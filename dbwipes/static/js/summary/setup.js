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
      util = require('summary/util');

  var setupButtons = function(q, qv) {
    $("[data-toggle=tooltip]").tooltip();

    var st_on_text = "Visualization shows what data matching your filter" ,
        st_off_text = "Visualization removes data matching your filter";
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
          .uniq()
          .map(function(w) { return util.toWhereClause(w.col, w.type, w.vals);})
          .map(function(w) { return util.negateClause(w); })
          .map(function(w) { return {col: null, sql: w}; })
          .value();
        var bws = q.get('basewheres');
        bws.push.apply(bws, ws);
        bws = _.uniq(bws, function(bw) { return bw.sql; });
        q.set('basewheres', bws);
        q.trigger('change:basewheres');
        window.where.trigger('change:selection');
      }
    });

  };


  var setupBasic = function() {
    var q = new Query();
    var qv = new QueryView({ model: q })
    $("#right").prepend(qv.render().$el);


    var where = new Where({
      query: q,
      nbuckets: 200
    });
    var whereview = new WhereView({
      collection: where, 
      el: $("#temp-where")
    });
    var csv = new CStatsView({
      collection: where, 
      el: $("#facets")
    });
    var qwv = new QueryWhereView({
      model: q,
      el: $("#perm-where")
    });
    var qf = new QueryForm({model: q, el: $("#query-form-container")});
    q.on('change:db change:table change:basewheres', function() {
      var whereSQL = _.chain(q.get('basewheres'))
        .flatten()
        .pluck('sql')
        .compact()
        .value()
        .join(' AND ');

      where.fetch({
        data: {
          db: q.get('db'),
          table: q.get('table'),
          where: whereSQL
        },
        reset: true
      });

      qf.render();
    });
    qf.on("submit", function() {
      qv.resetState();
    });
    $("#q-toggle").click(qf.toggle.bind(qf));

    where.on('change:selection', function() {
      var defaultOpts = {silent: false, clear: true};
      var opts = null;
      arguments.length && (opts = _.last(arguments))
      opts || (opts = {silent: false});
      opts = _.extend(defaultOpts, opts);
      console.log(['summary.js', 'where.onselection', opts]);
      if (!opts.silent) {
        if (window.srv) {
          window.srv.unlockAll({clear: false});
          window.psrv.unlockAll({clear: false});
        }
        qv.renderWhereOverlay(where.toJSON());
      }
    });
    window.q = q;
    window.qv = qv;
    window.qf = qf;
    window.qwv = qwv;
    window.where = where;
    window.csv = csv;
  }


  var setupScorpion = function(enableScorpion, q, qv, where) {
    if (!enableScorpion) {
      $("#facet-togglecheckall").css("opacity", 0);
      return;
    }

    var srs = null,
        srv = null,
        sq = null,
        sqv = null,
        psrs = null,
        psrv = null;

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


    var scr_btn = $(".walkthrough-btn");
    scr_btn.click(function() {
      sqv.$el.toggle()
    });

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


    window.sq = sq;
    window.sqv = sqv;
    window.srs = srs;
    window.srv = srv;
    window.psrs = psrs;
    window.psrv = psrv;
  };


  var setupTuples = function(q, srv, where) {
    var tv = new TupleView({
      query: q, 
      el: $("#tuples").get()[0]
    });
    tv.hide();

    if (srv) {
      srv.on('setActive', function(whereJSON) {
        tv.model.set('where', whereJSON);
      });
    }
    where.on('change:selection', function() {
      tv.model.set('where', where.toJSON());
      tv.model.trigger('change:where')
    });
    q.on('change', function() {
      var wheres = _.union(q.get('basewheres'), q.get('where'));
      wheres = _.chain(wheres).flatten().compact().value();
      tv.model.set('where', wheres);
      tv.model.trigger('change:where');
    });

    $("#tuples-toggle").click(tv.toggle.bind(tv));
    window.tv = tv;
  };


  return {
    setupBasic: setupBasic,
    setupButtons: setupButtons,
    setupScorpion: setupScorpion,
    setupTuples: setupTuples
  };
});

