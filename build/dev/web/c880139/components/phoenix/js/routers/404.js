/*global Connection */
var pageNotFoundRouter = new (Backbone.Router.extend({
  routes: {
    '*path': 'render404'
  },
  render404: function(path) {
    Phoenix.setView(new Thorax.View({
      name: 'error-not-found',
      className: 'error-page',
      path: path
    }));
  }
}))();

exports.bind('fatal-error', function(msg) {
  if (msg === Connection.NOT_FOUND_ERROR) {
    pageNotFoundRouter.render404();
  }
});
