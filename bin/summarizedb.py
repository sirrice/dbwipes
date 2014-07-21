#!/usr/bin/env python2.7

try:
  activate_this = './bin/activate_this.py'
  execfile(activate_this, dict(__file__=activate_this))
except:
  pass

import click
import sys
from sqlalchemy import *
from dbwipes.summary import Summary


@click.command()
@click.option('--reset', is_flag=True)
@click.argument('dbname')
@click.argument('tables', nargs=-1)
def script(reset, dbname, tables):
  def get_tables(db):
    q = "select tablename from pg_tables where schemaname = 'public'"
    return [str(table) for (table,) in db.execute(q).fetchall()]

  if not tables:
    engine = create_engine("postgresql://localhost/%s" % dbname)
    db = engine.connect()
    tables = get_tables(db)
    db.close()
    engine.dispose()

  for table in tables:
    summary = Summary(dbname, table, nbuckets=500)
    if reset:
      summary.reset_cache()
    summary()
    summary.close()


if __name__ == '__main__':
  script()



