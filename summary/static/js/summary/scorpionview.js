// ScorpionView

define(function(require) {
  var Handlebars = require('handlebars'),
      Backbone = require('backbone'),
      d3 = require('d3'),
      $ = require('jquery'),
      md5 = require('md5'),
      util = require('summary/util'),
      ScorpionQuery = require('summary/scorpionquery'),
      StatusView = require('summary/status');

  var ScorpionView = Backbone.View.extend({
    template: Handlebars.compile($("#scorpion-template").html()),

    events: {
      "click #scorpion_submit":  "onSubmit",
      "click .close":            "onClose",
      "click #addbad":           "onAddBad",
      "click #addgood":          "onAddGood",
      "click #clearbad":         "onClearBad",
      "click #cleargood":        "onClearGood",
      "click #draw":             "onDrawToggle"

    },

    initialize: function(attrs) {
      this.queryview = attrs.queryview;
      this.donetext = "click when done drawing";
      this.drawtext = "click to draw expected values for selected results";

      this.listenTo(this.model, 'change', this.onChange);
    },

    onChange: function() {
      if (this.model.count('selection') == 0) return;
      this.render();
      this.$el.show();
    },

    onResult: function(resp) {
      $("#scorpion-wait").hide();
      if (this.statusview) {
        this.statusview.state.running = false;
        this.statusview.$el.remove();
        this.statusview = null;
      }
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
      var _this = this;
      console.log(this.model.get('erreqs'));
      console.log(this.model.get('badselection'));

      var ignore_cols = $("input.errcol")
        .map(function(idx, el) { 
          if (!el.checked) return el.value;
        });
      ignore_cols = _.compact(ignore_cols);
      this.model.set('ignore_cols', ignore_cols);

      $.get('/api/requestid', function(resp) {
        var requestid = resp.requestid;
        var wait = $("#scorpion-wait").show();
        _this.model.fetch({
          data: {
            fake: false,
            requestid: requestid,
            json: JSON.stringify(_this.model.toJSON()) ,
            db: _this.model.get('query').get('db')
          }, 
          type: 'POST',
          success: _this.onResult.bind(_this),
          error: _this.onResult.bind(_this)
        });
        _this.statusview = new StatusView({ requestid: requestid });
        _this.statusview.render();
        $("#scorpion_status").append(_this.statusview.$el);
      }, 'json')
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
    onDrawToggle: function() {
      var draw = this.$("#draw")
          qv = this.queryview;
      
      if (qv.brushStatus() == 'all') {
        qv.disableBrush();
        qv.dv.enable();
        draw.addClass("drawing");
        draw.text(this.donetext);
      } else {
        qv.enableBrush();
        qv.dv.disable();
        draw.removeClass("drawing");
        draw.text(this.drawtext);
      }
    },

    render: function() {
      var _this = this,
          model = this.model;

      this.$el.attr("id", "walkthrough-container");
      this.$el.empty().html(this.template(this.model.toJSON()));

      var draw = this.$("#draw");
      var qv = this.queryview;
      draw.text((qv.brushStatus() == 'all')? this.drawtext : this.donetext);

      return this;
    },


  });

  return ScorpionView;
});

