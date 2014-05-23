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

    events: {
      "click #scorpion_submit":  "onSubmit",
      "click .close":            "onClose",
      "click #addbad":           "onAddBad",
      "click #addgood":          "onAddGood",
      "click #clearbad":         "onClearBad",
      "click #cleargood":        "onClearGood",
      "click #schema":           "onToggleSchema",
      "click #uncheck-schema":   "onUncheckSchema",
      "click #draw":             "onDrawToggle"

    },

    initialize: function(attrs) {
      this.queryview = attrs.queryview;
      this.listenTo(this.model, 'change', this.onChange);
    },

    onChange: function() {
      if (this.model.count('selection') == 0) return;
      this.render();
      this.$el.show();
    },

    onResult: function(resp) {
      console.log(resp)
      $("#scorpion-wait").hide();
      if (resp.errmsg) {
        this.$("#errmsg").text(resp.errormsg);
      } else {
        this.$el.fadeOut();
        this.$("#errmsg").text("");
      }
    },


    onSubmit: function() {
      if (!this.model.isValid()) {
        this.$("#errmsg").html(this.model.validationError);
        return false;
      }

      console.log(this.model.get('erreqs'));
      console.log(this.model.get('badselection'));

      var wait = $("#scorpion-wait").show();
      this.model.fetch({
        data: {
          json: JSON.stringify(this.model.toJSON()) ,
          db: this.model.get('query').get('db')
        }, 
        type: 'POST',
        success: this.onResult.bind(this),
        error: this.onResult.bind(this)
      });
    },

    onClose: function() {
      this.$el.hide();
    },
    onAddBad: function() {
      this.model.merge('badselection', this.model.get('selection'));
    },
    onAddGood: function() {
      this.model.merge('goodselection', this.model.get('selection'));
    },
    onClearBad: function() {
      this.model.set('badselection', {});
    },
    onClearGood: function() {
      this.model.set('goodselection', {});
    },
    onToggleSchema: function() {
      this.$('#schema').toggle()
    },
    onUncheckSchema: function() {
      this.$('.errcol')
        .get().forEach(function(e){
          e.checked = false;
        });
    },
    onDrawToggle: function() {
      var draw = this.$("#draw")
          qv = this.queryview;
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
    },

    render: function() {
      var _this = this,
          model = this.model;

      this.$el.attr("id", "walkthrough-container");
      this.$el.empty().html(this.template(this.model.toJSON()));

      var draw = this.$("#draw");
      var qv = this.queryview;
      draw.text((qv.brushStatus() == 'all')? "click to draw" : "click when done drawing")

      return this;
    },


  });

  return ScorpionView;
});

