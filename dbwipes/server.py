import os
import re
import time
import json
import md5
import pdb
import random
import psycopg2
import traceback
import numpy as np

from functools import wraps
from collections import *
from datetime import datetime
from sqlalchemy import *
from sqlalchemy.pool import NullPool
from flask import Flask, request, render_template, g, redirect, Response
from flask_compress import Compress


from summary import Summary
from util import *
from db import *

tmpl_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'templates')
print tmpl_dir
app = Flask(__name__, template_folder=tmpl_dir)
Compress(app)


def returns_json(f):
  @wraps(f)
  def json_returner(*args, **kwargs):
    r = f(*args, **kwargs)
    if not isinstance(r, basestring):
      r = json.dumps(r, cls=SummaryEncoder)
    return Response(r, content_type='application/json')
  return json_returner

def cache_result(key, value):
  engine = db_connect('cache')
  db = engine.connect()
  q = "insert into requests values(%s, %s)"
  db.execute(q, key, value)
  db.close()
  engine.dispose()

@app.before_request
def before_request():
  try:
    dbname = None
    if 'db' in request.form:
      dbname = request.form['db']
    elif 'db' in request.args:
      dbname = request.args['db']

    g.dbname = dbname
    g.engine = None
    g.db = None

    if dbname:
      g.engine = db_connect(dbname)
      g.db = g.engine.connect()
  except:
    traceback.print_exc()
    g.engine = None
    g.db = None

@app.teardown_request
def teardown_request(exception):
  try:
    if hasattr(g, 'db'):
      g.db.close()
  except Exception as e:
    pass

  try:
    if hasattr(g, 'engine'):
      g.engine.dispose()
  except Exception as e:
    pass


@app.route('/', methods=["POST", "GET"])
def index():
  try:
    import scorpion
    enable_scorpion = 1
    title = 'DBWipes + Scorpion!'
  except:
    enable_scorpion = 0
    title = 'DBWipes'

  context = {
    'enableScorpion': enable_scorpion,
    'js': 'summary',
    'study': 0,
    'title': title,
    'debug': True
  }
  return render_template("index_base.html", **context)




@app.route('/drspott/', methods=["POST", "GET"])
def drspott():
  context = {
    'enableScorpion': 1,
    'js': 'summarydrspott',
    'study': 0,
    'title': 'DBWipes + Scorpion!'
  }
  return render_template("index_base.html", **context)


@app.route('/hidden/', methods=["POST", "GET"])
def hidden():
  context = {
    'enableScorpion': 1,
    'js': 'summary',
    'title': 'DBWipes + Scorpion!',
    'study': 0,
    'debug': True
  }
  return render_template("index_base.html", **context)

@app.route('/study/name/', methods=["POST", "GET"])
def study_name():
  return render_template("study/name.html")

@app.route('/study/', methods=["POST", "GET"])
@app.route('/study/dir/', methods=["POST", "GET"])
def study_dir():
  return render_template("study/dir.html", **{
    'taskids': enumerate([4,5, 8, 10])
  })

@app.route('/study/<int:idx>/', methods=["POST", "GET"])
def index_idx(idx):
  templates = []
  templates.append("study/index%d.html" % idx)
  templates.append("index_base.html")

  js = 'study/summary%d' % idx
  title = "DBWipes Tutorial"
  subtitle = ""
  enable_scorpion = 1

  if idx in [0,1,2,4]:
    enable_scorpion = 0

  if idx == 2:
    title = 'DBWipes Verification Test'

  if idx == 3:
    title = "DBWipes + Scorpion Tutorial"

  if idx >= 4:
    title = "DBWipes User Study"
    subtitle = "without Scorpion"

  # hard1 sum
  if idx == 4:
    enable_scorpion = 0

  if idx == 5:
    subtitle = "with Scorpion"
    js = 'study/summary4'
    enable_scorpion = 1
    templates[0] = "study/index4.html"

  # intel
  if idx == 6:
    subtitle = "without Scorpion"
    js = 'study/summary6'
    enable_scorpion = 0

  if idx == 7:
    subtitle = "with Scorpion"
    js = 'study/summary6'
    enable_scorpion = 1
    templates[0] = "study/index6.html"

  # hard1 avg
  if idx == 8:
    enable_scorpion = 0
    js = 'study/summary8'
    templates[0] = "study/index8.html"

  if idx == 9:
    subtitle = "with Scorpion"
    js = 'study/summary8'
    enable_scorpion = 1
    templates[0] = "study/index8.html"


  # hard2 sum
  if idx == 10:
    js = 'study/summary10'
    enable_scorpion = 0
    templates[0] = "study/index10.html"

  if idx == 11:
    subtitle = "with Scorpion"
    js = 'study/summary10'
    enable_scorpion = 1
    templates[0] = "study/index10.html"

  # hard2 avg
  if idx == 12:
    js = 'study/summary12'
    enable_scorpion = 0
    templates[0] = "study/index12.html"

  if idx == 13:
    subtitle = "with Scorpion"
    js = 'study/summary12'
    enable_scorpion = 1
    templates[0] = "study/index12.html"



  context = {
    'enableScorpion': enable_scorpion,
    'idx': idx,
    'js': js,
    'study': 1,
    'title': title,
    'subtitle': subtitle,
    'debug': False
  }
  print context

  return render_template(templates, **context)

@app.route('/tasks/get/', methods=["POST", "GET"])
@returns_json
def task_get():
  name = request.form['name']
  if not name:
    return { 'status': False }

  try:
    db = db_connect("tasks")
    try:
      q = """create table tasks(
        name varchar, 
        tstamp timestamp default current_timestamp,
        tasks text
      )"""
      db.execute(q)
    except:
      pass


    q = """select * from tasks where name = %s"""
    rows = db.execute(q, name).fetchall()
    if rows:
      tasks = json.loads(rows[0][2])
      return {
        'status': True,
        'tasks': tasks
      }
    else:
      alltasks = [4, 8, 10, 12]
      options = np.random.choice(alltasks, 3, replace=False)
      tasks = []
      for task in options:
        enable_scorpion = random.random() > .5
        if enable_scorpion:
          task += 1
        tasks.append(task)
      q = """insert into tasks values(%s, default, %s)"""
      db.execute(q, (name, json.dumps(tasks)))
      return {
        'status': True,
        'tasks': tasks
      }
  except Exception as e:
    print e
    pass
  finally:
    if db:
      db.dispose()

 

@app.route('/tasks/submit/', methods=["POST", "GET"])
@returns_json
def task_submit():
  print request.form
  name = request.form['name']
  taskid = request.form['taskid']
  data = request.form['data']
  db = db_connect("tasks")

  try:
    q = """create table responses(
      name varchar, 
      tstamp timestamp default current_timestamp,
      taskid varchar, 
      data text
    )"""
    db.execute(q)
  except:
    pass

  q = "insert into responses values(%s, default, %s, %s)"
  db.execute(q, (name, taskid, data))

  db.dispose()
  return {'status': True}
 
@app.route('/api/databases/', methods=['POST', 'GET'])
@returns_json
def dbs():
  q = "SELECT datname FROM pg_database where datistemplate = false;"
  dbnames = [str(row[0]) for row in g.db.execute(q).fetchall()]
  return {'databases': dbnames}



@app.route('/api/tables/', methods=['POST', 'GET'])
@returns_json
def tables():
  cur = g.db.cursor()
  res = cur.execute("SELECT tablename from pg_tables WHERE schemaname = 'public'")
  tables = [str(row[0]) for row in res.fetchall()]
  return {'tables': tables}



def get_schema(db_or_name, table):
  summary = Summary(db_or_name, table)
  try:
    cols_and_types = summary.get_columns_and_types()
    schema = dict(cols_and_types)
    return schema
  except Exception as e:
    traceback.print_exc()
  finally:
    summary.close()
  return {}



@app.route('/api/schema/', methods=['POST', 'GET'])
@returns_json
def schema():
  table = request.args.get('table')
  
  if not table:
    return {}

  ret = {}
  ret['schema'] = get_schema(g.db, table)
  return ret


@app.route('/api/requestid/', methods=['POST', 'GET'])
@returns_json
def requestid():
  try:
    from scorpion.util import Status
    status = Status()
    requestid = status.reqid
    status.close()
    return {'requestid': requestid}
  except Exception as e:
    return {'error': str(e)}



@app.route('/api/status/', methods=['POST', 'GET'])
@returns_json
def api_status():
  try:
    from scorpion.util import Status
    rid = int(request.args.get('requestid'))

    status = Status(rid)
    ret = status.latest_status()
    label_rules = status.get_rules()
    status.close()

    partial_rules = []
    for label, rules in label_rules:
      partial_rules.extend(rules)
    rules_hash = hash(str(partial_rules))

    return {
      'status': ret,
      'results': partial_rules,
      'hash': rules_hash
    }
  except Exception as e:
    return {
      'status': str(e),
      'results': []
    }


@app.route('/api/tuples/', methods=['POST', 'GET'])
@returns_json
def api_tuples():
  ret = { }
  jsonstr = request.args.get('json')
  if not jsonstr:
    print "query: no json string.  giving up"
    return ret

  args = json.loads(jsonstr)
  dbname = args.get('db')
  table = args.get('table')
  where = args.get('where', []) or []

  where, params = where_to_sql(where)
  if where:
    where = 'AND %s' % where
  print where
  print params

  query = """WITH XXXX as (select count(*) from %s WHERE 1 = 1 %s)
  SELECT * FROM %s 
  WHERE random() <= 50.0 / (select * from XXXX) %s 
  LIMIT 50"""
  query = query % (table, where, table, where)
  try:
    conn = g.db
    cur = conn.execute(query, [params+params])
    rows = cur.fetchall()
    cur.close()

    data = [dict(zip(cur.keys(), vals)) for vals in rows]
    ret['data'] = data
    ret['schema'] = get_schema(g.db, table)

  except Exception as e:
    traceback.print_exc()
    ret = {}
    raise

  print "%d points returned" % len(ret.get('data', []))
  return ret



@app.route('/api/query/', methods=['POST', 'GET'])
@returns_json
def api_query():
  ret = { }
  jsonstr = request.args.get('json')
  if not jsonstr:
    print "query: no json string.  giving up"
    return ret

  args = json.loads(jsonstr)
  dbname = args.get('db')
  table = args.get('table')

  o, params = create_sql_obj(g.db, args)
  o.limit = 10000;
  query = str(o)
  print query
  print params

  if not dbname or not table or not query:
    print "query: no db/table/query.  giving up"
    return ret

  try:
    conn = g.db
    cur = conn.execute(query, [params])
    rows = cur.fetchall()
    cur.close()

    data = [dict(zip(cur.keys(), vals)) for vals in rows]
    ret['data'] = data
    ret['schema'] = get_schema(g.db, table)

  except Exception as e:
    traceback.print_exc()
    ret = {}

  print "%d points returned" % len(ret.get('data', []))
  return ret



@app.route('/api/column_distribution/', methods=['POST', 'GET'])
@returns_json
def column_distribution():
  dbname = request.args.get('db', 'intel')
  tablename = request.args.get('table', 'readings')
  where = request.args.get('where', '')
  col = request.args.get('col')
  try:
    nbuckets = int(request.args.get('nbuckets', 100))
  except Exception as e:
    print e
    nbuckets = 100


  summary = Summary(g.db, tablename, nbuckets=nbuckets, where=where)
  try:
    typ = summary.get_type(col)
    stats = summary.get_col_stats(col, typ)
  except Exception as e:
    traceback.print_exc()
  finally:
    summary.close()

  data = {
    'col': col,
    'type': typ,
    'stats': stats
  }
  context = { "data": data }
  return context



@app.route('/api/column_distributions/', methods=['POST', 'GET'])
@returns_json
def column_distributions():
  dbname = request.args.get('db', 'intel')
  tablename = request.args.get('table', 'readings')
  where = request.args.get('where', '')
  try:
    nbuckets = int(request.args.get('nbuckets', 100))
  except Exception as e:
    print e
    nbuckets = 100

  #  #from monetdb import sql as msql
  #  #db = msql.connect(user='monetdb', password='monetdb', database=dbname)

  summary = Summary(g.db, tablename, nbuckets=nbuckets, where=where)
  print 'where: %s' % where
  try:
    stats = summary()
  except Exception as e:
    traceback.print_exc()
  finally:
    summary.close()


  data = []
  for col, typ, col_stats in stats:
    data.append({
      'col': col, 
      'type': typ, 
      'stats': col_stats
    })

  context = { "data": data }
  return context



@app.route('/api/scorpion/', methods=['POST', 'GET'])
@returns_json
def scorpion():
  try:
    import scorpionutil
  except:
    print >>sys.stderr, "Could not load scorpionutil.  Maybe scorpion has not been installed?"
    traceback.print_exc()
    return {}

  try:
    data =  json.loads(str(request.form['json']))
    fake = request.form.get('fake', False)
    requestid = request.form.get('requestid')
    if not fake or fake == 'false':
      results = scorpionutil.scorpion_run(g.db, data, requestid)
      return results
  except:
    return {}

  ret = {}
  results = [
    {
      'score': 0.2,
      'c_range': [0, 1],
      'count': 100,
      'clauses': [
        {'col': 'sensor', 'type': 'str', 'vals': map(str, [18])}
      ],
      'alt_rules': [
        [ {'col': 'humidity', 'type': 'num', 'vals': [0, 1.4]}]
      ]
    },
    {
      'score': 0.2,
      'c_range': [0, 1],
      'count': 100,
      'clauses': [
        {'col': 'voltage', 'type': 'num', 'vals': [0, 2.15]},
        {'col': 'sensor', 'type': 'str', 'vals': ['18']}
      ],
      'alt_rules': [
        [ {'col': 'humidity', 'type': 'num', 'vals': [0, 1.4]},
          {'col': 'humidity', 'type': 'num', 'vals': [0, 1.4]} ],
        [ {'col': 'humidity', 'type': 'num', 'vals': [0, 1.4]},
          {'col': 'humidity', 'type': 'num', 'vals': [0, 1.4]} ]
      ]
    }
  ]

  top_k = [
    {
      'c': 0,
      'score': 0.2,
      'c_range': [0, 0],
      'count': 100,
      'clauses': [
        {'col': 'sensor', 'type': 'str', 'vals': map(str, [18])}
      ]
    },
    {
      'c': 0,
      'score': 0.2,
      'c_range': [0, 0],
      'count': 100,
      'clauses': [
        {'col': 'voltage', 'type': 'num', 'vals': [0, 2.15]},
        {'col': 'sensor', 'type': 'str', 'vals': ['18']}
      ]
    },
    {
      'c': 0.5,
      'score': 0.2,
      'c_range': [0.5, .5],
      'count': 100,
      'clauses': [
        {'col': 'sensor', 'type': 'str', 'vals': map(str, [18, 15])}
      ]
    },
    {
      'c': 0.5,
      'score': 0.2,
      'c_range': [0.5, .5],
      'count': 100,
      'clauses': [
        {'col': 'voltage', 'type': 'num', 'vals': [-5, 2.5]},
        {'col': 'sensor', 'type': 'str', 'vals': ['18', '15']}
      ]
    },
    {
      'c': 1.0,
      'score': 0.2,
      'c_range': [1.0, 1.0],
      'count': 100,
      'clauses': [
        {'col': 'sensor', 'type': 'str', 'vals': map(str, [18, 30, 35])}
      ]
    },
    {
      'c': 1.0,
      'score': 0.2,
      'c_range': [1.0, 1.0],
      'count': 100,
      'clauses': [
        {'col': 'humidity', 'type': 'num', 'vals': [-100, 40]},
        {'col': 'sensor', 'type': 'str', 'vals': ['18', '19']}
      ]
    }

  ]

  from scorpion.util import Status
  status = Status(requestid)
  status.update_rules('label', results)
  status.close()

  time.sleep(1)

  ret['results'] = results
  ret['top_k_results'] = top_k
  return ret


