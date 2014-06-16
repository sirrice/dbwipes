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




  var testq = {
    x: 'day',
    ys: [{col: 'amt', expr: 'sum(amt)'}],
    schema: {
      x: 'num',
      amt: 'num'
    },
    table: 'simple',
    db: 'test'
  };

  q.set(testq);





  var tasks = [
    new TaskView({
      text: "<p>Which gender has higher total sum of sales on day 0?</p>",
      options: [ 'Male', 'Female', 'They are equal'],
      truth: 0,
      attachTo: '#tasks'
    }),
    new TaskView({
      text: "<p>Which gender has higher total sum of sales on day 9?</p>",
      options: [ 'Male', 'Female', 'They are roughly equal'],
      truth: 1,
      attachTo: '#tasks'
    }),
    new TaskView({
      text: "<p>Which state most contributes to the rising sales?</p>",
      textbox: true,
      truth: 'CA',
      attachTo: '#tasks',
      successText: "Nice!  You're all done!"
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
  var backbtn = [{
    text: 'Back',
    action: tour.back
  }];
  var step;


  step = tour.addStep('start', {
    title: "Validation",
    text: "<p>This is a randomly generated dataset of sales over a 10 day period.  The attributes in the dataset include the day, the amount spent, and customer age range, gender, and state.</p>"+
          "<p>We will ask you to answer a few questions about this dataset using the baseline scorpion tool.</p>"+
          "<p>When you are ready, click Next.</p>",
    classes: "shepherd shepherd-open shepherd-theme-arrows shepherd-transparent-text",
    style: { width: "500px" },
  });
  step.on("show", function() { $("div.row").css("opacity", 0.6); });
  step.on("hide", function() { $("div.row").css("opacity", 1); });

  step = tour.addStep('intro', {
    title: "Introduction",
    text: "<p>Rather than manually searching the data ourselves, Scorpion lets you directly ask questions about result values</p>"+
          "<p>The visualization has been augmented with the ability to select results</p>" +
          "<p>Click Next for an example selection.</p>",
    highlight: true,
    attachTo: "#viz left",
    classes: "shepherd shepherd-open shepherd-theme-arrows shepherd-transparent-text",
    style: { width: "500px" },
    buttons: [{
      text: "Next",
      action: function() {
        qv.gbrush.call(qv.d3brush.extent([[5.5, 230000],[9.5, 245501]]))
        qv.d3brush.event(qv.gbrush);
        _.delay(tour.show.bind(tour), 50, 'sq');
      }
    }]


  });

  step = tour.addStep('sq', {
    title: "Scorpion Query",
    text: "<p>Whenever you select something in the visualization, this dialog will pop up.</p>"+
          "<p>It asks you to specify something about the points you just selected.</p>",
    attachTo: "div.walkthrough right",
    highlight: true,
    classes: "shepherd shepherd-open shepherd-theme-arrows shepherd-transparent-text",
    style: { width: "500px" },
  });

  step = tour.addStep('sq-npoints', {
    title: "Scorpion Query",
    text: "<p>At the top, it always tells you how many points you have selected.</p>",
    attachTo: "#selectionmsg right",
    highlight: true,
    classes: "shepherd shepherd-open shepherd-theme-arrows shepherd-transparent-text",
    buttons: btns,
    style: { width: "500px" },
  });



  step = tour.addStep('sq-bad', {
    title: "Scorpion Query",
    text: "<p>This button will add your selected points as examples of results whose values are wrong (either too high or too low)</p>" +
          "<p>Since we are interested in why the sales have gone up, go ahead and click on this button</p>",
    attachTo: "div.walkthrough #addbad right",
    highlight: true,
    classes: "shepherd shepherd-open shepherd-theme-arrows shepherd-transparent-text",
    style: { width: "500px" },
    buttons: backbtn,
    advanceOn: "#addbad click"
  });

  step = tour.addStep('sq-brush', {
    title: "Scorpion Query",
    text: "<p>Now select some examples of good points whose values seem normal.</p>" +
          "<p>Select days 0 to 2 and click Next when you are done.</p>",
    attachTo: "#viz left",
    highlight: true,
    classes: "shepherd shepherd-open shepherd-theme-arrows shepherd-transparent-text",
    buttons: backbtn,
    style: { width: "500px" },
  });
  step.on('show', function() {
    var f = function() { 
      tour.show('sq-good'); 
      window.qv.off('change:selection', f);
    };
    window.qv.on('change:selection', f);
  });

  step = tour.addStep('sq-good', {
    title: "Scorpion Query",
    text: "<p>This button will add your selected points as examples of results whose values are OK</p>" +
          "<p>Scorpion will compute the values of the average bad point and the average good point to decide if the bad points' values are too high or too low.</p>" +
          "<p>Go ahead and click on it</p>",
    attachTo: "div.walkthrough #addgood right",
    highlight: true,
    classes: "shepherd shepherd-open shepherd-theme-arrows shepherd-transparent-text",
    style: { width: "500px" },
    buttons: backbtn,
    advanceOn: "#addgood click"
  });

  step = tour.addStep('sq-submit', {
    title: "Scorpion Query",
    text: "<p>Great!  That's all Scorpion needs from you!</p>"+
          "<p>Click submit to let Scorpion do your work!</p>"+
          "<p><a onclick=\"$('#sq-helptext').toggle();\"><small>click me to see what Scorpion will do?</small></a>"+
            "<blockquote id='sq-helptext' style='display: none'>"+
              "<p>When you click submit, Scorpion will look for subsets of the records that can be removed to:"+
                "<ol><li>Drive the bad points you selected as far in the direction of the normal examples as possible.</li>"+
                "<li>Minimize the number of records that need to be deleted</li>"+
                "<li>Minimize how much the normal examples change</li></ol></p>"+
              "<p>Scorpion tries to describe the subsets of records as WHERE clause filtering rules, the same as the ones you create when using the Facets.</p>"+
            "</blockquote>"+
          "</p>",
    attachTo: "#scorpion_submit right",
    highlight: true,
    classes: "shepherd shepherd-open shepherd-theme-arrows shepherd-transparent-text",
    style: { width: "500px" },
    buttons: btns
  });

  step = tour.addStep('psrs', {
    title: "Scorpion Partial Results",
    text: "<p>While Scorpion runs, this section lists the best filters found in the search so far.</p>"+
          "<p>Hovering over any of the rules will apply it to the Facets on the left and also update the visualization above.</p>"+
          "<p>When Scorpion is done, the buttons will turn blue and the next dialog box will appear.</p>"+
          "<p>Until then, feel free to hover and click on these results.  <small>(the list may change at any time.</small></p>",
    attachTo: "#all-scorpion-results-container left",
    highlight: true,
    classes: "shepherd shepherd-open shepherd-theme-arrows shepherd-transparent-text",
    tetherOptions: {
      attachment: 'top left',
      targetAttachment: 'top right',
      offset: '10px 10px'
    },
    style: { width: "500px" },
    buttons: [{ 
      text: 'Back',
      action: tour.back
    }]
  });
  step.on("show", function() {
    window.sqv.on('scorpionquery:done', function() {
      _.delay(tour.show.bind(tour), 50, 'srs');
      window.sqv.off('scorpionquery:done');
    });
  });
  step.on('hide', function() {
    window.sqv.off('scorpionquery:done');
  });


  step = tour.addStep('srs', {
    title: "Scorpion Final Results",
    text: "<p>This is the list of final scorpion results.  Feel free to hover over any of the results.</p>"+
          "<p>Clicking on a result will lock it in place so that moving your cursor away from the result will not reset the filters.  This lets you lock one result in place, and hover over another result for comparison purposes</p>",
    attachTo: "#all-scorpion-results-container left",
    highlight: true,
    classes: "shepherd shepherd-open shepherd-theme-arrows shepherd-transparent-text",
    tetherOptions: {
      attachment: 'top left',
      targetAttachment: 'top right',
      offset: '10px 10px'
    },
    style: { width: "500px" }
  });

  step = tour.addStep('srs-remove', {
    title: "How Much Influence?",
    text: "<p>Try switching this to <span style='font-family: arial; font-weight: bold;'><span style='background:#D46F6F; border-radius: 4px; width: 2em;'>&nbsp;&nbsp;&nbsp;&nbsp;</span><b style='background:whitesmoke; color: black; padding-left: 10px; padding-right: 10px;'>remove</b></span>.</p>"+
          "<p>Hovering over a result will then suggest how much those records 'influenced' the final result.</p>",
    attachTo: "#selection-type right",
    highlight: true,
    classes: "shepherd shepherd-open shepherd-theme-arrows shepherd-transparent-text",
    tetherOptions: {
      attachment: 'top right',
      targetAttachment: 'top left',
      offset: '10px -10px'
    },
    style: { width: "500px" }
  });


  step = tour.addStep('checkboxes', {
    title: "Ignoring Attributes",
    text: "<p>You can uncheck the checkboxes next to each attribute to remove them from consideration.</p>"+
          "<p>This is useful if you know that certain attributes are not interesting, or if you want to restrict the results to filters over a small number of attributes.</p>",
    attachTo: ".errcol right",
    highlight: true,
    classes: "shepherd shepherd-open shepherd-theme-arrows shepherd-transparent-text",
    tetherOptions: { 
      attachment: 'top right',
       targetAttachment: 'top left',
      offset: '19px -10px' 
    },
    style: { width: "500px" }
  });
  step.on('show', function() {
      $(".cstat-label .type").css("box-shadow", "rgb(18, 179, 255) 0px 0px 10px 0px");
  });
  step.on('hide', function() {
      $(".cstat-label .type").css("box-shadow", "none");
  });


  step = tour.addStep('checkboxes-all', {
    title: "Ignoring Attributes",
    text: "<p>For convenience, you can click this button to uncheck all of the attributes at once.</p>",
    attachTo: "#facet-togglecheckall right",
    highlight: true,
    classes: "shepherd shepherd-open shepherd-theme-arrows shepherd-transparent-text",
    tetherOptions: {
      attachment: 'top right',
      targetAttachment: 'top left',
      offset: '10px -10px'
    },
    style: { width: "400px" }
  });



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
