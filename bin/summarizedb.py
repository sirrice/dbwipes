import sys
from sqlalchemy import *
from summary.summary import Summary


def get_tables(db):
  q = "select tablename from pg_tables where schemaname = 'public'"
  return [str(table) for (table,) in db.execute(q).fetchall()]

if len(sys.argv) < 2:
  print "python summarizedb.py <dbname> [table,...]"
  exit()

dbname = sys.argv[1]
if len(sys.argv) > 2:
  tables = sys.argv[2:]
else:
  engine = create_engine("postgresql://localhost/%s" % dbname)
  db = engine.connect()
  tables = get_tables(db)
  db.close()
  engine.dispose()

reset = raw_input('enter Y to reset cache: ')
reset = reset == 'Y'

for table in tables:
  summary = Summary(dbname, table, nbuckets=500)
  if reset:
    summary.reset_cache()
  summary()
  summary.close()



