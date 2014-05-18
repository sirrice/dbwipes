define(function(require) {
  var Backbone = require('backbone'),
      Handlebars = require('handlebars'),
      $ = require('jquery'),
      d3 = require('d3'),
      _ = require('underscore'),
      Where = require('summary/where'),
      util = require('summary/util'),
      ScorpionResult = require('summary/scorpionresult'),
      ScorpionResultView = require('summary/scorpionresultview');


  var ScorpionResultsView = Backbone.View.extend({
    template: Handlebars.compile($("#scorpion-results-template").html()),

    initialize: function(attrs) {
      this.state = {
        active: null,  // null = base results, int = scorpion result views
        where: null,   // global where object
        query: null
      };
      _.extend(this.state, attrs);
      this.listenTo(this.collection, 'add', this.addTo);
    },

    render: function() {
      this.$el.html(this.template({}));
      return this;
    },

    setActive: function(model) {
      var active = this.state.active;
      if (model) {
        this.query.set('where', model.toSQL());
      } else if (active && model == null) {
        this.query.set('where', this.state.where.toSQL());
      } 

      this.state.active = model;
    },

    addTo: function(model) {
      var view = new ScorpionResultView({model:model});
      this.$('.list').append(view.render().el);
      view.on('selected', this.setActive(view.model));
      view.on('unselected', this.setActive(null));
      return this;
    }
  });

  return ScorpionResultsView;
})
