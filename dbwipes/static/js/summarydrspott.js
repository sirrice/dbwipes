requirejs.config({
  //By default load any module IDs from js/lib
  baseUrl: '/static/js/lib',

  //except, if the module ID starts with "app",
  //load it from the js/app directory. paths
  //config is relative to the baseUrl, and
  //never includes a ".js" extension since
  //the paths config could be for a directory.
  paths: {
    summary: '../summary'
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
  }
});

// Start the main app logic.
requirejs([
  'jquery', 'd3',
  'summary/util',
  'summary/setup',
  'bootstrap',
  'bootstrap-slider'
  ], function ( $, d3, util, setup) {

  $ = require('bootstrap-slider');

  setup.setupBasic();
  setup.setupButtons(window.q, window.qv);
  setup.setupScorpion(window.enableScorpion, window.q, window.qv, window.where);
  setup.setupTuples(window.q, window.srv, window.where);


  var q = {
    x: 'week_start_date',
    ys: [ { col: 'job_count', expr: 'sum(job_count)'} ],
    schema: {
      week_start_date: 'timestamp',
      job_count: 'num'
    },
    table: 'sample',
    db: 'bt'
  };

  window.q.set(q);
});
