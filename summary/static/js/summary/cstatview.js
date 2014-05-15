// CSTatView
define(function(require) {
  var Handlebars = require('handlebars'),
      Backbone = require('backbone'),
      d3 = require('d3'),
      $ = require('jquery');


  return Backbone.View.extend({
    events: {
    },

    template: Handlebars.compile($("#foo-template").html()),

    render: function() {
      this.$el.html(this.template(this.model.toJSON()));
      this.renderPlot(this.$('svg'));
      return this;
    },

    makeScales: function(domain, range, type) {
      var scales = d3.scale.linear();
      if (_.contains(['time', 'timestamp', 'date'], type)) {
        scales = d3.time.scale();
      } else if (type == 'str') {
        scales = d3.scale.ordinal();
      }

      scales.domain(domain).range(range);
      if (type == 'str')
        scales.rangeRoundBands(range, 0.1);
      return scales;
    },

    setXTicks: function(xaxis, type, w) {
      var xscales = xaxis.scale();
      var ex = 40.0/5;
      var xticks = 10;
      while(xticks > 1) {
        if (type == 'str') {
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
      xticks = Math.max(1, +xticks.toFixed())

      xaxis.ticks(xticks).tickSize(0,0);

      if (type == 'str') {
        var skip = xscales.domain().length / xticks;
        var idx = 0;
        var previdx = null;
        var tickvals = [];
        while (idx < xscales.domain().length) {
          if (previdx == null || Math.floor(idx) > previdx) {
            tickvals.push(xscales.domain()[Math.floor(idx)])
          }
          idx += skip;
        }
        xaxis.tickValues(tickvals);
      }
    },

    renderPlot: function(svg) {
      var stats = this.model.get('stats'),
          type = this.model.get('type'),
          _this = this;

      svg.empty();
      var d3svg = d3.select(svg.get()[0]);
      var w = 300,
          h = 30,
          xscales = this.makeScales(this.model.get('xdomain'), [0, w], type),
          yscales = this.makeScales(this.model.get('ydomain'), [h, 5], 'num'),
          xaxis = d3.svg.axis().scale(xscales).orient('bottom'),
          yaxis = d3.svg.axis().scale(yscales).orient('left');

      this.setXTicks(xaxis, type, w);
      yaxis.ticks(2).tickSize(0,0);

      var c = d3svg
          .attr({
            class: "container",
            width: w+40,
            height: h+20,
          })
        .append('g')
          .attr('transform', "translate(20, 0)")

      c.append('g')
        .attr('class', 'axis x')
        .attr('transform', "translate(0,"+(h)+")")
        .call(xaxis)

      c.append('g')
        .attr('class', 'axis y')
        .call(yaxis)

      var dc = c.append('g')
        .attr('class', "data-container")

      if (type != 'str') {
        dc.selectAll("circle")
            .data(stats)
          .enter().append('circle')
            .attr({
              class: 'mark',
              cx: function(d) {return xscales(d.val);},
              cy: function(d) {return yscales(d.count);},
              r: 2
            })
      } else {
        dc.selectAll('rect')
            .data(stats)
          .enter().append('rect')
            .attr({
              class: 'mark',
              width: xscales.rangeBand(),
              height: function(d) {return yscales(d.count)},
              x: function(d) {return xscales(d.val)},
              y: function(d) { return h-yscales(d.count)}
            })
      }

      var brushf = function(p) {
        var e = brush.extent()
        var selected = {};
        dc.selectAll('.mark')
          .classed('selected', function(d){
            if (type == 'str') {
              var b = e[0] <= xscales(d.val) && e[1] >= xscales(d.val);
            } else {
              var b = e[0] <= d.val && e[1] >= d.val;
            }
            if (b) {
              selected[d.val] = d.range;
            }
            return b;
          })
        if (d3.event.type == 'brushend') {
          _this.model.set('selection', selected);
          console.log(where.toSQL())
        }
      }

      var brush = d3.svg.brush()
          .x(xscales)
          .on('brush', brushf)
          .on('brushend', brushf)
          .on('brushstart', brushf)
      var gbrush = dc.append('g')
          .attr('class', 'brush')
          .call(brush)
      gbrush.selectAll('rect')
          .attr('height', h)


    }
  });
});

