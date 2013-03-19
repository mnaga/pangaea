/*global Connection */

//***************
// Error tracking
//
// Helps us differentiate between true connection errors and
// errors that are introduced due to aborted connections due to page naviation.
//
//***************
var isUnloading = false,
    unloadTrackerCount = 0;
function unloadTracker() {
  isUnloading = true;
}
// We want to keep the page in the page cache if possible.
// Using the rules defined in https://developer.mozilla.org/en-US/docs/Using_Firefox_1.5_caching
// as a rough outline for the presumed behavior of webkit.
Connection.on('start', function() {
  ++unloadTrackerCount;
  if (unloadTrackerCount === 1) {
    window.addEventListener('beforeunload', unloadTracker, false);
  }
});

Connection.on('error', function(event) {
  // Simplify the output for the data connection lost case
  if (event.connectionError) {
    // If we are actively unloading and see a connection error, ignore.
    if (isUnloading) {
      event.error = function() {};
    }
  }
});

Connection.on('end', function() {
  --unloadTrackerCount;
  if (!unloadTrackerCount) {
    window.removeEventListener('beforeunload', unloadTracker, false);
  }
});
