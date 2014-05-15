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
requirejs(['jquery', 'handlebars', 'summary/where', 'summary/whereview', 'summary/cstat', 'summary/cstatsview', 'summary/query', 'summary/queryview'],
function   ($, Handlebars, Where, WhereView, CStat, CStatsView, Query, QueryView) {

  $("#fm").on("submit", function() {
    var params = {
      db: $("#db").val(),
      table: $("#table").val(),
      nbuckets: $("#nbuckets").val()
    }

    $.post('/json/lookup/', params, function(resp){
      var data = resp.data;
      var rows = $("#rows").empty();
      _.each(data, function(tup){
        var cs = new CStat(tup);
        where.add(cs);
      })

    }, 'json')
    return false;

  });

  var where = new Where;
  var whereview = new WhereView({collection: where, el: $("#where")});
  var csv = new CStatsView({collection: where, el: $("#rows")});
  var q = new Query();
  var qv = new QueryView({ model: q })
  $("body").append(qv.render().$el);


  var newq = {
    x: 'hr',
    ys: [{col: 'temp', expr: "avg(temp)", alias: 'temp'}],
    schema: {
      hr: 'timestamp',
      temp: 'num'
    },
    where: where,
    table: 'readings' ,
    db: 'intel',
    data: _.times(10, function(i) {
      return { hr: new Date('2004-03-'+i), temp: i, y2: i/2};
    })
  };

  function loadQuery(newquery) {
    where.fetch({data: { db: newquery.db, table: newquery.table}});
    console.log(['where post fetch', where])
    q.set(newquery);
    console.log(['where post set', where])
    q.fetch({data: q.toJSON()});
    console.log(['where post qfetch', where])
  }
  loadQuery(newq)


  window.where = where;



});
