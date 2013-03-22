/*global LocalCache */

// should be initialized with:
// a) lat + lng attributes
// b) itemIds: possibly an array of item ids
var Stores = Phoenix.Collections.Stores = Phoenix.PagedCollection.extend({
  model: Phoenix.Models.Store,
  ttl: LocalCache.TTL.DAY,
  v1: true,
  initialize: function(models, attributes) {
    attributes = _.extend(this, _.defaults(attributes || {}, {
      lat: 0,
      lng: 0,
      radius: 50
    }));
    Phoenix.Collection.prototype.initialize.call(this, models);
  },
  url: function() {
    if (this.itemIds) {
      return '/m/j?service=StoreLocator&method=locateShippableByLatLong&p1=' +
        this.lat + '&p2=' + this.lng + '&p3=' + JSON.stringify(this.itemIds) +
        '&p4=' + this.radius + this.offsetParams(5);
    } else {
      return '/m/j?service=StoreLocator&method=locate&p1=' +
        this.lat + '&p2=' + this.lng + '&p3=' + this.radius + this.offsetParams(4);
    }
  },
  attributes: function() {
    return {
      lat: this.lat,
      lng: this.lng,
      radius: this.radius
    };
  },
  hasMore: function() {
    return !this.noMorePages;
  },
  parse: function(data) {
    var rtn = Phoenix.Collection.prototype.parse.call(this, data);
    // the data has not totalCount attribute
    if (rtn.length < this.pageSize) {
      this.noMorePages = true;
    }
    // Support this while we still have the one off paging logic in the checkout store locator
    // After that is killed off we can drop this var in favor of CachedPagedCollection
    this.totalCount = this.length + rtn.length;
    return rtn;
  },
  getPhotoPickupTimes: function(ids, callback) {
    if (!callback) {
      callback = ids;
      ids = _.pluck(this.models, 'id');
    }
    this.ajax({
      secure: true,
      v1: true,
      url: '/m/j?service=Photo&method=getStorePickupTime',
      data: {
        p1: JSON.stringify(ids)
      },
      success: callback
    });
  }
});

//get closest store, callback will only be called if a store is found
(function() {
  function _getClosestStore(coords, callback, options) {
    var stores = new Phoenix.Collections.Stores(null, coords);
    stores.fetch(_.defaults({
        success: function(stores) {
          callback(stores.at(0));
        }
      },
      options));
  }

  // keep a cached value of the closest store when not querying location services
  var CACHED_CLOSEST_STORE = '_cachedClosestStore';
  var cachedClosestStoreData = JSON.parse(LocalCache.get(CACHED_CLOSEST_STORE) || '{}');
  if (cachedClosestStoreData.store) {
    // the model attributes were cached
    var attrs = cachedClosestStoreData.store;
    cachedClosestStoreData.store = new Phoenix.Models.Store(attrs);
  }

  function _cacheClosestStore(coords, store) {
    var data = {
      store: store,
      coords: coords
    };
    LocalCache.store(CACHED_CLOSEST_STORE, JSON.stringify(data));
    cachedClosestStoreData = data;
  }

  Stores.closest = function(callback, failback, options) {
    Phoenix.getLocation(function(coords) {
      var cachedCoords = cachedClosestStoreData.coords;
      if (!cachedCoords || !Phoenix.Util.isWithinRange(cachedCoords, coords)) {
        // location is out of date, get new store data
        _getClosestStore(coords, function(store) {
          _cacheClosestStore(coords, store);
          if (store) {
            callback(store);
          } else {
            failback && failback();
          }
        }, options);
      } else {
        // the cached store location is still the same
        callback(cachedClosestStoreData.store);
      }
    }, failback, options && options.useCachedLocation);
  };
})();

