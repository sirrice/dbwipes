// ScorpionView

define(function(require) {
  var Handlebars = require('handlebars'),
      Backbone = require('backbone'),
      d3 = require('d3'),
      $ = require('jquery'),
      util = require('summary/util'),
      ScorpionQuery = require('summary/scorpionquery');

  var ScorpionView = Backbone.View.extend({

    template: Handlebars.compile($("#scorpion-template").html()),

    initialize: function(attrs) {
      this.listenTo(this.model, 'change', this.onChange);
    },

    onChange: function() {
      if (this.model.count('selection') == 0) return;
      this.render();
      this.$el.show();
    },

    render: function() {
      console.log("render walkthroug")
      var _this = this,
          model = this.model;

      this.$el.empty().html(this.template(this.model.toJSON()));

      this.$('.close').click(function() {_this.$el.hide(); });
      this.$('#addbad').click(function(){
        model.merge('badselection', model.get('selection'));
        console.log(model.get('badselection'))
      });
      this.$('#addgood').click(function(){
        model.merge('goodselection', model.get('selection'));
      });
      this.$('#draw').click(function(){});
      this.$('#toggle-schema').click(function() {
        _this.$('#schema').toggle()
      });
      this.$('#uncheck-schema').click(function() {
        _this.$('.errcol')
          .get().forEach(function(e){
            e.checked = false;
          });
      });
      this.$('submit').click(function(){});


      return this;
    },


  });

  return ScorpionView;
});

