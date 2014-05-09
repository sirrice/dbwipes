#from gevent.pywsgi import WSGIServer # must be pywsgi to support websocket
#from geventwebsocket.handler import WebSocketHandler
from flask import Flask, request, render_template, g, redirect
import json
import md5
import traceback
from datetime import datetime
from monetdb import sql as msql

from summary import *
import pdb
app = Flask(__name__)


@app.route('/', methods=["POST", "GET"])
def index():
  dbname = request.form.get('db', 'bt')
  tablename = request.form.get('table', 'sample')
  try:
    nbuckets = int(request.form.get('nbuckets', 50))
  except:
    nbuckets = 50

  foo = Foo(dbname, tablename, nbuckets=nbuckets)
  stats = foo()
  data = []
  for col, col_stats in stats:
    s = ','.join([str(v) for k,v in col_stats])
    data.append((col, col_stats, s))
  context = {
    "data": data
  }
  return render_template("index.html", **context)

if __name__ == "__main__":
  import psycopg2
  DEC2FLOAT = psycopg2.extensions.new_type(
    psycopg2.extensions.DECIMAL.values,
    'DEC2FLOAT',
    lambda value, curs: float(value) if value is not None else None)
  psycopg2.extensions.register_type(DEC2FLOAT)
  app.debug = True
  app.run(port=8111)
