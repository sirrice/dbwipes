import pdb
from sqlalchemy import create_engine

class Summary(object):

  def __init__(self, dbname, tablename, nbuckets=50):
    self.dbtype = 'pg'
    if 'monetdb' in str(dbname):
      self.db = dbname
      self.dbtype = 'monet'
    elif 'Engine' in str(dbname):
      self.db = dbname
    else:
      self.db = create_engine("postgresql://localhost/%s" % dbname)
    self.tablename = tablename
    self.nbuckets = nbuckets


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


  def get_columns(self):
    """
    engine specific way to get table columns
    """
    if self.dbtype == 'pg':
      q = "select attname from pg_class, pg_attribute where relname = %s and attrelid = pg_class.oid and attnum > 0;"
    else:
      q = "select columns.name from columns, tables where tables.name = %s and tables.id = columns.table_id;"
    ret = []
    for (attr,) in self.query(q, self.tablename):
      ret.append(attr)
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
        q = "select count(distinct %s)::float / count(*), count(*) from %s"
      else:
        q = "select cast(count(distinct %s) as float) / count(*), count(*) from %s"

      q = q % (col_name, self.tablename)
      perc, count = self.query(q)[0]

      if count > 1000 and perc > .7:
        return None

      groupby = self.get_num_stats(col_name)

    return groupby


  def get_col_stats(self, col_name):
    col_type = self.get_type(col_name)

    groupby = self.get_col_groupby(col_name, col_type)
    if groupby:
      return self.get_group_stats(col_name, groupby)
    return None



  def get_group_stats(self, col_name, groupby):
    q = "select %s as GRP, count(*) from %s group by GRP order by GRP limit %d"
    q = q % (groupby, self.tablename, self.nbuckets)#groupby, groupby, self.nbuckets)
    rows = [(x, count) for (x, count) in self.query(q)]
    return rows

  def get_num_stats(self, col_name):
    q = "select min(%s), max(%s), avg(%s), var_pop(%s), count(distinct %s) from %s" 
    q = q % (col_name, col_name, col_name, col_name, col_name, self.tablename)
    minv, maxv, avg, var, ndistinct = self.query(q)[0]
    if ndistinct <= self.nbuckets: return col_name

    block = (min(maxv, avg+2.5*(var**.5)) - max(minv, avg-2.5*(var**.5))) / self.nbuckets 
    if self.dbtype == 'pg':
      groupby = "((%s-(%.3f)) / %s)::int*%.3f" % (col_name, minv, block, block)
    else:
      groupby = "cast(((%s-(%.3f)) / %s) as int)*%.3f" % (col_name, minv, block, block)

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



