/*global RefinementList, SortSelectorView, ShelfDepartmentList, ShelfDepartmentPicker, largeThumbnail, getFlags, outOfStock, buildFacetUrl, processFilters */
var ShelfView = Phoenix.View.extend({
  name: 'shelf/shelf',
  className: 'body',
  _collectionSelector: '.shelf-list',
  nonBlockingLoad: true,

  emptyMessage: 'Currently, we don\'t have any items available in this category.',

  events: {
    collection: {
      add: 'toggleControls',
      reset: function() {
        this.toggleControls();

        if (!this.showRefinements) { return; }

        if (this.isSearch()) {
          var collection = this.collection;
          var url = buildFacetUrl({
            pageNum: collection.page,
            pageSize: collection.pageSize,
            filterIds: collection.curFilters,
            searchTerm: collection.searchTerm,
            departmentId: collection.curDepartment.id,
            url: '/search/search-ng.do?'
          });

          url = Phoenix.wwwUrl(url);
          $('.desktop-site').attr({href: url});
        }

        this._buildAppliedFilters();
        this.$('.filters-value').html(this._appliedFilters);
        var closed = !this.refinementsLink.hasClass('open');
        if (closed && this._appliedFilters) {
          this.$('.filters-applied').toggle(true);
        } else {
          this.$('.filters-applied').toggle(false);
        }
      },
      'load:start': function() {
        if (!collectionHasPendingFetch(this)) {
          this.omniDone = false;
        }

        if (this.collection.isOnFirst()) {
          // Clear out the collection - it will be reloaded when fetched.
          this.$('.shelf-list')
            .addClass('loading')
            .html(this.template('inline-loading-indicator', {
              label: 'Loading...'
            }));

          // Only allow the paginator to show itself when the paged collection's
          // fetch is called. Otherwise, we see it when the selected filters
          // changes and a fetch from the search collection is called.
          this.paginator.hide();

          // hide the item count
          this.$('.shelf-item-count').hide();
        }
      },
      'load:end': function() {
        this.logSearch();

        if (!collectionHasPendingFetch(this)) {
          var closed = !this.refinementsLink.hasClass('open');
          if (closed) {
            // show the item count if the refinemnt list is closed
            this.$('.shelf-item-count').show();
            this.paginator.show();

            if (!this.omniDone) {
              if (this.showRefinements) {
                Phoenix.Track.facetedSearch(omniSearchHelper(this.collection));
                this.omniDone = true;
              }
            }
          }

          if (this.collection.isOnFirst()) {
            this.$('.shelf-list').removeClass('loading');

            var filtersLength = this.collection.curFilters ? this.collection.curFilters.length : 0;
            this.refinementsLink.toggleClass('filtered', this.collection.prefStore || filtersLength);
          }
        }

        if (this.collection.isOnFirst()) {
          if (this.collection.departments && this.collection.departments.length) {
            var selected = this.collection.departments.getSelectedDept();
            if (this.departmentList && this.departmentPicker) {
              if (this.collection.departments.totalCount > 0) {
                if (selected) {
                  this.departmentPicker.setLabel(selected.name);
                  this.departmentList.selectNodeByBrowseToken({
                    id: selected.id,
                    browseToken: selected.browseToken
                  }, {silent: true});
                  this.departmentList.sortBySelected();
                  this.departmentList.showAllDepartments();
                } else {
                  this.departmentPicker.setLabel();
                }
              } else {
                if (selected && selected.totalCount > this.collection.departments.totalCount) {
                  // Parsing didn't take into account the parent's totals
                  this.departmentPicker.disable(selected.name);
                } else {
                  this.departmentPicker.disable();
                }
              }
            }
          }
        }

        if (this.isReset) {
          this.paginator.show();
          this.isReset = false;
        }
      }
    },
    rendered: 'rendered',
    'rendered:item': function() {
      this.$(this._collectionSelector).removeClass('empty');
    },
    'rendered:empty': function() {
      this.$(this._collectionSelector).addClass('empty');
    }
  },
  crumbs: {
    name: function() {
      return this.isSearch() ? 'Search Results' : this.browseLabel || 'Browse';
    },
    type: function() {
      if (this.type !== 'rollbacks') {
        // department browse or search
        return this.isSearch() ? 'root' : ['rootMarker', 'transient'];
      }
    },
    mainView: function() {
      return this.departmentPicker;
    },
    links: function(links) {
      if (this.showRefinements) {
        this.refinementsLink = links.add(_.bind(this.toggleRefinements, this), $(this.template('breadcrumb-choice', {
          type: 'filter-button full',
          text: 'Filter'
        })));
      } else {
        this.refinementsLink = $();
      }
      links.add(_.bind(this.toggleGridList, this), $(this.template('breadcrumb-choice', {
        type: 'show-grid icon full',
        text: 'Grid'
      })));

      links.links.addClass('button-container choice-group list-grid-buttons');
    }
  },

  isSearch: function() {
    return this.type === 'search';
  },

  initialize: function() {
    //can pass sort: false to this view to disable the sort selector from appearing
    if (this.sort !== false) {
      this.sort = new SortSelectorView({
        model: this.collection
      });
      this.sort.bind('change:sort', function() {
        this.isReset = true;
      }, this);
    }

    if (this.isSearch()) {
      this.departmentList = new ShelfDepartmentList();
      this.departmentList.hide();
      this.departmentList.bind('selected:browseToken', function(obj, label) {
        this.departmentPicker.hide();
        this.departmentPicker.setLabel(label);
        this.collection.applyStoreAndFilters({
          department: _.clone(obj)
        });
      }, this);
      this.departmentList.bind('selected:all', function() {
        this.departmentPicker.hide();
        this.collection.departments.setSelectedDept();
        this.departmentPicker.setLabel(false);
        this.collection.applyStoreAndFilters({
          department: null
        });
      }, this);

      this.departmentPicker = new ShelfDepartmentPicker();
      this.departmentPicker.disable();
      this.departmentPicker.bind('show', function(){
        this.departmentList.show();
        this.toggleRefinements(false);
        _.invoke(this._elementsToToggle(['shelf-department-list'], false), 'hide');
      },this);
      this.departmentPicker.bind('hide', function(){
        this.departmentList.hide();
        _.invoke(this._elementsToToggle(null, true), 'show');
      },this);
    }

    this.itemCount = this.view('ShelfItemCount');

    this.showRefinements = Phoenix.config.useFacetedSearch &&
        _.indexOf(['rollbacks', 'shop-by-department', 'search'], this.type) >= 0;

    if (this.showRefinements) {
      this.refinementList = new RefinementList({
        isSearch: this.isSearch()
      });
      this.refinementList.$el.hide();
      this.refinementList.bind('hide', function() {
        this.toggleRefinements(false);
      },this);

      this.refinementList.bind('reset', function() {
        Phoenix.Track.facetedSearchReset();
        this.toggleRefinements(false);
      },this);
      this.refinementList.on('applyStoreAndFilters', this.onApplyStoreAndFilters, this);
    } else {
      var empty = function() {};
      var Blank = Phoenix.View.extend({name: 'blank', setItemCount: empty, render: empty, renderEmpty: empty, renderItem: empty});
      this.refinementList = new Blank();
    }

    this.refinementsLink || (this.refinementsLink = $());

    this.paginator = this.view('Paginator');
    this.paginator.bind('paginate', this.onPaginate, this);
    this.mixin('ScrollPosition');

    // Ensure that we are properly seeded for grid display if passed on init
    if (this.displayType === 'grid') {
      this.updateType();
    }
  },

  rendered: function() {
    var phrase = this.collection && this.collection.correctedSearchPhrase;
    if (phrase) {
      this.$('.search-suggestion').text(phrase).attr('href', '/search/' + encodeURIComponent(phrase));
      this.$('.corrected-search-container').show();
    }
    if (Phoenix.useNativeScroll()) {
      this.$('.filters-applied').addClass('native-scroll');
    }
  },

  setCollection: function(collection, options) {
    Phoenix.View.prototype.setCollection.call(this, collection, options);
    if (this.sort) {
      this.sort.setModel(collection, options);
    }

    if (collection.filters) {
      this.refinementList.setCollection(collection.filters, options);
    }
    this.paginator.setCollection(collection, options);

    if (this.departmentList && collection.departments) {
      this.departmentList.setCollection(collection.departments, options);
    }

    this.toggleControls();

    // if the collection has already been loaded, and is thus populated, we
    // need to still log the analytics for it.
    if (collection.isPopulated()) {
      this.logSearch();
    }
  },

  onApplyStoreAndFilters: function(obj, unchecked) {
    if (unchecked) {
      Phoenix.Track.facetedSearchRemove(
        processFilters(obj.filters, [], 'id'));
    }
    this.collection.applyStoreAndFilters(obj);
  },

  toggleRefinements: function(show) {
    if (!_.isBoolean(show)) {
      show = !this.refinementsLink.hasClass('open');
    }
    if (show) {
      if (this.departmentPicker) {
        this.departmentPicker.hide();
      }
      this.refinementsLink.addClass('open');
      _.invoke(this._elementsToToggle(['shelf-refinement-list'], false), 'hide');
      this.refinementList.$el.show();
    } else {
      if (!this.omniDone && !collectionHasPendingFetch(this)) {
        if (this.showRefinements) {
          Phoenix.Track.facetedSearch(omniSearchHelper(this.collection));
          this.omniDone = true;
        }
      }

      this.refinementList.$el.hide();
      _.invoke(this._elementsToToggle(null, true), 'show');
      this.refinementsLink.removeClass('open');
    }
  },

  toggleGridList: function() {
    if (this.displayType === 'grid') {
      this.displayType = 'list';
    } else {
      this.displayType = 'grid';
    }
    this.updateType();
  },

  updateType: function() {
    // Spitball the number of items in each row at 3
    var pagingScale = 3;
    if (this.displayType === 'grid') {
      pagingScale = 1/pagingScale;
    }
    this.paginator.pagingPadding *= pagingScale;

    this.$('.shelf-list').toggleClass('grid', this.displayType === 'grid');

    var primaryClass = 'show-grid',
        secondaryClass = 'show-list';
    if (this.displayType === 'list') {
      primaryClass = 'show-list';
      secondaryClass = 'show-grid';
    }
    $('.breadcrumbs .list-grid-buttons .' + primaryClass)
        .removeClass(primaryClass)
        .addClass(secondaryClass);
  },

  toggleControls: function() {
    if (!collectionHasPendingFetch(this)) {
      var show = this.collection.size();
      if (!show && this.collection.isPopulated() && this.sort) {
        this.sort.hide(); // We only hide
      }

      if (this.isSearch()) {
        this.departmentPicker.hide();
      }
      this.itemCount.setItemCount(this.collection.length, show ? (this.collection.totalCount || this.collection.length) : 0);
    }
  },

  onPaginate: function() {
    this.collection.nextPage();
  },

  itemContext: function(model) {
    var attr = model.attributes;

    // This should be in the model, but adding it there will require changes in several model.
    // For expediency this is in the view for now.
    var isVaryingPrice = (attr.price === "Price varies by store.") || (attr.price === "Price varies by store");

    var rtn = {
      name: attr.name,
      itemPage: attr.url,
      thumbnail: largeThumbnail(attr),
      price: (attr.pricingInformation || {}).submap || attr.price,
      flags: getFlags(attr, null, this.type), //shelf type will be "rollbacks", "shop-by-department", "search"
      rating: attr.rating,
      outOfStock: model.outOfStock ? model.outOfStock() : outOfStock(null, model.attributes),
      varyingPriceClass: isVaryingPrice ? "varying-price" : ""
    };
    if (this.type && rtn.itemPage) {
      rtn.itemPage += (rtn.itemPage.indexOf('?') !== -1 ? '&' : '?') + 'type=' + this.type;
    }
    return rtn;
  },

  logSearch: function() {
    if (this.searchLogged) {return;}

    if (this.analyticsType) {
      // this should track manual shelf
      Phoenix.Track.customShelf(this.browseLabel, this.collection.totalCount, this.analyticsType);
    } else {
      // log taxonomy shelf
      if (this.type === 'rollbacks') {
        Phoenix.Track.rollbacksShelf(this.browseLabel, this.collection.totalCount);
      } else if (this.type === 'shop-by-department'){
        Phoenix.Track.departmentShelfBrowse(this.browseLabel, this.collection.totalCount);
      } else if (this.type === 'localAd') {
        Phoenix.Track.localAdShelf(this.browseLabel, this.collection.totalCount);
      } else {
        // log search
        Phoenix.Track.itemSearch(this.collection.searchTerm, this.collection.totalCount);
      }
    }
    this.searchLogged = true;
  },

  _elementsToToggle: function(excludes, show) {
    var elements = [
      this.$('.shelf-list'),
      $(Phoenix.footer.el)
    ];
    var classNames = ['paginator', 'shelf-refinement-list', 'shelf-department-list', 'shelf-item-count'];
    if (this.sort) {
      elements.push($(this.sort.el));
    }
    if (this.showRefinements) {
      if (!show || (show && this._appliedFilters)) {
          classNames.push('filters-applied');
      }
    }
    if (show) {
      excludes = ['shelf-department-list', 'shelf-refinement-list'];
      if (this.collection.numOfPages() < 2) {
        excludes.push('paginator'); // don't show the paginator if there isn't more than 1 page
      }
      if (this.collection.isLoading()) {
        excludes.push('paginator'); // don't show the paginator if there is more loading
        excludes.push('shelf-item-count'); // don't show the item count if there is more loading
      }
    }
    var excluded = _.difference(classNames, _.union(excludes));
    elements = elements.concat(_.map(excluded, function(val) {
      return this.$('.' + val);
    }, this));
    return elements;
  },

  wwwUrl: function() {
    if (this.isSearch()) { return; }

    var rootPath = '/cp/' + Phoenix.config.rootDepartmentId;
    var deptBrowseToken = (this.collection.curDepartment || {}).browseToken;
    if (deptBrowseToken) {
      return Phoenix.Data.getEncodedUrlPath(deptBrowseToken, rootPath);
    } else {
      return rootPath;
    }
  },

  _buildAppliedFilters: function() {
    if (this.showRefinements) {
      var emits = [];
      _.each(this.collection.curFilters, function(id) {
        emits.push(this.collection.filters.getPropertyById(id, 'name'));
      }, this);
      if (emits.length) {
        this._appliedFilters = emits.join(', ');
      } else {
        this._appliedFilters = null;
      }
    }
  }

});

function collectionHasPendingFetch(context) {
  if (context.collection.hasPendingFetch) {
    return context.collection.hasPendingFetch();
  }
  return false;
}

function omniSearchHelper(collection) {
  return {
    filters: _.clone(collection.curFilters),
    searchTerm: collection.searchTerm,
    deptId: collection.curDepartment.id
  };
}

