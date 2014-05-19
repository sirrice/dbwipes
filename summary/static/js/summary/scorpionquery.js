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
        errtypes: {},
        query: null,
        results: new ScorpionResults()
      }
    },


    initialize: function() {
    },

    merge: function(key, selection) {
      //
      // TODO: remove from other selection values in new selection
      //
      if (selection == null || _.size(selection) == 0) return;
      var curSel = this.get(key) || {};
      _.each(selection, function(ds, yalias) {
        if (!curSel[yalias]) 
          curSel[yalias] = [];
        curSel[yalias] = _.union(curSel[yalias], ds);
      }, this)
      this.set(key, curSel);
      this.trigger('change')
    },

    count: function(key) {
      return d3.sum(
        _.values(this.get(key))
          .map(function(ds) { return ds.length; })
      );
    },

    mean: function(key, yalias) {
      var selected = this.get(key)[yalias];
      if (!selected) return null;

      return d3.mean(selected.map(function(d) {
        return d[yalias];
      }));
    },

    validate: function() {
      var errs = [];

      this.set('errtypes', {});

      _.each(this.get('badselection'), function(selected, yalias) {
        var badmean = this.mean('badselection', yalias),
            goodmean = this.mean('goodselection', yalias);
        if (!badmean) return;
        if (badmean && goodmean == null) 
          errs.push(["<div>select good examples for <strong>"+yalias+"</strong></div>"]);
        else
          this.get('errtypes')[yalias] = (goodmean > badmean)? 3 : 2;
      }, this) 

      if (errs.length) 
        return errs.join('\n');
    },

    parse: function(resp) {
      //
      // [ { score:, c_range:, clauses:, alt_clauses:, } ]
      //
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
        schema: this.get('query').get('schema'),
        nbad: this.count('badselection'),
        ngood: this.count('goodselection'),
        badselection: this.get('badselection'),
        goodselection: this.get('goodselection'),
        errtypes: this.get('errtypes'),
        query: this.get('query').toJSON()
      };
      return json;
    },

    toSQL: function() {
      return "";
    }

  })

  return ScorpionQuery;
});
