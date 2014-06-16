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
  'summary/where', 'summary/whereview', 
  'summary/cstat', 'summary/cstatsview', 
  'summary/query', 'summary/queryview',
  'summary/scorpionquery', 'summary/scorpionview',
  'summary/scorpionresults', 'summary/scorpionresultsview',
  'summary/tupleview',
  'summary/drawingview', 'summary/util',
  'summary/task',
  'underscore',
  'shepherd',
  'bootstrap'
  ], function (
  $, d3,
  Where, WhereView, 
  CStat, CStatsView, 
  Query, QueryView, 
  ScorpionQuery, ScorpionQueryView, 
  ScorpionResults, ScorpionResultsView,
  TupleView,
  DrawingView, util, TaskView,
  _, Shepherd) {

  $ = require('bootstrap');



  $("[data-toggle=tooltip]").tooltip();

  var st_on_text = "Query only what you highlight below" ,
      st_off_text = "Queries will ignore what you highlight below";
  $("#selection-type > input[type=checkbox]").click(function() {
    where.trigger("change:selection");
    var txt = (this.checked)? st_on_text : st_off_text;
    $("#selection-type")
      .attr('title', txt)
      .tooltip('fixTitle')
      .tooltip('show');
  });
  $("#selection-type")
    .attr('title', st_on_text)
    .tooltip('fixTitle');



  $("#apply-btn").click(function() {
    if (qv.overlayquery && qv.overlayquery.get('where')) {
      var ws = _.chain(qv.overlayquery.get('where'))
        .filter(function(w) { return w.vals && w.vals.length; })
        .compact()
        .map(function(w) { return util.toWhereClause(w.col, w.type, w.vals);})
        .map(function(w) { return util.negateClause(w); })
        .map(function(w, idx) { return {id: idx, col: null, sql: w}; })
        .each(function(w) { q.get('basewheres').push(w); })
        .value();
      console.log(ws)
      q.trigger('change:basewheres');
    }
  });

  // to avoid fetching same queries repeatedly
  window.prev_fetched_json = null;

  var enableScorpion = window.enableScorpion = false;
  // define all scorpion related variables so 
  // they can be checked for null

  var q = new Query();
  var qv = new QueryView({ model: q })
  $("#right").prepend(qv.render().$el);


  var where = new Where({ query: q, nbuckets: 200 });
  var whereview = new WhereView({collection: where, el: $("#where")});
  var csv = new CStatsView({collection: where, el: $("#facets")});
  q.on('change:db change:table change:basewheres', function() {
    where.reset()
    where.fetch({
      data: {
        db: q.get('db'),
        table: q.get('table'),
        where: _.compact(_.pluck(_.flatten(q.get('basewheres')), 'sql')).join(' AND ')
      },
      reset: true
    });
  })
  where.on('change:selection', function() {
    var whereJson = where.toJSON();
    if (!_.isEqual(q.get('where'), whereJson)) {
      console.log(["where.change:selection", q.get('where'), whereJson])
      qv.renderWhereOverlay(whereJson);
    } else {
      console.log(["where.canceloverlay", q.get('where'), whereJson])
      qv.cancelWhereOverlay();
    }

  });


  var tv = new TupleView({query: q, el: $("#tuples").get()[0]});

  where.on('change:selection', function() {
    tv.model.set('where', where.toJSON());
    tv.model.trigger('change:where')
  });
  q.on('change', function() {
    tv.model.set('where', 
      _.compact(_.flatten(_.union(q.get('basewheres'), q.get('where')))));
    tv.model.trigger('change:where');
  });
  window.tv = tv;




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



  if (true) {

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
    step.on("show", function() { $("div.row").css("opacity", 0.3); });

    
    step = tour.addStep('end', {
      title: "Validation Done!",
      text: "<p>Great job!  You will notice that many of these questions involved understanding why the total sales rose over the 10 days.</p>"+
            "<p>Scorpion's automated tools are designed for answering these types of questions.  The next section will introduce you to the Scorpion automated explanation tool.</p>",
      classes: "shepherd shepherd-open shepherd-theme-arrows shepherd-transparent-text",
      style: { width: "500px" }
    });
    step.on("show", function() { $("div.row").css("opacity", 0.3); });
    step.on("hide", function() { 
      window.location = '/dir/';
    });



    tour.start();
    window.tour = tour;
  }




  window.q = q;
  window.qv = qv;
  window.where = where;
  window.csv = csv;
});
