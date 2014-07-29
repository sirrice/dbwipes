define(function(require) {
  var Backbone = require('backbone'),
      $ = require('bootstrap'),
      d3 = require('d3'),
      _ = require('underscore'),
      Where = require('summary/where'),
      util = require('summary/util'),
      ScorpionQuery = require('summary/scorpionquery'),
      ScorpionQueryView = require('summary/scorpionview'),
      ScorpionResult = require('summary/scorpionresult'),
      ScorpionResults = require('summary/scorpionresults'),
      ScorpionResultsView = require('summary/scorpionresultsview'),
      TupleView = require('summary/tupleview'),
      DrawingView = require('summary/drawingview'),
      Where = require('summary/where'),
      WhereView = require('summary/whereview'),
      CStat = require('summary/cstat'),
      CStatView = require('summary/cstatview'),
      CStatsView = require('summary/cstatsview'),
      Query = require('summary/query'),
      QueryForm = require('summary/queryform'),
      QueryView = require('summary/queryview'),
      QueryWhereView = require('summary/querywhereview'),
      util = require('summary/util'),
      TaskView = require('summary/task'),
      scrSetup = require('summary/setup');


  //
  // Vanilla answer checker makes sure answer is not empty
  //
  var checkAnswer = function(answer, task) {
    if (answer == null || answer == '' || answer.length == 0) {
      return "Please enter an answer";
    }
    return true;
  };

  // 
  // ensure filter answer doesn't contain day or amt attributes
  //
  var checkFilterAnswer = function(answer, task) {
    if (!(answer && answer.length)) {
      return "Please select a filter";
    }
    var cols = answer.map(function(cstat) { return cstat.get('col'); });
    var illegalCols = [];
    if (_.contains(cols, 'day')) {
      illegalCols.push("day");
    }
    if (_.contains(cols, 'amt')) {
      illegalCols.push("amt");
    }
    if (illegalCols.length > 0) {
      return "Please select a filter that does not use attributes " + illegalCols.join(" or ");
    }
    return true;
  }

  //
  // adds handler to DBWipes filter changes to reflect in
  // answer input
  //
  var showf = function(task) {
    function onChange() {
      var models = _.compact(window.where.map(function(model) {
        var sel = model.get('selection'),
            vals = _.keys(sel);
        if (vals.length) return model;
      }));
      $("#q1-answer").empty();
      var clauses = _.map(models, function(model, idx) { 
        var sql = util.negateClause(model.toSQLWhere());
        var json = { idx: idx, sql: sql};
        $("#q1-answer").append($(wheretemplate(json)));
        return sql;
      });
      task.model.set('answer', models);
    }
    window.where.on('change:selection', onChange);
    task.on('submit', function() {
      window.where.off('change:selection', onChange);
    });
    onChange();
  }


  // Connect the tasks together with the tour
  var createTaskList = function(tour, tasks) {
    _.each(tasks, function(task, idx) {
      var prefix = "Q" + (idx+1) + " of " + tasks.length;
      var title = task.model.get('title') || "";
      task.model.set('title', prefix + " " + title);
      task.on('trysubmit', function() {
        var username = localStorage['name'];
        var data = JSON.stringify(task.model);
        $.post("/tasks/submit/", {
          name: username,
          taskid: task.model.get('id'),
          data: data
        }, function() {}, "json")
      });

      task.on('submit', function() {
        // show next task
        _.delay(function() {
          task.hide();
          if (tasks[idx+1]) {
            tasks[idx+1].show();
          } else {
            tour.show('end');
          }
        }, 1500);
      });
    })
  }

  var wheretemplate = Handlebars.compile($("#where-ans-template").html());






  //
  // setup scorpion+dbwipes
  //
  var setup = function() {
    scrSetup.setupBasic();
    scrSetup.setupButtons(window.q, window.qv);
    scrSetup.setupScorpion(window.enableScorpion, window.q, window.qv, window.where);
    scrSetup.setupTuples(window.q, window.srv, window.where);
  }

  //
  // given tasks and the index (step id) of the study task,
  // create the shepherd tour object for the page
  // 
  var setupTour = function(tasks, idx) {
    var tour = new Shepherd.Tour({
      defaults: { classes: "shepherd-element shepherd-open shepherd-theme-arrows"}
    });

    step = tour.addStep('start', {
      title: "Validation",
      text: $("#start-template").html(),
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

    createTaskList(tour, tasks);

    step = tour.addStep('end', {
      title: "Done!",
      text: "<p>Thank You!</p>"+
            "<p>Please press Exit to go back to the main directory when you are ready.</p>",
      classes: "shepherd shepherd-open shepherd-theme-arrows shepherd-transparent-text",
      showCancelLink: true,
      buttons: [{
        text: 'Exit',
        action: function () {
          var completed = +(localStorage['stepCompleted'] || 0);
          localStorage['stepCompleted'] = Math.max(completed, idx)
          window.location = '/study/';
        }
      }],
      style: { width: 500 }
    });
    step.on("show", function() { $("div.row").css("opacity", 0.6); });
    step.on("hide", function() { $("div.row").css("opacity", 1); });

    return tour;
  }

  var setupSum = function(query, taskprefix, idx) {
    setup();
    window.q.set(query);


    var tasks = [
      new TaskView({
        id: taskprefix+"-1",
        question: $("#q1-question").html(),
        text: $("#q1-text").html(),
        textbox: false,
        attachTo: '#tasks',
        truth: checkFilterAnswer,
        on: { 'show': showf }
      }),
      new TaskView({
        id: taskprefix+"-2",
        question: $("#q2-template").html(),
        textbox: true,
        largetextbox: true,
        truth: checkAnswer,
        attachTo: '#tasks',
      }),
      new TaskView({
        id: taskprefix+"-3",
        question: $("#q3-template").html(),
        textbox: true,
        largetextbox: true,
        truth: checkAnswer,
        attachTo: '#tasks',
      }),
      new TaskView({
        id: taskprefix+"-4",
        question: $("#q4-template").html(),
        options: [ 
          'not confident', 
          'somwhat confident',
          'very confident',
          'without a doubt'
        ],
        textbox: true,
        truth: checkAnswer,
        attachTo: '#tasks',
      })
    ];
    var tour = setupTour(tasks, idx);
    return tour;
  }


  var setupAvg = function(query, taskprefix, idx) {
    setup();
    window.q.set(query);


    var tasks = [
      new TaskView({
        id: taskprefix+"-1",
        question: $("#q1-question").html(),
        text: $("#q1-text").html(),
        textbox: false,
        attachTo: '#tasks',
        truth: checkFilterAnswer,
        on: { 'show': showf }
      }),
      new TaskView({
        id: taskprefix+"-2",
        question: $("#q2-template").html(),
        textbox: true,
        largetextbox: true,
        truth: checkAnswer,
        attachTo: '#tasks',
      }),
      new TaskView({
        id: taskprefix+"-3",
        question: $("#q3-template").html(),
        textbox: true,
        largetextbox: true,
        truth: checkAnswer,
        attachTo: '#tasks',
      }),
      new TaskView({
        id: taskprefix+"-4",
        question: $("#q4-template").html(),
        options: [ 
          'not confident', 
          'somwhat confident',
          'very confident',
          'without a doubt'
        ],
        textbox: true,
        truth: checkAnswer,
        attachTo: '#tasks',
      })
    ];
    var tour = setupTour(tasks, idx);
    return tour;
  }


  return {
    setupSum: setupSum,
    setupAvg: setupAvg
  };
});

