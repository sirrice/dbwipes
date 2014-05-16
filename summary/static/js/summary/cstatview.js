// CSTatView
define(function(require) {
  var Handlebars = require('handlebars'),
      Backbone = require('backbone'),
      d3 = require('d3'),
      $ = require('jquery'),
      util = require('summary/util');


  return Backbone.View.extend({

    template: Handlebars.compile($("#foo-template").html()),

    render: function() {
      console.log(this.model.toJSON());
      this.$el.html(this.template(this.model.toJSON()));
      this.renderPlot(this.$('svg'));
      return this;
    },

    makeScales: function(domain, range, type) {
      var scales = d3.scale.linear();
      if (util.isTime(type)) 
        scales = d3.time.scale();
      else if (util.isStr(type)) 
        scales = d3.scale.ordinal();

      scales.domain(domain).range(range);
      if (util.isStr(type))
        scales.rangeRoundBands(range, 0.1);
      return scales;
    },

    setXTicks: function(xaxis, type, w) {
      var nticks = util.estNumXTicks(xaxis, type, w);
      util.setAxisLabels(xaxis, type, nticks);
    },

    renderPlot: function(svg) {
      var stats = this.model.get('stats'),
          type = this.model.get('type'),
          _this = this;

      svg.empty();
      var d3svg = d3.select(svg.get()[0]),
          w = 300,
          h = 30,
          xscales = this.makeScales(this.model.get('xdomain'), [0, w], type),
          yscales = this.makeScales(this.model.get('ydomain'), [h, 5], 'num'),
          xaxis = d3.svg.axis().scale(xscales).orient('bottom'),
          yaxis = d3.svg.axis().scale(yscales).orient('left');

      this.setXTicks(xaxis, type, w);
      yaxis.ticks(2).tickSize(0,0);

      var c = d3svg
          .attr('class', 'container')
          .attr('width', w+60)
          .attr('height', h+20)
        .append('g')
          .attr('transform', "translate(60, 0)")

      c.append('g')
        .attr('class', 'axis x')
        .attr('transform', "translate(0,"+h+")")
        .call(xaxis)

      c.append('g')
        .attr('class', 'axis y')
        .call(yaxis)

      var dc = c.append('g')
        .attr('class', "data-container")

      if (util.isStr(type)) {
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
      } else {
        dc.selectAll('rect')
            .data(stats)
          .enter().append('rect')
            .attr({
              class: 'mark',
              width: 4,
              height: function(d) {return yscales(d.count)},
              x: function(d) {return xscales(d.val) - 2},
              y: function(d) { return h-yscales(d.count)}
            })

        /*
        dc.selectAll("circle")
            .data(stats)
          .enter().append('circle')
            .attr({
              class: 'mark',
              cx: function(d) {return xscales(d.val);},
              cy: function(d) {return yscales(d.count);},
              r: 2
            })
            */
      } 

      var brushf = function(p) {
        var e = brush.extent()
        var selected = [];
        dc.selectAll('.mark')
          .classed('selected', function(d){
            if (type == 'str') {
              var b = e[0] <= xscales(d.val) && e[1] >= xscales(d.val);
            } else {
              var b = e[0] <= d.val && e[1] >= d.val;
            }
            if (b) selected.push(d);
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

