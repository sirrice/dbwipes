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
    }
  }
});

// Start the main app logic.
requirejs([
  'jquery', 'd3',
  'summary/util',
  'summary/setup',
  'bootstrap'
  ], function ( $, d3, util, setup) {

  $ = require('bootstrap');

  setup.setupBasic();
  setup.setupButtons(window.q, window.qv);
  setup.setupScorpion(window.enableScorpion, window.q, window.qv, window.where);
  setup.setupTuples(window.q, window.srv, window.where);


  var intelq = {
    x: 'hr',
    ys: [
      {col: 'temp', expr: "avg(temp)", alias: 'avg'},
      {col: 'temp', expr: "stddev(temp)", alias: 'std'}
    ],
    schema: {
      hr: 'timestamp',
      temp: 'num'
    },
    where: '',
    table: 'readings' ,
    db: 'intel'
  };

  var btq = {
    x: 'week_start_date',
    ys: [ { col: 'job_count', expr: 'sum(job_count)'} ],
    schema: {
      week_start_date: 'timestamp',
      job_count: 'num'
    },
    table: 'sample',
    db: 'bt'
  };

  var ppq = {
    //x: 'provider',
    x: 'hcpscd1',
    ys: [ { col: 'pmt_amt', expr: 'sum(pmt_amt)'} ],
    schema: {
      x: 'str',
      'pmt_amt': 'num'
    },
    table: 'inp',
    db: 'penispros'
  };

  var medq = {
    //x: 'provider',
    x: 'ccm_payor',
    ys: [ { col: 'total_cost', expr: 'sum(total_cost)'} ],
    schema: {
      x: 'str',
      'total_cost': 'num'
    },
    table: 'lqm',
    db: 'med'
  };

  var fecq = {
    x: 'disb_dt',
    ys: [{col: 'disb_amt', expr: 'sum(disb_amt)'}],
    schema: {
      disb_dt: 'timestamp',
      disb_amt: 'num'
    },
    table: 'expenses',
    db: 'fec12'
  };

  var sigmodq = {
    x: 'g',
    ys: [{col: 'v', expr: 'sum(v)'}],
    schema: {
      g: 'num',
      v: 'num'
    },
    table: 'data_3_3_1000_0d50_80uo',
    db: 'sigmod'
  };


  $("#q-load-bt").click(function() { 
    q.set(btq);
  });
  $("#q-load-intel").click(function() { 
    q.set(intelq);
  });
  $("#q-load-pp").click(function() { 
  // q.set(ppq);
    q.set(sigmodq)
  });
  $("#q-load-med").click(function() { 
    q.set(medq);
  });
  $("#q-load-fec").click(function() { 
    q.set(fecq);
  });



  q.set(intelq);
});
