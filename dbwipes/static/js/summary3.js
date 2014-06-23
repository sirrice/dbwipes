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
      text: "",
      highlight: true,
      buttons: btns,
      classes: "shepherd shepherd-open shepherd-theme-arrows shepherd-transparent-text",
      style: { width: 500 }
    }
    return function(name, opts) {
      opts = _.extend(_.clone(defaults), opts)
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
        qv.gbrush.call(qv.d3brush.extent([[5.3, 58000], [9.5, 75000]]))
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
    text: "<p>This button will add your selected points as examples of results whose values are wrong (either too high or too low)</p>" +
          "<p>Since we are interested in why the sales have gone up, click on <span class='btn btn-danger btn-xs'>examples of outlier values</span></p>",
    attachTo: "div.walkthrough #addbad right",
    advanceOn: "#addbad click",
    buttons: backbtn
  });

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
        if (missing.length == 0 && extras.length == 0) {
          $("#sq-brush-err")
            .removeClass("bg-danger")
            .addClass("bg-success")
            .text("Great job!").show();
          window.qv.off('change:selection', f);
          console.log($(step.el).find(".next-btn"))
          $(step.el).find(".next-btn")
            .removeClass('disabled')
            .click(tour.next.bind(tour));
          //_.delay(tour.show.bind(tour), 1000, 'sq-good'); 
          return;
        } else {
          var msg = _.compact([
            ((extras.length > 0)? "remove days " + extras.join(', ') : null),
            ((missing.length > 0)? "select days " + missing.join(', '): null)
          ]).join(" and ");
          msg = "Please make sure to " + msg + ".";

          $("#sq-brush-err")
            .text(msg)
            .show();
        }
      };
      window.qv.on('change:selection', f);
    };
  })(step));

  step = addStep('sq-good', {
    title: "Scorpion Query",
    text: "<p>This button will add your selected points as examples of results whose values are OK</p>" +
          "<p>Scorpion will compute the values of the average bad point and the average good point to decide if the bad points' values are too high or too low.</p>" +
          "<p>Go ahead and click on <span class='btn btn-success btn-xs'>examples of good values</span></p>",
    attachTo: "div.walkthrough #addgood right",
    buttons: backbtn,
    //advanceOn: "#addgood click"
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
          .click(tour.next.bind(tour));
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
      class: "shepherd-button-secondary psrs-next-btn",
      action: function() {
        if (window.scorpionReturned) {
          tour.show('srs-1');
        }
      }
    }] 
  });

  window.sqv.on('scorpionquery:done', function() {
    window.sqv.off('scorpionquery:done');
    window.scorpionReturned = true;
    $("#psrs-info").show();
    $(".psrs-next-btn").removeClass("shepherd-button-secondary").addClass('shepherd-button');
  });

  var scorpionReturned = false;
  step.on("show", function() {
    $(".psrs-next-btn").removeClass("shepherd-button").addClass("shepherd-button-secondary");
  });


  step = addStep('srs-1', {
    title: "Scorpion Final Results",
    text: $("#srs-1").html(),
    attachTo: "#all-scorpion-results-container left",
    tetherOptions: {
      attachment: 'top left',
      targetAttachment: 'top right',
      offset: '10px 10px'
    }
  });

  step = addStep('srs-remove', {
    title: "How Much Influence?",
    text: "<p>Try switching this to <span style='font-family: arial; font-weight: bold;'><span style='background:#D46F6F; border-radius: 4px; width: 2em;'>&nbsp;&nbsp;&nbsp;&nbsp;</span><b style='background:whitesmoke; color: black; padding-left: 10px; padding-right: 10px;'>remove</b></span>.</p>"+
          "<p>Now try hovering over a Scorpion result.   The visualization now shows what would happen if the records matching the result did not exist.  This is a proxy for how much those records <i>influenced</i> the final result.</p>",
    attachTo: "#selection-type right",
    tetherOptions: {
      attachment: 'top right',
      targetAttachment: 'top left',
      offset: '10px -10px'
    }
  });


  step = addStep('checkboxes', {
    title: "Ignoring Attributes",
    text: "<p>You can uncheck the checkboxes next to each attribute to remove them from consideration.</p>"+
          "<p>This is useful if you know that certain attributes are not interesting, or if you want to restrict the results to filters over a small number of attributes.</p>",
    attachTo: ".errcol right",
    tetherOptions: { 
      attachment: 'top right',
       targetAttachment: 'top left',
      offset: '19px -10px' 
    }
  });
  step.on('show', function() {
      $(".cstat-label .type").css("box-shadow", "rgb(18, 179, 255) 0px 0px 10px 0px");
  });
  step.on('hide', function() {
      $(".cstat-label .type").css("box-shadow", "none");
  });


  step = addStep('checkboxes-all', {
    title: "Ignoring Attributes",
    text: "<p>For convenience, you can click this button to uncheck all of the attributes at once.</p>",
    attachTo: "#facet-togglecheckall right",
    tetherOptions: {
      attachment: 'top right',
      targetAttachment: 'top left',
      offset: '10px -10px'
    }
  });



  step = addStep('end', {
    title: "Done!",
    text: "<p>You have just finished a tour of Scorpion!</p>"+
          "<p>Now we will ask you to to participate in the user study by analyzing a few datasets with and without the automated tool.</p>"+
          "<p>Please press Exit to go back to the main directory when you are ready.</p>",
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
  });
  step.on("show", function() { $("div.row").css("opacity", 0.6); });
  step.on("hide", function() { $("div.row").css("opacity", 1); });



  tour.start();
  window.tour = tour;

});
