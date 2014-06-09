import os
import re
import time
import json
import md5
import pdb
import psycopg2
import traceback

from functools import wraps
from collections import *
from datetime import datetime
from sqlalchemy import *
from flask import Flask, request, render_template, g, redirect, Response
from flask.ext.compress import Compress


from summary import Summary
from scorpion.util import ScorpionEncoder
import scorpionutil

app = Flask(__name__)
Compress(app)
SUMMARYCACHE = '.summary.cache'



def returns_json(f):
  @wraps(f)
  def json_returner(*args, **kwargs):
    r = f(*args, **kwargs)
    if not isinstance(r, basestring):
      r = json.dumps(r, cls=ScorpionEncoder)
    return Response(r, content_type='application/json')
  return json_returner

def cache_result(key, value):
  engine = create_engine('postgresql://localhost/cache')
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
      g.engine = create_engine('postgresql://localhost/%s' % dbname)
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


@app.route('/1/', methods=["POST", "GET"])
def index1():
  return render_template("index1.html")

@app.route('/2/', methods=["POST", "GET"])
def index2():
  return render_template("index2.html")


@app.route('/', methods=["POST", "GET"])
def index():
  return render_template("index.html")


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
  try:
    summary = Summary(db_or_name, table, CACHELOC=SUMMARYCACHE)
    cols_and_types = summary.get_columns_and_types()
    schema = dict(cols_and_types)
    summary.close()
    return schema
  except Exception as e:
    traceback.print_exc()
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



@app.route('/api/query/', methods=['POST', 'GET'])
@returns_json
def query():
  ret = { }
  jsonstr = request.args.get('json')
  if not jsonstr:
    print "query: no json string.  giving up"
    return ret

  args = json.loads(jsonstr)
  dbname = args.get('db')
  table = args.get('table')

  o, params = scorpionutil.create_sql_obj(g.db, args)
  query = str(o)
  print args
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

  summary = Summary(dbname, tablename, nbuckets=nbuckets, CACHELOC=SUMMARYCACHE)
  print 'where: %s' % where
  stats = summary(where=where)
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
  data =  json.loads(str(request.form['json']))
  fake = request.form.get('fake', False)
  requestid = request.form.get('requestid')
  if not fake or fake == 'false':
    results = scorpionutil.scorpion_run(g.db, data, requestid)
    print json.dumps(results, cls=ScorpionEncoder)
    return results

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

  from scorpion.util import Status
  status = Status(requestid)
  status.update_rules('label', results)
  status.close()

  time.sleep(3)

  ret['results'] = results
  return ret


