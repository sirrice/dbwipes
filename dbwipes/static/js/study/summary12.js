requirejs.config({
  //By default load any module IDs from js/lib
  baseUrl: '/static/js/lib',

  //except, if the module ID starts with "app",
  //load it from the js/app directory. paths
  //config is relative to the baseUrl, and
  //never includes a ".js" extension since
  //the paths config could be for a directory.
  paths: {
    summary: '../summary',
    study: '../study'
  },

  shim: {
    'backbone': {
      //These script dependencies should be loaded before loading
      //backbone.js
      deps: ['underscore', 'jquery'],
      //Once loaded, use the global 'Backbone' as the
      //module value.
      exports: 'Backbone'
    },
    'underscore': {
      exports: '_'
    },
    'jquery': {
      exports: '$'
    },
    'handlebars': {
      exports: 'Handlebars'
    },
    'bootstrap': {
      deps: ['jquery'],
      exports: '$'
    },
    'bootstrap-slider': {
      deps: ['bootstrap'],
      exports: '$'
    },
    'tether': {
      exports: 'Tether'
    },
    'shepherd': {
      deps: ['jquery', 'tether', 'backbone'],
      exports: 'Shepherd'
    }
  }
});

// Start the main app logic.
requirejs(['jquery', 
           'd3',
           'summary/util',
           'study/setup',
           'summary/task',
           'underscore',
           'shepherd',
           'handlebars',
           'bootstrap',
           'bootstrap-slider'
  ], function ($, d3, util, setup, TaskView, _, Shepherd, Handlebars) {
  $ = require('bootstrap-slider');

  var testq1 = {
    x: 'day',
    ys: [{col: 'amt', expr: 'avg(amt)'}],
    schema: {
      x: 'num',
      amt: 'num'
    },
    table: 'hard2',
    db: 'test'
  };

  var taskprefix = "task12-"+window.enableScorpion+"-";

  var tour = setup.setupAvg(testq1, taskprefix, window.jsidx);
  tour.start();
  window.tour = tour;

});
