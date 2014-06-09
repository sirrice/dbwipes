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
  'summary/where', 'summary/whereview', 
  'summary/cstat', 'summary/cstatsview', 
  'summary/query', 'summary/queryview',
  'summary/scorpionquery', 'summary/scorpionview',
  'summary/scorpionresults', 'summary/scorpionresultsview',
  'summary/tupleview',
  'summary/drawingview', 'summary/util',
  'bootstrap'
  ], function (
  $, d3,
  Where, WhereView, 
  CStat, CStatsView, 
  Query, QueryView, 
  ScorpionQuery, ScorpionQueryView, 
  ScorpionResults, ScorpionResultsView,
  TupleView,
  DrawingView, util) {

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
      .tooltip('fixTitle')
      .tooltip('show');
    _.delay(function() {
      $("#selection-type").tooltip('hide');
    }, 5000);


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


  var where = new Where;
  var whereview = new WhereView({collection: where, el: $("#where")});
  var csv = new CStatsView({collection: where, el: $("#facets")});
  q.on('change:db change:table change:basewheres', function() {
    where.reset()
    where.fetch({
      data: {
        db: q.get('db'),
        table: q.get('table'),
        nbuckets: 500,
        where: _.compact(_.pluck(_.flatten(q.get('basewheres')), 'sql')).join(' AND ')
      },
      reset: true
    });
  })
  where.on('change:selection', function() {
    var whereJson = where.toJSON();
    if (srv) {
      srv.unlockAll();
      psrv.unlockAll();
    }
    if (!_.isEqual(q.get('where'), whereJson)) {
      console.log(["where.change:selection", whereJson])
      qv.renderWhereOverlay(whereJson);
    } else {
      qv.cancelWhereOverlay();
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
      if (!_.isEqual(q.get('where'), whereJson)) 
        qv.renderWhereOverlay(whereJson);
    });
    psrv.on('setActive', function(whereJson) {
      if (!_.isEqual(q.get('where'), whereJson)) 
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


  /*
  var tv = new TupleView({query: q, el: $("#tuples").get()[0]});

  srv.on('setActive', function(model) {
    if (model)
      tv.model.set('where', model.toSQL());
    else {
      tv.model.set('where', null);
    }
  });
  */



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
    scehma: {
      disb_dt: 'timestamp',
      disb_amt: 'num'
    },
    table: 'expenses',
    db: 'fec12'
  };

  var sigmodq = {
    x: 'g',
    ys: [{col: 'v', expr: 'sum(v)'}],
    scehma: {
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
