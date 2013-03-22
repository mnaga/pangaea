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
