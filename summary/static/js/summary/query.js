define(function(require) {
  var Backbone = require('backbone'),
      $ = require('jquery'),
      d3 = require('d3'),
      _ = require('underscore'),
      Where = require('summary/where');


  var Query = Backbone.Model.extend({
    defaults: function() {
      return {
        x: null,        // { col:, expr:}
        ys: null,
        schema: null,   // { col -> type }
        where: null,    // Where object
        table: null,
        db: null,
        data: null
      }
    },


    url: '/api/query',

    initialize: function() {
      this.on('change', this.onChange);
    },

    ensureX: function() {
      var x = this.get('x');
      x = (_.isString(x))? {col:x, expr:x} : x;
      if (!x.alias) x.alias = x.col;
      this.attributes['x'] = x;
    },

    ensureYs: function() {
      var ys = this.get('ys');
      ys = (_.isArray(ys))? ys: [ys];
      ys = _.map(ys, function(y) {
        y = (_.isString(y))? {col:y, expr: y} : y;
        if (!y.alias) y.alias = y.col;
        return y;
      })
      this.attributes['ys'] = ys;
    },

    ensureWhere: function() {
      var where = this.get('where');
      if (!where) where = new Where;
      this.listenTo(where, 'change:selection', function() {
        console.log("selection changed")
        console.log(where)
        console.log(where.toSQL())
        this.fetch({data:this.toJSON()});
      }, this);
      this.attributes['where'] = where;
    },

    onChange: function() {
      console.log('changed')
      this.ensureX();
      this.ensureYs();
      this.ensureWhere();
      this.fetch({data:this.toJSON()});
    },

    parse: function(resp, opts) {
      if (resp.data) {
        // ensure vals and ranges are date objects
        _.each(resp.data, function(el) {
          // SUPER HACK RIGHT NOW
          el.hr = new Date(el.hr);
        })
      }
      return resp;
    },

    toJSON: function() {
      return {
        x: this.get('x'),
        ys: this.get('ys'),
        where: this.get('where').toJSON(),
        table: this.get('table'),
        db: this.get('db'),
        query: this.toSQL()
      }
    },

    toSQL: function() {
      function col2str(d) {
        return d.expr + " as " + d.alias;
      }
      var select = [col2str(this.get('x'))];
      select = select.concat(_.map(this.get('ys'), col2str));
      select = "SELECT " + select.join(', ');

      var from = 'FROM ' + this.get('table');
      var where = this.get('where');
      where = (where)? where.toSQL() : '';
      where = (where != '')? 'WHERE ' + where : null;
      var groupby = 'GROUP BY ' + this.get('x').expr;
      var orderby = 'ORDER BY ' + this.get('x').expr;

      return _.compact([
        select,
        from,
        where,
        groupby,
        orderby
      ]).join('\n');
    }

  })

  return Query;
});


