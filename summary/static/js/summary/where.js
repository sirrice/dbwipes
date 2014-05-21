define(function(require) {
  var Backbone = require('backbone'),
      $ = require('jquery'),
      d3 = require('d3'),
      _ = require('underscore'),
      CStat = require('summary/cstat');


  var Where = Backbone.Collection.extend({
    model: CStat,
    url: '/api/column_distributions/',

    initialize: function() {
      var _this = this;
      this.id = Where.id_++;
      this.on('add', function(model) {
        this.listenTo(model, 'change:selection', function() {
          _this.trigger('change:selection', _this);
        })
      });
    },


    // Sets each cstat to the corresponding selection clause
    // @param clauses list of { col:, type:, vals: } objects
    setSelection: function(clauses) {
      var col2clause = {};
      _.each(clauses, function(clause) {
        col2clause[clause.col] = clause;
      });

      this.each(function(model) {
        var col = model.get('col');
        model.set('selection', []);
        model.trigger('setSelection', col2clause[col]);
      });
    },


    parse: function(resp) {
      var data = resp.data;
      var newstats = _.map(data, function(tup) { return new CStat(tup); })
      return newstats;
    },

    toJSON: function() {
      return _.compact(_.invoke(this.models, 'toJSON'));
    },

    toSQL: function() {
      var SQL = _.compact(this.map(function(m) {
        return m.toSQLWhere();
      })).join(' and ');
      if (SQL.length)
        return "not("+SQL+")";
      return null;
    }
  });

  Where.id_ = 0;

  return Where;
});
