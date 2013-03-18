/*global Connection, LocalCache */
Connection.on('start', function(event) {
  event.shouldCache = Connection.shouldCache(event);

  var cachedResponse = event.shouldCache && LocalCache.get(event.cacheUrl);
  if (cachedResponse) {
    try {
      event.responseData = JSON.parse(cachedResponse);
    } catch (err) {
      /* NOP */
    }
  }
});
Connection.on('data', function(event) {
  // Save off cache data so callback modifications don't corrupt the cache
  if (event.shouldCache) {
    event.cacheData = JSON.stringify(event.responseData);
  }
});
Connection.on('end', function(event) {
  var ttl = event.dataObject && event.dataObject.ttl;

  if (event.cacheData && ttl && !event.errorInfo) {
    LocalCache.store(event.cacheUrl, event.cacheData, ttl);
  }
});
Connection.on('cache-error', function(event) {
  LocalCache.remove(event.cacheUrl);
});

Connection.on('invalidate', function(event) {
  LocalCache.invalidate(event.options.url, event.options.hard);
});

Connection.shouldCache = function(event) {
  var dataObject = event.dataObject,
      options = event.options;

  event.cacheUrl = event.originalUrl;

  // WARN: This does not take into account state changes that could be introduced by non-safe methods
  //    called on a particular URL. If the services tier is changed to a more RESTful architecture
  //    this implementation should be revisited to either invalidate or update the cache elements
  //    based on the responses to other methods.
  return !options.add
        && options.url
        && (!options.type || (options.type && options.type.toLowerCase() === 'get'))
        && dataObject.ttl;
};
