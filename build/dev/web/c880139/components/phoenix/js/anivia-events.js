/*global Loader, alert, console */
exports.trackError = function(type, msg) {
  exports.trackEvent('error', {type: type, msg: msg});
  console.error(type + ':' + msg);
  if (!exports.isProd && type === 'javascript') {
    alert('Background error: ' + msg);
  }
};
Thorax.onException = exports.trackCatch = function(location, err) {
  exports.trackError('javascript', 'trackCatch:' + location + ': ' + err + (err.stack || ''));
};

// if applicable, bind to window.onerror
var _onError = window.onerror;
window.onerror = function(errorMsg, url, lineNumber) {
  _onError && _onError(errorMsg, url, lineNumber);
  exports.trackError('javascript', url + ': ' + lineNumber + ' - ' + errorMsg);
};

var lastPage;
Backbone.history.bind('route', function() {
  var name = Backbone.history.getFragment();
  // Do not send duplicate events (route will be triggered twice for the first module load)
  if (name !== lastPage) {
    exports.trackEvent('pageView', { name: name });
    lastPage = name;
  }
});

Backbone.history.bind('route-error', function(route, err) {
  exports.trackCatch('route-error:' + Backbone.history.getFragment(), err);
});

_.each(Loader.initErrors, function(error) {
  exports.trackError(error.type, error.msg);
});

var touchSanity = exports.touchSanity = function(event) {
  if (!event.touches) {
    exports.trackError('javascript', 'Touch event missing touches: ' + navigator.userAgent);
    throw new Error('Touch event missing touches');
  }
};
