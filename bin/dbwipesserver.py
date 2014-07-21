#!/usr/bin/env python2.7

try:
  activate_this = './bin/activate_this.py'
  execfile(activate_this, dict(__file__=activate_this))
except:
  pass


import click
import sys
import psycopg2
from dbwipes.server import app

DEC2FLOAT = psycopg2.extensions.new_type(
  psycopg2.extensions.DECIMAL.values,
  'DEC2FLOAT',
  lambda value, curs: float(value) if value is not None else None)
print "registering type"
psycopg2.extensions.register_type(DEC2FLOAT)


@click.command()
@click.option('--debug', is_flag=True)
@click.option('--threaded', is_flag=True)
@click.argument('HOST', default='localhost')
@click.argument('PORT', default=8111, type=int)
def run(debug, threaded, host, port):
  HOST, PORT = host, port
  print "running on %s:%d" % (HOST, PORT)

  app.run(host=HOST, port=PORT, debug=debug, threaded=threaded)


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
      app.run(host=HOST, port=PORT, debug=debug)


if __name__ == '__main__':
  run()
