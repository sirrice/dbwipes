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

      var getx = function(d) { return d.val; },
          gety = function(d) { return d.count },
          xdomain = util.getXDomain(stats, type, getx),
          ydomain = [ d3.min(stats, gety), d3.max(stats, gety) ];

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
