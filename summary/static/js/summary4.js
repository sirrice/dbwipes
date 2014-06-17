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
           'summary/setup',
           'summary/task',
           'underscore',
           'shepherd',
           'bootstrap'
  ], function ($, d3, util, setup, TaskView, _, Shepherd) {

  $ = require('bootstrap');

  var enableScorpion = window.enableScorpion = true;
  setup.setupBasic();
  setup.setupButtons(window.q, window.qv);
  setup.setupScorpion(enableScorpion, window.q, window.qv, window.where);
  setup.setupTuples(window.q, window.srv, window.where);




  var testq1 = {
    x: 'day',
    ys: [{col: 'amt', expr: 'sum(amt)'}],
    schema: {
      x: 'num',
      amt: 'num'
    },
    table: 'test',
    db: 'test'
  };
  var testq2 = _.extend(_.clone(testq1), {
    ys: [{col: 'amt', expr: 'avg(amt)'}]
  })

  q.set(testq1);


  var tasks = [
    new TaskView({
      text: "<p>What subset of the data is most responsible for the increase in sales?</p>",
      textbox: true,
      truth: function(answer) {
        return false;
      },
      attachTo: '#tasks'
    }),
    new TaskView({
      text: "<p>Which gender has a higher number (count) of California sales overall?</p>",
      options: [ 'Male', 'Female', 'They are roughly equal'],
      truth: 0,
      attachTo: '#tasks',
      successText: "Nice!  You're all done!"
    })

  ];
  _.each(tasks, function(task, idx) {
    var prefix = (idx+1) + " of " + tasks.length;
    var title = task.model.get('title') || "";
    task.model.set('title', prefix + " " + title);
    task.on('submit', function() {
      _.delay(function() {
        task.hide();
        if (tasks[idx+1]) {
          tasks[idx+1].show();
        } else {
          tour.show('end');
        }
      }, 2000);
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
  var backbtn = [{
    text: 'Back',
    action: tour.back
  }];
  var step;


  step = tour.addStep('start', {
    title: "Validation",
    text: "<p>This is a slightly more complex synthetic sales dataset.  The attributes include the day, the amount spent, and customer age range, gender, and state.</p>"+
          "<p>We will ask you to answer a few questions about this dataset <i>without</i> access to the automated Scorpion tool.</p>"+
          "<p>When you are ready, click Next.</p>",
    classes: "shepherd shepherd-open shepherd-theme-arrows shepherd-transparent-text",
    style: { width: 600 },
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
  step.on("hide", function() { $("div.row").css("opacity", 1); });


  step = tour.addStep('end', {
    title: "Done!",
    text: "<p>That's it for a tour of Scorpion!</p>"+
          "<p>Now we will ask you to analyze a few datasets with and without the automated tool.</p>"+
          "<p>Please press Exit to go back to the main directory when you are ready.</p>",
    classes: "shepherd shepherd-open shepherd-theme-arrows shepherd-transparent-text",
    showCancelLink: true,
    buttons: [{
      text: 'Back',
      action: tour.back
    }, {
      text: 'Exit',
      action: function () {
        window.location = '/dir/';
      }
    }],
    style: { width: "500px" }
  });
  step.on("show", function() { $("div.row").css("opacity", 0.6); });
  step.on("hide", function() { $("div.row").css("opacity", 1); });



  tour.start();
  window.tour = tour;

});
