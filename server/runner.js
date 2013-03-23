var searchTerm = require('system').args[1];
var page = require('webpage').create();
var url = 'http://localhost:8080/#' + searchTerm;
page.open(url, function (status) { });

page.onCallback = function(data) {
  if (data.ready) {
    page.evaluate(function() {
      window.$('script').remove();
      window.$('[data-view-name="loading-indicator"]').remove();
    });
    var content = page.content;
    require('fs').write('build/dev/' + searchTerm + '.html', content);
    phantom.exit();
  }
};

page.onConsoleMessage = function() {
  console.log.apply(console, arguments);
};