define(function(require) {
  var Backbone = require('backbone'),
      Handlebars = require('handlebars'),
      $ = require('jquery'),
      d3 = require('d3'),
      _ = require('underscore'),
      Where = require('summary/where'),
      util = require('summary/util'),
      DrawingView = require('summary/drawingview'),
      QueryForm = require('summary/queryform');





  var QueryView = Backbone.View.extend({
    errtemplate: Handlebars.compile($("#q-err-template").html()),

    defaults: function() {
      return {
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
        lp: 60,
        tp: 20,
        bp: 15,
        marktype: 'circle'
      };
    },



    initialize: function() {
      this.state = this.defaults();


      this.$svg = $("<svg id='viz'></svg>").prependTo(this.$el);
      this.svg = this.$svg.get()[0];
      this.d3svg = d3.select(this.svg);
      this.d3svg
        .attr('class', 'viz-container')
        .attr('width', this.state.w + this.state.lp)
        .attr('height', this.state.h + this.state.tp + this.state.bp);
      this.c = this.d3svg.append('g')
          .classed("plot-container", true)
          .attr('transform', "translate("+this.state.lp+", 0)");
      this.c.append('rect')
        .attr('width', this.state.w)
        .attr('height', this.state.h)
        .attr('fill', 'none')
        .attr('stroke', 'none')
        .style('pointer-events', 'all')



      this.queryform = new QueryForm({model: this.model});
      this.listenTo(this.queryform, 'submit', this.resetState.bind(this));
      this.$el.append(this.queryform.render().el)


      this.$toggle = $("#q-toggle")
        .addClass("btn btn-primary")
        .css("margin-left", this.state.lp)
        .click((function() {
          this.queryform.render().$el.toggle();
          this.$('.legend').toggle();
          this.$svg.toggle();
        }).bind(this));
          

      this.listenTo(this.model, 'change:db', this.resetState);
      this.listenTo(this.model, 'change:table', this.resetState);
      this.listenTo(this.model, 'change:data', this.render);
    },

    resetState: function() {
      this.state = this.defaults();
      this.trigger("resetState");
    },

    onChange: function() {
      return;
      this.model.get('where').fetch({
        data: {
          db: this.model.get('db'),
          table: this.model.get('table'),
          nbuckets: 500
        }
      });
    },

    setupScales: function() {
      var data = this.model.get('data'),
          schema = this.model.get('schema'),
          xcol = this.model.get('x').alias,
          ycols = _.pluck(this.model.get('ys'), 'alias'),
          type = schema[this.model.get('x').col],
          _this = this;
      var xs = _.pluck(data, xcol),
          yss = _.map(ycols, function(ycol) { return _.pluck(data, ycol) });
      console.log(yss)

      var newCDomain = _.compact(_.union(this.state.cscales.domain(), ycols));
      this.state.cscales.domain(newCDomain);

      var getx = function(d) { return d[xcol]; };
      var xdomain = util.getXDomain(data, type, getx);
      this.state.xdomain = util.mergeDomain(this.state.xdomain, xdomain, type);

      /*
      if (util.isStr(type)) {
        if (this.state.xdomain == null) this.state.xdomain = [];
        this.state.xdomain = _.union(this.state.xdomain, _.uniq(xs));
      } else {
        if (this.state.xdomain == null) 
          this.state.xdomain = [Infinity, -Infinity];

        xs = _.filter(_.compact(xs), _.isFinit)
        if (xs.length) {
          this.state.xdomain[0] = d3.min([this.state.xdomain[0], d3.min(xs)]);
          this.state.xdomain[1] = d3.max([this.state.xdomain[1], d3.max(xs)]);
        }
      }
      */

      _.each(yss, function(ys) {
        if (this.state.ydomain == null) this.state.ydomain = [Infinity, -Infinity];
        ys = _.filter(ys, _.isFinite);
        if (ys.length) {
          this.state.ydomain[0] = Math.min(this.state.ydomain[0], d3.min(ys));
          this.state.ydomain[1] = Math.max(this.state.ydomain[1], d3.max(ys));
        }
      }, this);

      if (this.state.xscales == null) {
        var xscales = d3.scale.linear();
        if (util.isTime(type)) {
          xscales = d3.time.scale();
        }
        xscales.range([0, this.state.w]);

        if (util.isStr(type)) {
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

      el.append('g')
        .attr('transform', 'translate('+(this.state.w/2)+','+(this.state.h+25)+')')
        .append('text')
        .data([1])
        .text(this.model.get('x')['expr'])
    },

    renderData: function(el, xalias, yalias) {
      var _this = this;
      var data = _.map(this.model.get('data'), function(d) {
        var ret = {
          x: d[xalias],
          y: d[yalias],
          px: _this.state.xscales(d[xalias]),
          py: _this.state.yscales(d[yalias])
        };
        ret[xalias] = d[xalias];
        ret[yalias] = d[yalias];
        return ret
      });

      var dc = el.append('g')
        .attr('class', 'data-container')
      if (this.state.marktype == 'circle') {
        dc.selectAll('circle')
            .data(data)
          .enter().append('circle')
            .attr({
              class: 'mark',
              cx: function(d) { return d.px },
              cy: function(d) { return d.py },
              r: 2,
              fill: this.state.cscales(yalias),
              stroke: this.state.cscales(yalias),
              yalias: yalias
            })
      }
    },

    renderBrush: function(el) {
      var type = this.model.get('type'),
          _this = this;
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
              var yalias = d3.select(this).attr('yalias')
              if (!selected[yalias]) selected[yalias] = [];
              selected[yalias].push(d);
            }
            return b;
          })
        if (d3.event.type == 'brushend') {
          _this.trigger('change:selection', selected);
        }
      }

      var brush = d3.svg.brush()
          .x(this.state.xscales)
          .y(this.state.yscales)
          .on('brush', brushf)
          .on('brushend', brushf)
          .on('brushstart', brushf)
      var gbrush = this.gbrush = el.append('g')
          .attr('class', 'brush')
          .call(brush)
      gbrush.selectAll('rect')
          .attr('height', this.state.h)
    },

    disableBrush: function() {
      if (this.gbrush)
        this.gbrush.style("pointer-events", null);
    },
    enableBrush: function() {
      if (this.gbrush)
        this.gbrush.style("pointer-events", 'all');
    },

    brushStatus: function() {
      if (this.gbrush)
        return this.gbrush.style("pointer-events");
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

    renderLabels: function() {
      var ys = this.model.get('ys'),
          cscales = this.state.cscales;

      this.$('.legend').remove();
      d3.select(this.el).append("div")
          .attr('class', 'legend')
          .style("margin-left", this.state.lp)
        .selectAll("span")
          .data(ys)
        .enter().append("span")
          .text(function(d) { console.log("yo"); return d.alias; })
          .style("background", function(d) { return cscales(d.alias); });
    },

    toggleBrushDrawing: function() {
      if (!this.dv) {
        this.enableBrush();
        return;
      }

      if (this.dv.status() == 'all') {
        this.dv.disable();
        this.enableBrush();
      } else {
        this.dv.enable();
        this.disableBrush();
      }
    },


    render: function() {
      if (!this.model.isValid()) {
        this.queryform.render().$el.show()
        this.$svg.hide();
        return this;
      }
      this.$svg.show();
      this.queryform.$el.hide();


      $(this.c[0]).empty()

      this.setupScales()
      this.renderAxes(this.c)
      _.each(this.model.get('ys'), function(ycol) {
        this.renderData(this.c, this.model.get('x').alias, ycol.alias);
      }, this);
      this.renderBrush(this.c);
      this.renderLabels(this.c);

      this.dv = new DrawingView({state: this.state});
      this.listenTo(this.dv, "change:drawing", (function() {
        this.trigger('change:drawing', this.dv.model);
      }).bind(this))
      $(this.c[0]).append(this.dv.render().$("g"));
      this.dv.disable();
      this.enableBrush();


      return this;
    }

  });

  return QueryView;
})
