define(function(require) {
  var Backbone = require('backbone'),
      $ = require('jquery'),
      d3 = require('d3'),
      _ = require('underscore'),
      Where = require('summary/where');


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
          xcol = this.model.get('x').col,
          ycols = _.pluck(this.model.get('ys'), 'col')
          _this = this;
      var xs = _.pluck(data, xcol),
          yss = _.map(ycols, function(ycol) { return _.pluck(data, ycol) });

      console.log("setup scales")
      console.log(this.state.xdomain)

      this.state.cscales.domain(_.compact(_.union(this.state.cscales.domain(), ycols)));

      if (this.model.get('type') == 'str') {
        if (this.state.xdomain == null) this.state.xdomain = [];
        this.state.xdomain = _.union(this.state.xdomain, _.uniq(xs));
      } else {
        if (this.state.xdomain == null) this.state.xdomain = [Infinity, -Infinity];
        this.state.xdomain[0] = Math.min(this.state.xdomain[0], d3.min(xs));
        this.state.xdomain[1] = Math.max(this.state.xdomain[1], d3.max(xs));
      }

      _.each(yss, function(ys) {
        if (this.state.ydomain == null) this.state.ydomain = [Infinity, -Infinity];
        this.state.ydomain[0] = Math.min(this.state.ydomain[0], d3.min(ys));
        this.state.ydomain[1] = Math.max(this.state.ydomain[1], d3.max(ys));
      }, this);

      if (this.state.xscales == null) {
        var xtype = schema[xcol];
        var xscales = d3.scale.linear();
        if (_.contains(['time', 'timestamp', 'date'], xtype)) {
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
      }
      if (!this.state.yaxis) {
        this.state.yaxis = d3.svg.axis()
          .scale(this.state.yscales)
          .tickSize(0,0)
          .orient('left');
      }


      console.log(this.state.xdomain)

    },

    renderAxes: function(el) {
      el.append('g')
        .attr('class', 'axis x')
        .attr('transform', "translate(0,"+this.state.h+")")
        .call(this.state.xaxis)

      el.append('g')
        .attr('class', 'axis y')
        .call(this.state.yaxis)
    },

    renderData: function(el, xcol, ycol) {
      var data = _.map(this.model.get('data'), function(d) {
        return {
          x: d[xcol],
          y: d[ycol]
        }
      });
      console.log(this.model.get('schema')['hr']);
      console.log(this.state.xscales.domain())
      console.log(this.state.xscales.range())
      var _this = this;
      var dc = el.append('g')
        .attr('class', 'data-container')
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
    },

    renderBrush: function(el) {
      var type = this.model.get('type');
      var brushf = function(p) {
        var e = brush.extent()
        var selected = {};
        el.selectAll('.mark')
          .classed('selected', function(d){
            if (type == 'str') {
              var b = e[0][0] <= xscales(d.x) && e[1][0] >= xscales(d.x);
            } else {
              var b = e[0][0] <= d.x && e[1][0] >= d.x;
            }
            b = b && (e[0][1] <= d.y && e[1][1] > d.y);

            if (b) {
              selected[d.x] = d;
            }
            return b;
          })
        if (d3.event.type == 'brushend') {
          console.log(selected)
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


    render: function() {
      if (!this.model.get('data'))  {
        console.log("no data, queryview not rendering");
        return this;
      }
      console.log("data:")
      console.log(this.model.get('data')[0])



      this.$el.empty();
      var svg = d3.select(this.el).append("svg")
          .attr('class', 'container')
          .attr('width', this.state.w + 40)
          .attr('height', this.state.h + 20);
      var c = svg.append('g')
          .attr('transform', "translate(40, 0)");

      this.setupScales()
      this.renderAxes(c)
      _.each(this.model.get('ys'), function(ycol) {
        this.renderData(c, this.model.get('x').col, ycol.col);
      }, this)
      this.renderBrush(c)
      return this;

    }

  });

  return QueryView;
})
