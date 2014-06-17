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
    'tether': {
      exports: 'Tether'
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
    'shepherd': {
      deps: ['jquery', 'tether', 'backbone'],
      exports: 'Shepherd'
    }
  }
});

// Start the main app logic.
requirejs([
  'jquery', 'd3',
  'summary/util',
  'summary/task',
  'summary/setup',
  'underscore',
  'shepherd',
  'bootstrap'
  ], function ($, d3, util, TaskView, setup,  _, Shepherd) {

  $ = require('bootstrap');

  var enableScorpion = window.enableScorpion = false;
  setup.setupBasic();
  setup.setupButtons(window.q, window.qv);
  setup.setupTuples(window.q, null, window.where);



  // TODO:
  // ask users to answer some questions
  // 1) single attribute filtering query
  // 2) multi-attribute filtering query
  // 3) rejection query to understand an outlier
  // 4) multiattribute rejection query
  //
  //
  // then for summary3
  // 1) introduce scorpion as a tool to explain outliers
  // 2) how how to highlight some stuff
  // 3) add examples
  // 4) add negative examples
  // 5) point to partial results
  // 6) clicking to lock predicates

  var qobj = {
    x: 'day',
    ys: [
      {col: 'amt', expr: "sum(amt)", alias: 'sum'},
    ],
    schema: {
      x: 'num',
      amt: 'num'
    },
    table: 'simple' ,
    db: 'test'
  };
  q.set(qobj);




  var tasks = [
    new TaskView({
      text: "<p>Which gender has higher total sum of sales on day 0?</p>",
      options: [ 'Male', 'Female', 'They are equal'],
      truth: 1,
      attachTo: '#tasks div.col-md-12'
    }),
    new TaskView({
      text: "<p>Which gender has higher total sum of sales on day 9?</p>",
      options: [ 'Male', 'Female', 'They are roughly equal'],
      truth: 0,
      attachTo: '#tasks div.col-md-12'
    }),
    new TaskView({
      text: "<p>Which state most contributes to the rising sales?</p>",
      textbox: true,
      truth: 'CA',
      attachTo: '#tasks div.col-md-12',
      successText: "One more question!"
    }),
    new TaskView({
      text: "<p>Which gender has a higher number (count) of California sales overall?</p>",
      options: [ 'Male', 'Female', 'They are roughly equal'],
      truth: 0,
      attachTo: '#tasks div.col-md-12',
      successText: "Nice!  You're all done!"
    })

  ];
  _.each(tasks, function(task, idx) {
    var prefix = (idx+1) + " of " + tasks.length;
    var title = task.model.get('title') || "";
    task.model.set('title', prefix + " " + title);
    task.on('submit', function() {
      task.hide();
      if (tasks[idx+1]) {
        tasks[idx+1].show();
      } else {
        tour.show('end');
      }
    });
  })

  var tour = new Shepherd.Tour({
    defaults: { classes: "shepherd-element shepherd-open shepherd-theme-arrows"}
  });

  var btns = [{
      text: 'Back',
      action: tour.back
    },{
      text: 'Next',
      action: tour.next
    }];
  var step;


  step = tour.addStep('start', {
    title: "Validation",
    text: "<p>This is a randomly generated dataset of sales over a 10 day period.  The attributes in the dataset include the day, the amount spent, and customer age range, gender, and state.</p>"+
          "<p>We will ask you to answer a few questions about this dataset using the baseline scorpion tool.</p>"+
          "<p>When you are ready, click Next.</p>",
    classes: "shepherd shepherd-open shepherd-theme-arrows shepherd-transparent-text",
    style: { width: "500px" },
    buttons: [{
      text: "Next",
      action: function() {
        $("div.row").css("opacity", 1); 
        tasks[0].show();
        tour.cancel();
      }
    }]
  });
  step.on("show", function() { $("div.row").css("opacity", 0.6); });

  
  step = tour.addStep('end', {
    title: "Great Job!",
    text: "<p>You will notice that many of these questions involved understanding why the total sales rose over the 10 days.</p>"+
          "<p>Scorpion's automated tools are designed for answering these types of questions.</p>"+
          "<p>The next section will introduce you to the Scorpion automated explanation tool.</p>",
    classes: "shepherd shepherd-open shepherd-theme-arrows shepherd-transparent-text",
    style: { width: "500px" },
    buttons: [{
      text: 'Exit',
      action: tour.cancel
    }]
  });
  step.on("show", function() { $("div.row").css("opacity", 0.6); });
  step.on("hide", function() { 
    window.location = '/dir/';
  });



  tour.start();
  window.tour = tour;

});
