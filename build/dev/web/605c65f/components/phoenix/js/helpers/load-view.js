/*global getOptionsData, htmlAttributesToCopy */

// Displays loading view until main view triggers 'loaded' event, after which
// displays main view. Main view (instance or name) is passed as an argument.
// Loading view (instance or name) is passed in 'loading-view' parameter. If not
// specified, defaults to 'inline-loading'

Handlebars.registerHelper('load-view', function(view, options) {
  var declaringView = getOptionsData(options).view;
  if (arguments.length === 1) {
    options = view;
    view = Thorax.View;
  }

  var mainView = Thorax.Util.getViewInstance(view, _.omit(options.hash, 'loading-view', 'expand-tokens'));
  if (!mainView) {
    return '';
  }
  declaringView._addChild(mainView);

  var loadingView = Thorax.Util.getViewInstance(options.hash['loading-view'] || 'inline-loading');

  declaringView.on('append', function(scope, callback) {
    var el = (scope || this.$el).find('[load-view-placeholder-id=' + mainView.cid + ']');
    mainView.ensureRendered();
    loadingView.ensureRendered();
    if (!mainView._isLoading) {
      $(el).replaceWith(mainView.el);
      callback && callback(mainView.el);
    } else {
      $(el).replaceWith(loadingView.el);
      mainView.on('loaded', function() {
        //see if the view helper declared an override for the view
        //if not, ensure the view has been rendered at least once
        if (options.fn) {
          mainView.render(options.fn);
        }
        loadingView.$el.replaceWith(mainView.el);
        callback && callback(mainView.el);
      });
    }
  });

  var htmlAttributes = _.extend({
    'load-view-placeholder-id': mainView.cid
  }, _.pick(options.hash, htmlAttributesToCopy));
  return new Handlebars.SafeString(Thorax.Util.tag(htmlAttributes, undefined, options.hash['expand-tokens'] ? this : null));
});
