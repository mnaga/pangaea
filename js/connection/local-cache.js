/*global Connection, LocalCache */
exports.SessionTTL = LocalCache.TTL.hours(0.25);    // 15 minutes

Connection.shouldCache = function(event) {
  var dataObject = event.dataObject,
      options = event.options;

  event.cacheUrl = event.originalUrl + (options.data ? JSON.stringify(options.data) : '');

  // WARN: This does not take into account state changes that could be introduced by non-safe methods
  //    called on a particular URL. If the services tier is changed to a more RESTful architecture
  //    this implementation should be revisited to either invalidate or update the cache elements
  //    based on the responses to other methods.
  return !options.add
        && options.url
        && options.syncMethod === 'read'
        && dataObject.ttl;
};
