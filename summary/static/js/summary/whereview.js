define(function(require) {
  var Backbone = require('backbone'),
      $ = require('jquery'),
      d3 = require('d3'),
      _ = require('underscore'),
      Where = require('summary/where'),
      SelectionView = require('summary/selectionview');


  var WhereView = Backbone.View.extend({

    initialize: function() {
      var collection = this.collection;
      this.listenTo(collection, 'add', this.addOne);
      this.listenTo(collection, 'reset', this.onReset);
    },

    onReset: function() {
      this.$el.empty();
      this.collection.each(this.addOne.bind(this));
    },

    addOne: function(model) {
      var view = new SelectionView({model: model});
      var vel = view.render().el;
      this.$el.append(vel);
    }
  })

  return WhereView
});
