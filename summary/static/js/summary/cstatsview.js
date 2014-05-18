// CStatsView
define(function(require) {
  var CStatView = require('summary/cstatview'),
      Backbone = require('backbone');

  return Backbone.View.extend({

    initialize: function() {
      this.listenTo(this.collection, 'add', this.addOne);
      this.listenTo(this.collection, 'reset', this.onReset);
    },

    onReset: function() {
      this.$el.empty();
      this.collection.each(this.addOne.bind(this));
    },

    addOne: function(model) {
      var view = new CStatView({model: model});
      var vel = view.render().el;
      this.$el.append(vel);
    }
  });
});

