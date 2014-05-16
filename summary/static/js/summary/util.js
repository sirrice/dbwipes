define(function(require) {
  var _ = require('underscore'),
      d3 = require('d3');
  function isTime(type) {
    return _.contains(['time', 'timestamp', 'date'], type);
  }
  function isNum(type) {
    return _.contains(['int4', 'int', 'int8', 'float8', 'float', 'bigint'], type);
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

  return {
    isTime: isTime,
    isNum: isNum,
    isStr: isStr,
    estNumXTicks: estNumXTicks,
    setAxisLabels: setAxisLabels
  }
})


