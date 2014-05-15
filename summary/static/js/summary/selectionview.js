define(function(require) {
  var Backbone = require('backbone'),
      $ = require('jquery'),
      d3 = require('d3'),
      _ = require('underscore'),
      Where = require('summary/where');

  // View to render the selected stuff for debugging
  var SelectionView = Backbone.View.extend({
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

      var s = "("+vals.join(', ')+")";
      if (type != 'str') {
        var s = JSON.stringify(d3.min(vals)) + " - " + JSON.stringify(d3.max(vals));
      }
      this.$el.html("<div>" + this.model.get('col') + " = " + s + "</div>");
      this.$el.show();
      return this;
    },

    clear: function() {
      this.$el.hide();
      return this;
    }

  })

  return SelectionView;
})
