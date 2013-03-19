/*global Connection */
Connection.on('start', function(event) {
  event.route = Backbone.History.started && Backbone.history.getFragment();
});
Connection.on('data', function(event) {
  // Mark any out of band responses as aborted.
  // This will not block most of the response handling
  // but will filter out some error cases that no longer
  // make sense in the user's current context
  if (event.route && event.route !== Backbone.history.getFragment()) {
    event.dataObject._aborted = true;
  }
});
