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
requirejs(['jquery', 
           'd3',
           'summary/util',
           'summary/setup',
           'underscore',
           'shepherd',
           'bootstrap'
  ], function ($, d3, util, setup, _, Shepherd) {

  $ = require('bootstrap');



  var enableScorpion = window.enableScorpion = false;
  setup.setupBasic();
  setup.setupButtons(window.q, window.qv);
  setup.setupTuples(window.q, null, window.where);


  var testq = {
    x: 'day',
    ys: [{alias: 'sum', col: 'amt', expr: 'sum(amt)'}],
    schema: {
      x: 'num',
      amt: 'num'
    },
    table: 'simple',
    db: 'test'
  };

  q.set(testq);





  /*
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
  */



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
    text: "<p>This tutorial will walk you through the main parts of the manual interface. </p>"+
          "<p>This is a randomly generated dataset of sales over a 10 day period.  The attributes in the dataset include the day, the amount spent, and customer age range, gender, and state.</p>"+
          "<p>When you are ready, click Next.</p>",
          //"<p>The dataset we will use is a sensor dataset containing voltage, light, and humidity readings from 54 different sensors installed around a building</p> ",
    classes: "shepherd shepherd-open shepherd-theme-arrows shepherd-transparent-text",
    style: { width: "500px" },
    showCancelLink: true
  });
  step.on("show", function() { $("div.row").css("opacity", 0.6); });
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
          "<p>For example, this shows the daily"+
          " <span style='color:#1f77b4; font-family: arial; font-weight: bold;'>sum</span> "+
          "of sales in the dataset.</p>",
    classes: "shepherd-theme-arrows",
    highlight: true,
    style: { width: "400px" },
    buttons: btns,
  });
  tour.addStep('qformbtn', {
    attachTo: "#q-toggle",
    title: "Query Form Toggle Button",
    text: "<p>You can see and edit the query that generated this visualization by clicking on this button.</p>"+
          "<p>Click on it to continue!</p>",
    showCancelLink: true,
    classes: "shepherd-theme-arrows",
    tetherOptions: {
      attachment: 'top right',
      targetAttachment: 'top left',
      offset: '10px 10px'
    },
    highlight: true,
    buttons: { next: false },
    style: { width: "400px" },
    advanceOn: "#q-toggle click"
  });
  step = tour.addStep('qformbtn-clicked', {
    attachTo: "#q left",
    title: "Query Form Toggle Button",
    text: "<p>That button will switch between this query edit form and the visualization view.</p>"+
          "<p> This is the query edit form that describes the data that we are visualizing and interacting with.</p>"+
          "<p>We're going to plot the "+
          "<span style='color:#ff7f0e; font-family: arial; font-weight: bold;'>average</span> "+
          "sales as well</p>",
    showCancelLink: true,
    classes: "shepherd-theme-arrows",
    highlight: true,
    buttons: btns,
    style: { width: 400 }
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
    tetherOptions: { offset: '-15px 0px' },
    style: { width: 400 },
    advanceOn: "#q-add-select-expr click"
  });


  step = tour.addStep('add-expr-2', {
    attachTo: "#q input[name=q-y-expr]:last bottom",
    title: "Add a Select Clause",
    text: "<p>Type the SELECT aggregation expression <span style='color:#ff7f0e; font-family: arial; font-weight: bold;'>avg(amt)</span> into this field</p>",
    showCancelLink: true,
    classes: "shepherd-theme-arrows",
    highlight: true,
    buttons: btns,
    style: { width: 400 },
  });


  step = tour.addStep('add-expr-3', {
    attachTo: "#q input[name=q-y-col]:last bottom",
    title: "Add a Select Clause",
    text: "<p>This field is the attribute you are computing the aggregation over.  In this case, type in <span style='color:#ff7f0e; font-family: arial; font-weight: bold;'>amt</span> </p>"+
          "<p>We ask for this information because knowing this makes Scorpion's life easier</p>",
    showCancelLink: true,
    classes: "shepherd-theme-arrows",
    highlight: true,
    buttons: btns,
    style: { width: 400 },
  });


  step = tour.addStep('q-form-submit', {
    attachTo: "#q .q-submit bottom",
    title: "Submit New Query",
    text: "<p>Click <span class='btn btn-primary btn-xs'>Execute Query</span> to re-run the query with our new SELECT clause!</p>",
    showCancelLink: true,
    classes: "shepherd-theme-arrows",
    highlight: true,
    buttons: { next: false },
    style: { width: 400 },
    advanceOn: "#q .q-submit click"
  });


  step = tour.addStep('qviz-2', {
    attachTo: "#queryview-container left",
    title: "Main Visualization",
    showCancelLink: true,
    text: "<p>Now the visualization shows both the "+
          " <span style='color:#1f77b4; font-family: arial; font-weight: bold;'>sum</span> "+
          "and <span style='color:#ff7f0e; font-family: arial; font-weight: bold;'>average</span> "+
          " sales amounts in the dataset.</p><p>Nice Job!</p>",
    classes: "shepherd-theme-arrows",
    highlight: true,
    style: { width: 400 },
    buttons: btns,
  });
  step.on("show", function() {
    qv.hideQueryForm();
  })




  tour.addStep('facets', {
    attachTo: "#facets right",
    title: "Faceting Panel",
    text: "The Facetting panel shows value distributions as histograms for every attribute in the dataset.",
    showCancelLink: true,
    classes: "shepherd-theme-arrows",
    highlight: true,
    buttons: btns,
    style: { width: "400px" }
  });

  step = tour.addStep('facets-2', {
    attachTo: "#tuples top",
    title: "Faceting Panel",
    text: "<p>Each facet on the left corresponds with one of the columns in the sample records table.</p>",
    showCancelLink: true,
    classes: "shepherd-theme-arrows",
    highlight: false,
    buttons: btns,
    style: { width: 400 }
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
    attachTo: "#cstat-day .cstat-label right",
    title: "Attribute info",
    text: "<p>For example, this <b>day</b> attribute corresponds with the <b>day</b> column in the sample table on the right.</p>"+
          "<p>The small <span class='btn btn-xs' style='font-size: smaller; color: black; background: whitesmoke; border: 1px solid white; border-radius: 4px; cursor: pointer; min-width: 50px;'>num</span> label below is the data type, so we know this attribute is a number and not a timestamp.</p>",
    showCancelLink: true,
    classes: "shepherd-theme-arrows",
    highlight: true,
    buttons: btns,
    tetherOptions: { offset: '0px -10px' },
    style: { width: 400 }
  });
  step.on("show", function() {
    $("#tuples th[data-col=day]").css("box-shadow", "rgb(18, 179, 255) 0px 0px 10px 0px");
  });
  step.on("hide", function() {
    $("#tuples th[data-col=day]").css("box-shadow", "none");
  });


  tour.addStep('cstat-plot', {
    attachTo: "#cstat-day .cstat-plot right",
    title: "Faceting Distribution",
    text: "This is the distribution of values in the <b>day</b> attribute.  The y-axis shows the count of records within a particular value range.</p>"+
          "<p>You can use this to filter the visualization.</p>",
    showCancelLink: true,
    classes: "shepherd-theme-arrows",
    tetherOptions: { offset: '-10px 0px' },
    style: { width: 400 },
    highlight: true,
    buttons: btns,
  });


  step = tour.addStep('dist-select', {
    attachTo: "#cstat-day .cstat-plot .xaxis right",
    title: "Zoomable and Pannable Axes",
    text: "<p>You can use the axes to zoom and scroll.</p>  "+
          "<p>Hover over the x-axis and scroll-up using your mouse wheel or touch pad.</p>",
    showCancelLink: true,
    classes: "shepherd-theme-arrows",
    tetherOptions: { offset: '0px -5px' },
    style: { width: 400 },
    highlight: true,
    buttons: btns,
  });
  step.on('show', function() {
    $("#cstat-day .cstat-plot .xaxis rect")
      .attr("stroke", "rgb(18, 179, 255)")
      .attr("stroke-width", "2px");
    $("#cstat-day .cstat-plot .yaxis rect")
      .attr("stroke", "rgb(18, 179, 255)")
      .attr("stroke-width", "2px");
  })
  step.on('hide', function() {
    $("#cstat-day .cstat-plot .xaxis rect").attr("stroke", "none");
    $("#cstat-day .cstat-plot .yaxis rect").attr("stroke", "none");
  })


  step = tour.addStep('dist-filter', {
    attachTo: "#cstat-day .cstat-plot .plot-background right",
    title: "Filtering",
    text: "<p>You can also select portions of this distribution to filter the query.</p>"+
          "<p>Click Next to see an example</p>",
    showCancelLink: true,
    classes: "shepherd-theme-arrows",
    //tetherOptions: { offset: '-28px 0px' },
    tetherOptions: { offset: '0px -10px' },
    style: { width: '400px'},
    highlight: true,
    buttons: btns,
  });
  step.on('show', function() {
    $("#cstat-day .cstat-plot .plot-background")
      .attr("stroke", "rgb(18, 179, 255)")
      .attr("stroke-width", "2px");
  })

  step = tour.addStep('dist-filter-2', {
    attachTo: "#cstat-day .cstat-plot .plot-background right",
    title: "Filtering (example)",
    text: "<p>This selects records from day <i>0</i> to <i>3</i></p>"+
          "<p>Notice it changes the subset of data shown in the visualization on the right.</p>"+
          "<p>You can resize and drag the selection around.  Clicking outside of it will clear the filter.</p>"+
          "<p>Go ahead and give it a try</p>",
    showCancelLink: true,
    classes: "shepherd-theme-arrows",
    tetherOptions: { offset: '-20px -10px' },
    style: { width: '400px'},
    highlight: true,
    buttons: btns,
  });
  step.on('show', function() {
    where.setSelection( [ {col:'day', type:'num', vals: [0, 3.5]}])
  })
  step.on('hide', function() {
    $("#cstat-day .cstat-plot .plot-background").attr("stroke", "none");
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
          "<p>Try clicking and dragging on some of the other attributes to the left.  Click Next when you are done.</p>",
    showCancelLink: true,
    classes: "shepherd-theme-arrows",
    tetherOptions: { offset: '-28px 0px' },
    buttons: btns,
    highlight: true,
    style: { width: "400px" }
  });

  tour.addStep('seltype', {
    attachTo: "#selection-type",
    title: "Filtering (<b style='color:rgb(26, 189, 64); '>select</b> vs <b style='color:#D46F6F;'>remove</b>)",
    text: "<p>So far, the facets <b style='color: rgb(26, 189, 64)'>select</b> subsets of data that match your filters. </p>"+
          "<p>Sometimes it helps to see what happens if the data you selected were <i>removed</i></p>"+
          "<p>Toggle this switch to show data that <i>doesn't</i> match the filter.</p>"+
          "<p>Click on the green <span style='font-family: arial; font-weight: bold;'><b style='background:whitesmoke; color: black; padding-left: 10px; padding-right: 10px;'>select</b><span style='background:#6ADE85; border-radius: 4px; width: 2em;'>&nbsp;&nbsp;&nbsp;&nbsp;</span></span> "+
          "switch to the left.</p>",
    showCancelLink: true,
    classes: "shepherd-theme-arrows",
    tetherOptions: {
      attachment: 'top right',
      targetAttachment: 'top left',
      offset: '10px -10px'
    },
    highlight: true,
    buttons: btns,
    style: { width: "500px" },
  });

  step = tour.addStep('selapply', {
    attachTo: "#apply-btn right",
    title: "Updating the Facets",
    text: "<p>The distributions in the facets are can be expensive to recompute, so we only recompute it for a new query.</p>"+
          "<p>You can apply your current "+
          "<span style='font-family: arial; font-weight: bold;'><b style='background:whitesmoke; color: black; padding-left: 10px; padding-right: 10px;'>select</b><span style='background:#6ADE85; border-radius: 4px; width: 2em;'>&nbsp;&nbsp;&nbsp;&nbsp;</span></span>"+
          " or "+
          "<span style='font-family: arial; font-weight: bold;'><span style='background:#D46F6F; border-radius: 4px; width: 2em;'>&nbsp;&nbsp;&nbsp;&nbsp;</span><b style='background:whitesmoke; color: black; padding-left: 10px; padding-right: 10px;'>remove</b></span>"+
          "filters by pressing the button to the left.  This will copy the "+
          "<span style='background: grey; color: white; border-radius: 5px; padding-left: 1em; padding-right: 1em;'>filters</span> into the WHERE clauses in the Query Form.</p>"+
          "<p>Go ahead and click it!</p>",
    showCancelLink: true,
    classes: "shepherd-theme-arrows",
    tetherOptions: {
      attachment: 'top left',
      targetAttachment: 'top right',
      offset: '10px -10px'
    },
    highlight: true,
    buttons: btns,
    style: { width: 500 },
  });
  step.on('hide', function() {
    qv.showQueryForm();
  });

  step = tour.addStep('qform-2', {
    attachTo: "#q input[name=q-where]:first left",
    title: "Updating the Facets",
    text: "<p>Scorpion added your <span style='background: grey; color: white; border-radius: 5px; padding-left: 1em; padding-right: 1em;'>filters</span> to the WHERE clause of the query and re-submitted the query.</p>"+
          "<p>Scorpion is also recomputing the facet distributions based on the records that match the WHERE clause <small>(which may take some time)</small></p>"+
          "<p>You can always directly edit this field in addition to clicking on <span class='btn btn-primary btn-xs' style='font-size:9pt'>Add Filters to Query</span>.</p>",
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




  step = tour.addStep('end', {
    id: 1,
    title: "End of This Section!",
    text: "<p>We've just walked through the main components of the basic interface!</p>"+
          "<p>We will ask you to use this tool to analyze a few datasets</p>"+
          "<p>Click Exit to go back to the directory.</p>",
    showCancelLink: true,
    classes: "shepherd shepherd-open shepherd-theme-arrows shepherd-transparent-text",
    style: { width: "500px" },
    showCancelLink: true,
    buttons: [{
      text: "Exit",
      action: function() {
        window.location = '/dir/';
      }
    }]
  });
  step.on("show", function() { $("div.row").css("opacity", 0.6); });
  step.on("hide", function() { $("div.row").css("opacity", 1); });



  tour.start();
  window.tour = tour;


});
