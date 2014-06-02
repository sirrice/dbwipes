define(function(require) {
  var Backbone = require('backbone'),
      Handlebars = require('handlebars'),
      $ = require('jquery'),
      d3 = require('d3'),
      _ = require('underscore'),
      Where = require('summary/where'),
      util = require('summary/util'),
      ScorpionResult = require('summary/scorpionresult'),
      ScorpionResultView = require('summary/scorpionresultview'),
      Query = require('summary/query');


  var ScorpionResultsView = Backbone.View.extend({
    template: Handlebars.compile($("#scorpion-results-template").html()),

    initialize: function(attrs) {
      this.state = {
        locked: null,  // null = base results, int = scorpion result views
        where: null,   // global where object
        query: null
      };
      _.extend(this.state, attrs);


      this.listenTo(this.collection, 'add', this.addTo);
      this.listenTo(this.collection, 'reset', this.reset);
      this.listenTo(this.state.query, 'change:db', this.clear);
      this.listenTo(this.state.query, 'change:table', this.clear);

    },

    render: function() {
      this.$el.html(this.template({}));
      this.$list = this.$('.scorpion-results');
      return this;
    },

    setActive: function(model) {
      var where = null,
          clauses = [],
          _this = this;
      if (model != null) {
        where = util.negateClause(model.toSQL());
        clauses = model.get('clauses');
      } else if (model == null) {
        if (this.state.locked != null) {
          where = util.negateClause(this.state.locked.toSQL());
          clauses = this.state.locked.get('clauses');
        } else {
          where = util.negateClause(this.state.where.toSQL());
          clauses = [];
        }
      }

      console.log(['setactive', model, this.state.locked, where]);
      //this.state.query.set('where', where);
      this.state.where.setSelection(clauses);
      this.state.query.attributes.where = where;

      if (where) {
        var query = new Query(this.state.query.toJSON());
        query.set('where', where);
        query.fetch({
          data: query.toJSON(),
          success: function(model, resp, opts) {
            _this.trigger('modifiedData', resp.data);
          }
        });
      } else {
        this.trigger('modifiedData', null);
      }

      this.trigger('setActive', model);
    },

    toggleLocked: function(model) {
      if (this.state.locked == model) {
        this.state.locked = null;
      } else {
        this.state.locked = model;
      }
      console.log(['newstate:', this.state.locked])
      this.setActive(model);
    },

    clear: function() {
      this.collection.reset();
    },

    reset: function() {
      this.$list.empty();
      this.collection.each(this.addTo.bind(this));
    },


    addTo: function(model) {
      var _this = this;
      var view = new ScorpionResultView({model:model});
      this.$list.append(view.render().el);
      view.on('selected', function() { _this.setActive(view.model); });
      view.on('unselected', function() { _this.setActive(null); });
      view.on('click', function() { 
        _this.$list.find('.filter-clause').removeClass("locked");
        _this.toggleLocked(view.model); 
        view.$('.filter-clause').toggleClass("locked", _this.state.locked == view.model);
      });
      return this;
    }
  });

  return ScorpionResultsView;
})
