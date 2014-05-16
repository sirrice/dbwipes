define(function(require) {
  var Backbone = require('backbone'),
      $ = require('jquery'),
      d3 = require('d3'),
      _ = require('underscore'),
      CStat = require('summary/cstat');


  var Where = Backbone.Collection.extend({
    model: CStat,
    url: '/api/lookup/',

    initialize: function() {
      var _this = this;
      this.id = Where.id_++;
      this.on('add', function(model) {
        this.listenTo(model, 'change:selection', function() {
          _this.trigger('change:selection');
        })
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
      return _.compact(this.map(function(m) {
        return m.toSQLWhere();
      })).join(' and ');
    }
  });

  Where.id_ = 0;

  return Where;
});
