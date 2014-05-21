import sys
from sqlalchemy import *
from summary.summary import Summary


def get_tables(db):
  q = "select tablename from pg_tables where schemaname = 'public'";
  for (table,) in db.execute(q).fetchall():
    yield table



dbname = sys.argv[1]


engine = create_engine("postgresql://localhost/%s" % dbname)
db = engine.connect()

for table in get_tables(db):
  summary = Summary(db, table, nbuckets=500)
  summary()

db.close()
engine.dispose()


