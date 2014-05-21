define(function(require) {
  var _ = require('underscore'),
      d3 = require('d3');
  function isTime(type) {
    return _.contains(['time', 'timestamp', 'date'], type);
  }
  function isNum(type) {
    return _.contains(['num', 'int4', 'int', 'int8', 'float8', 'float', 'bigint'], type);
  }
  function isStr(type) {
    return _.contains(['varchar', 'text', 'str'], type);
  }


  function estNumXTicks(xaxis, type, w) {
    var xscales = xaxis.scale();
    var ex = 40.0/5;
    var xticks = 10;
    while(xticks > 1) {
      if (isStr(type)) {
        var nchars = d3.sum(_.times(
          Math.min(xticks, xscales.domain().length),
          function(idx){return (""+xscales.domain()[idx]).length+1.5})
        )
      } else {
        var fmt = xscales.tickFormat();
        var nchars = d3.sum(xscales.ticks(xticks), function(s) {return fmt(s).length+1.5;});
      }
      if (ex*nchars < w) break;
      xticks--;
    }
    xticks = Math.max(1, +xticks.toFixed());
    return xticks;
  }

  function setAxisLabels(axis, type, nticks) {
    var scales = axis.scale();

    axis.ticks(nticks).tickSize(0,0);

    if (isStr(type)) {
      var skip = scales.domain().length / nticks;
      var idx = 0;
      var previdx = null;
      var tickvals = [];
      while (idx < scales.domain().length) {
        if (previdx == null || Math.floor(idx) > previdx) {
          tickvals.push(scales.domain()[Math.floor(idx)])
        }
        idx += skip;
      }
      axis.tickValues(tickvals);
    } 
    return axis;

  }


  function toWhereClause(col, type, vals) {
    if (!vals || vals.length == 0) return null;
    var SQL = null;
    var re = new RegExp("'", "gi");
    if (isStr(type)) {
        SQL = [];
        if (_.contains(vals, null)) {
          SQL.push(col + " is null");
        }

        var nonnulls = _.compact(vals);
        if (nonnulls.length == 1) {
          var v = nonnulls[0];
          if (_.isString(v)) 
            v = "'" + v.replace(re, "\\'") + "'";
          SQL.push(col + " = " + v);
        } else if (nonnulls.length > 1) {
          vals = _.map(nonnulls, function(v) {
            if (_.isString(v)) 
              return "'" + v.replace(re, "\\'") + "'";
            return v;
          });
          SQL.push(col + " in ("+vals.join(',')+")");
        }

        SQL = (SQL.length)? SQL.join(' and ') : null;
    } else {
      if (isTime(type)) {
        var val2s = function(v) { return "'" + (new Date(v)).toISOString() + "'"; }
        vals = _.map(vals, function(v) { return new Date(v)});
      } else {
        var val2s = function(v) { return +v };
      }

      if (vals.length == 1) {
        SQL = col + " = " + val2s(vals[0]);
      } else {
        SQL = [
          val2s(d3.min(vals)) + " <= " + col,
          col + " <= " + val2s(d3.max(vals))
        ].join(' and ');
      }
    }
    return SQL;

  }


  return {
    isTime: isTime,
    isNum: isNum,
    isStr: isStr,
    estNumXTicks: estNumXTicks,
    setAxisLabels: setAxisLabels,
    toWhereClause: toWhereClause
  }
})


