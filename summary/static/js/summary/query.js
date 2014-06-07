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
        x: null,           // { col:, expr:}
        ys: null,
        schema: null,      // { col -> type }
        where: null,       // this changes depending on how user inteacts with rules/selection
        basewhere: null,   // this WHERE is part of the query and should not be modified
                           // only way to set basewhere is to click on a rule
        table: null,
        db: null,
        data: null,
        limit: null
      }
    },


    initialize: function() {
      this.on('change:x change:ys change:basewhere', this.onChange);
      this.on('change:db change:table', this.onChangeDB);
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

    onChangeDB: function() {
      this.set('where', null);
    },

    onChange: function() {
      this.ensureX();
      this.ensureYs();
      //this.ensureWhere();
      console.log("fetching new query " + this.get('where'))
      this.fetch({data:this.toJSON()});
    },


    fetch: function(options) {
      $("#q_loading").show();
      var model = this;
      options || (options = {});
      options.data || (options.data = this.toJSON());
      var complete = options.complete;
      var f = function(resp) {
        $("#q_loading").hide()
        if (complete) complete(model, resp, options);
      };
      options.complete = f;
      
      return Backbone.Model.prototype.fetch.call(this, options);
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
      function col2str(d) { return d.expr + " as " + d.alias; }
      if (!this.get('x')) return '';
      var select = [col2str(this.get('x'))];
      select = select.concat(_.map(this.get('ys'), col2str));
      select = "SELECT " + select.join(', ');

      var from = 'FROM ' + this.get('table');
      var basewhere = this.get('basewhere');
      basewhere = (basewhere && basewhere != '')? basewhere : null;
      var extrawhere = this.get('where');
      extrawhere = (extrawhere && extrawhere != '')? extrawhere : null;
      var where = _.compact([basewhere, extrawhere]);
      where = (where.length)? 'WHERE ' + where.join(' AND ') : null;
      var groupby = 'GROUP BY ' + this.get('x').expr;
      var orderby = 'ORDER BY ' + this.get('x').expr;
      var limit = this.get('limit');
      limit = (limit && limit != '')? 'LIMIT ' + limit : null;

      return _.compact([
        select,
        from,
        where,
        groupby,
        orderby,
        limit
      ]).join('\n');
    }

  })

  return Query;
});
