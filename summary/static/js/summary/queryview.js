define(function(require) {
  var Backbone = require('backbone'),
      Handlebars = require('handlebars'),
      $ = require('jquery'),
      d3 = require('d3'),
      _ = require('underscore'),
      Where = require('summary/where'),
      util = require('summary/util'),
      DrawingView = require('summary/drawingview'),
      QueryForm = require('summary/queryform'),
      Query = require('summary/query');





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
        ip: 5,  // data-container inner padding
        marktype: 'circle'
      };
    },



    initialize: function() {
      this.state = this.defaults();

      this.$el
        .css("padding", "1em")
        .css("padding-bottom", "1.5em")
        .css("box-shadow", "grey 0px 3px 2px -1px")
        .css("background", "white")
        .attr('id', 'queryview-container');

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
        .click(this.toggleQueryForm.bind(this));

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
    },

    showQueryForm: function() {
      this.$toggle.text("Show Visualization");
      this.queryform.render().$el.show();
      this.$('.legend').hide();
      this.$svg.hide();
    },

    hideQueryForm: function() {
      this.$toggle.text("Show Query Form");
      this.queryform.render().$el.hide();
      this.$('.legend').show();
      this.$svg.show();
    },

    toggleQueryForm: function() {
      if (this.queryform.render().$el.css('display') == 'none') {
        this.showQueryForm();
      } else {
        this.hideQueryForm();
      }
    },

    // persistently update scales information
    setupScales: function(data) {
      var schema = this.model.get('schema'),
          xcol = this.model.get('x'),
          xalias = xcol.alias,
          ycols = this.model.get('ys'),
          yaliases = _.pluck(ycols, 'alias'),
          type = schema[xcol.col],
          _this = this,
          ip = this.state.ip,
          xs = _.pluck(data, xalias),
          yss = _.map(yaliases, function(yalias) { return _.pluck(data, yalias) }), 
          newCDomain = _.compact(_.union(this.state.cscales.domain(), yaliases)),
          prevxdomain = this.state.xdomain,
          prevydomain = this.state.ydomain,
          getx = function(d) { return d[xalias]; },
          xdomain = util.getXDomain(data, type, getx),
          ydomain = util.getYDomain(data, ycols);

      this.state.xdomain = util.mergeDomain(this.state.xdomain, xdomain, type);
      this.state.ydomain = util.mergeDomain(this.state.ydomain, ydomain, 'num');

      if (this.state.xscales == null) {
        var xscales = d3.scale.linear();
        if (util.isTime(type)) {
          xscales = d3.time.scale();
        }
        xscales.range([0+ip, this.state.w-ip]);

        if (util.isStr(type)) {
          xscales = d3.scale.ordinal();
          xscales.rangeRoundBands([0+ip, this.state.w-ip], 0.1);
        }
        this.state.xscales = xscales;
      }
      if (this.state.yscales == null) {
        this.state.yscales = d3.scale.linear()
          .range([this.state.h-ip, 0+ip])
      }
      
      this.state.cscales.domain(newCDomain);
      this.state.xscales.domain(this.state.xdomain);
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
        if (this.state.ydomain[1] > 10000000) {
          this.state.yaxis.tickFormat(d3.format('.2e'))
        };
      }

    },

    renderAxes: function(el) {
      if(el.select('.xaxis').size() == 0) {
        var xel = el.append('g')
          .attr('class', 'axis x xaxis')
          .attr('transform', "translate(0,"+this.state.h+")");
        xel.append('rect')
          .attr('width', this.state.w)
          .attr('height', this.state.bp)
          .attr('fill', 'none')
          .attr('stroke', 'none')
          .style('pointer-events', 'all')
        xel.call(this.state.xaxis)
      } else {
        el.select('.axis.x').call(this.state.xaxis);
      }



      if (el.select('.yaxis').size() == 0) {
        var yel = el.append('g')
          .attr('class', 'axis y yaxis')
        yel.append('rect')
          .attr('width', this.state.lp)
          .attr('height', this.state.h)
          .attr('x', -this.state.lp)
          .attr('fill', 'none')
          .attr('stroke', 'none')
          .style('pointer-events', 'all')
        yel.call(this.state.yaxis)
      } else {
        el.select('.axis.y').call(this.state.yaxis);
      }



      if (el.select('.xaxis-label').size() == 0) {
        el.append('g')
          .classed('xaxis-label', true)
          .attr('transform', 'translate('+(this.state.w/2)+','+(this.state.h+25)+')')
          .append('text')
          .data([1])
          .text(this.model.get('x')['expr'])
      }
    },

    // set base plot to background and render
    // result with WHERE clause
    renderWhereOverlay: function(where) {
      if (!where || !where.length) {
        console.log(['qv.renderoverlay', 'canceloverlay']);
        this.cancelWhereOverlay();
        return;
      }
      if (_.isEqual(this.model.get('where'), where)) {
        console.log(['qv.renderoverlay', 'cached']);
        return;
      }

      this.overlayquery = query = new Query(this.model.toJSON());
      query.set('where', where);
      console.log(['qv.renderoverlay', JSON.stringify(where), where, query])

      query.fetch({
        data: {
          json: JSON.stringify(query.toJSON()),
          db: query.get('db')
        },
        context: this,
        success: (function(model, resp, opts) {
          console.log(['qv.fetch', 'success', resp.data]);
          this.renderModifiedData(resp.data);
        }).bind(this)
      });
      return this;
    },

    cancelWhereOverlay: function() {
      this.renderModifiedData(null);
      this.overlayquery = null;
      return this;
    },

    // renders the actual overlay
    renderModifiedData: function(data) {
      var _this = this;
      this.$(".updated").remove();
      this.c.selectAll('g.data-container')
        .classed('background', false)


      // expand the y-axis domain if necessary
      // relying on setupScales/renderAxes is too extreme because
      // it computes the union of all domains seen so far
      if (this.yzoom) {
        var ydomain = this.state.ydomain;
        if (data) {
          ydomain = util.getYDomain(data, this.model.get('ys'))
          ydomain = util.mergeDomain(this.state.yscales.domain(), ydomain, 'num')
        }
        this.yzoom.y(this.state.yscales.domain(ydomain));
        this.yzoom.event(this.c);
      }

      if (!data) {
        return;
      }

      this.setupScales(data);
      this.render();
      
      this.c.selectAll('g.data-container')
        .classed('background', true)
      var xalias = this.model.get('x').alias;
      var el = this.c.append('g')
          .classed('updated', true)

      _.each(this.model.get('ys'), function(ycol) {
        this.renderData(el, data, xalias, ycol.alias);
      }, this);
    },

    renderData: function(el, data, xalias, yalias) {
      var _this = this,
          h = this.state.h,
          w = this.state.w;
      var data = _.map(data, function(d) {
        var ret = {
          x: d[xalias],
          y: d[yalias],
          px: _this.state.xscales(d[xalias]),
          py: _this.state.yscales(d[yalias]),
          yalias: yalias
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
            .classed('mark', true)
            .attr({
              cx: function(d) { return d.px },
              cy: function(d) { return d.py },
              r: 2,
              fill: this.state.cscales(yalias),
              stroke: this.state.cscales(yalias),
              opacity: function(d) {
                if (d.px >= 0 && d.px <= w &&
                    d.py >= 0 && d.py <= h)
                  return 1;
                return 0;
              }
            })
      }
    },

    renderBrush: function(el) {
      if (el.select('.brush').size() > 0) return;
      var type = this.model.get('schema')[this.model.get('x').col],
          _this = this,
          xscales = this.state.xscales,
          yscales = this.state.yscales,
          xr = 5,
          yr = Math.abs(yscales.invert(0)-yscales.invert(5));

      var brushf = function(p) {
        var e = brush.extent()
        var selected = {};
        el.selectAll('.data-container:not(.background)')
            .selectAll('.mark')
          .classed('selected', function(d){
            if (util.isNum(type) || util.isTime(type)) {
              var minx = xscales(e[0][0]),
                  maxx = xscales(e[1][0]),
                  x    = d.px;
            } else {
              var minx = e[0][0],
                  maxx = e[1][0],
                  x    = d.px;
            }

            var y = d.y,
                bx = minx <= x+xr && maxx >= x-xr,
                by = e[0][1] <= y+yr && e[1][1] >= y-yr;

            if (bx && by) {
              var yalias = d.yalias;
              if (!selected[yalias]) selected[yalias] = [];
              selected[yalias].push(d);
              return true;
            }
            return false;
          })
        if (d3.event.type == 'brushend') {
          _this.trigger('change:selection', selected);
        }
      }

      this.d3brush = brush = d3.svg.brush()
          .x(this.state.xscales)
          .y(this.state.yscales)
          .on('brush', brushf)
          .on('brushend', brushf)
          .on('brushstart', brushf)
      this.gbrush = gbrush = el.append('g')
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
      var _this = this
          yscales = this.state.yscales,
          yaxis = this.state.yaxis,
          xscales = this.state.xscales,
          xaxis = this.state.xaxis;

      function yzoomf() {
        el.select('.axis.y').call(yaxis);
        el.selectAll('.mark')
          .attr('cy', function(d) {
            return yscales(d.y);
          })
          .style('opacity', function(d) {
            if (yscales.range()[0] >= yscales(d.y) && 
                yscales(d.y) >= yscales.range()[1])
              return 1;
            return 0;
          })
      };

      function xzoomf() {
        el.select('.axis.x').call(xaxis);
        el.selectAll('.mark')
          .attr('cx', function(d) {
            return xscales(d.x);
          })
          .style('opacity', function(d) {
            if (xscales.range()[0] <= xscales(d.x) && 
                xscales(d.x) <= xscales.range()[1])
              return 1;
            return 0;
          })
        _this.xscale = d3.event.scale;
      };



      this.yzoom = yzoom = d3.behavior.zoom()
        .y(this.state.yscales)
        .on('zoom', yzoomf);

      el.select('.axis.y').call(yzoom)
        .style('cursor', 'ns-resize')

          
      var type = this.model.get('schema')[this.model.get('x').col];

      if (!util.isStr(type)) {
        this.xzoom = xzoom = d3.behavior.zoom()
          .x(this.state.xscales)
          .on('zoom', xzoomf);

        el.select('.axis.x').call(xzoom)
          .style('cursor', 'ew-resize');


        var xStart = null;
        var curXScale = null;
        el.select('.xaxis')
          .on('mousedown.qvx', function() {
            if (d3.event.shiftKey) {
              xStart = d3.event.x;
              curXScale = xzoom.scale();
              d3.select('body')
                .on('mousemove.qvx', function() {
                  var diff = ((d3.event.x - xStart) / 100);
                  if (diff >= 0) { 
                    diff += 1.0; 
                  } else if (diff < 0) { 
                    diff = 1.0 / (Math.abs(diff)+1);
                  }
                  console.log(diff)
                  xzoom.scale(diff*curXScale);

                })
                .on('mouseup.qvx', function() {
                  d3.select('body')
                    .on('mousemove.qvx', null)
                    .on('mouseup.qvx', null);
                });
            }
          })


      }
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
          .text(function(d) { return d.expr; })
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


      if (!this.state.xaxis) {
        $(this.c[0]).empty();
      } else {
        this.$('.data-container').remove()
      }

      this.setupScales(this.model.get('data'))
      this.renderAxes(this.c)
      _.each(this.model.get('ys'), function(ycol) {
        this.renderData(
          this.c, 
          this.model.get('data'),
          this.model.get('x').alias, 
          ycol.alias
        );
      }, this);
      if (window.enableScorpion) {
        this.renderBrush(this.c);
      }
      this.renderLabels(this.c);
      this.renderZoom(this.c);

      
      this.$(".drawing-container").remove()
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
