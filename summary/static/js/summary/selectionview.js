define(function(require) {
  var Backbone = require('backbone'),
      $ = require('jquery'),
      d3 = require('d3'),
      _ = require('underscore'),
      Where = require('summary/where'),
      util = require('summary/util')

  // View to render the selected stuff for debugging
  var SelectionView = Backbone.View.extend({
    events: {
      "click .clause a": 'onClose'
    },

    initialize: function() {
      this.listenTo(this.model, 'change:selection', this.render);
    },

    render: function() {
      var sel = this.model.get('selection'),
          type = this.model.get('type'),
          vals = _.keys(sel);

      if (vals.length == 0) {
        this.clear();
        return this;
      }

      var s = this.model.toSQLWhere();
      this.$el.html("<div class='clause'><a>x</a>" + s + "</div>");
      this.$el.show()
      return this;
    },

    clear: function() {
      this.$el.hide();
      return this;
    },

    onClose: function() {
      this.model.set('selection', []);
      this.model.trigger('clearScorpionSelection');
    }


  })

  return SelectionView;
})
