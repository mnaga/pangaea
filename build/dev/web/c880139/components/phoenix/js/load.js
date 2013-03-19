/*global lumbarLoadPrefix:true, phoenixConfig */
exports.initErrors = [];

function loadBaseModule() {
  exports.loader.loadModule('base', function() {
    Phoenix.init(exports);
  });
}

if (window.phoenixConfig && phoenixConfig.lumbarLoadPrefix
    && phoenixConfig.lumbarLoadPrefix != lumbarLoadPrefix) {
  // Remap the loader to the replacement lumbarLoadPrefix.
  // Note that care needs to be taken when modifying source in the loader module as
  // these might have a mismatch.
  var originalPrefix = lumbarLoadPrefix;
  lumbarLoadPrefix = exports.loader.loadPrefix = phoenixConfig.lumbarLoadPrefix;

  exports.loader.loadModule('remap', function(err) {
    if (err || !window.ReMap) {
      // Something blew up. Revert to the version that we have inlined.
      lumbarLoadPrefix = exports.loader.loadPrefix = originalPrefix;

      // Provide visibility of this failure (assuming this wasn't a complete failure and we
      // can still stand up the old version)
      exports.initErrors.push({type: 'remap-failed', msg: phoenixConfig.lumbarLoadPrefix });
    }
    loadBaseModule();
  });
} else {
  loadBaseModule();
}
