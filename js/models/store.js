/*global LocalCache, Stores */
var Store = exports.Models.Store = exports.Model.extend({
  previewClass: 'store',
  ttl: LocalCache.TTL.HOUR,
  url: function() {
    return '/m/j?service=StoreLocator&method=locate&p1=' + (this.attributes.id || this.attributes.storeNumber);
  },
  parse: function(response) {
    // Empty response from the services layer
    if (_.isArray(response) && response.length === 0) {
      this._isEmpty = true;
      return;
    }

    function fixupHours(hours) {
      if (hours && hours.length === 1 && hours[0].day === 'Call store') {
        return { callStore: true };
      } else {
        return hours;
      }
    }

    response.localAdAvailable = Phoenix.Data.boolean(response.localAdAvailable);
    response.storeOpeningSoon = Phoenix.Data.boolean(response.storeOpeningSoon);

    response.hoursOfOperation = fixupHours(response.hoursOfOperation);
    response.storeServiceSlugs = [];
    _.each(response.storeServices, function(service) {
      service.slug = exports.Util.dasherize(service.name);
      response.storeServiceSlugs.push(service.slug);
      service.hoursOfOperation = fixupHours(service.hoursOfOperation);
    });

    return response;
  },

  // callback with {pickupTime: *timestamp ISO 8061 format*, timeZone: *string*}
  getPhotoPickupTime: function(callback) {
    this.ajax({
      v1: true,
      secure: true,
      url: '/m/j?service=Photo&method=getStorePickupTime',
      data: {
        p1: JSON.stringify([this.id])
      },
      success: function(pickupTimes) {
        callback(pickupTimes[0]);
      }
    });
  },

  getDistanceFrom: function(lat, lng, unit) {
    return Phoenix.Util.getDistanceBetween(lat, lng, this.attributes.latitude, this.attributes.longitude);
  },

  setAsSelectedShip2StoreAddress: function(callback) {
    var update = _.bind(function() {
      this.ajax({
        type: 'POST',
        url: '/m/j?service=Checkout&method=setSelectedShip2StoreAddress',
        secure: true,
        data: {
          p1: this.id
        },
        success: _.bind(function(data) {
          this.set(data,{
            silent: true
          });
          if (callback) {
            callback(data);
          }
        },this)
      });
    }, this);
    if (!this.isPopulated()) {
      this.fetch({success: update});
    } else {
      update();
    }
  },

  setAsPharmacyStore: function(callback) {
    this.ajax({
      type: 'GET',
      url: '/m/setStore?store_id=' + this.id,
      secure: true,
      success: _.bind(function(data) {
        this.set(data,{
          silent: true
        });
        if (callback) {
          callback(data);
        }
      },this)
    });
  }
});

Store.fromNative = function(data) {
  if (data.iD) { data.id = data.iD; }    // i love the evil iD  // It loves you too.
  if (!data.id) { data = { id: data }; } // handle id in vs. entire object in
  return new Phoenix.Models.Store(data);
};

var _lastStore;
Store.get = function(storeId, callback, error) {
  if (_lastStore && _lastStore.attributes.id === storeId) {
    callback(_lastStore);
  } else {
    (new Phoenix.Models.Store({
      id: storeId
    })).load(function(store) {
        if (store._isEmpty) {
          return error();
        }

        _lastStore = store;
        callback(store);
      },
      error);
  }
};

Store.suggestStore = function(callback, filter) {
  function checkStore(store) {
    if (store && (!filter || filter(store))) {
      return store;
    }
  }

  //try selected store
  var store = checkStore(Phoenix.getStore());
  if (store) {
    callback(store);
  //then closest store
  } else {
    Stores.closest(function(store) {
        store = checkStore(store);
        if (store) {
          _lastStore = store;
        }
        callback(store);
      },
      function() {
        callback();
      });
  }
};
