define(function(require) {
  var Backbone = require('backbone'),
      d3 = require('d3');
  require('date');
      

  var CStat = Backbone.Model.extend({
    urlRoot: "/",

    defaults: function() {
      return {
        col: null,
        type: null,   // time | timestamp | date | num | str
        stats: [],    // { val:, count:, range:}
        xdomain: [],   // (min, max) or [list of discrete vals]
        ydomain: [],
        selection: [] // subset of domain
      }
    },

    initialize: function(attrs) {
      var type = attrs.type,
          stats = attrs.stats,
          _this = this;

      if (_.contains(['int4', 'int', 'int8', 'float8', 'float', 'bigint'], type)) {
        type = attrs.type = 'num';
      }
      if (_.contains(['varchar', 'text'], type)) {
        type = attrs.type = 'str';
      }


      if (_.contains(['time', 'timestamp', 'date'], type)) {
        // ensure vals and ranges are date objects
        _.each(stats, function(el) {
          el.val = new Date(el.val);
          el.range = _.map(el.range, function(v) {return new Date(v);})
        })
      }

      var xdomain = null;

      if (type != 'str') {
        xdomain = [
          d3.min(stats, function(el) { return el.range[0] || el.val; }),
          d3.max(stats, function(el) { return el.range[1] || el.val; })
        ]
      } else {
        xdomain = {};
        _.each(stats, function(el) {
          _.each(el.range, function(o) {
            xdomain[o] = 1;
          });
          xdomain[el.val] = 1  ;
        });
        xdomain = _.keys(xdomain);
      }


      var ydomain = [
        d3.min(stats, function(el) { return el.count }),
        d3.max(stats, function(el) { return el.count })
      ];

      this.set('type', type);
      this.set('xdomain', xdomain);
      this.set('ydomain', ydomain);
      this.set('id', CStat.id_++);

      return this;
    },

    validate: function(attrs, opts) {
      if (!attrs.col) return "col can't be null";
      if (!attrs.type) return "type can't be null"
    },


    toJSON: function() {
      if (_.size(this.get('selection')) == 0) {
        return {};
      }
      return {
        col: this.get('col'),
        type: this.get('type'),
        vals: _.keys(this.get('selection'))
      };
    },

    toSQLWhere: function() {
      var sel = this.get('selection');
      if (_.size(sel) == 0) return null;

      var vals = _.keys(sel);

      if (this.get('type') == 'str') {
        vals = _.map(vals, function(v) { return '"'+v+'"'})
        vals.join(',')
        return this.get('col') + " in ("+vals+")";
      }

      if (vals.length == 1) {
        return this.get('col') + " = " + vals[0];
      }
      return [
        d3.min(vals) + " <= " + this.get('col'),
        this.get('col') + " <= " + d3.max(vals)
      ].join(' and ');
    }

  });
  CStat.id_ = 0;
  return CStat;
});




