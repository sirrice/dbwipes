// 
define(function(require) {
  var Handlebars = require('handlebars'),
      Backbone = require('backbone'),
      d3 = require('d3'),
      $ = require('jquery'),
      util = require('summary/util');

  var Task = Backbone.Model.extend({
    defaults: function() {
      return {
        id: -1,
        text: "",
        options: [],      // [ "text", "text",... ]
        textbox: false,   // setting this to True overrides .options
        truth: -1,        // a value or a function(answer, Task)
        answer: -1,
        successText: "Nice!  You'll see the next task in 2...1..."
      }
    },

    validate: function() {
      var truth = this.get('truth'),
          answer = this.get('answer');

      if (_.isFunction(truth)) {
        return truth(answer, this);
      }
      if (this.get('textbox')) {
        return _.isEqual(
          String(truth).trim().toLowerCase(),
          String(answer).trim().toLowerCase()
        );
      } else {
        return truth == answer;
      }
    },

    toJSON: function() {
      var json = _.clone(this.attributes);
      json.options = _.map(json.options, function(text, idx) {
        return { text: text, idx: idx }
      });
      return json;
    }

  });

  return Backbone.View.extend({
    className: "task",

    events: {
      'click .submit':              'onSubmit',
      'mousedown input[name=text]': 'onMouseDown',
      'click input[type=radio]':    'onOption'
    },

    template: Handlebars.compile($("#task-template").html()),

    initialize: function(attrs) {
      this.model = new Task(attrs);
      _.each((attrs.on || {}), function(f, name) {
        this.on(name, f);
      }, this);
    },

    onOption: function(ev) {
      var el = $(ev.target);
      var idx = el.val();
      this.model.set('answer', idx);
    },

    onMouseDown: function(ev) {
      this.model.set('answer', this.$("input[name=text]").val());
    },


    onSubmit: function() {
      var isvalid = this.model.validate();
      if (isvalid == true) {
        this.$(".error")
          .removeClass("bs-callout-danger")
          .addClass('bs-callout-info')
          .text(this.model.get('successText'))
          .show()
        this.trigger('submit', this);
      } else {
        var text = (isvalid == false)? "That answer doesn't seem right": isvalid;
        this.$(".error").text(text).show();
      }
    },

    render: function() {
      this.$el.html(this.template(this.model.toJSON()));
      return this;
    },

    show: function() {
      $(this.model.get('attachTo')).append(this.render().el);
      this.$el.show();
      this.trigger('show', this);
    },

    hide: function() {
      this.$el.hide().remove();
      this.trigger('hide', this);
    }

  });
});
 
