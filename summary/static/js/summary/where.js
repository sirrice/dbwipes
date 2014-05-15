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
      this.on('add', function(model) {
        this.listenTo(model, 'change:selection', function() {
          _this.trigger('change:selection');
        })
      });
    },

    parse: function(resp) {
      var data = resp.data;
      var newstats = _.map(data, function(tup) { return new CStat(tup); })
      console.log("resetting where")
      this.reset();
      _.each(newstats, function(m) {
        console.log(["adding new where", m]);
        this.add(m);
      }, this)
    },
    toJSON: function() {
      return _.compact(_.invoke(this.models, 'toJSON'));
    },
    toSQL: function() {
              console.log(this.models)
      return _.compact(this.map(function(m) {
        return m.toSQLWhere();
      })).join(' and ');
    }
  })

  return Where;
});

