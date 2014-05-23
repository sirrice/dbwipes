// CSTatView
define(function(require) {
  var Handlebars = require('handlebars'),
      Backbone = require('backbone'),
      d3 = require('d3'),
      $ = require('jquery'),
      util = require('summary/util');


  return Backbone.View.extend({

    template: Handlebars.compile($("#foo-template").html()),

    initialize: function() {
      this.state = {
        xscales: null,
        yscales: null,
        xaxis: null,
        yaxis: null,
        series: null,
        w: 350,
        h: 50,
        lp: 70,
        marktype: 'rect'
      }
    },

    render: function() {
      this.$el.html(this.template(this.model.toJSON()));
      this.renderPlot(this.$('svg'));
      this.listenTo(this.model, 'setSelection', this.setSelection)
      return this;
    },

    setupScales: function() {
      var xdomain = this.model.get('xdomain'),
          ydomain = this.model.get('ydomain'),
          type = this.model.get('type');
      this.state.xscales = this.makeScales('x', xdomain, [0, this.state.w], type);
      this.state.yscales = this.makeScales('y', ydomain, [this.state.h, 5], 'num');


      // create axes
      this.state.xaxis = d3.svg.axis()
        .scale(this.state.xscales)
        .orient('bottom');
      this.state.yaxis = d3.svg.axis()
        .scale(this.state.yscales)
        .orient('left');

      var nticks = util.estNumXTicks(
          this.state.xaxis, 
          this.model.get('type'), 
          this.state.w
      );
      util.setAxisLabels(this.state.xaxis, this.model.get('type'), nticks);
      this.state.yaxis.ticks(2).tickSize(0,0);
    },

    makeScales: function(scaletype, domain, range, type) {
      var scales = d3.scale.linear();
      if (util.isTime(type)) 
        scales = d3.time.scale();
      else if (util.isStr(type)) 
        scales = d3.scale.ordinal();
      
      if (scaletype == 'y' && util.isNum(type)) {
        if (domain[1] > Math.max(1,domain[0]) * 100)  {
          scales = d3.scale.log()
          domain[0] = Math.max(domain[0], 1);
        }
      }

      scales.domain(domain).range(range);
      if (util.isStr(type))
        scales.rangeRoundBands(range, 0.1);
      return scales;
    },


    renderAxes: function(el) {
      el.append('g')
        .attr('class', 'axis x xaxis')
        .attr('transform', "translate(0,"+this.state.h+")")
        .call(this.state.xaxis)

      el.append('g')
        .attr('class', 'axis y yaxis')
        .call(this.state.yaxis)
    },


    renderData: function(el) {
      var col = this.model.get('col'),
          type = this.model.get('type'),
          stats = this.model.get('stats'),
          xscales = this.state.xscales,
          yscales = this.state.yscales,
          h = this.state.h

      if (util.isStr(type)) {
        el.selectAll('rect')
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
        var xs =_.pluck(stats, 'val');

        //if (xs.length == 0) return;

        xs = _.uniq(_.map(xs, xscales));
        xs.push.apply(xs, xscales.range());
        xs.sort();
        var intervals = _.times(xs.length-1, function(idx) { return xs[idx+1] - xs[idx]});
        var width = null;
        if (intervals.length)
          width = d3.min(intervals)
        if (!width)
          width = 10;
        width = Math.max(2, width)
        var minv = xscales.invert(d3.min(xs) - Math.max(5, width)),
            maxv = xscales.invert(d3.max(xs) + Math.max(5, width));
        xscales.domain([minv, maxv]);

        if (!_.isNaN(xscales.domain()[0]) && col == 'light'){
          var args = [this.model.get('col'), type,  stats.length, stats[0]];
          args.push('xscale')
          args.push.apply(args, xscales.domain());
          args.push('->')
          args.push.apply(args, xscales.range());
          args.push('yscale')
          args.push.apply(args, yscales.domain());
          args.push('->')
          args.push.apply(args, yscales.range());
          console.log(args);
        }


        el.selectAll('rect')
            .data(stats)
          .enter().append('rect')
            .attr({
              class: 'mark',
              width: width,
              height: function(d) {return h-yscales(d.count)},
              x: function(d) {return xscales(d.val) - width/2},
              y: function(d) { return yscales(d.count)}
            })
      } 


    },

    // when scorpion results set the selection...
    setSelection: function(clause) {
      function withinClause(clause, val) {
        if (clause == null) return false;
        if (util.isStr(clause.type)) {
          return _.contains(clause.vals, val);
        } else {
          return clause.vals[0] <= val && val <= clause.vals[1];
        }
      };

      this.d3brush.extent([]);
      this.d3brush.clear();
      if (clause) {
        if (!util.isStr(clause.type)) {
          console.log(['setextent to', clause.col, clause.vals]);
          var extent = [
            Math.max(clause.vals[0], this.state.xscales.domain()[0]),
            Math.min(clause.vals[1], this.state.xscales.domain()[1])
          ];
          this.d3brush.extent(extent);
        }
      }
      this.d3brush(this.d3gbrush);

      if (clause) {
        this.d3svg.selectAll('.mark')
          .classed('selected', false)
          .classed('highlighted', function(d) {
            return withinClause(clause, d.val);
          })
          .classed('faded', function(d) {
            return !withinClause(clause, d.val);
          })
      } else {
        this.d3svg.selectAll('.mark')
          .classed('selected', false)
          .classed('highlighted', false)
          .classed('faded', false)
      }

    },


    renderBrushes: function(el) {
      var xscales = this.state.xscales,
          h = this.state.h,
          type = this.model.get('type'),
          _this = this;
      var within = function(d, e) {
        if (e[0] == e[1]) return false;
        if (type == 'str') {
          var bmin = xscales(d.val) + xscales.rangeBand()/4,
              bmax = xscales(d.val) + 3*xscales.rangeBand()/4;
          var b = !(e[1] < bmin || bmax < e[0]);
        } else {
          var b = e[0] <= d.val && e[1] >= d.val;
        }
        return b;
      };

      var brushf = function(p) {
        var e = brush.extent()
        var selected = [];
        el.selectAll('.mark')
          .classed('highlighted', false)
          .classed('selected', function(d){ return within(d, e); })
          .each(function(d) { if (within(d, e)) selected.push(d); })
        if (d3.event.type == 'brushend') {
          _this.model.set('selection', selected);
        }
      }

      var brush = d3.svg.brush()
          .x(xscales)
          .on('brush', brushf)
          .on('brushend', brushf)
          .on('brushstart', brushf);
      var gbrush = el.append('g')
          .attr('class', 'brush')
          .call(brush);
      gbrush.selectAll('rect')
          .attr('height', h)

      this.d3brush = brush;
      this.d3gbrush = gbrush;

    },

    renderZoom: function(el) {
      if (util.isStr(this.model.get('type'))) {
        // sorry, don't support discrete zooming...
        return;
      }
      var _this = this,
          xscales = this.state.xscales,
          xaxis = this.state.xaxis;

      var zoomf = function() {
        el.select('.axis.x').call(xaxis);
        el.selectAll('.mark') 
          .attr('x', function(d) {
            return xscales(d.val);
          })
          .style('display', function(d) {
            var x = xscales(d.val);
            var within = (x >= xscales.range()[0] && x <= xscales.range()[1]);
            return (within)? null : 'none';
          });
        
      }
      var nullf = function(){}

      var zoom = d3.behavior.zoom()
        .x(xscales)
        .scaleExtent([1, 1000])
        .on('zoom', zoomf)

      el.call(zoom)
        .on("mousedown.zoom", null)
        .on("touchstart.zoom", null)
        .on("touchmove.zoom", null)
        .on("touchend.zoom", null)
    },



    renderPlot: function(svg) {
      svg.empty();
      this.d3svg = d3.select(svg.get()[0]);
      var c = this.d3svg
          .attr('class', 'cstat-container')
          .attr('width', this.state.w+this.state.lp)
          .attr('height', this.state.h+15)
        .append('g')
          .attr('transform', "translate("+this.state.lp+", 0)")
          .attr('width', this.state.w)
          .attr('height', this.state.h)


      c.append('rect')
        .attr('width', this.state.w)
        .attr('height', this.state.h)
        .attr('fill', 'none')
        .attr('stroke', 'none')
        .style('pointer-events', 'all')

      var dc = c.append('g')
        .attr('class', "cstat data-container")

      this.setupScales();
      this.renderAxes(c);
      this.renderData(dc);
      this.renderBrushes(dc);
      this.renderZoom(c);


    }
  });
});

