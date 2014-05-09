import pdb
from sqlalchemy import *

class Foo(object):

  def __init__(self, dbname, tablename, nbuckets=50):
    self.db = create_engine("postgresql://localhost/%s" % dbname)
    self.dbname = dbname
    self.tablename = tablename
    self.nbuckets = nbuckets


  def __call__(self):
    cols = self.get_columns()
    stats = []
    for col in cols:
      print "stats for: %s" % col
      col_stats = self.get_col_stats(col)
      if col_stats is None:
        print "\tgot None"
        continue
      else:
        print "\tgot %d" % (len(col_stats))
      stats.append((col, col_stats))
    return stats


  def get_columns(self):
    q = "select attname from pg_class, pg_attribute where relname = %s and attrelid = pg_class.oid and attnum > 0;"
    ret = []
    for (attr,) in self.db.execute(q, self.tablename):
      ret.append(attr)
    return ret


  def get_type(self, col_name):
    q = """SELECT pg_type.typname FROM pg_attribute, pg_class, pg_type where 
      relname = %%s and pg_class.oid = pg_attribute.attrelid and attname = '%s' and
      pg_type.oid = atttypid"""
    try:
      row = self.db.execute(q % col_name, self.tablename).fetchone()
      return row[0]
    except Exception as e:
      print e
      return None


  def get_col_stats(self, col_name):
    col_type = self.get_type(col_name)

    if col_type == None:
      return None

    if col_name == 'id':
      return None

    if 'char' in col_type or 'text' in col_type:
      return self.get_char_stats(col_name)
    if 'time' == col_type:
      return self.get_time_stats(col_name)
    if 'date' in col_type or 'timestamp' in col_type:
      return self.get_date_stats(col_name)

    if 'int' in col_type or 'float' in col_type:
      q = "select count(distinct %s)::float / count(*), count(*) from %s"
      q = q % (col_name, self.tablename)
      perc, count = self.db.execute(q).fetchone()
      if count > 1000 and perc > .7:
        return None

      return self.get_num_stats(col_name)
    return None

  def get_group_stats(self, col_name, groupby):
    q = "select %s , count(*) from %s group by %s order by %s"
    q = q % (groupby, self.tablename, groupby, groupby)
    return [(x, count) for (x, count) in self.db.execute(q)]

  def get_num_stats(self, col_name):
    q = "select min(%s), max(%s) from %s" % (col_name, col_name, self.tablename)
    minv, maxv = self.db.execute(q).fetchone()

    if maxv == minv:
      (count, ) = self.db.execute("select count(*) from %s" % self.tablename).fetchone()
      return [(minv, count)]

    block = (maxv - minv) / self.nbuckets 
    groupby = "((%s-(%.9f)) / %s)::int" % (col_name, minv, block)
    return self.get_group_stats(col_name, groupby)

  def get_char_stats(self, col_name):
    q = "select %s as %s, count(*) as count from %s group by %s order by count desc"
    q = q % (col_name, col_name, self.tablename, col_name)

    rows = self.db.execute(q).fetchall()
    if len(rows) >= self.nbuckets:
      rows[self.nbuckets] = ("_MISC_", sum(c for _, c in rows[self.nbuckets:] ))
    rows = rows[:100]
    return rows

  def get_time_stats(self, col_name):
    q = "select date_trunc('hour', %s) as %s, count(*) from %s group by date_trunc('hour', %s) order by %s"
    q = q % (col_name, col_name, self.tablename, col_name, col_name)
    return self.db.execute(q).fetchall()

  def get_date_stats(self, col_name):
    

    q = "select max(%s)::date, min(%s)::date, EXTRACT(EPOCH FROM (max(%s::timestamp) - min(%s::timestamp)))/60 as minutes from %s"
    q = q % (col_name, col_name, col_name, col_name,  self.tablename)
    (maxv, minv, nminutes) = self.db.execute(q).fetchone()
    ndays = nminutes / 60 / 24
    print ndays

    if ndays == 0:
      groupby = "date_trunc('hour', %s::timestamp)" % col_name
    elif ndays <= 30:
      groupby = "date_trunc('day', %s::timestamp)" % col_name
    elif ndays <= 50 * 7:
      groupby = "date_trunc('week', %s::timestamp)" % col_name
    elif ndays <= 365 * 12:
      groupby = "date_trunc('month', %s::timestamp)" % col_name
    else:
      groupby = "date_trunc('year', %s::timestamp)" % col_name
    return self.get_group_stats(col_name, groupby)


