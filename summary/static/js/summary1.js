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
    //  {col: 'temp', expr: "stddev(temp)", alias: 'std'}
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


    step = tour.addStep('start', {
      id: 1,
      title: "Welcome to Scorpion!",
      text: "This is a tutorial to walk you through parts of the interface.  The sample dataset we will use is a sensor dataset (more text)",
      classes: "shepherd shepherd-open shepherd-theme-arrows shepherd-transparent-text",
      style: { width: "500px" },
      showCancelLink: true
    });
    step.on("show", function() { $("div.row").css("opacity", 0.3); });
    step.on("hide", function() { $("div.row").css("opacity", 1); });


    step = tour.addStep('tupleviz', {
      attachTo: "#tuples top",
      title: "Record Table",
      text: "This table shows a random sample of records that match the current query being rendered", 
      showCancelLink: true,
      classes: "shepherd-theme-arrows",
      tetherOptions: { offset: '10px 0' },
      highlight: true,
      style: { width: "400px" },
      buttons: btns,
    });


    tour.addStep('qviz', {
      attachTo: "#queryview-container left",
      title: "Main Visualization",
      showCancelLink: true,
      text: "<p>This area visualizes query results over the sample dataset. </p>"+
            "<p>For example, this shows the hourly"+
            " <span style='color:#1f77b4; font-family: arial; font-weight: bold;'>average</span> "+
            //"and <span style='color:#ff7f0e; font-family: arial; font-weight: bold;'>standard deviation</span> "+
            "temperatures in the dataset.</p>",
      classes: "shepherd-theme-arrows",
      highlight: true,
      style: { width: "400px" },
      buttons: btns,
    });
    tour.addStep('qformbtn', {
      attachTo: "#q-toggle",
      title: "Query Form Toggle Button",
      text: "<p>You can see and edit the query that generated this visualization by clicking on this button.</p>"+
            "<p>Go ahead and click on it to continue!</p>",
      showCancelLink: true,
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
      text: "<p>Great!  That button switches between the query building and visualization views.</p>"+
            "<p> This is the query edit form that describes the data that we are visualizing and interacting with.</p>"+
            "<p>We're going to plot the "+
            "<span style='color:#ff7f0e; font-family: arial; font-weight: bold;'>standard deviation</span> "+
            "of the temperatures as well</p>",
      showCancelLink: true,
      classes: "shepherd-theme-arrows",
      highlight: true,
      buttons: btns,
      style: { width: "400px" }
    });
    step.on('show', function() { qv.showQueryForm(); });


    step = tour.addStep('add-expr-1', {
      attachTo: "#q-add-select-expr bottom",
      title: "Add a Select Clause",
      text: "<p>These SELECT clauses specify what aggregations to compute</p>"+
            "<p>Click <span class='btn btn-primary btn-xs'>add</span> to create a new field for us to edit</p>",
      showCancelLink: true,
      classes: "shepherd-theme-arrows",
      highlight: true,
      buttons: { next: false },
      tetherOptions: { offset: '-10px 0px' },
      style: { width: "400px" },
      advanceOn: "#q-add-select-expr click"
    });


    step = tour.addStep('add-expr-2', {
      attachTo: "#q input[name=q-y-expr]:last bottom",
      title: "Add a Select Clause",
      text: "<p>Type the SELECT aggregation expression <span style='color:#ff7f0e; font-family: arial; font-weight: bold;'>stddev(temp)</span> into this field</p>",
      showCancelLink: true,
      classes: "shepherd-theme-arrows",
      highlight: true,
      buttons: btns,
      style: { width: "400px" },
    });


    step = tour.addStep('add-expr-3', {
      attachTo: "#q input[name=q-y-col]:last bottom",
      title: "Add a Select Clause",
      text: "<p>This field is the attribute you are computing the aggregation over.  In this case, type in <span style='color:#ff7f0e; font-family: arial; font-weight: bold;'>temp</span> </p>"+
            "<p>We ask for this information because knowing this makes Scorpion's life easier</p>",
      showCancelLink: true,
      classes: "shepherd-theme-arrows",
      highlight: true,
      buttons: btns,
      style: { width: "400px" },
    });


    step = tour.addStep('q-form-submit', {
      attachTo: "#q .q-submit bottom",
      title: "Submit New Query",
      text: "<p>Click <span class='btn btn-primary btn-xs'>Execute Query</span> to re-run the query with our new SELECT clause!</p>",
      showCancelLink: true,
      classes: "shepherd-theme-arrows",
      highlight: true,
      buttons: { next: false },
      style: { width: "400px" },
      advanceOn: "#q .q-submit click"
    });


    step = tour.addStep('qviz-2', {
      attachTo: "#queryview-container left",
      title: "Main Visualization",
      showCancelLink: true,
      text: "<p>Now the visualization shows both the "+
            " <span style='color:#1f77b4; font-family: arial; font-weight: bold;'>average</span> "+
            "and <span style='color:#ff7f0e; font-family: arial; font-weight: bold;'>standard deviation</span> "+
            " of temperatures in the dataset.  Nice Job!</p>",
      classes: "shepherd-theme-arrows",
      highlight: true,
      style: { width: "400px" },
      buttons: btns,
    });
    step.on("hide", function() {
      qv.hideQueryForm();
    })




    tour.addStep('facets', {
      attachTo: "#facets right",
      title: "Faceting Panel",
      text: "The Facetting panel lists count distribution information for every attribute in the dataset.",
      showCancelLink: true,
      classes: "shepherd-theme-arrows",
      highlight: true,
      buttons: btns,
      style: { width: "400px" }
    });

    step = tour.addStep('facets-2', {
      attachTo: "#facets right",
      title: "Faceting Panel",
      text: "Each facet on the left corresponds with one of the columns in the sample records table.",
      showCancelLink: true,
      classes: "shepherd-theme-arrows",
      highlight: false,
      buttons: btns,
      style: { width: "400px" }
    });
    step.on("show", function() {
      $("#tuples th").css("box-shadow", "rgb(18, 179, 255) 0px 0px 10px 0px");
      $(".cstat-label").css("box-shadow", "rgb(18, 179, 255) 0px 0px 10px 0px");
    });
    step.on("hide", function() {
      $("#tuples th").css("box-shadow", 'none');
      $(".cstat-label").css("box-shadow", 'none');
    });




    step = tour.addStep('cstat-label', {
      attachTo: ".cstat-label right",
      title: "Attribute info",
      text: "<p>For example, this date attribute corresponds with the date column in the sample table on the right.</p>"+
            "<p>The small <span class='btn btn-xs' style='font-size: smaller; color: black; background: whitesmoke; border: 1px solid white; border-radius: 4px; cursor: pointer; min-width: 50px;'>date</span> label below is the data type</p>",
      showCancelLink: true,
      classes: "shepherd-theme-arrows",
      highlight: true,
      buttons: btns,
      style: { width: '400px' }
    });
    step.on("show", function() {
      $("#tuples th[data-col=date]").css("box-shadow", "rgb(18, 179, 255) 0px 0px 10px 0px");
    });
    step.on("hide", function() {
      $("#tuples th[data-col=date]").css("box-shadow", "none");
    });



    tour.addStep('cstat-plot', {
      attachTo: ".cstat-plot .cstat-container right",
      title: "Faceting Distribution",
      text: "This is the distribution for the date attribute.  The y-axis shows the count of records within a particular value range.</p>"+
            "<p>You can use this to filter the visualization.</p>",
      showCancelLink: true,
      classes: "shepherd-theme-arrows",
      tetherOptions: { offset: '-10px 0px' },
      style: { width: 400 },
      highlight: true,
      buttons: btns,
    });
    step = tour.addStep('dist-select', {
      attachTo: ".cstat-plot .xaxis right",
      title: "Zoomable and Pannable Axes",
      text: "<p>You can use the axes to zoom and scroll.</p>  <p>Go ahead and hover over the x-axis and scroll-up using your mouse wheel or touch pad.</p>",
      showCancelLink: true,
      classes: "shepherd-theme-arrows",
      tetherOptions: { offset: '0px -5px' },
      style: { width: 400 },
      highlight: true,
      buttons: btns,
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
      attachTo: ".cstat-plot .plot-background right",
      title: "Filtering",
      text: "<p>You can also select portions of this distribution to filter the query.</p><p>Click Next to see an example</p>",
      showCancelLink: true,
      classes: "shepherd-theme-arrows",
      //tetherOptions: { offset: '-28px 0px' },
      tetherOptions: { offset: '0px -10px' },
      style: { width: '400px'},
      highlight: true,
      buttons: btns,
    });
    step.on('show', function() {
      $(".cstat-plot:first .plot-background")
        .attr("stroke", "rgb(18, 179, 255)")
        .attr("stroke-width", "2px");
    })

    step = tour.addStep('dist-filter-2', {
      attachTo: ".cstat-plot .plot-background right",
      title: "Filtering (example)",
      text: "<p>This selects records from <i>3/03/2004</i> to <i>3/07/2004</i></p>"+
            "<p>Notice it changes the subset of data shown in the visualization on the right.</p>"+
            "<p>You can resize and drag the selection around.  Clicking outside of it will clear the filter.</p>"+
            "<p>Go ahead and give it a try</p>",
      showCancelLink: true,
      classes: "shepherd-theme-arrows",
      //tetherOptions: { offset: '-28px 0px' },
      tetherOptions: { offset: '0px -10px' },
      style: { width: '400px'},
      highlight: true,
      buttons: btns,
    });
    step.on('show', function() {
      where.setSelection( [ {col:'date', type:'date', vals: [new Date('2004-03-03 12:00:00'), new Date('2004-03-07 12:00:00')]}])
    })
    step.on('hide', function() {
      $(".cstat-plot:first .plot-background").attr("stroke", "none");
    })

    step = tour.addStep('dist-filter-3', {
      attachTo: "#where right",
      title: "Filtering (example)",
      text: "<p>The filters that you add are also listed textually.</p>",
      showCancelLink: true,
      classes: "shepherd-theme-arrows",
      //tetherOptions: { offset: '-28px 0px' },
      tetherOptions: { offset: '0px -10px' },
      style: { width: '400px'},
      highlight: true,
      buttons: btns,
    });



    tour.addStep('facets-2', {
      attachTo: "#facets right",
      title: "Filtering (conjunctions)",
      text: "<p>If you filter multiple attributes, it will use the conjunction (AND) of your selections.</p>" +
            "<p>Go ahead and try adding some more filters.  Click Next when you are done.</p>",
      showCancelLink: true,
      classes: "shepherd-theme-arrows",
      tetherOptions: { offset: '-28px 0px' },
      buttons: btns,
      highlight: true,
      style: { width: "400px" }
    });

    tour.addStep('seltype', {
      attachTo: "#selection-type",
      title: "Filtering (<b style='color:#6ADE85; '>select</b> vs <b style='color:#D46F6F;'>reject</b>)",
      text: "<p>So far, the facets <b>select</b> subsets of data that match your filters. </p>"+
            "<p>Sometimes it helps to see what happens if the data you selected were <i>removed</i></p>"+
            "<p>Toggle this switch to show data that <i>doesn't</i> match the filter.</p>"+
            "<p>Go ahead and click on the green <span style='font-family: arial; font-weight: bold;'><b style='background:whitesmoke; color: black; padding-left: 10px; padding-right: 10px;'>select</b><span style='background:#6ADE85; border-radius: 4px; width: 2em;'>&nbsp;&nbsp;&nbsp;&nbsp;</span></span> switch to the left.</p>",
      showCancelLink: true,
      classes: "shepherd-theme-arrows",
      tetherOptions: {
        attachment: 'top right',
        targetAttachment: 'top left',
        offset: '20px -10px'
      },
      highlight: true,
      buttons: btns,
      style: { width: "500px" },
    });

    step = tour.addStep('selapply', {
      attachTo: "#apply-btn right",
      title: "Updating the Facets",
      text: "<p>The distributions in the facets are can be expensive to recompute, so we only recompute it for a new query.</p>"+
            "<p>One way to do so is to modify the WHERE clauses in the query form directly.</p>"+
            "<p>You can also apply your current <span style='font-family: arial; font-weight: bold;'><b style='background:whitesmoke; color: black; padding-left: 10px; padding-right: 10px;'>select</b><span style='background:#6ADE85; border-radius: 4px; width: 2em;'>&nbsp;&nbsp;&nbsp;&nbsp;</span></span> or <span style='font-family: arial; font-weight: bold;'><b style='background:whitesmoke; color: black; padding-left: 10px; padding-right: 10px;'>reject</b><span style='background:#D46F6F; border-radius: 4px; width: 2em;'>&nbsp;&nbsp;&nbsp;&nbsp;</span></span> filters by pressing the button to the left.</p>"+
            "<p>Go ahead and click it!</p>",
      showCancelLink: true,
      classes: "shepherd-theme-arrows",
      tetherOptions: {
        attachment: 'top left',
        targetAttachment: 'top right',
        offset: '20px -10px'
      },
      highlight: true,
      buttons: btns,
      style: { width: "400px" },
      //advanceOn: "#apply-btn click"
    });
 
    /*step = tour.addStep('q-toggle-2', {
      attachTo: "#q-toggle",
      title: "Updating the Facets",
      text: "<p>Clicking <b class='btn btn-primary btn-xs'>Apply current selection</b> has added a WHERE clause to our query.  The server is recomputing the faceting distributions, which may take a moment.</p><p>Click Next to see how the query form was updated.</p>",
      showCancelLink: true,
      classes: "shepherd-theme-arrows",
      tetherOptions: {
        attachment: 'top right',
        targetAttachment: 'top left',
        offset: '20px 10px'
      },
      buttons: btns,
      style: { width: "400px" },
    });
    */
    step.on('hide', function() {
      qv.showQueryForm();
    });
 
    step = tour.addStep('qform-2', {
      attachTo: "#q input[name=q-where]:first left",
      title: "Updating the Facets",
      text: "<p>Scorpion added your filters to the WHERE clause of the query and re-submitted the query.</p>"+
            "<p>It is also recomputing the distributions based on the records that match the WHERE clause (which may take some time)</p>"+
            "<p>Note that instead of clicking <span class='btn btn-primary btn-xs' style='font-size:9pt'>Add Filters to Query</span>, you can always edit this field directly</p>",
      showCancelLink: true,
      classes: "shepherd-theme-arrows",
      tetherOptions: { offset: '0px 10px' },
      buttons: btns,
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
      text: "<p>We've just walked through the main components of the basic interface!</p>"+
            "<p>We will ask you to use this tool to analyze a few datasets</p>"+
            "<p>Click next to continue</p>",
      showCancelLink: true,
      classes: "shepherd shepherd-open shepherd-theme-arrows shepherd-transparent-text",
      style: { width: "500px" },
      showCancelLink: true,
      buttons: [{
        text: "Exit",
        action: tour.cancel
      }]
    });


    tour.start();
    //_.delay(function(){ tour.show('dist-filter-2'); }, 1000)
  }




  window.q = q;
  window.qv = qv;
  window.where = where;
  window.csv = csv;
});
