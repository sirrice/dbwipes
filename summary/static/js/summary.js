requirejs.config({
  //By default load any module IDs from js/lib
  baseUrl: 'static/js/lib',

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
    }
  }
});

// Start the main app logic.
requirejs(['jquery', 'summary/where', 'summary/whereview', 'summary/cstat', 'summary/cstatsview', 'summary/query', 'summary/queryview'],
function   ($, Where, WhereView, CStat, CStatsView, Query, QueryView) {

  $("#fm").on("submit", function() {
    var params = {
      db: $("#db").val(),
      table: $("#table").val(),
      nbuckets: $("#nbuckets").val()
    }

    $.post('/json/lookup/', params, function(resp){
      var data = resp.data;
      var rows = $("#facets").empty();
      _.each(data, function(tup){
        var cs = new CStat(tup);
        where.add(cs);
      })

    }, 'json')
    return false;

  });

  var where = new Where;
  var whereview = new WhereView({collection: where, el: $("#where")});
  var csv = new CStatsView({collection: where, el: $("#facets")});
  var q = new Query();
  var qv = new QueryView({ model: q })
  $("#viz").append(qv.render().$el);


  var newq = {
    x: 'hr',
    ys: [
      {col: 'temp', expr: "avg(temp)", alias: 'avg'},
      {col: 'temp', expr: "stddev(temp)", alias: 'std'}
    ],
    schema: {
      hr: 'timestamp',
      temp: 'num'
    },
    where: where,
    table: 'readings' ,
    db: 'intel',
    data: _.times(10, function(i) {
      return { hr: new Date('2004-03-'+i), std: i, avg: i/2};
    })
  };

  q.set(newq);
  //q.fetch({data: q.toJSON()});
  //console.log(['where post qfetch', where])

  //where.parse({data: [{col: 'hr', type: 'timestamp', stats: [{val: new Date('2004-03-1'), count: 10, range:[]}]}]})
  where.fetch({data: { db: newq.db, table: newq.table, nbuckets:500}});
  //console.log(['where post fetch', where])



  window.q = q;
  window.qv = qv;
  window.where = where;



});
