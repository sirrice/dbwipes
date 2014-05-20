define(function(require) {
  var Backbone = require('backbone'),
      Handlebars = require('handlebars'),
      $ = require('jquery'),
      d3 = require('d3'),
      _ = require('underscore'),
      Where = require('summary/where'),
      util = require('summary/util');


  var Drawing = Backbone.Model.extend({
    defaults: function() {
      return {
        isDrawing: false,
        path: []
      };
    }
  });

  var DrawingView = Backbone.View.extend({
    tagName: "div",

    // expect state
    initialize: function(attrs) {
      this.model = new Drawing()
      this.state = attrs.state || {w: 500, h: 500};
    },


    renderPath: function() {
      this.d3path.attr('d', this.d3line(this.model.get('path')))
    },


    renderDrawing: function() {
      this.$el.empty();

      var d3svg = this.d3svg = d3.select(this.el).append("svg")
        .classed("drawingpane", true)
        .attr("width", this.state.w)
        .attr("height", this.state.h)

      var g = this.d3g = d3svg.append('g')
        .style("pointer-events", "all")
        .on('mousedown', this.onDown.bind(this))
        .on('mousemove', this.onMove.bind(this))
        .on('mouseup', this.onUp.bind(this))

      g.append("rect")
        .style("visibility", "hidden")
        .attr("width", this.state.w)
        .attr("height", this.state.h)

      var line = this.d3line = d3.svg.line()
        .x(function(d) { return d[0] })
        .y(function(d) { return d[1] })
        .interpolate('basis');

      var path = this.d3path = g.append('path')
        .style({
          'stroke': 'black', 
          'stroke-width': '3px', 
          'fill': 'none'
        });
    },

    onDown: function() {
      this.model.set({
        isDrawing: true,
        path: []
      });
      this.renderPath();
    },

    onMove: function() {
      if (!this.model.get("isDrawing")) 
        return;

      var xy = d3.mouse(this.d3g[0][0]),
          path = this.model.get("path");

      if (path.length > 1) {
        var diff = path[path.length-1][0] - path[path.length-2][0];
        if ((xy[0] - path[path.length-1][0])*diff > 0) {
          path.push(xy);
          this.renderPath();
        }
      } else if (path.length == 1) {
        var diff = xy[0] - path[path.length-1][0];
        if (diff != 0) {
          path.push(xy);
          this.renderPath();
        }
      } else {
        path.push(xy);
        this.renderPath();
      }

    },

    onUp: function() {
      if (!this.model.get('isDrawing')) 
        return;
      if (this.model.get("path").length <= 1) 
        this.model.get("path", [])
      this.model.set("isDrawing", false);
    },


    status: function() { 
      return this.d3g.style('pointer-events'); 
    },

    disable: function() { 
      return this.d3g.style('pointer-events', 'none') 
    },

    enable: function() { 
      return this.d3g.style('pointer-events', 'all') 
    },

    render: function() {
      this.renderDrawing();
      return this;
    }
  });

  return DrawingView;

});




