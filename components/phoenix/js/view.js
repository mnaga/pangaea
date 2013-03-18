var View = exports.View = Thorax.View.extend({
  // Remove loading timeout delay here as this can introduce up to two second delay for cases
  // that we will likely want to display the indicator anyway
  _loadingTimeoutDuration: 0
});
