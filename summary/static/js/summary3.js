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
  DrawingView, util, TaskView, _, Shepherd) {

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
        .map(function(w) { return {col: null, sql: w}; })
        .each(function(w) { q.get('basewheres').push(w); })
        .value();
      q.trigger('change:basewheres');
    }
  });

  // to avoid fetching same queries repeatedly
  window.prev_fetched_json = null;

  var enableScorpion = window.enableScorpion = true;
  // define all scorpion related variables so 
  // they can be checked for null
  var srs = null,
      srv = null,
      sq = null,
      sqv = null,
      psrs = null,
      psrv = null;


  var q = new Query();
  var qv = new QueryView({ model: q })
  $("#right").prepend(qv.render().$el);


  var where = new Where({query: q, nbuckets: 200});
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
    var opts = {silent: false};
    arguments.length && (opts = _.last(arguments))
    opts || (opts = {silent: false});
    console.log(['summary.js', 'where.onselection', opts]);
    if (!opts.silent) {
      if (srv) {
        srv.unlockAll();
        psrv.unlockAll();
      }
      qv.renderWhereOverlay(where.toJSON());
    }
  });



  if (enableScorpion) {
    srs = new ScorpionResults()
    srv = new ScorpionResultsView({
      collection: srs, 
      where: where, 
      query: q
    });
    psrs = new ScorpionResults()
    psrv = new ScorpionResultsView({
      collection: psrs, 
      where: where, 
      query: q
    });
    $("#scorpion-results-container").append(srv.render().el);
    $("#scorpion-partialresults-container").append(psrv.render().el);



    sq = new ScorpionQuery({
      query: q, 
      results: srs, 
      partialresults: psrs
    });
    sqv = new ScorpionQueryView({
      model: sq, 
      queryview: qv
    });
    $("body").append(sqv.render().$el.hide());

    srv.on('setActive', function(whereJson) {
      console.log(['summary.js', 'setactive', whereJson])
      qv.renderWhereOverlay(whereJson);
    });
    psrv.on('setActive', function(whereJson) {
      qv.renderWhereOverlay(whereJson);
    });


    q.on('change:db change:table', function() {
      sq.set('badselection', {});
      sq.set('goodselection', {});
    });
    qv.on('resetState', function() {
      sq.set('badselection', {});
      sq.set('goodselection', {});
      sq.set('selection', {});
    });
    qv.on('change:selection', function(selection) {
      sq.set('selection', selection);
    });
    qv.on('change:drawing', function(drawingmodel) {
      sq.set('drawing', drawingmodel);
    });

  } else {
    $("#facet-togglecheckall").css("opacity", 0)
  }


  var tv = new TupleView({query: q, el: $("#tuples").get()[0]});

  srv.on('setActive', function(whereJSON) {
    tv.model.set('where', whereJSON);
  });
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


  $("#q-load-intel").click(function() { 
    q.set(intelq);
  });
  $("#q-load-fec").click(function() { 
    q.set(fecq);
  });


  q.set(testq);




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

  if (enableScorpion) {
    window.sq = sq;
    window.sqv = sqv;
    window.srs = srs;
    window.srv = srv;
    window.psrs = psrs;
    window.psrv = psrv;

  }


});
