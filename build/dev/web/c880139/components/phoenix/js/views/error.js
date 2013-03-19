/*global Connection, View */
var ErrorView = View.extend({
  name: 'error',
  className: 'error-page',
  crumbs: {hide: true}
});

var errorMessageStrings = {};
errorMessageStrings[Connection.MAINTENANCE_ERROR]
    = 'The site is down for maintenance.  Please try again later.';

errorMessageStrings[Connection.HTTP_ERROR] =
errorMessageStrings[Connection.TIMEOUT_ERROR] =
errorMessageStrings[Connection.CONNECTION_ERROR] =
errorMessageStrings[Connection.PARSER_ERROR]
    = 'An error occurred communicating with the server. Please try again.';

errorMessageStrings[Connection.UNKNOWN_ERROR] =
errorMessageStrings[Connection.SERVER_ERROR]
    = 'We\'re sorry, but we\'re having system issues. Please try again.';

ErrorView.createAndDisplay = function(options) {
  options = _.defaults({message: errorMessageStrings[Connection.UNKNOWN_ERROR]}, options);
  var view = new ErrorView(options);
  view.render();
  Phoenix.setView(view);
};

//last resort error handler
exports.bind('fatal-error', function(msg) {
  if (errorMessageStrings[msg]) {
    ErrorView.createAndDisplay({message: errorMessageStrings[msg]});
  }
});
