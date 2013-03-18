/*global Connection, Util */
Connection.bind('start', function(event) {
  var options = event.options;

  options.url = Util.appendParams(options.url, {
    apikey: exports.config.apikey,
    requestorigin: 'mweb'
  });
});
