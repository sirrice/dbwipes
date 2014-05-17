define(function(require) {
  var Backbone = require('backbone'),
      $ = require('jquery'),
      d3 = require('d3'),
      _ = require('underscore'),
      Where = require('summary/where'),
      util = require('summary/util');


  // TODO: connect to server to query and fetch data
  //       connect with Where object
  var QueryView = Backbone.View.extend({
    initialize: function() {
      this.state = {
        xdomain: null,
        ydomain: null,
        xscales: null,
        yscales: null,
        cscales: d3.scale.category10(),
        xaxis: null,
        yaxis: null,
        series: null,
        w: 500,
        h: 400,
        marktype: 'circle'
      };

      this.listenTo(this.model, 'change', this.render);
    },

    setupScales: function() {
      var data = this.model.get('data'),
          schema = this.model.get('schema'),
          type = this.model.get('type'),
          xcol = this.model.get('x').col,
          ycols = _.pluck(this.model.get('ys'), 'alias'),
          _this = this;
      var xs = _.pluck(data, xcol),
          yss = _.map(ycols, function(ycol) { return _.pluck(data, ycol) });
      console.log(yss)


      this.state.cscales.domain(_.compact(_.union(this.state.cscales.domain(), ycols)));

      if (util.isStr(type)) {
        if (this.state.xdomain == null) this.state.xdomain = [];
        this.state.xdomain = _.union(this.state.xdomain, _.uniq(xs));
      } else {
        if (this.state.xdomain == null) this.state.xdomain = [Infinity, -Infinity];
        if (xs.length) {
          this.state.xdomain[0] = Math.min(this.state.xdomain[0], d3.min(xs));
          this.state.xdomain[1] = Math.max(this.state.xdomain[1], d3.max(xs));
        }
      }

      _.each(yss, function(ys) {
        if (this.state.ydomain == null) this.state.ydomain = [Infinity, -Infinity];
        ys = _.filter(ys, _.isFinite);
        if (ys.length) {
          this.state.ydomain[0] = Math.min(this.state.ydomain[0], d3.min(ys));
          this.state.ydomain[1] = Math.max(this.state.ydomain[1], d3.max(ys));
        }
      }, this);

      if (this.state.xscales == null) {
        var xtype = schema[xcol];
        var xscales = d3.scale.linear();
        if (util.isTime(xtype)) {
          xscales = d3.time.scale();
        }
        xscales.range([0, this.state.w]);

        if (xtype == 'str') {
          xscales = d3.scale.ordinal();
          xscales.rangeRoundBands([0, this.state.w], 0.1);
        }
        this.state.xscales = xscales;
      }
      this.state.xscales.domain(this.state.xdomain);

      if (this.state.yscales == null) {
        this.state.yscales = d3.scale.linear()
          .range([this.state.h, 5])
      }
      this.state.yscales.domain(this.state.ydomain);

      if (!this.state.xaxis) {
        this.state.xaxis = d3.svg.axis()
          .scale(this.state.xscales)
          .tickSize(0,0)
          .orient('bottom')
        var nticks = util.estNumXTicks(this.state.xaxis, type, this.state.w);
        util.setAxisLabels(this.state.xaxis, type, nticks);
      }
      if (!this.state.yaxis) {
        this.state.yaxis = d3.svg.axis()
          .scale(this.state.yscales)
          .tickSize(0,0)
          .orient('left');
      }

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

    renderData: function(el, xcol, ycol) {
      var data = _.map(this.model.get('data'), function(d) {
        return {
          x: d[xcol],
          y: d[ycol]
        }
      });

      var _this = this;
      var dc = el.append('g')
        .attr('class', 'data-container')
      if (this.state.marktype == 'circle') {
        dc.selectAll('circle')
            .data(data)
          .enter().append('circle')
            .attr({
              class: 'mark',
              cx: function(d) { return _this.state.xscales(d.x)},
              cy: function(d) { return _this.state.yscales(d.y)},
              r: 2,
              fill: this.state.cscales(ycol),
              stroke: this.state.cscales(ycol),
            })
      }
    },

    renderBrush: function(el) {
      var type = this.model.get('type');
      var brushf = function(p) {
        var e = brush.extent()
        var selected = [];
        el.selectAll('.mark')
          .classed('selected', function(d){
            if (type == 'str') {
              var b = e[0][0] <= xscales(d.x) && e[1][0] >= xscales(d.x);
            } else {
              var b = e[0][0] <= d.x && e[1][0] >= d.x;
            }
            b = b && (e[0][1] <= d.y && e[1][1] > d.y);

            if (b) selected.push(d)
            return b;
          })
        if (d3.event.type == 'brushend') {
          console.log(['selected', selected]);
        }
      }

      var brush = d3.svg.brush()
          .x(this.state.xscales)
          .y(this.state.yscales)
          .on('brush', brushf)
          .on('brushend', brushf)
          .on('brushstart', brushf)
      var gbrush = el.append('g')
          .attr('class', 'brush')
          .call(brush)
      gbrush.selectAll('rect')
          .attr('height', this.state.h)


    },

    renderZoom: function(el) {
      var _this = this;
      function zoomed() {
        el.select('.xaxis').call(_this.state.xaxis);
      };
      var zoom = d3.behavior.zoom()
        .x(this.state.xscales)
        .y(this.state.yscales)
        .scaleExtent([1, 5])
        .on('zoom', zoomed);

      zoom(el);
    },


    render: function() {
      if (!this.model.get('data'))  {
        console.log("no data, queryview not rendering");
        return this;
      }


      this.$el.empty();
      var svg = d3.select(this.el).append("svg")
          .attr('class', 'container')
          .attr('width', this.state.w + 40)
          .attr('height', this.state.h + 20);
      var c = svg.append('g')
          .attr('transform', "translate(40, 0)");
      
      c.append('rect')
        .attr('width', this.state.w)
        .attr('height', this.state.h)
        .attr('fill', 'none')
        .attr('stroke', 'none')
        .style('pointer-events', 'all')

      this.setupScales()
      this.renderAxes(c)
      _.each(this.model.get('ys'), function(ycol) {
        console.log(['renderData','ycol',ycol])
        this.renderData(c, this.model.get('x').col, ycol.alias);
      }, this)
      this.renderBrush(c)
      //this.renderZoom(c)
      return this;

    }

  });

  return QueryView;
})
