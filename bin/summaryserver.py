import psycopg2
from summary.server import app

DEC2FLOAT = psycopg2.extensions.new_type(
  psycopg2.extensions.DECIMAL.values,
  'DEC2FLOAT',
  lambda value, curs: float(value) if value is not None else None)
print "registering type"
psycopg2.extensions.register_type(DEC2FLOAT)


PORT = 8111
HOST = '128.52.160.140'

try:
  from gevent.wsgi import WSGIServer
  print "running gevent server"
  http_server = WSGIServer((HOST, PORT), app)
  http_server.serve_forever()
except:
  app.debug = True
  print "running flask server"
  app.run(host=HOST, port=PORT, debug=True)
print "running on port 8111"
