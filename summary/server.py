#from gevent.pywsgi import WSGIServer # must be pywsgi to support websocket
#from geventwebsocket.handler import WebSocketHandler
from flask import Flask, request, render_template, g, redirect
import json
import md5
import traceback
from datetime import datetime

from sqlalchemy import *
from summary import *
import pdb
app = Flask(__name__)


def json_handler(o):
  if hasattr(o, 'isoformat'):
    return o.isoformat()


@app.route('/', methods=["POST", "GET"])
def index():
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

  db = create_engine('postgresql://localhost/%s' % dbname)
  cur = db.execute(query)
  rows = cur.fetchall()
  data = [dict(zip(cur.keys(), vals)) for vals in rows]
  cur.close()
  return json.dumps({'data': data}, default=json_handler)

@app.route('/api/lookup/', methods=['POST', 'GET'])
def lookup():
  dbname = request.form.get('db', 'intel')
  tablename = request.form.get('table', 'readings')
  try:
    nbuckets = int(request.form.get('nbuckets', 20))
  except:
    nbuckets = 50

  from monetdb import sql as msql
  db = dbname
  #db = msql.connect(user='monetdb', password='monetdb', database=dbname)
  foo = Summary(db, tablename, nbuckets=nbuckets)
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


if __name__ == "__main__":
  import psycopg2
  DEC2FLOAT = psycopg2.extensions.new_type(
    psycopg2.extensions.DECIMAL.values,
    'DEC2FLOAT',
    lambda value, curs: float(value) if value is not None else None)
  psycopg2.extensions.register_type(DEC2FLOAT)
  app.debug = True
  app.run(port=8111)
