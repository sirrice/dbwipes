define(function(require) {
  var Backbone = require('backbone'),
      $ = require('jquery'),
      d3 = require('d3'),
      _ = require('underscore'),
      Where = require('summary/where'),
      util = require('summary/util');


  var Query = Backbone.Model.extend({
    url: '/api/query',

    defaults: function() {
      return {
        x: null,        // { col:, expr:}
        ys: null,
        schema: null,   // { col -> type }
        where: null,    // string
        table: null,
        db: null,
        data: null
      }
    },


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

    // @deprecated
    ensureWhere: function() {
      var where = this.get('where');
      if (!where) {
        where = new Where;
      }
      this.listenTo(where, 'change:selection', function() {
        this.fetch({data:this.toJSON()});
      }, this);
      this.attributes['where'] = where;
    },

    onChange: function() {
      this.ensureX();
      this.ensureYs();
      //this.ensureWhere();
      this.fetch({data:this.toJSON()});
    },


    // parse /api/query/ results
    parse: function(resp, opts) {
      var xcol = this.get('x'),
          schema = resp.schema || this.get('schema');

      if (resp.data) {
        var type = schema[xcol.col];

        if (util.isTime(type)) {
          if (type == 'time') {
            _.each(resp.data, function(d) {
              d[xcol.alias] = "2000-01-01T" + d[xcol.alias];
            });
          }
          // ensure vals and ranges are date objects
          _.each(resp.data, function(d) {
            d[xcol.alias] = new Date(d[xcol.alias]);
          });

          resp.data = _.reject(resp.data, function(d) {
            var vals = _.values(d);
            return _.any(_.map(vals, _.isNull));
          });
        }
      }
      return resp;

    },



    validate: function() {
      var errs = [];
      if (!this.get('db')) 
        errs.push("need database");
      if (!this.get('table')) 
        errs.push("need table name");
      if (!this.get('x')) 
        errs.push("need grouping attribute (x)");
      if (!this.get('ys')) 
        errs.push("need aggregations (y)");
      if (!this.get('data'))
        errs.push("need data!");
      if (errs.length) 
        return errs.join('\n');
    },


    toJSON: function() {
      var ret = {
        x: this.get('x'),
        ys: this.get('ys'),
        table: this.get('table'),
        db: this.get('db'),
        query: this.toSQL()
      };
      if (this.get('where')) {
        ret.where = this.get('where');
      }
      return ret;
    },

    toSQL: function() {
      function col2str(d) {
        return d.expr + " as " + d.alias;
      }
      if (!this.get('x')) return '';
      var select = [col2str(this.get('x'))];
      select = select.concat(_.map(this.get('ys'), col2str));
      select = "SELECT " + select.join(', ');

      var from = 'FROM ' + this.get('table');
      var where = this.get('where');
      where = (where && where != '')? 'WHERE ' + where : null;
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
