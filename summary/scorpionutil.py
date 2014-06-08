import os
import re
import time
import json
import md5
import pdb
import psycopg2
import traceback

from collections import *
from datetime import datetime

from scorpion.aggerror import AggErr
from scorpion.db import db_type
from scorpion.sql import Select, SelectExpr, SelectAgg, Query
from scorpion.arch import SharedObj, extract_agg_vals
from scorpion.parallel import parallel_debug
from scorpion.errfunc import *
from scorpion.util import Status



__agg2f__ = {
  'avg' : AvgErrFunc,
  'std' : StdErrFunc,
  'stddev' : StdErrFunc,
  'stddev_samp': StdErrFunc,
  'stddev_pop': StdErrFunc,
  'min' : MinErrFunc,
  'max' : MaxErrFunc,
  'sum' : SumErrFunc,
  'corr' : CorrErrFunc,
  'count' : CountErrFunc,
  'abs' : AbsErrFunc
}


def parse_agg(s):
  """
  parse an aggregation SELECT clause e.g., avg(temp) as foo
  into dictionary of function name, column, and alias components
  """
  p = re.compile('(?P<func>\w+)\(\s*(?P<col>\w+)\s*\)\s*(as\s+(?P<alias>\w+))?')
  d = p.match(s).groupdict()
  klass = __agg2f__[d['func'].strip()]
  func = klass([Var(str(d['col']))])
  return {
    'fname': d['func'],
    'func': func,
    'col': d['col'],
    'alias': d.get('alias', '') or d['func']
  }

def expr_from_nonagg(s):
  """
  remove alias component of a nonaggregation SELECT clause
  """
  if ' as ' in s: 
    return ' as '.join(s.split(' as ')[:-1])
  return s


def create_sql_obj(db, qjson):
  x = qjson['x']
  ys = qjson['ys']
  sql = qjson['query']
  dbname = qjson['db']
  table = qjson['table']
  where = qjson.get('where', '')

  
  select = Select()
  nonagg = SelectExpr(x['alias'], [x['col']], x['expr'], x['col'])
  select.append(nonagg)
  for y in ys:
    d = parse_agg(y['expr'])
    agg = SelectAgg(y['alias'], d['func'], [y['col']], y['expr'], y['col'])
    select.append(agg)

  parsed = Query(
    db, 
    select, 
    [table], 
    filter(bool, [where]), 
    [x['expr']], 
    [expr_from_nonagg(x['expr'])]
  )

  return parsed

def scorpion_run(db, requestdata, requestid):
  """
  badsel:  { alias: { x:, y:, xalias:, yalias:, } }
  goodsel: { alias: { x:, y:, xalias:, yalias:, } }
  """
  context = {}

  try:
    qjson = requestdata.get('query', {})
    tablename = qjson['table']
    parsed = create_sql_obj(db, qjson)
    print "parsed SQL"
    print parsed
  except Exception as e:
    traceback.print_exc()
    context["error"] = str(e)
    return context



  try:    
    badsel = requestdata.get('badselection', {})
    goodsel = requestdata.get('goodselection', {})
    errtypes = requestdata.get('errtypes', {})
    erreqs = requestdata.get('erreqs', {})
    ignore_attrs = requestdata.get('ignore_cols', [])
    dbname = qjson['db']
    x = qjson['x']
    ys = qjson['ys']

    obj = SharedObj(db, '', dbname=dbname, parsed=parsed)
    obj.dbname = dbname
    obj.C = 0.2
    obj.ignore_attrs = map(str, ignore_attrs )

    # fix aliases in select
    for nonagg in obj.parsed.select.nonaggs:
      nonagg.alias = x['alias']
    for agg in obj.parsed.select.aggs:
      y = [y for y in ys if y['expr'] == agg.expr][0]
      agg.alias = y['alias']


    xtype = db_type(db, tablename, x['col'])

    errors = []
    for agg in obj.parsed.select.aggregates:
      alias = agg.shortname
      if alias not in badsel:
        continue

      badpts = badsel.get(alias, [])
      badkeys = map(lambda pt: pt['x'], badpts)
      badkeys = extract_agg_vals(badkeys, xtype)
      goodpts = goodsel.get(alias, [])
      goodkeys = map(lambda pt: pt['x'], goodpts)
      goodkeys = extract_agg_vals(goodkeys, xtype)
      errtype = errtypes[alias]
      print "errtype", errtype
      erreq = []
      if errtype == 1:
        erreq = erreqs[alias]
        print "erreq", erreq

      err = AggErr(agg, badkeys, 20, errtype, {'erreq': erreq})
      obj.goodkeys[alias] = goodkeys
      errors.append(err)

    obj.errors = errors
    print obj.errors[0]

    obj.status = Status(requestid)
    print "status requid = ", requestid

    start = time.time()
    parallel_debug(
      obj,
      nprocesses=4,
      parallelize=False,
      nstds=0,
      errperc=0.001,
      epsilon=0.008,
      msethreshold=0.15,
      c=obj.c,
      complexity_multiplier=4.5,
      l=0.6,
      max_wait=20,
      use_cache=False,
      granularity=10,
      ignore_attrs=obj.ignore_attrs,
      DEBUG=False
    )
    cost = time.time() - start
    print "end to end took %.4f" % cost


    obj.update_status('serializing results')
    context['results'] = create_scorpion_results(obj)

    obj.update_status('done!')

  except Exception as e:
    traceback.print_exc()
    context['error'] = str(e)
  finally:
    try:
      obj.status.close()
    except:
      pass


  return context

def create_scorpion_results(obj):
  """
  Given the resulting rule clusters, package them into renderable
  JSON objects
  """
  from scorpion.learners.cn2sd.rule import rule_to_json
  results = []
  nrules = 6 
  for yalias, rules in obj.rules.items():
    for rule in rules:
      result = rule_to_json(rule, yalias=yalias)
      results.append(result)
  return results
