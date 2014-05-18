define(function(require) {
  var Backbone = require('backbone'),
      Handlebars = require('handlebars'),
      $ = require('jquery'),
      d3 = require('d3'),
      _ = require('underscore'),
      Where = require('summary/where'),
      util = require('summary/util');


  var ScorpionResultView = Backbone.View.extend({
    template: Handlebars.compile($("#scorpion-result-template").html()),
    initialize: function() {
      console.log(arguments)
      this.listenTo(this.model, 'change', this.render);
    },

    render: function() {
      var _this = this;
      this.$el.html(this.template(this.model.toJSON()));
      var show = this.$(".equiv-show"),
          hide = this.$(".equiv-hide"),
          equiv = this.$(".equiv-clauses");

      show.click(function() {
        show.hide();
        equiv.show();
      });
      hide.click(function() {
        equiv.hide();
        show.show();
      });

      this.$('.filter-clause').hover(
        function() { _this.trigger('selected'); },
        function() { _this.trigger('unselected'); }
      );

      return this;
    }

  });

  return ScorpionResultView;
})

