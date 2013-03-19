/*global Connection */
exports.bind('init', function(loaderModule) {
  exports.initBackboneLoader && exports.initBackboneLoader(loaderModule, function(type, module) {
    exports.trackError('loader', type + ':' + module);
    exports.trigger('fatal-error', type === 'connection' ? Connection.SERVER_ERROR : Connection.UNKNOWN_ERROR);
  });

  // Module loading indicators
  loaderModule.loader.initEvents();
  Thorax.forwardLoadEvents(loaderModule.loader, Phoenix);

  // Device info
  exports.devicePixelRatio = loaderModule.devicePixelRatio;
  exports.isDense = loaderModule.devicePixelRatio > 1;
});
