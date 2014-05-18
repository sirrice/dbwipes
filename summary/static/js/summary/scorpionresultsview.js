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
      this.listenTo(this.collection, 'reset', this.reset);
    },

    render: function() {
      this.$el.html(this.template({}));
      this.$list = this.$('.scorpion-results');
      return this;
    },

    setActive: function(model) {
      var active = this.state.active;
      if (model) {
        this.state.query.set('where', model.toSQL());
        this.state.where.setSelection(model.get('clauses'));
      } else if (active && model == null) {
        this.state.query.set('where', this.state.where.toSQL());
        this.state.where.setSelection([]);
      } 

      this.state.active = model;
    },

    reset: function() {
      this.$list.empty();
      this.collection.each(this.addTo.bind(this));
    },

    addTo: function(model) {
      console.log(['srv.add', model])
      var _this = this;
      var view = new ScorpionResultView({model:model});
      this.$list.append(view.render().el);
      view.on('selected', function() { _this.setActive(view.model); });
      view.on('unselected', function() { _this.setActive(null); });
      return this;
    }
  });

  return ScorpionResultsView;
})
