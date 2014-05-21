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

import scorpionutil

app = Flask(__name__)
SUMMARYCACHE = '.summary.cache'
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

    summary = Summary(g.engine, table, CACHELOC=SUMMARYCACHE)
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
    summaries[key] = Summary(dbname, tablename, nbuckets=nbuckets, CACHELOC=SUMMARYCACHE)

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
  results = scorpionutil.scorpion_run(g.db, data)
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


