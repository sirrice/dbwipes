define(function(require) {
  var Backbone = require('backbone'),
      Handlebars = require('handlebars'),
      $ = require('jquery'),
      d3 = require('d3'),
      _ = require('underscore'),
      Where = require('summary/where'),
      util = require('summary/util');


  // TODO: connect to server to query and fetch data
  //       connect with Where object
  var QueryView = Backbone.View.extend({
    errtemplate: Handlebars.compile($("#q-err-template").html()),

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
        lp: 40,
        tp: 20,
        marktype: 'circle'
      };



      this.$svg = $("<svg id='viz'></svg>").prependTo(this.$el);
      this.svg = this.$svg.get()[0];
      this.d3svg = d3.select(this.svg);
      this.d3svg
        .attr('class', 'viz-container')
        .attr('width', this.state.w + this.state.lp)
        .attr('height', this.state.h + this.state.tp);
      this.c = this.d3svg.append('g')
          .attr('transform', "translate("+this.state.lp+", 0)");
      this.c.append('rect')
        .attr('width', this.state.w)
        .attr('height', this.state.h)
        .attr('fill', 'none')
        .attr('stroke', 'none')
        .style('pointer-events', 'all')



      this.$q = $("<div id='q'></div>").prependTo(this.$el);
      this.q = this.$q.get()[0];
      this.d3q = d3.select(this.q);
      this.$q.css("padding-left", this.state.lp);


      this.$toggle = $("#q-toggle")
        .addClass("btn btn-primary")
        .css("margin-left", this.state.lp)
        .click((function() {
          this.renderUnready('');
          this.$('.legend').toggle();
          this.$svg.toggle();
          this.$q.toggle();
        }).bind(this));
          

      //this.listenTo(this.model, 'change:db', this.onChange);
      //this.listenTo(this.model, 'change:table', this.onChange);
      this.listenTo(this.model, 'change:data', this.render);
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
              ycol: ycol
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
              var ycol = d3.select(this).attr('ycol')
              if (!selected[ycol]) selected[ycol] = [];
              selected[ycol].push(d);
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


    renderUnready: function(errText) {
      var json = this.model.toJSON(),
          _this = this;
      json['error'] = errText;


      this.$q.html(this.errtemplate(json));

      this.$('.q-add').click((function(){
        this.$(".input-ys-expr").append(
          $("<div><input class='form-control' name='q-y-expr' placeholder='expression'/></div>")
        );
        this.$(".input-ys-col").append(
          $("<div><input class='form-control' name='q-y-col' placeholder='attribute'/></div>")
        );
      }).bind(this));


      this.$('.q-submit').click((function(){
        var db = this.$('input[name=q-db]').val(),
            table = this.$('input[name=q-table]').val();
        
        var xexpr = this.$('input[name=q-x-expr]').val(),
            xcol = this.$('input[name=q-x-col]').val(),
            xalias = xcol;
        if (xexpr.indexOf(' as ')) {
          var pair = xexpr.split(' as ');
          xexpr = pair[0];
          xalias = pair[1];
        }

        
        var yexprs = this.$("input[name=q-y-expr]").map(function(idx, el) {
          return $(el).val()
        }).get();
        var ycols = this.$("input[name=q-y-col]").map(function(idx, el) {
          return $(el).val()
        }).get();
        var ys = _.zip(yexprs, ycols);
        ys = _.compact(_.map(ys, function(pair) {
          if (pair[0] == '' || pair[1] == '') return null;
          var yexpr = pair[0],
              yalias = pair[1];
          if (pair[0].indexOf(' as ')) {
            var aspair = pair[0].split(' as '),
                yexpr = aspair[0],
                yalias = aspair[1];
          }
          return {
            col: pair[1],
            alias: yalias,
            expr: yexpr
          };
        }));

        var q = {
          db: db,
          table: table,
          x: { col: xcol, alias: xalias, expr: xexpr},
          ys: ys,
          where: this.model.get('where'),
          schema: this.model.get('schema')
        };
        this.model.set(q);


      }).bind(this));

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


    render: function() {
      if (!this.model.isValid()) {
        this.renderUnready(this.model.validationError);
        this.$q.show();
        this.$svg.hide();
        return this;
      }
      this.$svg.show();
      this.$q.hide();


      $(this.c[0]).empty()

      this.setupScales()
      this.renderAxes(this.c)
      _.each(this.model.get('ys'), function(ycol) {
        this.renderData(this.c, this.model.get('x').col, ycol.alias);
      }, this);
      this.renderBrush(this.c);
      this.renderLabels(this.c);

      return this;
    }

  });

  return QueryView;
})
