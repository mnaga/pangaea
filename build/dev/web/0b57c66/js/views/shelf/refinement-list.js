/*global RefinementCategoryView*/
var RefinementList = Phoenix.View.extend({
  name: 'shelf/refinement-list',

  events: {
    'click .clear': 'onReset',
    'click .apply': 'onApply',
    'click .select-refinement-store': 'toggleSelectStore',
    rendered: 'rendered',
    hide: function() {
      // close all refinement sections
      _.each(this._views, function(view) {
        view.trigger('close');
      });
    },
    collection: {
      'change:selected': function(model, checked) {
        this.trigger('applyStoreAndFilters', {filters: [{
          id: model.get('id'),
          browseToken: model.get('browseToken')
        }]}, !checked);
      }
    },
    'destroyed': 'cleanupBreadcrumbOverride'
  },

  initialize: function(options) {
    options = options || {};
    this.isSearch = options.isSearch;

    this.storeSelector = new Phoenix.Views.LocationSelectListView({
      collection: new Phoenix.Collections.Stores([])
    });
    this.storeSelector.on('results:non-empty', function(coords) {
      // _child is used in cased the collection is wrapped with a CachedPagedCollection
      _.extend(this.storeSelector.collection._child || this.storeSelector.collection, coords);
      this.storeSelector.collection.fetch();
    }, this);
    this.storeSelector.on('store:selected', function(selectedStore) {
      this.onStoreSelected(selectedStore);
      this.trigger('applyStoreAndFilters', {
        storeId: selectedStore
      });
    }, this);
    this.storeSelector.$el.hide();

    this.clearStoreSelector = _.bind(function(event) {
      event.preventDefault();
      this.toggleSelectStore(false);
    }, this);
    this.categoryViewState = {};
  },

  getOpened: function(id) {
    return this.categoryViewState[id];
  },

  setOpened:function(id, val) {
    this.categoryViewState[id] = val;
  },

  renderItem: function(category) {
    return new RefinementCategoryView({model: category, parent: this});
  },

  renderEmpty: function() {
    return '';
  },

  toggleSelectStore: function(show) {
    if (show) {
      if (show.preventDefault) {
        show.preventDefault();
      }
      this.$('.main').hide();
      this.storeSelector.$el.show();
      // this breadcrumb override will not live inside this view so we can not use standard view event binding
      this.clearStoreSelectorlink = Phoenix.breadcrumb.override(this.template('shelf/refinement-list-store-crumb')).find('a[href]');
      this.clearStoreSelectorlink.on('click', this.clearStoreSelector);
    } else {
      this.$('.main').show();
      this.storeSelector.$el.hide();
      this.cleanupBreadcrumbOverride();
    }
  },

  cleanupBreadcrumbOverride: function() {
    if (this.clearStoreSelectorlink) {
      this.clearStoreSelectorlink.off('click', this.clearStoreSelector);
      delete this.clearStoreSelectorlink;
    }
    Phoenix.breadcrumb.clearOverride();
  },

  onStoreSelected: function(store) {
    this.trigger('store:selected', store);

    this.$('.main').show();
    this.storeSelector.$el.hide();
    var button = this.$('.select-refinement-store').toggleClass('checked', !!store);
    // we need the extra div because we have both the checked image and the arrow on the right
    button.find('div').html(this.template('shelf/refinement-list-store', this));
    this.cleanupBreadcrumbOverride();
  },

  onReset: function(event) {
    event.preventDefault();
    // If we don't turn off our event listener for selected then we will
    // inadvertently trigger our instant updater function, onChangeSelected,
    // which is not what we want to do.
    this.collection.each(function(model) {
      model.clearSelections();
    });
    this.onStoreSelected(); // deselect the store

    // We clear the filters and store id but not the department. This
    // will force a refresh if there were previously selected filters
    // and or a preferred store selected.
    this.trigger('applyStoreAndFilters', {
      filters: null,
      storeId: null
    });
    this.categoryViewState = {};
    this.trigger('reset');
  },

  onApply: function() {
    event.preventDefault();
    this.categoryViewState = {};
    this.trigger('hide');
  },

  rendered: function() {
    if (this.isSearch || !Phoenix.config.useInStoreOnlyInFacetedSearch) {
      this.$('.select-refinement-store').hide();
    }
  }

});

