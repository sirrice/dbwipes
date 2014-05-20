from flask import Flask, request, render_template, g, redirect
import os
import re
import time
import json
import md5
import pdb
import psycopg2
import traceback
from collections import *
from datetime import datetime

from sqlalchemy import *
from summary import Summary
app = Flask(__name__)

summaries = {}


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
      g.engine = create_engine('postgresql:///%s' % dbname)
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
    if hasattr(g, 'engine'):
      g.engine.dispose()
  except:
    traceback.print_exc()



def json_handler(o):
  if hasattr(o, 'isoformat'):
    return o.isoformat()


@app.route('/', methods=["POST", "GET"])
def index():
  print os.path.abspath('.')
  return render_template("index.html")


@app.route('/api/query/', methods=['POST', 'GET'])
def query():
  x = request.args.get('x')
  ys = request.args.get('ys')
  where = request.args.get('where')
  table = request.args.get('table')
  dbname = request.args.get('db')
  query = request.args.get('query')
  
  if not dbname or not query:
    return json.dumps({})

  print query
  ret = {'data': []}

  try:
    conn = g.db

    cur = conn.execute(query)
    rows = cur.fetchall()
    data = [dict(zip(cur.keys(), vals)) for vals in rows]
    ret['data'] = data

    summary = Summary(g.engine, table)
    cols = summary.get_columns()
    types = map(summary.get_type, cols)
    schema = dict(zip(cols, types))
    ret['schema'] = schema

    cur.close()
    print data[:3]
  except Exception as e:
    traceback.print_exc()
  return json.dumps(ret, default=json_handler)


@app.route('/api/lookup/', methods=['POST', 'GET'])
def lookup():
  dbname = request.args.get('db', 'intel')
  tablename = request.args.get('table', 'readings')
  try:
    nbuckets = int(request.args.get('nbuckets', 100))
  except Exception as e:
    print e
    nbuckets = 100

  key = (dbname, tablename, nbuckets)
  if key not in summaries:
    #from monetdb import sql as msql
    #db = msql.connect(user='monetdb', password='monetdb', database=dbname)
    summaries[key] = Summary(dbname, tablename, nbuckets=nbuckets)

  foo = summaries[key]
  stats = foo()
  data = []
  for col, col_stats in stats:
    data.append({
      'col': col, 
      'type': foo.get_type(col),
      'stats': col_stats
    })
  context = {
    "data": data
  }
  return json.dumps(context, default=json_handler)



@app.route('/api/scorpion/', methods=['POST', 'GET'])
def scorpion():
  data =  json.loads(str(request.form['json']))
  schema = data.get('schema', {})
  badsel = data.get('badselection', {})
  goodsel = data.get('goodselection', {})
  errtypes = data.get('errtypes', {})
  qjson = data.get('query', {})
  results = scorpion_run(qjson, badsel, goodsel, errtypes)
  return json.dumps(results, default=json_handler)

  ret = {}
  results = [
    {
      'score': 0.2,
      'c_range': [0, 1],
      'clauses': [
        {'col': 'light', 'type': 'num', 'vals': [500, 1000]},
        {'col': 'sensor', 'type': 'str', 'vals': map(str, [16, 17, 18, 19, 20])}
      ],
      'alt_clauses': [
        {'col': 'humidity', 'type': 'num', 'vals': [0, 1.4]}
      ]
    },
    {
      'score': 0.2,
      'c_range': [0, 1],
      'clauses': [
        {'col': 'voltage', 'type': 'num', 'vals': [0, 1.5]},
        {'col': 'humidity', 'type': 'num', 'vals': [-5000, .1]}
      ],
      'alt_clauses': [
      ]
    }
  ]
  ret['results'] = results

  return json.dumps(ret, default=json_handler)

from scorpion.errfunc import *
__agg2f__ = {
  'avg' : AvgErrFunc,
  'std' : StdErrFunc,
  'stddev' : StdErrFunc,
  'stddev_samp': StdErrFunc,
  'stddev_pop': StdErrFunc,
  'min' : MinErrFunc,
  'max' : MaxErrFunc,
  'sum' : SumErrFunc,
  'corr' : CorrErrFunc,
  'count' : CountErrFunc,
  'abs' : AbsErrFunc
}


def parse_agg(s):
  p = re.compile('(?P<func>\w+)\(\s*(?P<col>\w+)\s*\)\s*(as\s+(?P<alias>\w+))?')
  d = p.match(s).groupdict()
  klass = __agg2f__[d['func'].strip()]
  func = klass([Var(str(d['col']))])
  print d
  return {
    'fname': d['func'],
    'func': func,
    'col': d['col'],
    'alias': d.get('alias', '') or d['func']
  }

def expr_from_nonagg(s):
  if ' as ' in s: 
    return ' as '.join(s.split(' as ')[:-1])
  return s


def scorpion_run(qjson, badsel, goodsel, errtypes):
  """
  badsel:  { alias: { x:, y:, xalias:, yalias:, } }
  goodsel: { alias: { x:, y:, xalias:, yalias:, } }
  """
  import scorpion
  from scorpion.aggerror import AggErr
  from scorpion.db import db_type
  from scorpion.sql import Select, SelectExpr, SelectAgg, Query
  from scorpion.arch import SharedObj, extract_agg_vals
  from scorpion.parallel import parallel_debug

  x = qjson['x']
  ys = qjson['ys']
  sql = qjson['query']
  dbname = qjson['db']
  table = qjson['table']
  where = qjson.get('where', '')

  
  select = Select()
  nonagg = SelectExpr(x['alias'], [x['col']], x['expr'], x['col'])
  select.append(nonagg)
  for y in ys:
    d = parse_agg(y['expr'])
    agg = SelectAgg(y['alias'], d['func'], [y['col']], y['expr'], y['col'])
    select.append(agg)
  parsed = Query(
    g.db, 
    select, 
    [table], 
    filter(bool, [where]), 
    x['expr'], 
    expr_from_nonagg(x['expr'])
  )


  print parsed

  context = {}

  try:    
    obj = SharedObj(g.db, '', dbname=dbname, parsed=parsed)
    obj.dbname = dbname
    obj.C = 0.2
    obj.ignore_attrs = []

    # fix aliases in select
    for nonagg in obj.parsed.select.nonaggs:
      nonagg.alias = x['alias']
    for agg in obj.parsed.select.aggs:
      y = [y for y in ys if y['expr'] == agg.expr][0]
      agg.alias = y['alias']


    xtype = db_type(g.db, table, x['col'])

    errors = []
    for agg in obj.parsed.select.aggregates:
      alias = agg.shortname
      if alias not in badsel:
        continue

      badpts = badsel.get(alias, [])
      badkeys = map(lambda pt: pt['x'], badpts)
      badkeys = extract_agg_vals(badkeys, xtype)
      goodpts = goodsel.get(alias, [])
      goodkeys = map(lambda pt: pt['x'], goodpts)
      goodkeys = extract_agg_vals(goodkeys, xtype)
      errtype = errtypes[alias]
      print "errtype", errtype
      erreq = None

      err = AggErr(agg, badkeys, 20, errtype, {'erreq': erreq})
      obj.goodkeys[alias] = goodkeys
      errors.append(err)

    obj.errors = errors
    print obj.errors[0]

    start = time.time()
    parallel_debug(
      obj,
      nprocesses=4,
      parallelize=False,
      nstds=0,
      errperc=0.001,
      epsilon=0.008,
      msethreshold=0.15,
      c=obj.c,
      complexity_multiplier=4.5,
      l=0.9,
      max_wait=10,
      DEBUG=True
    )
    cost = time.time() - start
    print "end to end took %.4f" % cost


    context['results'] = create_scorpion_results(obj)

  except Exception as e:
    traceback.print_exc()
    context['errormsg'] = str(e)

  return context

def create_scorpion_results(obj):
  results = []
  idx = 0
  nrules = 6 
  for yalias, clauses in obj.clauses.items():
    rules = [p[0] for p in obj.rules[yalias]]
    clauses = [c.strip() for c in clauses]

    for rule, clause in zip(rules[:nrules], clauses[:nrules]):
      clause_parts = rule.toCondDicts()
      equiv_clause_parts = {}
      for r in rule.cluster_rules:
        dicts = r.toCondDicts()
        for d in dicts:
          equiv_clause_parts[str(d)] = d
      equiv_clause_parts = equiv_clause_parts.values()
      idx += 1

      rnd = lambda v: round(v, 3)
      result = {
        'id': idx,
        'yalias': yalias,
        'score': rnd(rule.quality),
        'c_range': map(rnd, rule.c_range),
        'clauses': clause_parts,
        'alt_clauses': equiv_clause_parts
      }

      results.append(result)
  return results


