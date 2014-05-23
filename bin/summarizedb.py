import sys
from sqlalchemy import *
from summary.summary import Summary


def get_tables(db):
  q = "select tablename from pg_tables where schemaname = 'public'"
  return [str(table) for (table,) in db.execute(q).fetchall()]

dbname = sys.argv[1]


engine = create_engine("postgresql://localhost/%s" % dbname)
db = engine.connect()
tables = get_tables(db)
db.close()
engine.dispose()

for table in tables:
  summary = Summary(dbname, table, nbuckets=500)
  summary()
  summary.close()



