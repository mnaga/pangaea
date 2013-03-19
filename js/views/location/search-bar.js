/*global MapView, locationParams, locationUrl, storeLastSearch */
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
