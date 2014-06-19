#
# this file has no deps on Scorpion
#
import json


# JSON Encoder
class SummaryEncoder(json.JSONEncoder):
  def default(self, o):
    if isinstance(o, float):
      if o == float('inf'):
        return 1e100
      elif o == float('-inf'):
        return -1e100

    if hasattr(o, 'isoformat'):
      s =  o.isoformat()
      if not s.endswith("Z"):
        s += 'Z'
      return s
    return super(SummaryEncoder, self).default(o)




def where_to_sql(where_json, negate=False):
  is_type = lambda s, types: any([t in s for t in types])
  l = []
  args = []
  for clause_json in where_json:
    if 'sql' in clause_json:
      l.append(clause_json['sql'])
      continue

    ctype = clause_json['type']
    col = clause_json['col']
    vals = clause_json['vals']


    if not vals: continue

    if is_type(ctype, ['num', 'int', 'float', 'double', 'date', 'time']):
      q = "%%s <= %s and %s < %%s" % (col, col)
      args.extend(vals)
    else:
      tmp = []
      vals = list(vals)
      if None in vals:
        tmp.append("(%s is null)" % col)

      realvals = list(filter(lambda v: v is not None, vals))
      if len(realvals) == 1:
        tmp.append("(%s = %%s)" % col)
        args.append(realvals[0])
      elif len(realvals):
        tmp.append("(%s in %%s)" % col)
        args.append(tuple(list(realvals)))
      q = ' or '.join(tmp)

    l.append(q)

  q = ' and '.join(filter(bool, l))
  if negate and q:
    q = "not(%s)" % q
  return q, args



