import bsddb
import json
import pdb
from sqlalchemy import create_engine, engine


def json_handler(o):
  if hasattr(o, 'isoformat'):
    return o.isoformat()


class Summary(object):

  def __init__(self, dbname, tablename, nbuckets=50, CACHELOC='.summary.cache'):
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
      self.engine = create_engine("postgresql://localhost/%s" % dbname)
      self.db = self.engine.connect()

    self.tablename = tablename
    self.nbuckets = nbuckets

    self._cache = bsddb.hashopen(CACHELOC)

  def __call__(self):
    stats = []
    for col, typ in self.get_columns_and_types():
      print "stats for: %s\t%s" % (col, typ)
      col_stats = self.get_col_stats(col)
      if col_stats is None:
        print "\tgot None"
        continue
      print "\tgot %d" % (len(col_stats))
      stats.append((col, typ, col_stats))
    return stats


  def close(self):
    try:
      self.db.close()
    except:
      pass

    try:
      self.engine.dispose()
    except:
      pass

    try:
      self._cache.close()
    except:
      pass


  def query(self, q, *args):
    """
    Summaries using other engines only need to override this method
    """

    if self.dbtype == 'pg':
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


  def get_cardinality(self, col_name):
    q = "SELECT count(distinct %s) FROM %s"
    q = q % (col_name, self.tablename)
    return self.query(q)[0][0]

  def get_col_groupby(self, col_name, col_type):
    if col_type == None:
      return None

    if col_name == 'id':
      return None

    groupby = None
    if 'char' in col_type or 'text' in col_type:
      groupby = self.get_char_stats(col_name)

    if 'time' == col_type:
      groupby = self.get_time_stats(col_name)

    if 'date' in col_type or 'timestamp' in col_type:
      groupby = self.get_date_stats(col_name)

    if 'int' in col_type or 'float' in col_type or 'double' in col_type:
      if self.dbtype == 'pg':
        q = "select count(distinct %s), count(*) from %s"
      else:
        q = "select cast(count(distinct %s) as float), count(*) from %s"

      q = q % (col_name, self.tablename)
      distincts, count = self.query(q)[0]

      if count > 1000 and distincts > .7 * count:
        return None
      if count == 0:
        return None
      if distincts == 1:
        return col_name

      groupby = self.get_num_stats(col_name)

    return groupby


  def get_col_stats(self, col_name):
    key = str(tuple(map(str, (self.tablename, col_name, self.nbuckets))))
    print key
    if key in self._cache:
      try:
        return json.loads(self._cache[key])
      except Exception as e:
        print "couldn't load %s from cache.  re-populating" % str(key)
        del self._cache[key]


    col_type = self.get_type(col_name)

    if self.dbtype == 'pg' and any([('_' not in col_type) and (s in col_type) for s in ['int', 'float', 'double', 'numeric']]):
      stats = self.get_numeric_stats(col_name)
      self._cache[key] = json.dumps(stats, default=json_handler)
      self._cache.sync()
      return stats

    groupby = self.get_col_groupby(col_name, col_type)
    if groupby:
      stats = self.get_group_stats(col_name, groupby)
      self._cache[key] = json.dumps(stats, default=json_handler)
      self._cache.sync()
      return stats
    self._cache[key] = json.dumps(None)
    self._cache.sync()
    return None



  def get_group_stats(self, col_name, groupby):
    q = """select %s as GRP, min(%s), max(%s), count(*) 
    from %s group by GRP 
    order by GRP limit %d"""
    q = q % (groupby, col_name, col_name, self.tablename, self.nbuckets)
    rows = [{ 'val': x, 'count': count, 'range':[minv, maxv]} for (x, minv, maxv, count) in self.query(q)]
    return rows

  def get_numeric_stats(self, c):
    q = "SELECT count(distinct %s), count(*) from %s" % (c, self.tablename)
    ndistinct, ncount = tuple(self.query(q)[0])
    if ndistinct == 0:
      return []
    if ndistinct == 1:
      val = self.query("SELECT %s from %s where %s is not null" % (c, self.tablename, c))[0][0]
      return [{'val': val, 'count': ncount, 'range': [val, val]}]

    q = """
    with bound as (
      SELECT min(%s) as min, max(%s) as max, avg(%s) as avg, stddev(%s) as std FROM %s
    )
    SELECT width_bucket(%s::numeric, (avg-2.5*std), (avg+2.5*std), %d) as bucket,
           min(%s) as min,
           max(%s) as max,
           count(*) as count
    FROM %s, bound
    GROUP BY bucket
    """
    q = q % (c, c, c, c, self.tablename, c, self.nbuckets, c, c, self.tablename)
    print q
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

  def get_num_stats(self, col_name):
    q = "select min(%s), max(%s), avg(%s), var_pop(%s), count(distinct %s) from %s" 
    q = q % (col_name, col_name, col_name, col_name, col_name, self.tablename)
    minv, maxv, avg, var, ndistinct = self.query(q)[0]
    if ndistinct <= self.nbuckets: return col_name

    maxvar = avg+2.5*(var**.5)
    minvar = avg-2.5*(var**.5)
    if maxvar <= maxv and minvar >= minv:
      minv, maxv = minvar, maxvar

    block = (maxv - minv) / self.nbuckets 
    if self.dbtype == 'pg':
      groupby = "(%s / %s)::int*%s" % (col_name, block, block)
    else:
      groupby = "cast((%s / %s) as int)*%s" % (col_name, block, block)
    print groupby

    return groupby

  def get_char_stats(self, col_name):
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



