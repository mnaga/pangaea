/*global Connection, authentication */
var Util = Phoenix.Util = {
  latLng: function(value) {
    // Reduce precision to 3 places, approximately 111m resolution at the equator.
    // This produces cleaner urls and improves the odds of a warm cache hit for requests
    return Math.floor(parseFloat(value) * 1000) / 1000;
  },

  ensureArray: function(item) {
    if (!item) {
      return item;
    }
    if (_.isArray(item)) {
      return item;
    } else {
      return [item];
    }
  },

  valueOf: function(obj, _this) {
    _this = _this || window;
    return _.isFunction(obj) ? obj.call(_this) : obj;
  },

  // Unlike $.param, this function doesn't replace spaces with pluses
  serializeParams: function(params) {
    return _.map(params, function(value, key) {
      return encodeURIComponent(key) + '=' + encodeURIComponent(value);
    }).join('&');
  },

  appendParams: function(url, params) {
    url = url || '';

    params = _.isString(params) ? params : this.serializeParams(Util.removeUndefined(params));
    if (!params) {
      return url;
    }

    var base = url + (url.indexOf('?') === -1 ? '?' : '&');
    return base + params;
  },

  stripParams: function(url) {
    var index = url.indexOf('?');
    return url.slice(0, index === -1 ? undefined : index);
  },

  // Returns a copy of the object containing only keys/values that passed truth test (iterator)
  // TODO : Consider extending underscore with this method
  pickBy: function(obj, iterator) {
    var res = {};
    _.each(obj, function(value, key) {
      if (iterator(value, key)) {
        res[key] = value;
      }
    });
    return res;
  },

  removeUndefined: function(obj) {
    return this.pickBy(obj, function(v) {
      return v !== undefined;
    });
  },

  cachedSingletonMixin: function(DataClass, type, expires) {
    var instance;
    var lastAccessTime = new Date().getTime();
    DataClass.get = function(noCreate) {
      if (noCreate) {
        return instance;
      }
      var curTime = new Date().getTime();
      if ((curTime - lastAccessTime) > (expires || authentication.SESSION_DURATION)) {
        DataClass.release();
      }
      if (!instance) {
        instance = new DataClass();
      }
      lastAccessTime = curTime;
      return instance;
    };
    DataClass.release = function() {
      lastAccessTime = 0;

      // Clearing here rather than clearing the instance object so any long lived
      // binds will survive and not leak.
      if (instance) {
        instance.reset && instance.reset();
        instance.clear && instance.clear();
      }
    };

    // Clear all data if any fatal error occurs, `resetData` event triggered
    exports.on('fatal-error', DataClass.release);
    exports.on('order:complete', DataClass.release);
    exports.on('resetData', function(options) {
      if (!options.type || options.type === 'all' || options.type === type) {
        DataClass.release();
      }
    });

    authentication.on('loggedout', DataClass.release);
    authentication.on(Connection.SESSION_EXPIRED, DataClass.release);
    authentication.on('session-activity', function() {
      if (authentication.isAuthed() === false) {
        DataClass.release();
      }
    });
  }
};
