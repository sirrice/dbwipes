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
  DrawingView, util, _, Shepherd) {

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
  q.set(intelq);



  if (true) {
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


    tour.addStep('start', {
      id: 1,
      title: "Welcome to Scorpion!",
      text: "This is a tutorial to walk you through parts of the interface.  The sample dataset we will use is a sensor dataset (more text)",
      classes: "shepherd shepherd-open shepherd-theme-arrows shepherd-transparent-text",
      style: { width: "500px" },
      showCancelLink: true
    });
    tour.addStep('qviz', {
      attachTo: "#queryview-container left",
      title: "Main Visualization",
      showCancelLink: true,
      text: "<p>This area visualizes query results over the sample dataset. </p><p>For example, this shows the hourly <span style='background:#1f77b4; color: white;  padding-left: 5px; padding-right: 5px; font-weight: bold;'>average (top)</span> and <span style='color: white; background:#ff7f0e; padding-left: 5px; padding-right: 5px; font-weight: bold;'>standard deviation (bottom)</span> of temperatures in the dataset.</p>",
      classes: "shepherd-theme-arrows",
      highlight: true,
      style: { width: "400px" },
      buttons: btns,
    });
    tour.addStep('tupleviz', {
      attachTo: "#tuples top",
      title: "Record Table",
      text: "This table shows a random sample of records that match the current query being rendered", 
      showCancelLink: true,
      classes: "shepherd-theme-arrows",
      highlight: true,
      style: { width: "400px" },
      buttons: btns,
    });
    tour.addStep('qformbtn', {
      attachTo: "#q-toggle",
      title: "Query Form Toggle Button",
      text: "<p>This button switches between the query builder and this visualization.</p><p>Click <b class='btn btn-primary btn-xs'>Show Query Form</b> on the right to edit this query!</p>",
      classes: "shepherd-theme-arrows",
      tetherOptions: {
        attachment: 'top right',
        targetAttachment: 'top left',
        offset: '20px 10px'
      },
      highlight: true,
      buttons: { next: false },
      style: { width: "400px" },
      advanceOn: "#q-toggle click"
    });
    step = tour.addStep('qformbtn-clicked', {
      attachTo: "#q left",
      title: "Query Form Toggle Button",
      text: "Great!  Clicking on that button will now take you back to the visualization view.</p><p> This is the query edit form that describes the data that we are visualizing and interacting with.",
      classes: "shepherd-theme-arrows",
      highlight: true,
      buttons: btns,
      style: { width: "400px" }
    });
    step.on("hide", function() {
      qv.hideQueryForm();
    })




    tour.addStep('facets', {
      attachTo: "#facets right",
      title: "Faceting Panel",
      text: "This section lists each of the attributes in the sample dataset.",
      classes: "shepherd-theme-arrows",
      highlight: true,
      style: { width: "400px" }
    });

    tour.addStep('cstat-label', {
      attachTo: ".cstat-label right",
      title: "Attribute info",
      text: "<p>For example, this is the date attribute in the dataset.</p><p>The small 'date' label below is the data type</p>",
      classes: "shepherd-theme-arrows",
      highlight: true,
      //advanceOn: "<selector> action"
    });
    tour.addStep('cstat-plot', {
      attachTo: ".cstat-plot bottom",
      title: "Faceting Distribution",
      text: "This is the distribution for the date attribute.  You can use this to filter the visualization.",
      classes: "shepherd-theme-arrows",
      style: { width: 400 },
      highlight: true,
    });
    step = tour.addStep('dist-select', {
      attachTo: ".cstat-plot .xaxis bottom",
      title: "Zoomable and Pannable Axes",
      text: "<p>You can use the axes to zoom and scroll.</p>  <p>Go ahead and hover over the x-axis and scroll-up using your mouse wheel or touch pad.</p>",
      classes: "shepherd-theme-arrows",
      style: { width: 400 },
      highlight: true,
    });

    step.on('show', function() {
      $(".cstat-plot:first .xaxis rect")
        .attr("stroke", "rgb(18, 179, 255)")
        .attr("stroke-width", "2px");
      $(".cstat-plot:first .yaxis rect")
        .attr("stroke", "rgb(18, 179, 255)")
        .attr("stroke-width", "2px");
    })
    step.on('hide', function() {
      $(".cstat-plot:first .xaxis rect").attr("stroke", "none");
      $(".cstat-plot:first .yaxis rect").attr("stroke", "none");
    })


    step = tour.addStep('dist-filter', {
      attachTo: ".cstat-plot .plot-background bottom",
      title: "Filtering",
      text: "<p>You can also select portions of this distribution to filter the query.</p><p>Click Next to see an example</p>",
      classes: "shepherd-theme-arrows",
      style: { width: '400px'},
      highlight: true,
    });
    step.on('show', function() {
      $(".cstat-plot:first .plot-background")
        .attr("stroke", "rgb(18, 179, 255)")
        .attr("stroke-width", "2px");
    })
    step.on('hide', function() {
      $(".cstat-plot:first .plot-background").attr("stroke", "none");
    })


    step = tour.addStep('dist-filter-2', {
      attachTo: ".cstat-plot .plot-background bottom",
      title: "Filtering (example)",
      text: "<p>For example, we just selected records between <i>3/03/2004</i> and <i>3/07/2004</i></p> <p>Notice it changes the subset of data shown in the visualization on the right</p>",
      classes: "shepherd-theme-arrows",
      style: { width: '400px'},
      highlight: true,
    });
    step.on('show', function() {
      where.setSelection( [ {col:'date', type:'date', vals: [new Date('2004-03-03 12:00:00'), new Date('2004-03-07 12:00:00')]}])
    })

    tour.addStep('facets-2', {
      attachTo: "#facets right",
      title: "Filtering (conjunctions)",
      text: "If you filter multiple attributes, it will use the conjunction (AND) of your selections.",
      classes: "shepherd-theme-arrows",
      highlight: true,
      style: { width: "400px" }
    });

    tour.addStep('seltype', {
      attachTo: "#selection-type",
      title: "Filtering <b style='background:#6ADE85; color: white; padding-left: 10px; padding-right: 10px;'>select</b> vs <b style='background:#D46F6F; color: white; padding-left: 10px; padding-right: 10px;'>reject</b>",
      text: "<p>So far, when you filter attributes, we showed you the that matches your filters. </p><p>Toggle this switch to show data that <i>doesn't</i> match the filter.  Go ahead and click <b>on the switch</b> above.</p>",
      classes: "shepherd-theme-arrows",
      tetherOptions: {
        attachment: 'top right',
        targetAttachment: 'top left',
        offset: '20px -10px'
      },
      highlight: true,
      buttons: { next: false },
      style: { width: "400px" },
      advanceOn: "#myonoffswitch click"
    });

    step = tour.addStep('selapply', {
      attachTo: "#apply-btn bottom",
      title: "Drilling Down",
      text: "<p>If the visualization on the right is displaying a subset of the data you are interested in, you can click this button to reset this visualization on show <i>only</i> this data.  This will update the distributions below.</p><p>Click on <b class='btn btn-primary btn-xs'>Apply current selection</b> above</p>",
      classes: "shepherd-theme-arrows",
      highlight: true,
      buttons: { next: false },
      style: { width: "300px" },
      advanceOn: "#apply-btn click"
    });
 
    step = tour.addStep('q-toggle-2', {
      attachTo: "#q-toggle",
      title: "Drilling Down",
      text: "<p>Clicking <b class='btn btn-primary btn-xs'>Apply current selection</b> has added a WHERE clause to our query.  The server is recomputing the faceting distributions, which may take a moment.</p><p>Click Next to see how the query form was updated.</p>",
      classes: "shepherd-theme-arrows",
      tetherOptions: {
        attachment: 'top right',
        targetAttachment: 'top left',
        offset: '20px 10px'
      },
      style: { width: "400px" },
    });
    step.on('hide', function() {
      qv.showQueryForm();
    });
 
    step = tour.addStep('qform-2', {
      attachTo: "#q input[name=q-where]:first left",
      title: "Drilling Down",
      text: "<p>The WHERE clause has been filled with the expression that filters the data.</p><p>You can always directly edit this field, or add the empty expression field below.</p>",
      classes: "shepherd-theme-arrows",
      style: { width: "400px" }
    });
    step.on("show", function() { 
      $("#q input[name=q-where]:first").css("box-shadow", "rgb(18, 179, 255) 0px 0px 10px 0px");
    });
    step.on("hide", function() { 
      $("#q input[name=q-where]:first").css("box-shadow", "none");
    });




    tour.addStep('end', {
      id: 1,
      title: "End of the Tutorial!",
      text: "<p>We've just walked through the main components of the basic interface!</p> <p>To blah, we will ask you to use this tool to answer some questions about some datasets</p><p>Click next to continue</p>",
      classes: "shepherd shepherd-open shepherd-theme-arrows shepherd-transparent-text",
      style: { width: "500px" },
      showCancelLink: true,
      buttons: btns,
    });


    tour.start();
    //_.delay(function(){ tour.show('dist-filter-2'); }, 1000)
  }




  window.q = q;
  window.qv = qv;
  window.where = where;
  window.csv = csv;
});
