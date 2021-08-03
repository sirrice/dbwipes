from functools import wraps
import bsddb3 as bsddb
import json
import pdb
from sqlalchemy import create_engine, engine

from db import *



def get_cache():
  eng = db_connect('cache')
  db = eng.connect()

  try:
    db.execute("create table cache(key varchar, val text)")
  except:
    pass

  return eng, db

def make_cache(f):
  @wraps(f)
  def _f(self, *args, **kwargs):
    try:
      key = str(map(str, (f.__name__, self.engine, self.tablename, self.where, self.nbuckets, map(str, args))))
      #print key
      vals = self._cache.execute('select val from cache where key = %s', key).fetchall()
      if len(vals):
        return json.loads(vals[0][0])
    except Exception as e:
      print e
      pdb.set_trace()

    with self._cache.begin() as txn:
      res = f(self, *args, **kwargs)
      if key:
        self._cache.execute('insert into cache values(%s, %s)', key, json.dumps(res, default=json_handler))
      return res
    return None
  return _f

def json_handler(o):
  if hasattr(o, 'isoformat'):
    return o.isoformat()


class Summary(object):

  def __init__(self, dbname, tablename, nbuckets=50, where=''):
    self.dbtype = 'pg'
    if 'monetdb' in str(dbname):
      self.engine = None
      self.db = dbname
      self.dbtype = 'monet'
    elif isinstance(dbname, engine.base.Engine):
      self.engine = dbname
      self.db = dbname.connect()
    elif isinstance(dbname, engine.base.Connection):
      self.engine = dbname.engine
      self.db = dbname
    else:
      self.engine = db_connect(dbname)
      self.db = self.engine.connect()

    self.tablename = tablename
    self.nbuckets = nbuckets
    self.where = ''
    where = where.strip()
    if where:
      self.where = 'WHERE %s' % where

    self._engine, self._cache = get_cache()

    self.nrows = self.get_num_rows()
    self.col_types = self.get_columns_and_types()

  def __call__(self):
    stats = []
    for col, typ in self.col_types:
      #print "stats for: %s\t%s" % (col, typ)
      col_stats = self.get_col_stats(col, typ)
      if col_stats is None:
        #print "\tgot None"
        continue
      #print "\tgot %d" % (len(col_stats))
      stats.append((col, typ, col_stats))
    return stats


  def close(self):
    try:
      self.db.close()
    except Exception as e:
      print e
      pass

    try:
      self.engine.dispose()
    except Exception as e:
      print e
      pass

    try:
      self._cache.close()
    except Exception as e:
      print e
      pass

    try:
      self._engine.dispose()
    except Exception as e:
      print e
      pass

    #print self._cache.closed, self.db.closed

  def reset_cache(self):
    q = """delete from cache where key like '%%%%%s%%%%%s%%%%'""" % (str(self.engine), self.tablename)
    self._cache.execute(q)

  def query(self, q, *args):
    """
    Summaries using other engines only need to override this method
    """

    if self.dbtype == 'pg':
      print q
      return self.db.execute(q, *args).fetchall()
    else:
      cur = self.db.cursor()
      try:
        print q
        print args
        if args:
          cur.execute(q, args)
        else:
          cur.execute(q)
        ret = cur.fetchall()
        return ret
      except:
        self.db.rollback()
        raise
      finally:
        cur.close()


  @make_cache
  def get_num_rows(self):
    q = "SELECT count(*) from %s" % self.tablename
    return self.query(q)[0][0]

  @make_cache
  def get_distinct_count(self, col):
    q = "SELECT count(distinct %s) FROM %s %s" % (col, self.tablename, self.where)
    return self.query(q)[0][0]

  @make_cache
  def get_column_counts(self, cols):
    q = """SELECT %s FROM %s"""
    select = ["count(distinct %s)" % col for col in cols]
    select = ", ".join(select)
    q = q % (select, self.tablename)
    counts = tuple(self.query(q)[0])
    return dict(zip(cols, counts))



  @make_cache
  def get_columns_and_types(self):
    if self.dbtype == 'pg':
      q = """
      SELECT attname, pg_type.typname 
      FROM pg_class, pg_attribute, pg_type
      WHERE relname = %s and 
            pg_attribute.attrelid = pg_class.oid and 
            pg_type.oid = atttypid and
            attnum > 0 and 
            attisdropped = false;
      """
    else:
      q = """
      SELECT columns.name , columns.type
      FROM columns, tables 
      WHERE tables.name = %s and 
            tables.id = columns.table_id;
      """
    ret = []
    for (col, typ) in self.query(q, self.tablename):
      ret.append((str(col), str(typ)))
    return ret


  @make_cache
  def get_columns(self):
    """
    engine specific way to get table columns
    """
    if self.dbtype == 'pg':
      q = "select attname from pg_class, pg_attribute where relname = %s and attrelid = pg_class.oid and attnum > 0 and attisdropped = false;"
    else:
      q = "select columns.name from columns, tables where tables.name = %s and tables.id = columns.table_id;"
    ret = []
    for (attr,) in self.query(q, self.tablename):
      ret.append(str(attr))
    return ret


  @make_cache
  def get_type(self, col_name):
    if self.dbtype == 'pg':
      q = """SELECT pg_type.typname FROM pg_attribute, pg_class, pg_type where 
        relname = %s and pg_class.oid = pg_attribute.attrelid and attname = %s and
        pg_type.oid = atttypid"""
    else:
      q = """SELECT columns.type from columns, tables 
      WHERE tables.name = %s and tables.id = columns.table_id and columns.name = %s;
      """
    try:
      rows = self.query(q, self.tablename, col_name)
      row = rows[0]
      return row[0]
    except Exception as e:
      import traceback
      traceback.print_exc()
      return None


  def get_col_groupby(self, col_name, col_type):
    if col_type == None:
      return None

    groupby = None

    if 'time' == col_type:
      groupby = self.get_time_stats(col_name)

    if 'date' in col_type or 'timestamp' in col_type:
      groupby = self.get_date_stats(col_name)

    return groupby


  @make_cache
  def get_col_stats(self, col_name, col_type=None):
    if col_type is None:
      col_type = self.get_type(col_name)

    if col_type.startswith('_'):
      return None

    numerics = ['int', 'float', 'double', 'numeric']
    is_numeric = any([s in col_type for s in numerics])
    if self.dbtype == 'pg' and is_numeric:
      stats = self.get_numeric_stats(col_name)
      return stats
    if any([s in col_type for s in ['char', 'text']]):
      return self.get_char_stats(col_name)

    groupby = self.get_col_groupby(col_name, col_type)
    if groupby:
      stats = self.get_group_stats(col_name, groupby)
      return stats
    return None



  def get_group_stats(self, col_name, groupby):
    q = """select %s as GRP, min(%s), max(%s), count(*) 
    from %s  %s group by GRP 
    order by GRP limit %d"""
    q = q % (groupby, col_name, col_name, self.tablename, self.where, self.nbuckets)
    rows = [{ 'val': x, 'count': count, 'range':[minv, maxv]} for (x, minv, maxv, count) in self.query(q)]
    return rows

  def get_numeric_stats(self, c):
    ndistinct = self.get_distinct_count(c)
    if ndistinct == 0:
      return []
    if ndistinct == 1:
      if self.where:
        q = "SELECT %s from %s %s AND %s is not null"
        args = (c, self.tablename, self.where, c)
      else:
        q = "SELECT %s from %s WHERE %s is not null"
        args = (c, self.tablename, c)
      val = self.query(q % args)[0][0]
      return [{'val': val, 'count': self.nrows, 'range': [val, val]}]
    
    q = """
    with bound as (
      SELECT min(%s) as min, max(%s) as max, avg(%s) as avg, stddev(%s) as std FROM %s %s
    )
    SELECT width_bucket(%s::numeric, (avg-2.5*std), (avg+2.5*std), %d) as bucket,
           min(%s) as min,
           max(%s) as max,
           count(*) as count
    FROM %s, bound
    %s
    GROUP BY bucket
    """
    q = q % (c, c, c, c, self.tablename, self.where, c, self.nbuckets, c, c, self.tablename, self.where)


    q = """
    with TMP as (
      SELECT 2.5 * stddev(%s) / %d as block FROM %s %s
    )
    SELECT (%s/block)::int*block as bucket, 
           min(%s) as min, 
           max(%s) as max, 
           count(*) as count
    FROM %s,  TMP
    %s
    GROUP BY bucket
    ORDER BY bucket
    """
    q = q % (c, self.nbuckets, self.tablename, self.where, c, c, c, self.tablename, self.where)


    stats = []
    for (val, minv, maxv, count) in self.query(q):
      if val is None:
        stats.append({
          'val': None,
          'count': count,
          'range': [minv, maxv]
        })
      else:
        stats.append({
          'val': (maxv+minv)/2.,
          'count': count,
          'range': [minv, maxv]
        })

    return stats


  def get_char_stats(self, col_name):
    q = """select %s as GRP, min(%s), max(%s), count(*)
    FROM %s 
    %s
    GROUP BY GRP
    ORDER BY count(*) desc
    LIMIT %d"""
    q = q % (col_name, col_name, col_name, self.tablename, self.where, self.nbuckets)
    rows = [{ 'val': x, 'count': count, 'range':[minv, maxv]} for (x, minv, maxv, count) in self.query(q)]
    return rows


    
    groupby = col_name
    return groupby
    return self.get_group_stats(col_name, groupby)

  def get_time_stats(self, col_name):
    if self.dbtype == 'pg':
      return "date_trunc('hour', %s)::time" % col_name
    return """cast((%s 
              - cast(extract(second from %s) as interval second) 
              - cast(extract(minute from %s) as interval minute))
            as time)""" % (col_name, col_name, col_name)

  def get_date_stats(self, col_name):
    if self.dbtype == "pg":
      q = "select max(%s)::date, min(%s)::date, EXTRACT(EPOCH FROM (max(%s::timestamp) - min(%s::timestamp)))/60 as minutes from %s"
    else:
      q = """select cast(max(%s) as date), cast(min(%s) as date), 
        cast(max(cast(%s as timestamp)) - min(cast(%s as timestamp)) as bigint)/1000/60 as minutes
        from %s"""
    q = q % (col_name, col_name, col_name, col_name,  self.tablename)
    (maxv, minv, nminutes) = self.query(q)[0]
    if maxv is None or minv is None or nminutes is None:
      return None


    ndays = nminutes / 60 / 24

    if self.dbtype == 'pg':
      var = "%s::timestamp" % col_name
    else:
      var = "cast(%s as timestamp)" % col_name

    if self.dbtype == 'pg':
      if ndays == 0:
        groupby = "date_trunc('hour', %s)" % var
      elif ndays <= 30:
        groupby = "date_trunc('day', %s)" % var
      elif ndays <= 50 * 7:
        groupby = "date_trunc('week', %s)" % var
      elif ndays <= 365 * 12:
        groupby = "date_trunc('month', %s)" % var
      else:
        groupby = "date_trunc('year', %s)" % var
    else:
      if ndays == 0:
        groupby = """(%s 
          - cast(extract(second from %s) as interval second) 
          - cast(extract(minute from %s) as interval minute))
        """ % (var, var, var)
      elif ndays <= 30:
        groupby = "cast(cast(%s as date) as timestamp)" % var
      elif ndays <= 365 * 12:
        groupby = "cast(%s as date) - cast(extract(day from %s) as interval day)" % (var, var)
      else:
        groupby = """(cast(%s as date) 
        - cast(extract(day from %s) as interval day)
        - cast(extract(month from %s) as interval month)
        """ % (var, var, var)
    return groupby



