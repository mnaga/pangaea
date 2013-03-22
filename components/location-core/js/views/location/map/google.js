/*global google */
var mapAPIKey = "AIzaSyB_rVlTrxGmDtpzuGsrIusVCyO1W8Mhlgc"; // TODO: Google (this is my personal one...)

var MapView = Phoenix.Views.MapView = Phoenix.Views.AbstractMap.extend({

  events: {
    "click .map-zoom-control .in": "zoomIn",
    "click .map-zoom-control .out": "zoomOut"
  },

  setLocation: function(lat, lng) {
    this.location = new google.maps.LatLng(lat, lng);
    this.trigger("change:location", this, this.location);
  },

  setCenter: function(center) {
    var centerLoc = new google.maps.LatLng(center.latitude, center.longitude);
    this.map.setCenter(centerLoc);
  },

  fitBoundsByPins: function() {
    var myLat = this.location.lat(), myLng = this.location.lng();

    var distances = this.pins.map(function(val) {
        var pinPos = val.getPosition();
        return Phoenix.Util.getDistanceBetween(myLat, myLng, pinPos.lat(), pinPos.lng());
    });

    var pinIdx = distances.indexOf(Math.min.apply(Math, distances));

    var bounds = new google.maps.LatLngBounds();
    bounds.extend(this.location);
    bounds.extend(this.pins[pinIdx].getPosition());

    this.map.fitBounds(bounds);
  },

  clearPins: function() {
    _.invoke(this.pins, "setMap", null);
    this.pins = [];
  },

  addPin: function(options, selected) {
    var pinImage = selected ?
        "/images/map-pin-orange-w-shadow@2x.png" : "/images/map-pin-blue-w-shadow@2x.png";
    var pin = new google.maps.Marker({
      map: this.map,
      position: new google.maps.LatLng(options.position[0], options.position[1]),
      title: options.title,
      icon: new google.maps.MarkerImage(
        window.lumbarLoadPrefix + pinImage,
        null,
        null,
        new google.maps.Point(16, 50),
        new google.maps.Size(50, 50)
      )
    });

    // TODO normalize event names?
    _.each(options.events, function(callback, ev) {
      google.maps.event.addListener(pin, ev, callback);
    });

    this.pins.push(pin);
  },
  
  zoomIn: function() {
    this.map.setZoom(this.map.getZoom()+1);
  },

  zoomOut: function() {
    this.map.setZoom(this.map.getZoom()-1);
  },

  render: function() {
    if(MapView.scriptLoaded) {
      this._render();
    } else {
      Phoenix.bind("maps:google:ready", this._render, this);
      MapView.loadScript();
    }
  },

  _render: function() {
    var defaultZoomLevel = 12;
    this.map = new google.maps.Map(this.el, {
      center: new google.maps.LatLng(this.coords.lat, this.coords.lng),
      zoom: defaultZoomLevel,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      disableDefaultUI: true
    });

    // TODO We _could_ use the custom controls API
    // http://code.google.com/apis/maps/documentation/javascript/controls.html#CustomControls
    // But, I honestly don't see the point.
    $(this.el).append(this._zoomControlTemplate);

    this.trigger("rendered");
    this.trigger("map:ready");

    // the zoom property does not seem to be respected, for
    setTimeout(_.bind(function(){
      this.map.setZoom(defaultZoomLevel);
    }, this), 250);
  }

}, {
  // static props

  scriptSrc: "//maps.googleapis.com/maps/api/js?key="+ mapAPIKey +"&sensor=true&callback=Phoenix.Views.MapView.gmapLoadedCallback",
  scriptLoaded: false,

  loadScript: function() {

    var script = document.createElement("script");
    // TODO maybe prepend window.location.protocol?
    // What's the mobile browser support for relative protocols?
    // script.src = _.isFunction(this.scriptSrc)? this.scriptSrc() : this.scriptSrc;
    script.src = MapView.scriptSrc;

    // This actually is never useful... Both providers load a bootstrap
    // script first, that then loads the libraries.
    // script.onload = function() {
    //   _this.trigger("script:loaded");
    // }

    document.body.appendChild(script);
  },

  gmapLoadedCallback: function(){
    MapView.scriptLoaded = true;
    Phoenix.trigger("maps:google:ready");
  },

  getStaticMap: function(options) {
    // //maps.googleapis.com/maps/api/staticmap?center=40.714728,-73.998672&zoom=12&size=400x400&sensor=false
    options = _.extend({
      lat: null,
      lng: null,
      width: 200,
      height: 200,
      zoom: 15,
      sensor: true
    }, options);

    options.size = options.width + "x" + options.height;
    options.markers = options.lat + "," + options.lng;

    var queryString = $.param(options);

    return "//maps.googleapis.com/maps/api/staticmap?" + queryString;
  },

  getGeocoder: function() {
    return MapView._geocoder || (MapView._geocoder = new google.maps.Geocoder());
  },

  geolocate: function(query, options) {
    options || (options = {});

    if(MapView.scriptLoaded) {
      MapView._geolocate(query, options);
    } else {
      Phoenix.bind("maps:google:ready", function() {
        MapView._geolocate(query, options);
        Phoenix.unbind("maps:google:ready", arguments.callee);
      });
      MapView.loadScript();
    }
  },

  _geolocate: function(query, options) {
    var geocoder = MapView.getGeocoder();

    geocoder.geocode({ address: query, region: "us" }, function(res, status) {
      if (status === google.maps.GeocoderStatus.OK && res) {
        var match = res[0],
            normalized_response = {};

        // TODO Safer property access. WTB coffeescript ? operator
        normalized_response.formatted_address = match.formatted_address;
        normalized_response.coords = {
          lat: match.geometry.location.lat(),
          lng: match.geometry.location.lng()
        };

        if (options.success && normalized_response.coords.lat && normalized_response.coords.lng) {
          options.success(normalized_response, res);
        } else if (options.error) {
          options.error();
        }
      } else if (status === google.maps.GeocoderStatus.ZERO_RESULTS) {
        options.zeroResults && options.zeroResults();
      } else {
        if (options.error) {
          options.error();
        }
      }
    });
  }
});
