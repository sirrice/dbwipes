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
    'bootstrap-slider': {
      deps: ['bootstrap'],
      exports: '$'
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
           'bootstrap',
           'bootstrap-slider'
  ], function ($, d3, util, setup, _, Shepherd) {

  $ = require('bootstrap-slider');



  setup.setupBasic();
  setup.setupButtons(window.q, window.qv);
  setup.setupTuples(window.q, null, window.where);
  //window.qf.show();
  window.tv.hide();


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
    title: "Welcome to Scorpion!",
    text: $("#start").html(),
    classes: "shepherd-theme-arrows",
    style: { width: "500px" }
  });
  step.on("show", function() { $("div.row").css("opacity", 0.6); });
  step.on("hide", function() { $("div.row").css("opacity", 1); });


  /*
  step = tour.addStep('tupleviz', {
    attachTo: "#tuples left",
    title: "Record Table",
    text: "This table shows a random sample of the current query results.", 
    classes: "shepherd-theme-arrows",
    tetherOptions: { offset: '10px 0' },
    highlight: true,
    scrollTo: true,
    style: { width: "500px" },
    buttons: btns,
  });
  */


  tour.addStep('qviz', {
    attachTo: "#queryview-container left",
    title: "Main Visualization",
    text: $("#qviz").html(),
    classes: "shepherd-theme-arrows",
    highlight: true,
    scrollTo: true,
    style: { width: "500px" },
    buttons: btns,
  });

  /*
  step = tour.addStep('qformbtn-clicked', {
    attachTo: "#q left",
    title: "Query Form Toggle Button",
    text: $("#qformbtn-clicked").html(),
    classes: "shepherd-theme-arrows",
    scrollTo: true,
    highlight: true,
    buttons: btns,
    style: { width: 400 }
  });
  step.on('show', function() { window.qf.show(); });

  tour.addStep('qformbtn', {
    attachTo: "#q-toggle",
    title: "Query Form Toggle Button",
    text: "<p>This button toggles the query form</p>",
    classes: "shepherd-theme-arrows",
    tetherOptions: {
      attachment: 'top right',
      targetAttachment: 'top left',
      offset: '10px 10px'
    },
    scrollTo: true,
    highlight: true,
    buttons: btns,
    style: { width: 400 },
  });



  step = tour.addStep('add-expr-1', {
    attachTo: "#q-add-select-expr bottom",
    title: "Add a Select Clause",
    text: "<p>These SELECT clauses specify what aggregations to compute</p>"+
          "<p>Click <span class='btn btn-primary btn-xs'>add</span> to create a new field for us to edit and move to the next step.</p>",
    classes: "shepherd-theme-arrows",
    highlight: true,
    buttons: { next: false },
    tetherOptions: { offset: '0px 0px' },
    style: { width: 400 },
    advanceOn: "#q-add-select-expr click"
  });


  step = tour.addStep('add-expr-2', {
    attachTo: "#q input[name=q-y-expr]:last bottom",
    title: "Add a Select Clause",
    text: "<p>Type the SELECT aggregation expression <span class='orange'>avg(amt)</span> into this field.</p>",
    classes: "shepherd-theme-arrows",
    highlight: true,
    buttons: btns,
    style: { width: 400 },
  });


  step = tour.addStep('add-expr-3', {
    attachTo: "#q input[name=q-y-col]:last bottom",
    title: "Add a Select Clause",
    text: "<p>This field is the attribute you are computing the aggregation over. "+
          "In this case, type in <span class='orange'>amt</span>.</p>"+
          "<p>We ask for this information because knowing this makes our life easier</p>",
    classes: "shepherd-theme-arrows",
    highlight: true,
    buttons: btns,
    style: { width: 400 },
  });


  step = tour.addStep('q-form-submit', {
    attachTo: "#q .q-submit bottom",
    title: "Submit New Query",
    text: "<p>Click <span class='btn btn-primary btn-xs'>Execute Query</span> to re-run the query with our new SELECT clause!</p>",
    classes: "shepherd-theme-arrows",
    highlight: true,
    buttons: { next: false },
    style: { width: 400 },
    advanceOn: "#q .q-submit click"
  });


  step = tour.addStep('qviz-2', {
    attachTo: "#queryview-container left",
    title: "Main Visualization",
    text: "<p>Now the visualization shows both the "+
          " <span style='color:#1f77b4; font-family: arial; font-weight: bold;'>sum</span> "+
          "and <span style='color:#ff7f0e; font-family: arial; font-weight: bold;'>average</span> "+
          " sales amounts in the dataset.</p><p>Nice Job!</p>",
    classes: "shepherd-theme-arrows",
    highlight: true,
    scrollTo: true,
    style: { width: 400 },
    buttons: btns,
  });
  step.on("show", function() {
    window.qf.hide();
  })
  */




  tour.addStep('facets', {
    attachTo: "#facets right",
    title: "Faceting Panel",
    text: "The Faceting panel shows value distributions as histograms for every attribute in the dataset.",
    classes: "shepherd-theme-arrows",
    highlight: true,
    buttons: btns,
    style: { width: "400px" }
  });

  /*
  step = tour.addStep('facets-2', {
    attachTo: "#tuples top",
    title: "Faceting Panel",
    text: "<p>Each facet on the left corresponds with one of the columns in the sample records table.</p>",
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
    text: $("#cstat-label-template").html(),
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
  */


  tour.addStep('cstat-plot', {
    attachTo: "#cstat-day .cstat-plot right",
    title: "Faceting Distribution",
    text: "This is the distribution of values in the <b style='font-family:arial'>day</b> attribute."+
          "The y-axis shows the count of records within a particular value range.</p>"+
          "<p>We will show you how to use this to filter the visualization.</p>",
    classes: "shepherd-theme-arrows",
    tetherOptions: { offset: '-10px 0px' },
    style: { width: 400 },
    highlight: true,
    buttons: btns,
  });


  step = tour.addStep('dist-select', {
    attachTo: "#cstat-day .cstat-plot .xaxis right",
    title: "Zoomable and Pannable Axes",
    text: $("#dist-select").html(),
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
    text: "<p>You can also select subsets of this distribution to filter the query.</p>"+
          "<p>Click Next to see an example</p>",
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
    text: $("#dist-filter-2").html(),
    classes: "shepherd-theme-arrows",
    tetherOptions: { offset: '-20px -10px' },
    style: { width: 500},
    highlight: true,
    buttons: btns,
  });
  step.on('show', function() {
    where.setSelection( [ {col:'day', type:'num', vals: [0.5, 3.5]}])
  })
  step.on('hide', function() {
    $("#cstat-day .cstat-plot .plot-background").attr("stroke", "none");
  })

  step = tour.addStep('dist-filter-3', {
    attachTo: "#queryview-container left",
    title: "Filtering (example)",
    text: $("#dist-filter-3").html(),
    classes: "shepherd-theme-arrows",
    style: { width: 400},
    tetherOptions: {
      attachment: 'top right',
      targetAttachment: 'top left',
      offset: '10px 10px'
    },
    highlight: true,
    buttons: btns,
  });

  step = tour.addStep('dist-filter-4', {
    attachTo: "#temp-where-container right",
    title: "Filtering (example)",
    text: $("#dist-filter-4").html(),
    classes: "shepherd-theme-arrows",
    style: { width: '400px'},
    highlight: true,
    buttons: btns,
  });


  tour.addStep('facets-2', {
    attachTo: "#facets right",
    title: "Filtering (conjunctions)",
    text: "<p>If you filter multiple attributes, it will use the conjunction (logical AND) of your selections.</p>" +
          "<p>Try clicking and dragging on some of the other attributes to the left.</p>",
    classes: "shepherd-theme-arrows",
    tetherOptions: { offset: '-28px 0px' },
    buttons: btns,
    highlight: true,
    style: { width: "400px" }
  });

  tour.addStep('seltype', {
    attachTo: "#selection-type",
    title: "Filtering (<b style='color:rgb(26, 189, 64); '>select</b> vs <b style='color:#D46F6F;'>remove</b>)",
    text: $("#seltype").html(),
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


  tour.addStep('seltype-2', {
    attachTo: "#temp-where-container right",
    title: "Filtering (<b style='color:rgb(26, 189, 64); '>select</b> vs <b style='color:#D46F6F;'>remove</b>)",
    text: $("#seltype-2").html(),
    buttons: btns,
    highlight: true,
    style: { width: "500px" },
  });



  step = tour.addStep('selapply', {
    attachTo: "#apply-btn right",
    title: "Updating the Facets",
    text: $("#selapply").html(),
    classes: "shepherd-theme-arrows",
    tetherOptions: {
      offset: '0px -10px'
    },
    highlight: true,
    buttons: btns,
    style: { width: 500 },
  });

  step = tour.addStep('selapply-2', {
    attachTo: "#perm-where-container right",
    title: "Updating the Facets",
    text: $("#selapply-2").html(),
    classes: "shepherd-theme-arrows",
    tetherOptions: { offset: '0px 10px' },
    buttons: btns,
    style: { width: "400px" }
  });


  /*
  step = tour.addStep('selapply-3', {
    attachTo: "#q input[name=q-where]:first left",
    title: "Updating the Facets",
    text: $("#selapply-3").html(),
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
  */


  step = tour.addStep('tupletoggle', {
    attachTo: "#tuples-toggle bottom",
    title: "Showing Individual Records",
    text: $("#tupletoggle").html(),
    classes: "shepherd-theme-arrows",
    tetherOptions: { offset: '-10px 0px' },
    buttons: btns,
    style: { width: "400px" }
  });
  step.on('show', function() {
    window.tv.show();
  });
  step.on('hide', function() {
    window.tv.hide();
  });




  step = tour.addStep('end', {
    id: 1,
    title: "End of This Section!",
    text: "<p>We've just walked through the main components of the basic interface!</p>"+
          "<p>We will ask you to use this tool to analyze a few datasets</p>"+
          "<p>Click Exit to go back to the directory.</p>",
    classes: "shepherd shepherd-open shepherd-theme-arrows shepherd-transparent-text",
    style: { width: "500px" },
    buttons: [{
      text: "Exit",
      action: function() {
        var completed = +(localStorage['stepCompleted'] || 0);
        alert(completed);
        localStorage['stepCompleted'] = Math.max(completed, 1)
        window.location = '/study/';
      }
    }]
  });
  step.on("show", function() { $("div.row").css("opacity", 0.6); });
  step.on("hide", function() { $("div.row").css("opacity", 1); });



  tour.start();
  tour.show('end');
  window.tour = tour;


});
