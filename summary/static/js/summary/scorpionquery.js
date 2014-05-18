define(function(require) {
  var Backbone = require('backbone'),
      $ = require('jquery'),
      d3 = require('d3'),
      _ = require('underscore'),
      Where = require('summary/where'),
      util = require('summary/util'),
      ScorpionResult = require('summary/scorpionresult'),
      ScorpionResults = require('summary/scorpionresults')


  var ScorpionQuery = Backbone.Model.extend({
    url: '/api/scorpion/',

    defaults: function() {
      return {
        badselection: {},   // y -> []
        goodselection: {},
        selection: {},
        query: null,
        results: new ScorpionResults()
      }
    },


    initialize: function() {
    },

    merge: function(key, selection) {
      if (selection == null || _.size(selection) == 0) return;
      var cursel = this.get(key) || {};
      _.each(selection, function(ds, col) {
        if (!cursel[col]) cursel[col] = [];
        cursel[col] = _.union(cursel[col], ds);
      }, this)
      this.set(key, cursel);
      this.trigger('change')
    },

    count: function(key) {
     return d3.sum(
      _.values(this.get(key))
        .map(function(ds) { return ds.length; })
      );
    },


    validate: function() {
      var errs = [];
      if (errs.length) 
        return errs.join('\n');
    },

    parse: function(resp) {
      if (resp.results) {
        var q = this.get('query'),
            results = this.get('results');

        var newresults = _.map(resp.results, function(r) {
          r.query = q;
          return new ScorpionResult(r);
        });

        results.reset(newresults);
        resp.results = results;
      }
      return resp;
    },


    toJSON: function() {
      var json = {
        cols: _.keys(this.get('query').get('schema')),
        nbad: this.count('badselection'),
        ngood: this.count('goodselection')
      };
      return json;
    },

    toSQL: function() {
      return "";
    }

  })

  return ScorpionQuery;
});
