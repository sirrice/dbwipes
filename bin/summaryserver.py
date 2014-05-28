import sys
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
print "running on %s:%d" % (HOST, PORT)

if len(sys.argv) > 1:
  HOST = sys.argv[1]

app.run(host=HOST, port=PORT, debug=True, threaded=True)


try:
  from tornado .wsgi import WSGIContainer
  from tornado.httpserver import HTTPServer
  from tornado.ioloop import IOLoop

  print "running tornado server"
  http_server = HTTPServer(WSGIContainer(app))
  http_server.listen(PORT, address=HOST)
  IOLoop.instance().start()
except Exception as e:
  print e
  try:
    
    from gevent.wsgi import WSGIServer
    print "running gevent server"
    http_server = WSGIServer((HOST, PORT), app)
    http_server.serve_forever()
  except:
    app.debug = True
    print "running flask server"
    app.run(host=HOST, port=PORT, debug=True)

