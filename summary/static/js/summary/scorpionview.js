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
      this.queryview = attrs.queryview;
      this.listenTo(this.model, 'change', this.onChange);
    },

    onChange: function() {
      if (this.model.count('selection') == 0) return;
      this.render();
      this.$el.show();
    },

    render: function() {
      var _this = this,
          model = this.model;

      this.$el.attr("id", "walkthrough-container");
      this.$el.empty().html(this.template(this.model.toJSON()));

      this.$('.close').click(function() {_this.$el.hide(); });
      this.$('#addbad').click(function(){
        model.merge('badselection', model.get('selection'));
        console.log(model.get('badselection'))
      });
      this.$('#addgood').click(function(){
        model.merge('goodselection', model.get('selection'));
      });
      this.$('#clearbad').click(function(){
        model.set('badselection', {});
      });
      this.$('#cleargood').click(function(){
        model.set('goodselection', {});
      });
      this.$('#toggle-schema').click(function() {
        _this.$('#schema').toggle()
      });
      this.$('#uncheck-schema').click(function() {
        _this.$('.errcol')
          .get().forEach(function(e){
            e.checked = false;
          });
      });

      var draw = this.$("#draw");
      var qv = this.queryview;
      draw.text((qv.brushStatus() == 'all')? "click to draw" : "click when done drawing")
      draw.click(function(){
        if (qv.brushStatus() == 'all') {
          qv.disableBrush();
          qv.dv.enable();
          draw.addClass("drawing");
          draw.text("click when done drawing");
        } else {
          qv.enableBrush();
          qv.dv.disable();
          draw.removeClass("drawing");
          draw.text("click to draw");
        }
      });


      this.$('#scorpion_submit').click(function(){
        if (model.isValid()) {
          console.log(_this.model.get('erreqs'));
          console.log(_this.model.get('badselection'));
          var wait = $("#scorpion-wait").show();
          model.fetch({
            data: {
              json: JSON.stringify(model.toJSON()) ,
              db: model.get('query').get('db')
            }, 
            type: 'POST',
            success: function() { 
              wait.hide(); 
              _this.$el.fadeOut(); 
              _this.$("#errmsg").text(resp.errormsg || '');
            },
            error: function(resp) { 
              wait.hide(); 
              _this.$("#errmsg").text(resp.errormsg || '');
            }
          });
        } else {
          _this.$("#errmsg").html(model.validationError);
        }
      });


      return this;
    },


  });

  return ScorpionView;
});

