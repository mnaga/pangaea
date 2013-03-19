/*global LocationBase, LocationSearchBar */

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
