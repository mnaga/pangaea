/*global FastClick, appVersion, module */

Thorax.View.prototype._tapHighlightClassName = 'tap-highlight';

Phoenix = module.exports = exports = new Thorax.LayoutView(_.extend({name: 'application', el: document.body}, exports));
Backbone.history = new Backbone.History();

Phoenix.Collections = Thorax.Collections;
Phoenix.Models = Thorax.Models;
Phoenix.Views = Thorax.Views;

Thorax.setRootObject(Phoenix);

// Dev testing only to try to prevent some of the anti-patterns that occur in developer environments
exports.isDesktop = !('orientation' in window);

exports.init = function(loaderModule) {
  if (window.phoenixTest) {
    return exports.trigger('init-complete');
  }

  Phoenix.render();

  // Apply android specific root class as Android sucks.
  if ($.os.android) {
    $('body').addClass('android');
  }

  new FastClick(document.body);

  exports.trigger('init', loaderModule);

  function complete() {
    exports.trackEvent('launch', {
      model: navigator.userAgent
    });

    Backbone.history.start();
    exports.trigger('init-complete');
  }
  if (typeof appVersion !== 'undefined' && !appVersion.isPopulated()) {
    // A couple of notes here:
    // The common path for most cases will be the else block of the if conditional
    // as this value should be seeded by the m/phoenix service for production cases.
    // For developers we want this to fail relatively early so we don't have to wait.
    // This could also impact mock-server instances but presumabily the impact will
    // be minimal.
    appVersion.fetch({
      timeout: 3000,
      success: complete,
      error: complete     // If we fail to load we still want to try to show the app.
    });
  } else {
    complete();
  }
};
