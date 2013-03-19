
Phoenix['locationCore'] = (function(Phoenix, View, Handlebars) {
  var module = {exports: {}};
  var exports = module.exports;
  Phoenix['locationCore'] = exports;

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

;;
/*global getQueryInfo */

var LocationUtil = Phoenix.locationCore,
    selectedSlugs = [],
    popupSeen = false;

_.extend(LocationUtil, {
  TYPE_CART: 'cart',
  TYPE_PHOTO: 'photo',
  SERVICE_PHOTO: 'Photo Center',
  TYPE_PHARMACY: 'pharmacy',
  SERVICE_PHARMACY: 'Pharmacy'
});

var LocationBase = Phoenix.CollectionView.extend({
  name: 'location/list',
  nonBlockingLoad: true,

  crumbs: {
    name: 'Store Finder',
    links: function(links) {
      var linkEl = links.add(_.bind(function() {
        if (!linkEl.hasClass('disabled')) {
          this.filter.toggle();
        }
      }, this), Phoenix.View.i18n("Filters"));
      linkEl.addClass("location-filter-button");
      if (selectedSlugs.length > 0) {
        linkEl.addClass('active');
      }
      this.filterToggle = linkEl;
    },
    logic: function(data, callback) {
      var type = LocationUtil.getLocationType();
      var rtn = [];
      // reset the crumb for all but keep 'cart' as anchor if cart type
      if (type === LocationUtil.TYPE_CART) {
         rtn.push({name: 'Cart', showCrumb: true, showLink: true, route: 'cart'});
      } else if (type === LocationUtil.TYPE_PHOTO) {
        rtn.push({name: 'Photo', showCrumb: true, showLink: true, route: 'photo'});
      }
      rtn.push({name: 'Store Finder', showCrumb: true, showLink: false, route: Backbone.history.getFragment(), routeAlias: 'storeFinder'});
      callback({reset: rtn});
    }
  },
  _collectionSelector: '.location-list',

  initialize: function() {
    this.searchBar = new Phoenix.locationCore.LocationSearchBar({
      parent: this,
      queryLabel: (this.queryInfo || {}).formattedQuery,
      hideControls: this.hideControls || LocationUtil.getLocationType()
    })
    .bind('geoloc:error', this.onGeoLocError, this)
    .bind('results:empty', function() {
      // empty the pre-existing collection so when rendered its empty.
      this.collection.reset();

      // call with an empty string and false to display the default error
      // message to the user.
      this.onZeroResults('', false);

      this.filterToggle.addClass('disabled');
      this.filter.clearFilters();
    }, this)
    .bind('results:non-empty', function() {
      this.filterToggle.removeClass('disabled');
    }, this);

    // proxy search bar methods
    _.each(['results:non-empty', 'results:empty'], function(name) {
      this.searchBar.bind(name, _.bind(this.trigger, this, name));
    }, this);

    this.filter = this.view('LocationFilter');
    this.filter.bind('apply', function() {
      this.renderCollection();
      this.filter.hide();
    }, this);
    this.filter.hide();

    var _storeServices = StoreServices;
    // filter to services related to the type (if applicable)
    if (LocationUtil.getLocationType()) {
      var _tmpServices = StoreServices.where({type: LocationUtil.getLocationType()});
      if (_tmpServices.length) {
        _storeServices = new Thorax.Collection(_tmpServices);
      }
    }
    this.filter.setCollection(_storeServices);

    // TODO : Convert this to use search-overlay and make the "breadcrumb" opup generics
    this.filter.bind('show', function() {
      this.filterToggle.addClass('open');
      _.invoke(this._elementsToToggle(), 'hide');
      $('footer').hide();
    }, this);

    this.filter.bind('hide', function() {
      this.filterToggle.removeClass('open');
      _.invoke(this._elementsToToggle(), 'show');
      $('footer').show();
    }, this);
  },

  _matchFilters: function(slugs, collection) {
    collection || (collection = this.collection);

    var matches = collection.select(function(model) {
      var modelSlugs = model.attributes.storeServiceSlugs;
      return _.intersection(modelSlugs, slugs).length === slugs.length;
    });

    return matches;
  },

  onZeroResults: function(query, permissions) {
    // remove the form waiting state
    this.$('form').removeAttr('data-submit-wait');
    // fix url in case of page refresh or map view
    this._onRenderEmpty(query, permissions);
    // reset the search links
    this.coords = undefined;

    // instead of onZeroResults calling searchBar.render(), only have
    // onGeoLocError call it. on results:empty also calls this function and
    // calling searchBar.render() will clear our error message we just
    // displayed.
  },
  onGeoLocError: function() {
    this.onZeroResults(undefined, true);
    this.searchBar.render();
  },

  //manually show popup
  showPopup: function(msg) {
    // allow for the collection container tu be used as the popup container or, if outer content is requred, a specific
    // element with a 'popup' class for the popup if a specific element with a 'store-locator-container' class exists
    var popupEl = this.$('.popup'),
        standardEl = this.$('.store-locator-container');
    if (!popupEl.length) {
      popupEl = this.$(this._collectionSelector);
    }

    var data = msg;
    if (!data || !data.msg) {
      data = {
        msg: msg || '<strong>Use the search bar</strong> to find a store near you, or anywhere else. Search by City, State or ZIP.'
      };
    }

    popupEl
        .html(this.renderTemplate('location/list-empty', data))
        .find('.location-list-empty').addClass('popup');
    if (standardEl.length) {
      popupEl.show();
      standardEl.hide();
    }

    var hidePopup = _.bind(this._hidePopup, this);
    this.$('[name="query"]').one('focus', function() {
      hidePopup();
    });
    popupSeen = true;
  },

  _hidePopup: function() {
    var standardEl = this.$('.store-locator-container');
    this.$('.location-list-empty').remove();
    if (standardEl.length) {
      // If we are pairing a popup and content container then only show the content container
      // if we have content.
      standardEl.toggle(this.collection.size());
      this.$('.popup').hide();
    }
  },

  _onReady: function() {},
  _onReset: function() {},
  _onDestroyed: function() {},

  getQueryMessage: function(query) {
    if (!query) {
      return 'Please enter valid location name.  Search again by City, State or ZIP.';
    }
    // make sure the zip code entered was valid (the pattern allows for a zip code within a full street address)
    var match = query.match(/\b([0-9\-]+)\s*$/);
    if (match) {
      // match.length - 1 in case whitespace at end of query
      var parts = match[match.length-1].split('-');
      if (parts[0].length !== 5
          || (parts[1] && parts[1].length !== 4)
          || parts.length > 2) {
        return {
          msg: 'No stores found for <strong>{{query}}</strong>.  Please verify that the ZIP code entered was valid.',
          query: query
        };
      }
    }
    return {
      msg: 'No stores found for <strong>{{query}}</strong>.  Search again by City, State or ZIP.',
      query: query
    };
  },

  _onRenderEmpty: function(query, permissions) {
    if (!_.isString(query)) {
      if (this.collection) {
        // in case this is from base thorax.  this may happen if the user entered a location
        // with a valid address which is redirected to /location/list/{lat}/{lng} but the
        // search query needs to be shown if there are 0 results
        query = (LocationUtil.getQueryInfo(this.collection.lat, this.collection.lng) || {}).query;
        // make sure the search bar shows actually what the user entered
        this.searchBar.getInput().val((this.queryInfo && this.queryInfo.query) || '');
      } else {
        query = undefined;
      }
    }

    // Cleanup in case we came from a success case
    this._onDestroyed();

    if (query || query === '' || permissions) {
      var msg;
      if (permissions) {
        msg = 'We do not have permission to use your location. Try searching by City, State or ZIP.';
      } else {
        msg = this.getQueryMessage(query);
      }
      this.showPopup(msg);
      this.filter && this.filter.disable();
    } else {
      var coords = this.coords || {},
          s2sItemIds = coords.itemIds || [];

      if (s2sItemIds.length > 0) {
        var link = Phoenix.View.link('checkout/shipping-options');
        this.showPopup('We are not able to ship your item(s) to a store near you. Either enter a different shipping location or go back to <a href="' + link + '">select a new shipping option</a>.');
      } else {
        this.showPopup();
      }
    }
  },

  _onActivated: function() {
    Phoenix.search.bind('show', this._hidePopup, this);
  },

  _onDeactivated: function() {
    Phoenix.search.unbind('show', this._hidePopup, this);
  },

  _elementsToToggle: function() {
    return [
      $(this.searchBar.el),
      this.$(this._collectionSelector)
    ];
  }
});

var StoreServices = new Thorax.Collection([
  {
    "name": "Cell Phones, Plans &amp; More",
    "slug": "cell-phones-plans-more"
  },
  {
    "name": "Garden Center",
    "slug": "garden-center"
  },
  {
    "name": "Site to Store<sup>SM</sup>",
    "slug": "siteto-storesup-smsup"
  },
  {
    "name": "L.e.i. Apparel",
    "slug": "lei-apparel"
  },
  {
    "name": "Pharmacy",
    "slug": "pharmacy"
  },
  {
    "name": "Photo Center",
    "slug": "photo-center",
    "type": "photo"
  },
  {
    "name": "1-Hour Photo Center",
    "slug": "hour-photo-center",
    "type": "photo"
  },
  {
    "name": "Same Day Pickup Photo Center",
    "slug": "same-day-pickup-photo-center",
    "type": "photo"
  },
  {
    "name": "Pick Up Today",
    "slug": "pick-up-today"
  },
  {
    "name": "Portrait Studio",
    "slug": "portrait-studio"
  },
  {
    "name": "Vision Center",
    "slug": "vision-center"
  },
  {
    "name": "Tire &#38; Lube",
    "slug": "tire-lube"
  }
], {
  comparator: function(model) {
    return model.attributes.name;
  }
});

StoreServices.locationListDisplayOrder = [
  "tire-lube",
  "pharmacy",
  "photo-center",
  "vision-center",
  "garden-center"
];

LocationBase.on({
  'click .location-list-empty': function(e) {
    this.searchBar.$("input")[0].focus();
  },

  'collection': {
    'reset': '_onReset'
  },
  'rendered:empty': function() {
    this._onRenderEmpty();
  },
  'ready': '_onReady',
  'destroyed': '_onDestroyed',
  'rendered:collection':function() {
    if (this.filter) {
      if (this.collection && this.collection.length) {
        this.filter.enable();
      } else {
        this.filter.disable();
      }
    }
  },
  activated: '_onActivated',
  deactivated: '_onDeactivated'
});


;;
var PAN_RELOAD_RANGE = 10;
var MAX_DIST_FROM_CENTER = 8;

Phoenix.Views.LocationMap = LocationBase.extend({
  searchButton: '.show-map',

  _mapReady: false,

  initialize: function() {
    this.constructor.__super__.initialize.apply(this, arguments);

    var _this = this;

    this.filter.bind('show', function() {
      $('.flex').removeClass('full-screen-view');
    });

    this.filter.bind('hide', function() {
      $('.flex').addClass('full-screen-view');
    });

    if (this.coords) {
      this.map = this.view(new Phoenix.locationCore.MapView({
        className: "map-canvas"
      }));

      this.map.bind("map:ready", function() {
        _this._mapReady = true;
        _this.renderCollection();
        // remove the loading indicator once the map is ready
        _this.$('.collection-loading').remove();
      });
      this.map.bind('pan', _.debounce(this.onPan), this);
    }
  },

  onPan: function(startPosition, endPosition) {
    if (!this.coords || Phoenix.Util.getDistanceBetween(endPosition, this.coords) > PAN_RELOAD_RANGE) {
      this.coords = {
          lat: Phoenix.Data.latLng(endPosition.latitude),
          lng: Phoenix.Data.latLng(endPosition.longitude)
      };
      _.extend(this.collection, this.coords);
      var _this = this;
      this.collection.fetch({success: function() {
        _this.renderCollection(true);
        Backbone.history.navigate(locationParams('location/map', _this.collection), {trigger: false, replace: true});
        _this.searchBar.reset(true);
        // we will render directly with no auto map centering
      }, silent: true});
    }
  },

  renderItem: function(model, i) {
    var selectedStore = Phoenix.getStore();
    this.map.addPin({
      position: [model.get("latitude"), model.get("longitude")],
      title: "",
      events: {
        click: function() {
          // Defer to allow the map a chance to finish the event processing before
          // we blow it away.
          _.defer(function() {
            Backbone.history.navigate(Phoenix.locationCore.locationUrl(model.id), true);
          });
        }
      }
    }, selectedStore && selectedStore.id === model.id);
  },

  context: function() {
    return {showLoading: !this._mapReady};
  },

  renderCollection: function(cancelCentering) {
    if (this.coords) {
      if(!this._mapReady || !this.collection.isPopulated()) {
        // this will be called again when the map is ready or collection is populated
        return;
      }

      this.map.clearPins();
      if (selectedSlugs.length) {
        var matches = this._matchFilters(selectedSlugs, this.collection);
        _.map(matches, this.renderItem, this);
      } else {
        this.collection.map(this.renderItem, this);
      }
      this.trigger('rendered:collection', this.el);

      if (!cancelCentering) {
        // center on closest item
        if (this.collection.size() > 0) {
          var centerLoc = this.collection.at(0).attributes;
          this.map.setCenter(this.collection.at(0).attributes);
        } else {
          // just show current location
          this.map.setCenter(_this.coords.lat, this.coords.lng);
        }
      }
    }
  },

  _onReady: function() {
    if (this.collection.isPopulated()) {
      this.showContent();
    }
  },
  _onReset: function() {
    if (!this.rendered) {
      this.showContent();
    }
  },

  showContent: function() {
    this.rendered = true;
    if (this.collection.size() > 0) {
      $('.flex').addClass('full-screen-view');

      // Map needs to be appended before rendered
      this.$(this._collectionSelector)
          .append(this.map.el);
      this.map.render();
    } else {
      this.trigger('rendered:empty', this.$('.location-list'));
    }
  },

  _onDestroyed: function() {
    $('.flex').removeClass('full-screen-view');
    if (this.map) {
      this.map.dispose();
    }
  }
});

;;
Phoenix.Views.AbstractMap = Phoenix.View.extend({
  name: 'location/map',

  pins: [],

  dispose: function() {
    this.map && this.map.dispose && this.map.dispose();
    this.disposed = true;
  },

  _zoomControlTemplate: '<div class="map-zoom-control"><a class="in">+</a><a class="out">−</a></div>'
});

;;
/*global Microsoft */
var mapAPIKey = "AmV3iQQoSXvLS4UkW5zDQdzjGBUZlEe6UQOHLHSpyPXFNQTFsXAwno8xPbGCHnc_";
var BING_DEFAULT_ZOOM = 11;
var lastZoom;

var MapView = exports.MapView = Phoenix.Views.AbstractMap.extend({

  events: {
    "click .map-zoom-control .in": "zoomIn",
    'click .map-zoom-control .out': 'zoomOut',
    'click .MapPushpinBase': function(event) {
      // Prevent execution of the default or anchorClick handler for map pins.
      event.preventDefault();
      event.stopPropagation();
    }
  },

  mapEvents: {
    'viewchangestart': '_onViewChangeStart',
    'viewchangeend': '_onViewChangeEnd'
  },

  clearPins: function() {
    _.each(this.pins, function(pin) {
      this.map.entities.remove(pin);
    }, this);

    this.pins = [];
  },

  setCenter: function(center) {
    this.coords = new Microsoft.Maps.Location(center.latitude, center.longitude);
    this.setView({ center: this.coords });
  },

  addPin: function(options, selected) {
    var pinImage = selected ?
        "/images/map-pin-orange-w-shadow.png" : "/images/map-pin-blue-w-shadow.png";
    var loc = new Microsoft.Maps.Location(options.position[0], options.position[1]);
    var pin = new Microsoft.Maps.Pushpin(loc, {
      text: options.title,
      icon: window.lumbarLoadPrefix + pinImage,
      width: 50,
      height: 50,
      anchor: new Microsoft.Maps.Point(16, 50)
    });

    _.each(options.events, function(callback, ev) {
      Microsoft.Maps.Events.addHandler(pin, ev, callback);
    });

    this.pins.push(pin);
    if (this.map) {
      this.map.entities.push(pin);
    }
  },

  zoomIn: function() {
    this.setView({ zoom: this.map.getZoom()+1 });
  },

  zoomOut: function() {
    this.setView({ zoom: this.map.getZoom()-1 });
  },

  setView: function(options) {
    if (!this.map) {
      // allow property (mapOptions) to use if new map options would be different than setView options
      this.render(options.mapOptions || options);
    } else {
      this.map.setView(options);
    }
  },

  render: function(options) {
    if(MapView.scriptLoaded) {
      this._render(options);
    } else {
      Phoenix.bind("maps:bing:ready", _.bind(this._render, this, options));
      MapView.loadScript();
    }
  },

  _render: function(options) {
    if (!this.triggeredMapReady) {
      // we only want to trigger this once
      this.triggeredMapReady = true;
      this.trigger("map:ready");
    }

    if (this.coords && !this.map) {
      options = _.extend({
        credentials: mapAPIKey,
        center: new Microsoft.Maps.Location(this.coords.lat, this.coords.lng),
        mapTypeId: Microsoft.Maps.MapTypeId.road,
        zoom: lastZoom || BING_DEFAULT_ZOOM,
        tileBuffer: 1,
        showDashboard: false,
        showMapTypeSelector: false,
        showScalebar: false,
        enableSearchLogo: false
      }, options || {});

      this.map = new Microsoft.Maps.Map(this.el, options);
      var mapEvents = this.mapEvents;
      for (var prop in mapEvents) {
        Microsoft.Maps.Events.addHandler(this.map, prop, _.bind(this[mapEvents[prop]], this));
      }
      
      if (this.pins && this.pins.length) {
        _.each(this.pins, _.bind(function(pin) {
          this.map.entities.push(pin);
        }, this));
      }
  
      $(this.el).append(this._zoomControlTemplate);
      this.trigger("rendered");
    }
  },

  // would prefer to use onendpan but bing maps v7 no longer supports this event
  _onViewChangeStart: function() {
    this.changeStartPos = this.map.getCenter();
    this.changeStartZoom = this.map.getZoom();
  },
  _onViewChangeEnd: function() {
    if (!this.changeStartPos) {
      return;
    }

    var changeEndZoom = this.map.getZoom();
    if (this.changeStartZoom === changeEndZoom) {
      var changeEndPos = this.map.getCenter();
      this.trigger('pan', this.changeStartPos, changeEndPos);
    }
    delete this.changeStartPos;
    delete this.changeStartZoom;
  },

  dispose: function() {
    if (!this.disposed && this.map) {
      lastZoom = this.map.getZoom();
    }
    this.constructor.__super__.dispose.apply(this, arguments);
  }
}, {
  // Loading props
  scriptLoaded: false,
  scriptLoading: false,

  loadScript: function() {
    if (MapView.scriptLoading) {
      return;
    }

    // Custom script loader vs. $script as that is not loading in production.
    var script = document.createElement("script");
    script.src = '//ecn.dev.virtualearth.net/mapcontrol/mapcontrol.ashx?v=7.0&onscriptload=BingMapLoadedCallback';
    document.body.appendChild(script);
    MapView.scriptLoading = true;
  },

  getStaticMap: function(options) {
    // http://dev.virtualearth.net/REST/v1/Imagery/Map/
    // imagerySet?pushpin=pushpin_1&pushpin=pushpin_2&pushpin=pushpin_n&mapLayer=mapLayer&format=format&mapMetadata=mapMetadata&key=BingMapsKey
    options = _.extend({
      lat: null,
      lng: null,
      width: 200,
      height: 200,
      zoom: 15,
      key: mapAPIKey
    }, options);

    // From the docs: "The width must be between 80 and 900 pixels and the 
    // height must be between 80 and 834 pixels"
    // Request _will_ return 400 if not within these bounds.
    options.width = Math.max(80, options.width);
    options.height = Math.max(80, options.height);


    options.mapSize = options.width + "," + options.height;
    options.pushpin = options.lat + "," + options.lng;
    options.centerPoint = options.pushpin;
    options.zoomLevel = options.zoom;
    
    return "//dev.virtualearth.net/REST/v1/Imagery/Map/Road/" + options.lat + "," + options.lng + "/" + options.zoom + "?" + $.param(options);
  },

  geolocate: function(query, options) {
    options || (options = {});

    var url = '//dev.virtualearth.net/REST/v1/Locations/' + encodeURIComponent(query);
    var params = {
      maxResults: 1,
      key: mapAPIKey
    };

    url = url + '?' + $.param(params) + "&jsonp=?";

    $.ajax({
      url: url,
      dataType: 'json',
      success: function(res) {
        if (res && res.resourceSets && res.resourceSets[0].resources) {
          if (res.resourceSets[0].resources.length === 0) {
            options.zeroResults && options.zeroResults();
          } else {
            var match = res.resourceSets[0].resources[0],
            normalized_response = {};

            // TODO Safer property access. WTB coffeescript ? operator
            normalized_response.formatted_address = match.address.formattedAddress;
            normalized_response.coords = {
              lat: match.point.coordinates[0],
              lng: match.point.coordinates[1]
            };

            if (options.success && normalized_response.coords.lat && normalized_response.coords.lng) {
              options.success(normalized_response, res);
            } else if (options.error) {
              options.error();
            }
          }
        } else {
          if (options.error) {
            options.error();
          }
        }
      },
      error: function() {
        options.zeroResults && options.zeroResults();
      }
    });

  }
});

// I tried doing it this way, like google maps, but it doesn't
// Look like the callback will ever fire if its not a function
// DIRECTLY on the root object.... *grumble*

// &onscriptload=Phoenix.Views.BingMap.bingLoadedCallback
window.BingMapLoadedCallback = function() {
  MapView.scriptLoaded = true;
  try {
    Phoenix.trigger('maps:bing:ready');
  } catch (err) {
    Phoenix.trackCatch('maps:bing:ready', err);
  }
};

;;
Phoenix.Views.LocationFilter = Phoenix.CollectionView.extend({
  name: 'location/filter',
  events: {
    'click li': function(event) {
      event.preventDefault();

      var target = $(event.currentTarget);
      target.toggleClass("selected");
    },

    'click button.apply': function(event) {
      event.preventDefault();

      this.applyFilters();
      this.hide();
    },

    'click button.clear': function(event) {
      event.preventDefault();

      this.clearFilters();
      // only when the user clicks the clear button should we trigger this
      // which re-renders the collection.
      this.trigger('apply', false);
    }
  },

  isOpen: true,
  isDisabled: false,
  hasApplied: false,

  renderCollection: function() {
    Phoenix.CollectionView.prototype.renderCollection.call(this);

    var slugs = this.$('li').each(function(element) {
      var slug = this.getAttribute('data-slug');
      if (selectedSlugs.indexOf(slug) >= 0) {
        $(this).addClass('selected');
      }
    });
  },

  getSelected: function() {
    return this.$('li.selected').map(function() {
      return this.getAttribute('data-slug');
    });
  },

  clearFilters: function() {
    this.$('li.selected').removeClass('selected');
    $('.breadcrumbs .location-filter-button').removeClass('filtered');
    this.hasApplied = false;
    selectedSlugs = [];
    // location/base also calls this function from within it's results:empty
    // and by triggering the apply, the location/base will basically re-render
    // the collection and kill our error message.
  },

  applyFilters: function() {
    var slugs = selectedSlugs = this.getSelected();

    this.hasApplied = true;
    this.trigger('apply', slugs);
    $('.breadcrumbs .location-filter-button').addClass('filtered');
  },

  toggle: function() {
    this.isOpen? this.hide() : this.show();
  },

  show: function() {
    if (this.isDisabled || this.isOpen) {
      return;
    }
    this.isOpen = true;
    $(this.el).show();
    this.trigger('show');
  },

  hide: function(options) {
    if (!this.isOpen) {
      return;
    }

    this.isOpen = false;
    $(this.el).hide();
    this.trigger('hide');
  },

  disable: function() {
    this.isDisabled = true;
  },

  enable: function() {
    this.isDisabled = false;
  }

});


;;
Thorax.templates['location/filter'] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [2,'>= 1.0.0-rc.3'];
helpers = helpers || Handlebars.helpers; data = data || {};
  var buffer = "", escapeExpression=this.escapeExpression;


  buffer += "<div class=\"header button-container choice-group\">\n  <button type=\"button\" class=\"button clear secondary-button icon\">"
    + escapeExpression(helpers.i18n.call(depth0, "Reset", {hash:{},data:data}))
    + "</button>\n  <button type=\"button\" class=\"button apply secondary-button primary-button icon\">"
    + escapeExpression(helpers.i18n.call(depth0, "Apply", {hash:{},data:data}))
    + "</button>\n</div>\n\n<ul class=\"collection\"></ul>\n";
  return buffer;
  });Thorax.templates['location/filter-item'] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [2,'>= 1.0.0-rc.3'];
helpers = helpers || Handlebars.helpers; data = data || {};
  var buffer = "", stack1, stack2, functionType="function", escapeExpression=this.escapeExpression;


  buffer += "<li class=\"filter-item\" data-slug=\""
    + escapeExpression(((stack1 = depth0.slug),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\">\n  <div class=\"name\">";
  stack2 = ((stack1 = depth0.name),typeof stack1 === functionType ? stack1.apply(depth0) : stack1);
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "</div>\n  <div class=\"indicator\"></div>\n</li>\n";
  return buffer;
  });var HOUR_IN_MILIS = 1000 * 60 * 60;

Phoenix.Views.LocationList = LocationBase.extend({
  searchButton: '.show-list',

  initialize: function() {
    this.constructor.__super__.initialize.call(this);
    this.on({
      'click .address': 'onAddressClick',
      'click .set-photo-store': 'onSetPhotoStore'
    });
  },

  renderCollection: function() {
    Phoenix.View.prototype.renderCollection.apply(this, arguments);
    var style = this.style || Phoenix.locationCore.getLocationType();
    if (style === Phoenix.locationCore.TYPE_PHOTO) {
      var self = this;
      function updateStoreInfo(photoPickupData) {
        self.photoPickupData = photoPickupData;
        _.each(photoPickupData, function(data) {
          if (data.pickupTime) {
            var pickupDateTime = Date.parse(data.pickupTime);
            var pickupTime = dateFormat(pickupDateTime, "h:MM TT");
            var pickupDate = dateFormat(pickupDateTime, "ddd, mmm d");

            var listItem = self.$('.location-list-item[data-id="' + data.storeId + '"]');
            listItem.find('.pickup-hour').html(
                Phoenix.View.i18n.call({pickupTime: pickupTime}, 'After {{pickupTime}}', {'expand-tokens': true}));
            listItem.find('.pickup-day').html(pickupDate);
            self.$('button[data-id="' + data.storeId + '"]').show();
          } else {
            var container = self.$('.location-list-item[data-id="' + data.storeId + '"] .special-info');
            container.removeClass('enabled');
            container.html(Phoenix.View.i18n('Photo service at this store is not available'));
          }
        });
      }

      // make sure we aren't on the location query page
      if (this.collection && this.collection.getPhotoPickupTimes) {
        if (this.photoPickupData) {
          updateStoreInfo(this.photoPickupData);
        } else {
          this.collection.getPhotoPickupTimes(updateStoreInfo);
        }
      }
    }
  },

  itemFilter: function(item) {
    if (selectedSlugs.length) {
      var matches = this._matchFilters(selectedSlugs, _([item]));
      if (!matches.length) {
        return false;
      }
    }
    return true;
  },

  renderItem: function(item, i) {
    var name = this.name;
    var style = this.style || Phoenix.locationCore.getLocationType();
    if (style === Phoenix.locationCore.TYPE_PHOTO) {
      name += '-' + Phoenix.locationCore.TYPE_PHOTO;
    } else if (style === Phoenix.locationCore.TYPE_PHARMACY) {
      name += '-' + Phoenix.locationCore.TYPE_PHARMACY;
    }
    return this.renderTemplate(name + '-item.handlebars', this.itemContext(item, i));
  },

  itemContext: function(model) {
    var style = this.style || Phoenix.locationCore.getLocationType();
    var attrs = _.defaults({
      type: style,
      store: model.attributes,
      storeServices: sortAndFilterStoreServices(model.attributes.storeServices)
    }, model.attributes);

    if(this.coords) {
      attrs.distance = model.getDistanceFrom(this.coords.lat, this.coords.lng).toFixed(1);
    }

    if (style === Phoenix.locationCore.TYPE_PHARMACY) {
      var pharmacyService;
      _.each(model.attributes.storeServices, function(service) {
        if (service.name === Phoenix.locationCore.SERVICE_PHARMACY) {
          pharmacyService = service;
        }
        if (pharmacyService) {
          attrs.pharmacyService = pharmacyService;
          // normalize hours
          var hours = pharmacyService.hoursOfOperation;
          for (var i=0; i<hours.length; i++) {
            hours[i].time = hours[i].time.replace(/0(\d\:)/, '$1').replace(/\:00/, '');
          }
          attrs.hours = hours;
        }
      });
    }
    if (style === Phoenix.locationCore.TYPE_PHOTO) {
      var photoService;
      _.each(model.attributes.storeServices, function(service) {
        if (service.name === Phoenix.locationCore.SERVICE_PHOTO) {
          photoService = service;
        }
      });
      if (photoService) {
        attrs.photoService = photoService;
        // FIXME we really need to use snapfish service to get
        // proper pickup time - MOWEB-162
        var pickupTime = new Date(new Date().getTime() + HOUR_IN_MILIS);
        attrs.pickupTime = dateFormat(pickupTime, "h:MM TT");
        attrs.pickupDate = dateFormat(pickupTime, "dddd, mmmm dS");
      }
    }
    return attrs;
  },

  onSetPhotoStore: function(event) {
    var storeId = event.target.getAttribute('data-id');
    var store = this.collection.get(storeId);
    if (store) {
      Phoenix.setPhotoStore(store);
      Backbone.history.navigate(Phoenix.photoReturnRoute || 'photo', {trigger: true});
    }
  },

  onAddressClick: function(event) {
    // keep android from launching map view with content that looks like an address
    event.preventDefault();
    var id = $(event.currentTarget).data('id');
    if (id) {
      var route = 'location/' + id;
      var style = this.style || Phoenix.locationCore.getLocationType();
      if (style) {
        route = style + '/' + route;
      }
      Backbone.history.navigate(route, true);
    }
  }
});

function sortAndFilterStoreServices(services) {
  return _.sortBy(_.reject(services, function(service) {
    return StoreServices.locationListDisplayOrder.indexOf(service.slug) === -1;
  }), function(service) {
    return StoreServices.locationListDisplayOrder.indexOf(service.slug);
  });
}

;;
Thorax.templates['location/list'] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [2,'>= 1.0.0-rc.3'];
helpers = helpers || Handlebars.helpers; data = data || {};
  var buffer = "", stack1, options, escapeExpression=this.escapeExpression, helperMissing=helpers.helperMissing;


  buffer += escapeExpression(helpers.view.call(depth0, depth0.searchBar, {hash:{},data:data}))
    + "\n";
  options = {hash:{
    'class': ("location-list"),
    'loading-text': ("Finding stores..."),
    'show-loading-indicator': (depth0.showLoading)
  },data:data};
  buffer += escapeExpression(((stack1 = helpers['location-collection']),stack1 ? stack1.call(depth0, options) : helperMissing.call(depth0, "location-collection", options)))
    + "\n"
    + escapeExpression(helpers.view.call(depth0, depth0.filter, {hash:{},data:data}))
    + "\n";
  return buffer;
  });Thorax.templates['location/list-item'] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [2,'>= 1.0.0-rc.3'];
helpers = helpers || Handlebars.helpers; data = data || {};
  var buffer = "", stack1, stack2, options, functionType="function", escapeExpression=this.escapeExpression, self=this, helperMissing=helpers.helperMissing;

function program1(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n      <li class=\""
    + escapeExpression(((stack1 = depth0.slug),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\"></li>\n    ";
  return buffer;
  }

function program3(depth0,data) {
  
  var buffer = "";
  buffer += "\n      <a class=\"button secondary-button\" href=\""
    + escapeExpression(helpers.url.call(depth0, "local-ad/{{this.id}}", {hash:{
    'expand-tokens': (true)
  },data:data}))
    + "\">"
    + escapeExpression(helpers.i18n.call(depth0, "Local Ad", {hash:{},data:data}))
    + "</a>\n    ";
  return buffer;
  }

  buffer += "<div class=\"location-list-item item\">\n  <div class=\"details\">\n    <p class=\"distance\">"
    + escapeExpression(((stack1 = depth0.distance),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "mi</p>\n    <ul class=\"store-service-icons\">\n    ";
  stack2 = helpers.each.call(depth0, depth0.storeServices, {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n    </ul>\n  </div>\n\n  <h2>";
  options = {hash:{},data:data};
  buffer += escapeExpression(((stack1 = helpers['store-details']),stack1 ? stack1.call(depth0, depth0.store, options) : helperMissing.call(depth0, "store-details", depth0.store, options)))
    + "</h2>\n\n  <div class=\"location-contact\">\n    <div class=\"address\" data-id=\""
    + escapeExpression(((stack1 = depth0.id),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\">";
  options = {hash:{},data:data};
  stack2 = ((stack1 = helpers.address),stack1 ? stack1.call(depth0, depth0.address, options) : helperMissing.call(depth0, "address", depth0.address, options));
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "</div>\n    <p class=\"phone\"><a href=\"tel:"
    + escapeExpression(((stack1 = depth0.phone),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\">"
    + escapeExpression(((stack1 = depth0.phone),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</a></p>\n  </div>\n\n  <div class=\"button-container spaced-group\">\n    <a class=\"button secondary-button\" href=\""
    + escapeExpression(helpers['directions-link'].call(depth0, depth0.address, {hash:{},data:data}))
    + "\">"
    + escapeExpression(helpers.i18n.call(depth0, "Directions", {hash:{},data:data}))
    + "</a>\n    <div class=\"group-spacer\"></div>\n    ";
  stack2 = helpers['if'].call(depth0, depth0.localAdAvailable, {hash:{},inverse:self.noop,fn:self.program(3, program3, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n  </div>\n</div>\n";
  return buffer;
  });Thorax.templates['location/list-empty'] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [2,'>= 1.0.0-rc.3'];
helpers = helpers || Handlebars.helpers; data = data || {};
  var buffer = "", stack1;


  buffer += "<div class=\"location-list-empty\">\n  <p>";
  stack1 = helpers.i18n.call(depth0, depth0.msg, {hash:{
    'expand-tokens': (true)
  },data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "</p>\n  <div class=\"tail\"></div>\n</div>\n";
  return buffer;
  });/*global LocationBase, LocationSearchBar */

Phoenix.Views.LocationSelectListView = LocationBase.extend({
  name: 'location/select-list',
  crumbs: {
    name: 'Store Finder'
  },
  events: {
    'submit form': 'onContinue',
    'click .show-more': 'onShowMore',
    collection: {
      'reset': 'onCollectionChanged',
      'add': 'onCollectionChanged'
    },
    destroyed: 'onDestroyed'
  },

  // options
  // - alwaysShowGoNearMe: show the Go/Near Me buttons always (and hide the map/list buttons)
  initialize: function() {
    this.searchBar = new Phoenix.locationCore.LocationSearchBar({
      parent: this,
      queryLabel: (this.queryInfo || {}).formattedQuery,
      alwaysShowGoNearMe: true
    })
    .bind('geoloc:error', this.onGeoLocError, this)
    .bind('results:empty', function() {
      // empty the pre-existing collection so when rendered its empty.
      this.collection.reset();

      // call with an empty string and false to display the default error
      // message to the user.
      this.onZeroResults('', false);
    }, this);

    // proxy search bar methods
    _.each(['results:non-empty', 'results:empty'], function(name) {
      this.searchBar.bind(name, _.bind(this.trigger, this, name));
    }, this);
  },

  onCollectionChanged: function() {
    // show/hide next page link
    this.$('.collection-footer').toggle(this.collection.hasMore());
    this.$('.button-group').toggle(this.collection.length);
  },

  onShowMore: function(event) {
    this.collection.nextPage(_.bind(this.onCollectionChanged, this));
  },

  onGeoLocError: function() {
    this.onZeroResults(undefined, true);
    this.searchBar.render();
  },

  setCollection: function(collection) {
    this.baseCollection = collection;
    collection = new CachedStoreCollection(undefined, {collection: collection});
    Phoenix.View.prototype.setCollection.call(this, collection);
  },

  onContinue: function(event) {
    // don't pass the event to serialize to avoid the thorax preventDuplicateSubmission code.
    // because this view can be embedded, we don't know for sure that this view will be replaced when the user clicks continue.
    event.preventDefault();
    var data = this.serialize();
    if (data) {
      if (data.id) {
        this.trigger('store:selected', this.collection.get(data.id));
      } else {
        this.trigger('error', 'Please select a store');
      }
    }
  },

  itemContext: function(model) {
    return _.defaults({
      formattedAddress: Phoenix.View.address(model.attributes.address),
      disabled: this.itemFilter && this.itemFilter(model)
    }, model);
  },

  onDestroyed: function() {
    this.collection && this.collection.unbindCollection();
  }
});

var CachedStoreCollection = Phoenix.PagedCollection.extend({
  pageSize: 5
});

;;
Thorax.templates['location/select-list'] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [2,'>= 1.0.0-rc.3'];
helpers = helpers || Handlebars.helpers; data = data || {};
  var buffer = "", stack1, stack2, options, helperMissing=helpers.helperMissing, escapeExpression=this.escapeExpression, self=this;

function program1(depth0,data) {
  
  var buffer = "", stack1, options;
  buffer += "\n  <div class=\"collection-container\">\n    ";
  options = {hash:{
    'class': ("location-list"),
    'loading-text': ("Finding stores...")
  },data:data};
  buffer += escapeExpression(((stack1 = helpers['location-collection']),stack1 ? stack1.call(depth0, options) : helperMissing.call(depth0, "location-collection", options)))
    + "\n    <div class=\"collection-footer item\" style=\"display: none\">\n      <button class=\"show-more\" type=\"button\">"
    + escapeExpression(helpers.i18n.call(depth0, "Show More", {hash:{},data:data}))
    + "</button>\n    </div>\n  </div>\n\n  <div class=\"button-group\" style=\"display: none\">\n    <button class=\"button primary-button\">"
    + escapeExpression(helpers.i18n.call(depth0, "Continue", {hash:{},data:data}))
    + "\n  </div>\n";
  return buffer;
  }

  buffer += escapeExpression(helpers.view.call(depth0, depth0.searchBar, {hash:{},data:data}))
    + "\n\n<div class=\"popup\"></div>\n";
  options = {hash:{
    'class': ("stores store-locator-container content")
  },inverse:self.noop,fn:self.program(1, program1, data),data:data};
  stack2 = ((stack1 = helpers['view-form']),stack1 ? stack1.call(depth0, options) : helperMissing.call(depth0, "view-form", options));
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n";
  return buffer;
  });Thorax.templates['location/select-list-item'] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [2,'>= 1.0.0-rc.3'];
helpers = helpers || Handlebars.helpers; data = data || {};
  var buffer = "", stack1, stack2, options, functionType="function", escapeExpression=this.escapeExpression, self=this, helperMissing=helpers.helperMissing;

function program1(depth0,data) {
  
  var buffer = "", stack1, stack2;
  buffer += "\n  ";
  stack2 = ((stack1 = depth0.formattedAddress),typeof stack1 === functionType ? stack1.apply(depth0) : stack1);
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n  <div class=\"flag location-disabled\">"
    + escapeExpression(helpers.i18n.call(depth0, depth0.disabled, {hash:{},data:data}))
    + "</div>\n";
  return buffer;
  }

  options = {hash:{
    'name': ("id"),
    'value': (depth0.id),
    'disabled': (depth0.disabled),
    'labelClass': ("flags location-flags")
  },inverse:self.noop,fn:self.program(1, program1, data),data:data};
  stack2 = ((stack1 = helpers['radio-item']),stack1 ? stack1.call(depth0, options) : helperMissing.call(depth0, "radio-item", options));
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n";
  return buffer;
  });Thorax.templates['location/select-list-empty'] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [2,'>= 1.0.0-rc.3'];
helpers = helpers || Handlebars.helpers; data = data || {};
  var buffer = "", stack1;


  buffer += "<div class=\"location-list-empty\">\n  <p>";
  stack1 = helpers.i18n.call(depth0, depth0.msg, {hash:{
    'expand-tokens': (true)
  },data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "</p>\n  <div class=\"tail\"></div>\n</div>\n";
  return buffer;
  });/*global MapView, locationParams, locationUrl, storeLastSearch */
var LocationUtil = Phoenix.locationCore;

var LocationSearchBar = exports.LocationSearchBar = Phoenix.View.extend({
  name: "location/search-bar",
  tagName: 'form',
  attributes: {
    'action': '#'
  },

  events: {
    'click .search-text': function(event) {
      var target = $(event.target);
      if (target.hasClass("search-text")) {
        $("INPUT", target).focus();
      }
    },
    'submit': '_submit',
    'rendered': '_rendered',
    'destroyed': 'cleanup',

    'click .near-me': 'nearMe',

    //special case, must use touchstart to prevent
    //keyboard from dissapearing
    'touchstart .search-clear-button': 'clear',
    'click .search-clear-button': 'clear'
  },

  initialize: function(options) {
    this.geolocate = MapView.geolocate;
    this.hideControls = options && (options.alwaysShowGoNearMe || options.hideControls);
    this.reset();
  },

  _rendered: function() {
    this.$(this.parent.searchButton).addClass('primary-button');
    this.toggleClearButton();

    var self = this;
    this.$('input')
        .bind('focus', function() {
          if (!self.alwaysShowGoNearMe) {
            self.$('.search-active-buttons').show();
            self.$('.location-view-buttons').hide();
          }
          self.toggleClearButton();
        })
        .bind('keyup', function() {
          self.toggleClearButton();
        })
        .bind('blur', _.debounce(function() {
          // Delay slightly to prevent the buttons from being hidden before the tap
          // chain occurs on them.
          if (!self.alwaysShowGoNearMe) {
            self.$('.search-active-buttons').hide();
            self.$('.location-view-buttons').show();
          }
          self.toggleClearButton(true);
        }, 500));
    this.reset();
  },
  cleanup: function() {
    this.$('input').unbind();
  },

  _submit: function(event) {
    var self = this;
    this.serialize(event, function(attrs) {
      if (attrs.query) {
        function onSuccess(result) {
          LocationUtil.storeLastSearch({
            query: attrs.query,
            formattedQuery: result.formatted_address,
            lat: result.coords.lat,
            lng: result.coords.lng
          });
          self.trigger('results:non-empty', result.coords);
        }

        // WARN There is no loading indicator on this, but the services backing this
        // are super fast. Ignoring load indicator for the time being
        this.geolocate(attrs.query, {
          success: onSuccess,
          zeroResults: function() {
            LocationUtil.storeLastSearch();
            self.clear();
            // remove filters and disable filter button
            self.trigger('results:empty', attrs.query);
          }
        });
      }
    });

    // if the user enters the same location twice, the page will not change and the user
    // will be stuck with a form they can't submit.  This is a non-standard view because
    // the view tag is the form.
    $(this.el).removeAttr('data-submit-wait');
  },
  nearMe: function() {
    var self = this;
    Phoenix.getLocation(function(coords) {
        self.getInput().val(coords.lat + ',' + coords.lng);
        self._submit();
      },
      function() {
        self.trigger('geoloc:error');
      });
  },

  getInput: function() {
    return this.$('input[type="search"]');
  },

  reset: function(suppressFocus) {
    if (!this.hideControls) {
      this.mapUrl = coordsRoute('map', this.parent.coords);
      this.listUrl = coordsRoute('list', this.parent.coords);
      this.$('.show-map').attr('href', this.mapUrl);
      this.$('.show-list').attr('href', this.listUrl);
    }
    if (this.alwaysShowGoNearMe) {
      this.$('.search-active-buttons').show();
    }
    this.clear(undefined, suppressFocus);
  },

  clear: function(event, suppressFocus) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    if (this.getInput().length) {
      this.getInput().val('');
      if (!suppressFocus) {
        this.getInput()[0].focus();
      }
      this.toggleClearButton(true);
    }
  },

  toggleClearButton: function (isEmpty) {
    isEmpty = isEmpty || this._isEmpty();
    this.$('.search-clear-button').toggle(!isEmpty);
  },

  _isEmpty: function() {
    function trim(val) {
      return ( val || '' ).replace(/(^\s+|\s+$)/);
    }
    return !trim(this.getInput().val()).length;
  }

});

function coordsRoute(type, coords) {
  return Phoenix.View.url(LocationUtil.locationParams(LocationUtil.locationUrl(type), coords));
}

;;
Thorax.templates['location/search-bar'] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [2,'>= 1.0.0-rc.3'];
helpers = helpers || Handlebars.helpers; data = data || {};
  var buffer = "", stack1, stack2, options, functionType="function", escapeExpression=this.escapeExpression, helperMissing=helpers.helperMissing, self=this;

function program1(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n  <div class=\"location-view-buttons button-container choice-group\">\n    <a href=\""
    + escapeExpression(((stack1 = depth0.listUrl),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\" class=\"button secondary-button show-list icon\"><span>"
    + escapeExpression(helpers.i18n.call(depth0, "List", {hash:{},data:data}))
    + "</span></a>\n    <a href=\""
    + escapeExpression(((stack1 = depth0.mapUrl),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\" class=\"button secondary-button show-map icon\"><span>"
    + escapeExpression(helpers.i18n.call(depth0, "Map", {hash:{},data:data}))
    + "</span></a>\n  </div>\n";
  return buffer;
  }

  options = {hash:{
    'name': ("query"),
    'value': (depth0.queryLabel),
    'type': ("search"),
    'autocorrect': ("off"),
    'class': ("search-text"),
    'tag-class': ("search-clear-button"),
    'tag-text': ("Clear Search"),
    'placeholder': ("City, State or ZIP")
  },data:data};
  buffer += escapeExpression(((stack1 = helpers['input-tagged-text']),stack1 ? stack1.call(depth0, options) : helperMissing.call(depth0, "input-tagged-text", options)))
    + "\n\n<div class=\"search-active-buttons button-container choice-group\" style=\"display:none\">\n  <button class=\"button secondary-button primary-button\" type=\"submit\">"
    + escapeExpression(helpers.i18n.call(depth0, "Go", {hash:{},data:data}))
    + "</button>\n  <button class=\"button secondary-button add-button near-me\" type=\"button\">"
    + escapeExpression(helpers.i18n.call(depth0, "Near Me", {hash:{},data:data}))
    + "</button>\n</div>\n";
  stack2 = helpers.unless.call(depth0, depth0.hideControls, {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n";
  return buffer;
  });

  if (Phoenix['locationCore'] !== module.exports) {
    console.warn("Phoenix['locationCore'] internally differs from global");
  }
  return module.exports;
}).call(this, Phoenix, Phoenix.View, Handlebars);

//@ sourceMappingURL=locationCore.js.map
