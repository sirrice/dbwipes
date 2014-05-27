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


  var TupleQuery = Backbone.Model.extend({
    url: "/api/query/",

    defaults: function() {
      return {
        cols: [],
        data: [],
        query: null
      };
    },

    initialize: function() {
      this.on('change:where', (function() {
        if (this.get('where')) 
          this.fetch({ data: this.toJSON() });
      }).bind(this));
        
    },

    parse: function(resp, opts) {
      var schema = this.get('query').get('schema'),
          q = this.get('query');
      if (resp.data && resp.data.length) {
        resp.cols = _.keys(resp.data[0]);
        var qcols = _.flatten([q.get('x'), q.get('ys')]);
        qcols = _.pluck(qcols, 'col');
        var tcols = _.filter(resp.cols, function(col) {
          return util.isTime(schema[col]) && _.contains(qcols, col);
        });

        _.each(resp.data, function(d) {
          _.each(tcols, function(col) {
            if (schema[col] == 'time') {
              d[col] = '2000-01-01T' + d[col];
            }
            d[col] = new Date(d[col]);
          });
        });
      } else {
        resp.data = [];
      }
      return resp;
    },

    toDataJSON: function() {
      var cols = this.get('cols'),
          data = this.get('data');

      data = _.map(data, function(d) {
        return _.map(cols, function(col) { return d[col]; });
      });

      return {
        cols: cols,
        data: data
      };
    },

    toJSON: function() {
      var json = {
        db: this.get('query').get('db'),
        table: this.get('query').get('table'),
        query: this.toSQL()
      };
      return json;
    },

    toSQL: function() {
      var select = "SELECT *",
          from = "FROM " + this.get('query').get('table'),
          where = 'WHERE ' + this.get('where')
      return _.compact([
        select,
        from,
        where
      ]).join('\n');
    }
  });

  // Query is the model
  var TupleView = Backbone.View.extend({
    template: Handlebars.compile($("#tuple-template").html()),

    initialize: function(attrs) {
      this.w = 500;
      this.h = 300;
      this.lp = 50;
      this.tp = 20;
      this.model = new TupleQuery({query: attrs.query});
      this.listenTo(this.model, 'change:data', this.render);

      this.d3svg = d3.select(this.el)
        .attr('width', this.w+this.lp)
        .attr('height', this.h+this.tp)
      this.g = this.d3svg.append('g')
        .attr('transform', 'translate('+this.lp+', 0)')
      this.d3svg.append('rect')
        .attr('width', this.w+this.lp)
        .attr('height', this.h+this.tp)
        .attr('fill', 'none')

    },

    render: function() {
      //this.$el.html(this.template(this.model.toDataJSON()));
      var q = this.model.get('query'),
          xcol = q.get('x').col,
          xtype = q.get('schema')[xcol],
          data = this.model.get('data');
      if (!data || !data.length) return this;

      var getx = function(d) { return d[xcol]; };
      var xdomain = util.getXDomain(data, xtype, getx);
      var ydomain = [Infinity, -Infinity];
      var ycols = _.uniq(_.map(q.get('ys'), function(ycol) {
        return ycol.col;
      }));
      _.each(ycols, function(y) {
        var yvals = _.filter(_.pluck(data, y), _.isFinite);
        ydomain[0] = Math.min(ydomain[0], d3.min(yvals));
        ydomain[1] = Math.max(ydomain[1], d3.max(yvals));
      }, this);




      var cscales = d3.scale.category10().domain(ycols);
      var xscales = d3.scale.linear().domain(xdomain).range([0, this.w]);
      if (util.isStr(xtype))
        xscales = d3.scale.ordinal().domain(xdomain).rangeRoundBands([0, this.w], .1);
      if (util.isTime(xtype))
        xscales = d3.time.scale().domain(xdomain).range([0, this.w]);
      var yscales = d3.scale.linear().domain(ydomain).range([this.h, this.tp]),
          xf = function(d) {return xscales(d[xcol]); };
      console.log(xscales.domain())

      $(this.g[0]).empty();


      this.g.append('g')
        .attr('class', 'axis x')
        .attr('transform', 'translate(0,' + this.h + ')')
        .call(d3.svg.axis().scale(xscales).orient('bottom'))
      this.g.append('g')  
        .attr('class', 'axis y')
        .call(d3.svg.axis().scale(yscales).orient('left'))

      _.each(ycols, function(y) {
        var yf = function(d) { return yscales(d[y]); };

        this.g.append('g').selectAll('circle')
            .data(data)
          .enter().append('circle')
            .attr({
              class: 'mark',
              cx: xf,
              cy: yf,
              fill: cscales(y),
              r: 2
            });
      }, this);
      console.log(this.el)
      return this;
    }
  });



  return TupleView;

})




