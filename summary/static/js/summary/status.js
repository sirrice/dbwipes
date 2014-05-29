define(function(require) {
  var Handlebars = require('handlebars'),
      Backbone = require('backbone'),
      d3 = require('d3'),
      $ = require('jquery');
  
  var Status = Backbone.Model.extend({
    url: '/api/status',

    defaults: function() {
      return {
        requestid: null,
        status: ''
      };
    },

    initialize: function() {
    },
    
    parse: function(resp) {
      return resp;
    },

    toJSON: function() {
      return {
        requestid: this.get('requestid')
      };
    }
  });

  var StatusView = Backbone.View.extend({
    tagName: 'div',
    initialize: function(attrs) {
      var requestid = attrs.requestid
      this.state = { running: true };
      this.model = new Status({ requestid: requestid });
      this.listenTo(this.model, "change", this.render.bind(this));
      this.loadStatus();
    },
  
    loadStatus: function() {
      if (!this.state.running) {
        this.model.set('status', '');
        return;
      }
     var onSuccess = (function() {
        _.delay(this.loadStatus.bind(this), 200)
      }).bind(this) ;

      this.model.fetch({
        data: this.model.toJSON(),
        success: onSuccess,
        error: onSuccess
      })
    },

    render: function() {
      var span = this.$el.append("span")
      span
        .addClass("status")
        .text(this.model.get('status'))
      return this;
    }
  });
  return StatusView;
});

 
