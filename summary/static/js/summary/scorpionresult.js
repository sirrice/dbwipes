define(function(require) {
  var Backbone = require('backbone'),
      $ = require('jquery'),
      d3 = require('d3'),
      _ = require('underscore'),
      Where = require('summary/where'),
      util = require('summary/util');

  var ScorpionResult = Backbone.Model.extend({
    defaults: function() {
      return {
        query: null,        // Query object
        score: 0,
        c_range: [],     // [minc, maxc]
        clauses: [],    // { col:, type:, vals: }
        alt_clauses: [], // {col:, type:, vals:}
        id: ScorpionResult._id++
      }
    },

    initialize: function() {
    },


    toJSON: function() {
      var json = {
        score: this.get('score'),
        clauses: _.map(this.get('clauses'), function(c){
          return util.toWhereClause(c.col, c.type, c.vals);//.substr(0, 20);
        }),
        alt_clauses: _.map(this.get('alt_clauses'), function(c) {
          return util.toWhereClause(c.col, c.type, c.vals);//.substr(0, 20);
        }),
        c_range: this.get('c_range').join(' - ')
      };
      return json;
    },

    toSQL: function() {
      return _.map(this.get('clauses'), function(clause) {
        return util.toWhereClause(clause.col, clause.type, clause.vals); 
      });
    }
  });
  ScorpionResult._id = 0;


  return ScorpionResult;
});
