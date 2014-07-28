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
           'bootstrap',
           'bootstrap-slider'
  ], function ($, d3, util, setup, TaskView, _, Shepherd) {

  $ = require('bootstrap-slider');



  setup.setupBasic();
  setup.setupButtons(window.q, window.qv);
  setup.setupScorpion(window.enableScorpion, window.q, window.qv, window.where);
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
  }, {
    text: 'Next',
    classes: 'disabled next-btn',
    action: function() {}
  }];
  var step;


  var addStep = (function(tour) {
    var defaults = {
      title: "",
      text: null,
      highlight: true,
      buttons: btns,
      classes: "shepherd shepherd-open shepherd-theme-arrows shepherd-transparent-text",
      style: { width: 500 }
    }
    return function(name, opts) {
      opts = _.extend(_.clone(defaults), opts)
      opts.text || (opts.text = $("#"+name).html());
      return tour.addStep(name, opts);
    };
  })(tour);




  step = addStep('start', {
    title: "DBWipes Scorpion Extension",
    text: $("#start").html(),
    buttons: [{ 
      text: "Next",
      action: tour.next
    }]
  });
  step.on("show", function() { $("div.row").css("opacity", 0.6); });
  step.on("hide", function() { $("div.row").css("opacity", 1); });

  step = addStep('intro', {
    title: "Introduction",
    text: "<p>The visualization has been augmented with the ability to select results by clicking and dragging regions that you want to select.</p>" +
          "<p>Click Next for an example selection.</p>",
    attachTo: "#viz left",
    scrollTo: true,
    buttons: [{
      text: 'Back',
      action: tour.back
    }, {
      text: "Next",
      action: function() {
        qv.gbrush.call(qv.d3brush.extent([[5.3, 60000], [9.5, 81000]]))
        qv.d3brush.event(qv.gbrush);
        _.delay(tour.show.bind(tour), 50, 'sq');
      }
    }]

  });

  step = addStep('sq', {
    title: "Scorpion Query",
    text: "<p>Whenever you select something in the visualization, this dialog will pop up.</p>"+
          "<p>It asks you to specify something about the points you just selected.</p>",
    attachTo: "div.walkthrough right"
  });

  step = addStep('sq-npoints', {
    title: "Scorpion Query",
    text: "<p>At the top, it always tells you how many points you have selected.</p>",
    attachTo: "#selectionmsg right"
  });



  step = addStep('sq-bad', {
    title: "Scorpion Query",
    attachTo: "div.walkthrough #addbad right",
    buttons: backbtn
  });
  step.on("show", (function(step) {
    return function() {
      $("#addbad").click(function() {
        $(step.el).find(".next-btn")
          .removeClass('disabled')
          .click(tour.next.bind(tour));
      });
    }
  })(step));



  step = addStep('sq-brush', {
    title: "Scorpion Query",
    text: "<p>Select some good results whose values seem normal.</p>" +
          "<p><i>Select days 0 to 2</i> and click Next when you are done.</p>" +
          "<p class='bg-danger' id='sq-brush-err' style='display: none'></p>",
    attachTo: "#viz left",
    buttons: backbtn,
  });
  step.on('show', (function(step) {
    return function() {
      var f = function() { 
        var sel = window.sq.get('selection') || {amt:[]};
        var selected = _.chain(sel.amt || []).pluck('day').value();
        var missing = _.difference([0,1,2], selected);
        var extras = _.difference(selected, [0,1,2]);
        console.log(selected)
        if (missing.length == 0 && extras.length == 0) {
          $("#sq-brush-err")
            .removeClass("bg-danger")
            .addClass("bg-success")
            .text("Great job!").show();
          $(step.el).find(".next-btn")
            .removeClass('disabled')
            .click(function() {
              window.qv.off('change:selection', f);
              tour.show('sq-good');
            });
          //_.delay(tour.show.bind(tour), 1000, 'sq-good'); 
          return;
        } else {
          var msg = _.compact([
            ((extras.length > 0)? "remove days " + extras.join(', ') : null),
            ((missing.length > 0)? "select days " + missing.join(', '): null)
          ]).join(" and ");
          msg = "Please make sure to " + msg + ".";

          $("#sq-brush-err")
            .removeClass("bg-success")
            .addClass("bg-danger")
            .text(msg)
            .show();
          $(step.el).find(".next-btn")
            .addClass('disabled')
            .click(null);

        }
      };
      window.qv.on('change:selection', f);
    };
  })(step));

  step = addStep('sq-good', {
    title: "Scorpion Query",
    attachTo: "div.walkthrough #addgood right",
    buttons: backbtn,
  });
  step.on("show", (function(step) {
    return function() {
      $("#addgood").click(function() {
        $(step.el).find(".next-btn")
          .removeClass('disabled')
          .click(tour.next.bind(tour));
      });
    }
  })(step));



  step = addStep('sq-submit', {
    title: "Scorpion Query",
    text: $("#sq-submit").html(),
    attachTo: "#scorpion_submit right",
    buttons: backbtn,
  });
  step.on("show", (function(step) {
    return function() {
      $("#scorpion_submit").click(function() {
        $(step.el).find(".next-btn")
          .removeClass('disabled')
          .click(tour.show.bind(tour, 'psrs'));
      });
    }
  })(step));

  step = addStep('psrs', {
    title: "Scorpion Partial Results",
    text: $("#psrs").html(),
    attachTo: "#all-scorpion-results-container left",
    tetherOptions: {
      attachment: 'top left',
      targetAttachment: 'top right',
      offset: '10px 10px'
    },
    buttons: [{
      text: "Back",
      action: tour.back
    }, {
      text: "Next",
      classes: "disabled next-btn",
      action: function() {
        if (window.scorpionReturned) {
          tour.show('srs-1');
        }
      }
    }] 
  });

  (function(step) {
    window.sqv.on('scorpionquery:done', function() {
      window.sqv.off('scorpionquery:done');
      window.scorpionReturned = true;
      $("#psrs-info").show();
      $(step.el).find('.next-btn')
        .removeClass("disabled")  
        .click(tour.next.bind(tour));
    });
  })(step);


  var scorpionReturned = false;
  step.on("show", function() {
    $(".psrs-next-btn").removeClass("shepherd-button").addClass("shepherd-button-secondary");
  });


  step = addStep('srs-1', {
    title: "Scorpion Final Results",
    attachTo: "#all-scorpion-results-container right",
    tetherOptions: {
      attachment: 'top left',
      targetAttachment: 'top right',
      offset: '10px 10px'
    }
  });


  step = addStep('srs-2', {
    title: "Varying &lambda;",
    attachTo: "#slider-container left",
  });

  step = addStep('srs-3', {
    title: "Showing Best Overall Filters",
    attachTo: "#scorpion-showbest top",
  });

  step = addStep('srs-4', {
    title: "Locking Result Filters",
    attachTo: "#all-scorpion-results-container left",
  });



  step = addStep('srs-remove', {
    title: "How Much Influence?",
    attachTo: "#selection-type left",
    tetherOptions: {
      attachment: 'top right',
      targetAttachment: 'top left',
      offset: '10px -10px'
    }
  });


  step = addStep('checkboxes', {
    title: "Ignoring Attributes",
    attachTo: ".errcol right",
    buttons: backbtn,
    tetherOptions: {
      attachment: 'top right',
      targetAttachment: 'top left',
      offset: '10px -10px'
    }
  });
  step.on('show', function() {
    $(".cstat-label .type").css("box-shadow", "rgb(18, 179, 255) 0px 0px 10px 0px");
  });
  step.on('hide', function() {
      $(".cstat-label .type").css("box-shadow", "none");
  });
  step.on("show", (function(step) {
    return function() {
      $("#cstat-age input[type=checkbox]").click(function() {
        $(step.el).find(".next-btn")
          .removeClass('disabled')
          .click(tour.next.bind(tour));
      });
    }
  })(step));



  step = addStep('checkboxes-2', {
    title: "Ignoring Attributes",
    attachTo: "#togglescorpion bottom",
    buttons: backbtn
  });
  step.on("show", (function(step) {
    return function() {
      $("#togglescorpion").click(function() {
        $("#togglescorpion").click(null);
        _.delay(_.bind(tour.next, tour), 50);
      });
    }
  })(step));

  step = addStep('checkboxes-3', {
    title: "Ignoring Attributes",
    attachTo: "#scorpion_submit right",
    buttons: backbtn
  });
  step.on("show", (function(step) {
    return function() {
      $("#scorpion_submit").click(function() {
        $("#scorpion_submit").click(null);
        _.delay(_.bind(tour.next, tour), 50);
      });
    }
  })(step));


  step = addStep('checkboxes-4', {
    title: "Ignoring Attributes",
    attachTo: "#all-scorpion-results-container right",
  });

  step = addStep('checkboxes-all', {
    title: "Ignoring Attributes",
    attachTo: "#facet-togglecheckall right",
    tetherOptions: {
      attachment: 'top right',
      targetAttachment: 'top left',
      offset: '10px -10px'
    }
  });

  step = addStep('end', {
    title: "Done!",
    showCancelLink: true,
    buttons: [{
      text: 'Back',
      action: tour.back
    }, {
      text: 'Exit',
      action: function () {
        var completed = +(localStorage['stepCompleted'] || 0);
        localStorage['stepCompleted'] = Math.max(completed, 3)
        window.location = '/study/';
      }
    }],
  });
  step.on("show", function() { $("div.row").css("opacity", 0.6); });
  step.on("hide", function() { $("div.row").css("opacity", 1); });



  tour.start();
  window.tour = tour;

});
