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
      this.bTriggerModelSelection = true;
      this.on('add', function(model) {
        this.listenTo(
          model, 
          'change:selection', 
          _this.onModelSelection.bind(_this)
        );
      });
    },

    onModelSelection: function() {
      console.log("onmodelselection " + this.bTriggerModelSelection)
      if (this.bTriggerModelSelection) {
        this.trigger('change:selection');
      }
    },

    // Sets each cstat to the corresponding selection clause
    // @param clauses list of { col:, type:, vals: } objects
    setSelection: function(clauses) {
      this.bTriggerModelSelection = false;

      var col2clause = {};
      _.each(clauses, function(clause) {
        col2clause[clause.col] = clause;
      });

      this.each(function(model) {
        var col = model.get('col');
        model.trigger('setSelection', col2clause[col]);
      });
      console.log("manual trigger change:selection")
      this.trigger('change:selection');
      this.bTriggerModelSelection = true;

    },

    clearScorpionSelections: function() {
      this.bTriggerModelSelection = false;
      this.each(function(model) {
        model.set('selection', [])
        model.trigger('clearScorpionSelection');
      });
      this.trigger('change:selection');
      this.bTriggerModelSelection = true;
    },


    parse: function(resp) {
      var data = resp.data;
      var newstats = _.map(data, function(tup) { return new CStat(tup); })
      return newstats;
    },

    toJSON: function() {
      return _.filter(_.invoke(this.models, 'toJSON'), function(j) {
        return j && j.vals && j.vals.length > 0;
      });
    },

    toSQL: function() {
      var SQL = _.compact(this.map(function(m) {
        return m.toSQLWhere();
      })).join(' and ');
      if (SQL.length)
        return SQL;
      return null;
    }
  });

  Where.id_ = 0;

  return Where;
});
