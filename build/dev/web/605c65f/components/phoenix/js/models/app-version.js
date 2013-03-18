/*global LocalCache */
var appVersion = exports.appVersion = new (exports.Model.extend({
  background: true,

  cacheToken: function() {
    return this.get('clearClientCache');
  },
  isPopulated: function() {
    if (!this.loadTime) {
      return false;
    }

    var refreshRate = exports.config.configRefreshRate;

    if (refreshRate) {
      refreshRate = Math.max(parseInt(refreshRate, 10), 5 * 60 * 1000);
      return this.loadTime + refreshRate > Date.now();
    } else {
      return true;
    }
  },
  parse: function(data) {
    this.loadTime = Date.now();

    // The AB service does not handle booleans as such so cast boolean string values.
    _.each(data, function(value, key) {
      if (value === 'true') {
        data[key] = true;
      } else if (value === 'false') {
        data[key] = false;
      }
    });

    exports.config = _.extend({}, this.baseConfig, data);
    return exports.config;
  }
}))();

appVersion.bind('change:clearClientCache', function() {
  var TOKEN = 'client-cache-token';
  var token = appVersion.cacheToken(),
      cached = LocalCache.get(TOKEN);
  if (token !== cached) {
    LocalCache.reset();

    if (!LocalCache.store(TOKEN, token)) {
      // Something blew up with the quota. Do not reload as this could cause very bad things
      LocalCache.remove(TOKEN);
    }

    if (cached) {
      // We had data. Now it changed. Signal a reload.
      exports.trigger('cache-reset');
    }
  }
});

// If we do see a change in the cache value then we want to force a reload,
// special casing the checkout routes as these generally aren't cached and
// we do not want to interfere with any inputs the user may have had there
exports.bind('cache-reset', function() {
  if (!Backbone.history || !Backbone.history.started) {
    return;
  }

  if (!/^(?:checkout|photo)/.test(Backbone.history.getFragment())) {
    Backbone.history.loadUrl();
  }
});

$(document).ready(function() {
  appVersion.baseConfig = _.clone(exports.config);

  // Pull an any a/b config that was inlined
  if (window.phoenixConfig) {
    appVersion.set(appVersion.parse(window.phoenixConfig));
  }

  // Disable auto loading in test mode
  if (window.phoenixTest) {
    return;
  }

  // Refetch the app version if we aren't populated anymore, per the refresh config.
  Backbone.history.bind('route', function() {
    if (!appVersion.isPopulated()) {
      appVersion.fetch({background: true, ignoreErrors: true});
    }
  });
});
