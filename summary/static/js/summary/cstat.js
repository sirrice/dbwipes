define(function(require) {
  var Backbone = require('backbone'),
      d3 = require('d3'),
      util = require('summary/util');


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

      if (util.isNum(type)) {
        type = attrs.type = 'num';
      }
      if (util.isStr(type)) {
        type = attrs.type = 'str';
      }
      if (util.isTime(type)){
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
        if (xdomain[0] == xdomain[1]) {
          if (util.isNum(type)) {
            xdomain[0] -= .5;
            xdomain[1] += .5;
          } else {
            xdomain[0] -= 1000*60*60*24;
            xdomain[1] += 1000*60*60*24;
          }
        } else {
          var diff = (xdomain[1] - xdomain[0]) * 0.05;
          if (util.isNum(type)) {
            xdomain[0] -= diff;
            xdomain[1] += diff;
          } else {
            xdomain[0] = new Date(xdomain[0] - diff);
            xdomain[1] = new Date(xdomain[1] + diff);
          }
        }
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
      return {
        col: this.get('col'),
        type: this.get('type'),
        vals: _.pluck(this.get('selection'), 'range')
      };
    },

    toSQLWhere: function() {
      var sel = this.get('selection'),
          type = this.get('type'),
          col = this.get('col');
      if (sel.length == 0) return null;

      var vals = [];
      _.each(sel, function(d) {
        vals = vals.concat(d.range);
      });
      vals = _.compact(_.uniq(vals));


      var SQL = null;
      if (util.isStr(type)) {
         SQL = col + " in ("+vals.join(',')+")";
      } else {
        if (util.isTime(type)) {
          var val2s = function(v) { return "'" + (new Date(v)).toISOString() + "'"; }
          vals = _.map(vals, function(v) { return new Date(v)});
        } else {
          var val2s = function(v) { return +v };
        }

        if (vals.length == 1) {
          SQL = col + " = " + val2s(vals[0]);
        } else {
          SQL = [
            val2s(d3.min(vals)) + " <= " + col,
            col + " <= " + val2s(d3.max(vals))
          ].join(' and ');
        }
      }
      return "not("+SQL+")";
    }

  });
  CStat.id_ = 0;
  return CStat;
});
