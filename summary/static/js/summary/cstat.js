define(function(require) {
  var Backbone = require('backbone'),
      d3 = require('d3'),
      util = require('summary/util');


  require('date');

  var CStat = Backbone.Model.extend({
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
        _.each(stats, function(d) {
          if (type == 'time')  {
            d.val = '2000-01-01T' + d.val;
            d.range = _.map(d.range, function(v) { return '2000-01-01T'+v; });
          }
          d.val = new Date(d.val);
          d.range = _.map(d.range, function(v) {return new Date(v);})
        })
      }


      var xdomain = null;
      if (util.isNum(type)) {
        var xvals = [];
        _.each(stats, function(d) {
          xvals.push.apply(xvals, d.range);
          xvals.push(d.val);
        });
        xvals = _.reject(xvals, _.isNull);
        xvals = _.filter(xvals, _.isFinite);
        xdomain = [ d3.min(xvals), d3.max(xvals) ];

        // expand the domain a bit
        var diff = 1;
        if (xdomain[0] != xdomain[1])
          diff = (xdomain[1] - xdomain[0]) * 0.05;
        xdomain[0] -= diff;
        xdomain[1] += diff;
        console.log([attrs.col, type, 'diff', diff, 'domain', xdomain[0], xdomain[1]])
      } else if (util.isTime(type)) {
        var xvals = [];
        _.each(stats, function(d) {
          xvals.push.apply(xvals, d.range);
          xvals.push(d.val);
        });
        xvals = _.reject(xvals, _.isNull);
        xdomain = [ d3.min(xvals), d3.max(xvals) ];

        // expand the domain a bit
        var diff = 1000*60*60*24; // 1 day
        if (xdomain[0] != xdomain[1]) 
          diff = (xdomain[1] - xdomain[0]) * 0.05;

        xdomain[0] = new Date(+xdomain[0] - diff);
        xdomain[1] = new Date(+xdomain[1] + diff);
      } else {
        xdomain = {};
        _.each(stats, function(d) {
          _.each(d.range, function(o) {
            xdomain[o] = 1;
          });
          xdomain[d.val] = 1  ;
        });
        xdomain = _.keys(xdomain);
      }


      var ydomain = [
        d3.min(stats, function(d) { return d.count }),
        d3.max(stats, function(d) { return d.count })
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
      var sel = this.get('selection');
      if (sel.length == 0) return null;

      var vals = [];
      _.each(sel, function(d) {
        vals = vals.concat(d.range);
      });
      vals = _.uniq(vals);
      var SQL = util.toWhereClause(
        this.get('col'), 
        this.get('type'),
        vals
      );
      if (SQL == '' || SQL == null) return null;
      return SQL;
    }

  });
  CStat.id_ = 0;
  return CStat;
});
