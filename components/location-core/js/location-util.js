var LAST_STORE_SEARCH = '_lastStoreSearch';
var STORE_SEARCH_HISTORY = '_storeSearchHistory';
var lastSearchData = SessionCache.getItem(LAST_STORE_SEARCH);
lastSearchData = lastSearchData && JSON.parse(lastSearchData);
var storeSearchHistory = JSON.parse(SessionCache.getItem(STORE_SEARCH_HISTORY) || '[]');

 _.defaults(exports, {
  getLocationType: function() {
    var route = Backbone.history.getFragment();
    var match = route.match(/([^\/]+)\/location\/.*/);
    if (match) {
      return match[1];
    }
  },

  // return the location URL
  // allow the style to be passed in (as opposed to just relying on the URL)
  // since Android has a bug where the current route does not get updated correctly
  // if multiple route replacements in a row occur.  In these cases, data contained
  // in the route *must* be extracted through router methods (which still perform
  // correctly) instead of extraction using Backbone.history.getFragment() at a later time.
  locationUrl: function(url, style) {
    style = style || exports.getLocationType();
    return (style ? style + '/' : '') + 'location/' + url;
  },

  locationParams: function(baseUrl, coords) {
    var params = $.param(Backbone.history.getQueryParameters());

    coords = coords ? ('/' + Phoenix.Data.latLng(coords.lat) + '/' + Phoenix.Data.latLng(coords.lng)) : '';
    params = params ? ('?' + params) : '';
    return baseUrl + coords + params;
  },

  storeLastSearch: function(data) {
    lastSearchData = data;
    if (data) {
      data.lng = Phoenix.Data.latLng(data.lng);
      data.lat = Phoenix.Data.latLng(data.lat);
      SessionCache.setItem(LAST_STORE_SEARCH, JSON.stringify(data));
      // store in history
      if (!exports.getQueryInfo(data.lat, data.lng)) {
        if (storeSearchHistory.length > 10) {
          storeSearchHistory.splice(9, 1);
        }
        storeSearchHistory.push(data);
        SessionCache.setItem(STORE_SEARCH_HISTORY, JSON.stringify(storeSearchHistory));
      }
    } else {
      SessionCache.removeItem(LAST_STORE_SEARCH);
    }
  },

  getLastSearch: function() {
    return lastSearchData;
  },

  getQueryInfo: function(lat, lng) {
    lng = Phoenix.Data.latLng(lng);
    lat = Phoenix.Data.latLng(lat);

    for (var i=storeSearchHistory.length-1; i>=0; i--) {
      if (storeSearchHistory[i].lat === lat && storeSearchHistory[i].lng === lng) {
        return storeSearchHistory[i];
      }
    }
  },

  doLocate: function(showForm, showList) {
    if (storeSearchHistory.length > 0) {
      // default to the most recent search
      var lastSearch = exports.getLastSearch();
      if (lastSearch && lastSearch.lat) {   // Ignore possibly out of date data types
        showList(lastSearch);
      } else {
        // an empty last search meant that the last search returned 0 results
        showForm();
      }
    } else {
      // see if we can get their location
      Phoenix.getLocation(Thorax.Router.bindToRoute(showList), Thorax.Router.bindToRoute(showForm));
    }
  },

  locatorView: function(options) {
    options || (options = {});
    var view = options.view,
        hideFooter = options.hideFooter || false,
        type = options.type,
        baseUrl = options.baseUrl,
        args = options.args,
        filter = options.filter,
        coords = options.coords,
        callback = options.callback,
        queryInfo, lat, lng;

    if (coords) {
      lat = coords.lat;
      lng = coords.lng;
    } else { // fallback to arguments if lat/lng not found in coords
      lat = args[0];
      lng = args[1];
      // need to create this to hold the lat/lng and passed to stores ctor
    }
    if (coords && lat && lng) {
      queryInfo = exports.getQueryInfo(lat, lng);
      coords.lat = Phoenix.Data.latLng(lat);
      coords.lng = Phoenix.Data.latLng(lng);
    }

    // get the style attribute from query parameters if exist
    var style = args[args.length - 1] && args[args.length - 1].style;
    var view = this.view(view, {
      hideFooter: hideFooter,
      coords: coords,
      queryInfo: queryInfo,
      hideControls: type === 'item',
      style: style,
      itemFilter: filter
    });

    if (baseUrl) {
      view.on('results:non-empty', function(coords) {
        Backbone.history.navigate(exports.locationParams(baseUrl, coords), {trigger: true});
      });
      view.on('rendered:empty', function() {
        Backbone.history.navigate(exports.locationParams(baseUrl), {trigger: false, replace: true});
      });
      view.on('map:view-change', function(trigger) {
        Backbone.history.navigate(exports.locationParams('location/map', view.collection), {trigger: trigger, replace: true});
      });
    }

    // Reuse the existing collection if possible. Being a bit indirect here as matching
    // on the collection attributes is quite a bit more complex
    var oldView = Phoenix.layout.view,
        stores;
    if (coords) {
      if (oldView && _.isEqual(oldView.coords, coords)) {
        stores = oldView.baseCollection || oldView.collection;
      } else {
        stores = new Phoenix.Collections.Stores(null, coords);
      }
    } else {
      // Need to pass empty collection to force view to render empty state
      stores = new Phoenix.Collection([]);
    }

    view.setCollection(stores);
    // TODO: destroying the view will cause exports.CachedPagedCollection
    // _child to be set to undefined via LocationSelectListView.unbindCollection
    // since the view is re-used and the collection extracted later
    // Regression introduced in 2.x since view destruction is handled differently
    // need to determine exact behavioral change and fix
    Phoenix.layout.setView(view, {destroy: false});

    callback && callback(stores, type);
    return view;
  },

  coordsFromArgs: function(args, startIndex) {
    var decimalRe = Phoenix.Util.regexes.decimal,
        length = args.length;

    // Ignore the last arg if we were passed a query param
    while (length >= 0 && (!args[length-1] || _.isObject(args[length-1]))) {
      length--;
    }

    if (length === startIndex + 2) {
      if (decimalRe.test(args[startIndex]) && decimalRe.test(args[startIndex + 1])) {
        return {
          lat: args[startIndex],
          lng: args[startIndex + 1]
        };
      }
    }
  }
});

Handlebars.registerHelper('store-details', function(storeAttr, href) {
  var clazz = Phoenix.getStoreId() === storeAttr.id ? 'current-store' : '',
      href = exports.locationUrl(storeAttr.storeNumber);
  return new Handlebars.SafeString(
    '<a class="' + clazz + '" href="' + Phoenix.View.link(href) + '">'
        + storeAttr.address.city + ' #' + storeAttr.storeNumber
      + '</a>');
});
