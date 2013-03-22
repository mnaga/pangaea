var HOUR_IN_MILIS = 1000 * 60 * 60;

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
