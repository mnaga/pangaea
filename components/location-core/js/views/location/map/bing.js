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
