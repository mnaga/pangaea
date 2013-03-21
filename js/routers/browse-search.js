
new (Backbone.Router.extend({
  routes: module.routes,

  searchDepartment: function(deptEnum, searchTerm) {
    // Here deptEnum represents ELECTRONICS, TOYS, VIDEOGAMES, etc.,
    // e.g., #search-department/ELECTRONICS/apple
    _renderShelf.call(this, {
      collectionClass: SearchCollection,
      searchTerm: searchTerm,
      curDeptEnum: deptEnum,
      oneResultRedirect: true,
      type: 'search'
    }, function(view) {
    });
  },

  search: function(searchTerm, query) {
    if (!searchTerm) {
      searchTerm = 'xbox';
    }

    query || (query = {});
    var departmentId = query.department,
        filterIds = query.refinements,
        oneResultRedirect = true;

    if (departmentId || filterIds) {
      // we don't want to redirect because we still have to make the
      // corresponding selections.
      oneResultRedirect = false;
    }

    if (searchTerm) {
      Phoenix.header.searchInput.setSearchTerm(searchTerm);
    }

    _renderShelf.call(this, {
      collectionClass: SearchCollection, // Will use SBD or SBDF calls
      searchTerm: searchTerm,
      curFilters: filterIds,
      curDepartment: {id: departmentId},
      oneResultRedirect: oneResultRedirect,
      type: 'search'
    });
  }

}));

function _shouldUseLastShelfCollection(options) {
  if (!this._lastShelfCollection) {
    return false;
  }
  if (options.curDepartment) {
    var lhs = this._lastShelfCollection.curDepartment;
    var rhs = options.curDepartment;
    if (lhs.browseToken && rhs.browseToken) {
      return lhs.browseToken === rhs.browseToken;
    }
  } else if (options.searchTerm) {
    return this._lastShelfCollection.searchTerm === options.searchTerm;
  }

  return false;
}

function _renderShelf(options, callback) {
  var CollectionClass = options.collectionClass,
      view = new ShelfView({
        curDepartment: options.curDepartment || {},
        curDeptEnum: options.curDeptEnum || false,
        searchTerm: options.searchTerm || false,
        curFilters: options.curFilters || [],
        type: options.type || false, //may be falsy, or "rollbacks"
        browseLabel: options.name
      });
  delete options.collectionClass;
  //use same collection as last shelf view (i.e. went to shelf, went to item, return to shelf)
  if (_shouldUseLastShelfCollection.call(this, options)) {
    view.bind('ready', _.bind(function() {
      window.scrollTo(0, this._lastScrollY || 0);
    }, this));
  } else {    //blank shelf screen
    this._lastShelfCollection = new CollectionClass(null, options);
  }

  view.bind('scroll', _.bind(function(x, y) {
    this._lastScrollY = y;
  }, this));

  var self = this,
      collection = this._lastShelfCollection;

  collection.on('reset', function(options) {
    options = options || {};
    if (options.searchTerm) {
      Backbone.history.navigate(buildBrowseTokenUrl({
        filterIds: collection.curFilters,
        searchTerm: collection.searchTerm,
        departmentId: collection.curDepartment.id
      }), {trigger: false, replace: false});
    }
  });

  view.setCollection(collection, {fetch: false});
  Phoenix.setView(view);

  collection.load(function(collection) { 
    if (callback) {
      callback.call(self, view);
    }
  }, { background: true });
}

function buildBrowseTokenUrl(options) {
  options = options || {};
  var filterIds = options.filterIds,
      searchTerm = options.searchTerm,
      departmentId = options.departmentId;

  // Build url -> search/:searchTerms?department=foo&refinements=a|b|c
  var url = '';
  if (searchTerm) { // should be a search term
    url += '/' + encodeURIComponent(searchTerm);
  }

  if (filterIds && filterIds.length === 0) {
    filterIds = undefined;
  }

  var query = Backbone.Router.stringify({
    department: departmentId,
    refinements: filterIds
  });
  if (query) {
    url += '?' + query;
  }

  return url;
}

