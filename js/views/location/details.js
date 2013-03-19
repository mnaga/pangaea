Phoenix.Views.LocationDetails = Phoenix.View.extend({
  name: 'location/details',
  className: 'location-details',
  crumbs: {
    type: 'anchorMarker',
    name: function() {
      if (this.isCurrentStore()) {
        return 'My Store';
      } else {
        return 'Store Details';
      }
    },
    'class': function() {
      if (this.isCurrentStore()) {
        return 'current-store';
      }
    }
  },
  events: {
    'click .set-store': 'setCurrentStore',
    'rendered': 'rendered'
  },
  context: function() {
    var model = this.model;
    return _.defaults({
        city: model.attributes.address.city,
        extendedStoreServices: _.filter(model.attributes.storeServices, function(service) {
          return _.isArray(service.hoursOfOperation) || service.phone;
        }),
        storeHref: "location/" + model.attributes.storeNumber,
        mapUrl: Phoenix.locationCore.MapView.getStaticMap({
          width: 102,
          height: 76,
          zoom: 11,
          lat: model.attributes.latitude,
          lng: model.attributes.longitude
        }),
        mapLink: 'location/map/' + model.attributes.latitude + '/' + model.attributes.longitude
      }, model.attributes);
  },

  rendered: function() {
    if (this.isCurrentStore()) {
      $(this.el).addClass('current');
    }
  },

  setCurrentStore: function(event) {
    event.preventDefault();
    // pharmacy store will be set with the wicket app but we'll remember it here so the "my store" behavior works correctly
    Phoenix.setStore(this.model);
    $(this.el).addClass('current');
    if (Phoenix.locationCore.getLocationType() === Phoenix.locationCore.TYPE_PHARMACY) {
      this.model.setAsPharmacyStore();
    }
    Phoenix.breadcrumb.updateCrumbs(this);
  },

  isCurrentStore: function() {
    return this.model && this.model.attributes.storeNumber === Phoenix.getStoreId();
  }
});
