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

