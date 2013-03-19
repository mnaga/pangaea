
Phoenix['browse-search'] = (function(Phoenix, View, Handlebars) {
  var module = {exports: {}};
  var exports = module.exports;
  Phoenix['browse-search'] = exports;

  /* router : browse-search */
module.name = "browse-search";
module.routes = {"search/:searchTerms":"search"};
function largeThumbnail(attr) {
  return (Phoenix.isDense && attr.itemImage215) || attr.itemImage150 || attr.imageThumbnailUrl || attr.thumbnail;
}
function smallThumbnail(attr) {
  return (Phoenix.isDense && attr.itemImage150) || attr.imageThumbnailUrl || attr.thumbnail;
}

function outOfStock(variant, attributes) {
  var info = attributes.generalProductInformationModule,
      availability = attributes.itemAvailability || (info && info.itemAvailability);

  // Unified data models
  if ((variant && 'outOfStock' in variant) || 'outOfStock' in attributes) {
    return variant ? variant.outOfStock : attributes.outOfStock;
  //for shelf
  } else if (!info && availability) {
    //special case: item may have flag of "Not Available at this time" but we want to show as in stock on a shelf
    if (availability.availability === 'Not Available at this time') {
      return false;
    //special case: items not sold by walmart.com should not be listed as out of stock
    } else if (parseInt(attributes.pcpSellerId, 10) !== 0) {
      return false;
    } else {
      return outOfStockValues.indexOf(availability.availability) !== -1;
    }

  //for main item page
  } else {
    info = info || {};

    var inStore = Phoenix.Data.boolean(info.availableInStore),
        online = Phoenix.Data.boolean(variant ? variant.addableToCart : info.availableOnline);
    return !inStore && !online;
  }
}

function itemUrl(url) {
  return url && url.replace(/https?:\/\/.*?\/(.*)/, '$1');
}

function getFlags(attr, variant, shelfType) {
  //shelfType will be "rollbacks", "search" or null
  var response = [];
  flagsOrder.forEach(function(type) {
    var flags = Flags[type],
        item_flags;
    if (flags.getValue) {
      item_flags = flags.getValue(attr, variant);
    } else {
      var variantFlags = variant && variant['variant' + type.charAt(0).toUpperCase() + type.slice(1)];
      item_flags = variantFlags && variantFlags.length ? variantFlags : attr[type];
    }
    if (item_flags) {
      for (var i = 0; i < item_flags.length; ++i) {
        if (shouldDisplayFlag(type, shelfType, item_flags[i], flags, attr, variant)) {
          response.push({name: item_flags[i], type: (flags._class || '') + ' ' + (flags[item_flags[i]] || '')});
        }
      }
    }
  });
  return response;
}

function isPickupTodayOnly(generalProductInformationModule) {
  // NOTE generalProductInformationModule has a putElgible flag, but
  // we are not sure if it is complete.
  //
  // A Pickup Today (PUT) item at store would not be available online and would
  // only be available in store. Checking the availability display is probably
  // not necessary and is added just for good measure.
  var info = generalProductInformationModule || {},
      inStore = Phoenix.Data.boolean(info.availableInStore),
      online = Phoenix.Data.boolean(info.availableOnline),
      onlyInStore = info.availabilityDisplay === 'Only in Stores';

  return inStore && !online && onlyInStore;
}

function isGiftCard(generalProductInformationModule) {
  var info = generalProductInformationModule || {},
      str = info.itemClass,
      starts = 'SHOPPING_CARD';

  if (!info.itemClass) { return false; }
  return str.length >= starts.length && str.slice(0, starts.length) === starts;
}

function isElectronicGiftCard(generalProductInformationModule) {
  // fixed price gift cards have itemClass equal to SHOPPING_CARD_B2B
  return (generalProductInformationModule || {}).itemClass === 'SHOPPING_CARD';
}

function getGiftCardPriceRange(attributes) {
  attributes = attributes || {};
  var sellerModule = _.first(attributes.sellersModule || []) || {},
      sellerItem = sellerModule.sellerItem || {};

  return [parseInt(sellerItem.minPrice, 10), parseInt(sellerItem.maxPrice, 10)];
}

function isVariableGiftCard(attributes) {
  attributes = attributes || {};
  var info = attributes.generalProductInformationModule || {};

  if (isGiftCard(info)) {
    var range = getGiftCardPriceRange(attributes);
    return range[0] !== range[1];
  }
  return false;
}


//used by outOfStock, "Out of stock online", "In Stock" and "Preorder Now" will not appear as being out of stock
var outOfStockValues = [
  'Out of Stock',
  'Out of stock online',
  'Not Available at this time',
  'Temporarily Out of Stock'
];

//only display these flags on a shelf
var shelfFlags = [
  'Out of Stock',
  'Temporarily Out of Stock',
  'Not Available at this time',
  'Free Shipping to Home',
  '97 Cent Shipping',
  'No Cost Shipping'
];

//shelfType will be "rollbacks", "search" or null
//flagType will be "priceFlags", "merchFlags", "shipFlags" or "availabilityFlags"
function shouldDisplayFlag(flagType, shelfType, flag, flags, attr, variant) {
  if (!shelfType) {
    return true;
  } else {
    //special case: If the item-level out of stock state is not triggered then
    // filter out any out of stock flags.
    if (shelfType && flags[flag] === 'out-of-stock' && !outOfStock(variant, attr)) {
      return false;
    //special case: do not show 'Not Available at this time' on shelf if walmart.com
    //is not the seller (pcpSellerId == 0)
    } else if (shelfType && flag === 'Not Available at this time' && parseInt(attr.pcpSellerId, 10) !== 0) {
      return false;
    } else {
      return shelfFlags.indexOf(flag) !== -1;
    }
  }
}

var flagsOrder = ['availabilityFlags', 'shipFlags', 'priceFlags', 'merchFlags'];

var Flags = {
  priceFlags: {
    _class: 'price-flags',

    "Rollback": "rollback"
    /*  Known values, uncomment items if custom styles are needed
    "Dare to Compare": "dare-to-compare",
    "Clearance": "clearance",
    "Below List Prices": "below-list-prices",
    "Strikeout": "strikeout",
    "97 Cent Shipping": "shipping-97-cent",
    "Same Day Delivery": "same-day-delivery",
    "Reduced Price": "reduced-price",
    */
  },
  merchFlags: {
    _class: 'merch-flags'
    /*  Known values, uncomment items if custom styles are needed
    "Special Buy": "special-buy",
    "New": "new",
    "No Cost Shipping": "no-cost-shipping",
    "As Advertised": "as-advertised",
    "As Seen On TV": "as-seen-on-tv",
    "Online Only": "online-only",
    "Rebate Available": "rebate-available",
    "Wal-Mart Exclusive": "wal-mart-exclusive",
    "Certified": "certified",
    "Also In Many Stores": "also-in-many-stores",
    "Coming Soon": "coming-soon",
    "Save On Shipping": "save-on-shipping",
    "En Espanol": "en-espanol",
    "Award-Winning": "award-winning",
    "Personalize It": "personalize-it",
    */
  },
  shipFlags: {
    _class: 'shipping-flags'
    /*  Known values, uncomment items if custom styles are needed
    "97 Cent Shipping": "shipping-97-cent",
    "Free Shipping to Home": "free-shipping",
    "No Cost Shipping": "free-shipping"
    */
  },
  availabilityFlags: {
    getValue: function(attr, variant) {
      //attr.availabilityFlags is added by Phoenix in local ads
      var itemAvailability = (variant ? variant.variantItemAvailability : attr.itemAvailability) || {},
          value = itemAvailability.availability || attr.availabilityDisplay || attr.availabilityFlags;

      // Exception: Can this be a Pickup Today (PUT) in store only item?
      if (isPickupTodayOnly(attr)) {
        value = 'Only available from full site';
      }

      if (value) {
        return [value];
      }
    },

    "In Stock": "in-stock",
    "Not Available at this time": "out-of-stock",
    "Temporarily Out of Stock": "out-of-stock",
    "Out of stock online": "out-of-stock",
    "Out of Stock": "out-of-stock",
    "Preorder Now": "preorder-now",
    "Only in Stores": "only-in-stores", //this is a flag created by Phoenix for local ads
    "Only available from full site": "only-in-stores" //this is a flag created by Phoenix for PUT
  }
};

function normalizePricingInformation(attr, pricingInfo) {
  if (pricingInfo && pricingInfo.price) {
    var matches = pricingInfo.price.match(/.([\d,\.]+) - .([\d,\.]+)/);
    if (matches) {
      // mobile displays price range as "From {lower price}"
      var context = {
        from: Phoenix.View.price(matches[1]),
        to: Phoenix.View.price(matches[2]),
      };
      attr.price = Phoenix.i18n.call(context, "{{from}} - {{to}}", {'expand-tokens': true});
    }
  }
}

;;
/*global RefinementItems*/
var RefinementCategory = Phoenix.Model.extend({
  initialize: function(attributes, options) {
    this.on('remove', function() {
      this.items.off('change:selected', null, this);
    });
    this.on('add', function() {
      this.items.on('change:selected',
        _.bind(this.trigger, this, 'change:selected'), this);
    });
  },
  parse: function(data) {
    var items = data.items || [];
    delete data.items;

    // build the collection of items in this category
    this.items = new RefinementItems(items, {parse: true});

    return data;
  },
  getSelectedItems: function() {
    return this.items.where({selected: true});
  },
  clearSelections: function(options) {
    options = _.extend({silent: true}, options || (options = {}));
    this.items.each(function(model) {
      model.set({selected: false}, options);
    });
  }
});


;;
var RefinementItem = Phoenix.Model.extend({
  select: function(selected) {
    if (_.isUndefined(selected)) {
      selected = true;
    }
    this.set({selected: selected});
  }
});

var RefinementItems = Phoenix.Collection.extend({
  model: RefinementItem
});


;;
/*global LocalCache, itemUrl, normalizePricingInformation, RefinementCategories */
var shelfItem = Phoenix.Model.extend({
  previewClass: 'item',

  parse: function(data){
    return data;
  }
});

var ShelfCollection = Phoenix.PagedCollection.extend({
  model: shelfItem,
  ttl: LocalCache.TTL.DAY,
  pageSize: 30,

  sortInfo: {
    sorts: [
      {value: 'TOPRATED', name: 'Top Rated'},
      {value: 'BESTSELLERS', name: 'Best Sellers'},
      {
        value: 'PRICE_LOHI',
        name: 'Price',
        selected: 'Low to High',
        reverse: { value: 'PRICE_HILO', selected: 'High to Low' }
      }
    ],
    defaultSort: 'RELEVANCE'
  },

  applySort: function(sortValue) {
    // queue the sorting option too since we queue other changes this makes sense
    this.applyStoreAndFilters({
      sortValue: sortValue
    });
  },

  collateQueue: function() {
    var queue = this._queue,
        filters = [],
        department,
        sortValue,
        storeId;

    while (queue.length) {
      var action = queue.shift();
      filters = processFilters(action.filters, filters, 'id');
      department = action.department; // One at a time only.
      storeId = action.storeId; // One at a time only.
      sortValue = action.sortValue; // One at a time only.
    }

    // Now check to make sure each id is still available
    filters = _.compact(_.map(filters, function(id) {
      // Take the filter's id and locate it in the returned list of refinements
      // and then return its browseToken so we have an array of updated
      // browseTokens when we're done.
      var found = this.filters.getPropertyById(id, 'browseToken');
      if (found) { return {
          id: id,
          browseToken: found
        };
      }
    }, this));

    if (filters.length === 0) {
      filters = undefined;
    }

    return {
      department: department,
      filters: filters,
      storeId: storeId,
      sortValue: sortValue
    };
  },

  applyStoreAndFilters: function(options) {
    /*jshint eqeqeq:false */
    // We only want to set the 'preferred store's id', 'selected filters', or
    // 'selected department.' if they differ from what they were before.
    // Passing a value of undefined will not unset the previous values. If you
    // want to unset (i.e., clear), a value then you need to pass null.
    options = options || {};
    var storeId = options.storeId,
        filters = options.filters,
        department = options.department,
        sortValue = options.sortValue,
        dirty;

    if (this._isLoading) {
      // Queue the changes after the current request completes.
      this._queue.push({
        storeId: storeId,
        filters: filters,
        department: department,
        sortValue: sortValue
      });
      return;
    }

    if (!_.isUndefined(sortValue) && sortValue != this.sortField) {
      this.sortField = sortValue;
      dirty = true;
    }

    if (!_.isUndefined(storeId) && storeId != this.curStore) {
      this.curStore = storeId;
      dirty = true;
    }

    if (_.isNull(department)) {
      this.curDepartment = {};
      dirty = true;
    }
    else if (!_.isUndefined(department) && !_.isEqual(department, this.curDepartment)) {
      this.curDepartment = department;
      dirty = true;
    }

    if (_.isNull(filters) && !_.isEmpty(this.curFilters)) {
      this.curFilters = [];
      dirty = true;
    } else if (_.isArray(filters)) {
      filters = processFilters(filters, _.clone(this.curFilters), 'id');
      // We have to sort the arrays to determine if they're equal or not when
      // using underscore isEqual.
      var sortedActiveFilters = sortIf(this.curFilters),
          sortedFilters = sortIf(filters);

      if (!_.isEqual(sortedActiveFilters, sortedFilters)) {
        this.curFilters = _.clone(filters);
        dirty = true;
      }
    }

    // If we've made any changes then we should re-fetch.
    if (dirty) {
      this._dirty = true;
      this.fetch({resetQueue: true});
    }
  },

  initialize: function(models, attributes) {
    attributes || (attributes = {});
    // Selectivly loooking to attach certain attributes to our instance.
    // curDepartment: This refers to the department refinement group's browseToken/id
    // curDeptEnum: This is a hard coded enum like ENTIRESITE, ELECTRONICS,
    //   that's used in the call to SBD of SBDF
    // searchTerm: Self explanatory, used in call to SBD or SBDF
    _.extend(this, _.pick(attributes, 'curFilters', 'curDepartment', 'curDeptEnum', 'searchTerm'));

    if (attributes.pos) {
      this.page = Math.floor(parseInt(attributes.pos, 10) / this.pageSize) || 0;
    }

    this.departments = new SearchDepartmentsCollection();
    this.departments.collection = this;
    this.filters = new RefinementCategories();
    this.filters.collection = this;

    this.on('load:start', function(message, background) {
      this._isLoading = true;
      this.filters.saveSelState();
      if (this._dirty) {
        this.page = 0; // very important to reset the page
        this._dirty = false;
      }
    });
    this.on('load:end', function() {
      this._isLoading = false;
      var queue = this.collateQueue();
      _.defer(_.bind(this.applyStoreAndFilters, this), queue);
    });

    this._queue = [];
    this._firstParse = true;
    this.curFilters || (this.curFilters= []);
    this.curDepartment || (this.curDepartment = {});

    Phoenix.PagedCollection.prototype.initialize.apply(this, arguments);
  },

  sync: Phoenix.Connection.boundSync(
          ['sortField', 'curFilters', 'curStore', 'curDepartment'],
          Phoenix.PagedCollection.prototype.sync),

  url: function() {
    // We are either now going to call browseByToken or browseByTokenFiltered
    // depending on if we have active filters set or not on this instance. It
    // is also possible to use a preferred store so we have to check for its
    // presence on determining if we should pass the active filters as p7 or
    // p6. We are allowed to pass department (isDeaprtment=true) refinement
    // group browseTokens in the filtered array.
    var hasActiveFilters = !_.isEmpty(this.curFilters);
    var url = '/m/j?service=Browse&method=browseByToken'
      + ( hasActiveFilters ? 'Filtered' : '' )
      + '&p1=' + encodeURIComponent(this.curDepartment.browseToken) // from taxonomy service
      + '&p2=All'
      + '&p3=' + (this.sortField || this.sortInfo.defaultSort)
      + this.offsetParams(4);

    if (this.curStore) {
      url = url + '&p6=' + this.curStore;
    }

    if (hasActiveFilters) {
      url = url + ( this.curStore ? '&p7=' : '&p6=' );

      var facetUrl = buildFacetUrl({
        pageNum: this.page,
        pageSize: this.pageSize,
        filterIds: this.curFilters,
        departmentId: this.curDepartment.id,
        encode: true
      });
      url = url + encodeURIComponent(JSON.stringify([facetUrl]));
    }

    return url;
  },

  parse: function(data) {
    this._hasPendingFetch = !!this._queue.length;

    this.correctedSearchPhrase = data.correctedSearchPhrase;

    // We don't want to parse the filters and departments if this parse
    // method is invoked as a result of going to the next page.
    if (this.isOnFirst()) {
      var departments = this.departments.parse(data.refinementGroups);
      if (Phoenix.config.useBayesian) {
        departments = bayesianAvg(departments);
      }
      this.departments.reset(departments, {parse: true});

      var refinements = this.filters.parse(data.refinementGroups);
      this.filters.remove(this.filters.models);

      var previousSelections = _.clone(this.filters.previousSelections || []);
      if (!_.isEmpty(this.curFilters)) {
        if (this._firstParse) {
          this.filters.previousSelections = _.union(_.clone(this.curFilters), previousSelections);
          this._firstParse = false;
        } else {
          var differences = _.difference(previousSelections, this.curFilters);
          if (differences.length) {
            _.each(differences, function(diff) {
              previousSelections = _.without(previousSelections, diff);
            });
            this.filters.previousSelections = previousSelections;
          }
        }
      }

      // Now need to reslect queued items. If user selects an item, A, then only
      // A will be saved with saveSelState() and then a fetch() is invoked
      // followed by a parse(). If the user selected two more items, B, and C,
      // while A was still running, then they wouldn't of been saved. We need to
      // reslect them just in case but not save their browseTokens to
      // curFilters because we want to re-fetch if needed.
      var foundRefinements = this.filters.restoreSelState(refinements);
      // a previously selected id may no longer be available
      this.curFilters = _.pluck(foundRefinements, 'id');

      // Trick the collection into thinking queued models are selected too.
      var queue = _.clone(this._queue);
      var queueSelections = [];        // will give us an array of queued ids
      while (queue.length) {
        var action = queue.shift();
        queueSelections = processFilters(action.filters, queueSelections, 'id');
      }
      this.filters.previousSelections = _.union(queueSelections, previousSelections);

      // Purposely don't set this.curFilters to the retval because
      // we want to be able to re-fetch the queued actions.
      this.filters.restoreSelState(refinements);

      // Now set the models into the collection and go live with them.
      this.filters.add(refinements, {parse: true});
    }

    if (!this.hasPendingFetch()) {
      _.each(data.item, function(item) {
        item.url = itemUrl(item.url);
        normalizePricingInformation(item, item.pricingInformation);
      });

      return Phoenix.PagedCollection.prototype.parse.call(this, data);
    } else {
      // Don't bother rendering the items and downloading images if we
      // have another request pending that will overwrite it anyways.
      return [];
    }
  },

  numOfPages: function() {
    var totalCount = parseInt(this.totalCount, 10);
    return Math.ceil(totalCount / this.pageSize);
  },

  hasPendingFetch: function() {
    return this._hasPendingFetch;
  },

  isLoading: function() {
    // lets callee know if an active fetch is in progress during
    // load:start up till the last load:end.
    return this._isLoading;
  }

});

var SearchCollection = ShelfCollection.extend({
  url: function() {
    // We are either now going to call searchByDepartment or
    // searchByDepartmentFiltered depending on if we have active filters set or
    // not on this instance.
    var hasActiveFilters = !_.isEmpty(this.curFilters),
        hasFilters = this.curDepartment.id || hasActiveFilters,
        filters;

    var url = '/m/j?service=Browse&method=searchByDepartment'
      + ( hasFilters ? 'Filtered' : '' )
      + '&p1=' + encodeURIComponent(this.searchTerm)
      + '&p2=' + encodeURIComponent(this.curDeptEnum || 'ENTIRESITE')
      + '&p3=All' // one of 'All', 'Store', or 'Online'
      + '&p4=' + (this.sortField || 'RELEVANCE')
      + this.offsetParams(5);

    if (hasFilters) {
      var facetUrl = buildFacetUrl({
        pageNum: this.page,
        pageSize: this.pageSize,
        searchTerm: this.searchTerm,
        filterIds: this.curFilters,
        departmentId: this.curDepartment.id,
        encode: true
      });
      url = url + '&p7=' + encodeURIComponent(JSON.stringify([facetUrl]));
    }
    return url;
  }
});

//sorts by number of results, then alphabetical
//"1" will be removed by sortBySelectedBrowseToken
//if needed
//TODO: better way to score?
function searchDepartmentsComparator(department) {
  return (1000000 - parseInt(department.totalCount, 10) * 100) + department.name;
}

var SearchDepartmentsCollection = Phoenix.Collection.extend({
  comparator: function(department) {
    return searchDepartmentsComparator(department.attributes);
  },

  parse: function(refinementGroups) {
    this.totalCount = 0;
    //discard everything that isn't a department
    var departmentRefinementGroups = _.reject(refinementGroups, function(refinementGroup) {
      return !Phoenix.Data.boolean(refinementGroup.isDepartment);
    });

    //when searching by department the top level refinement won't have a browseToken
    if (departmentRefinementGroups.length) {
      if (!departmentRefinementGroups[0].browseToken) {
        return _.map(departmentRefinementGroups[0].refinements, function(refinement) {
          var totalCount = parseInt(refinement.stats, 10);
          this.totalCount += totalCount;
          return {
            name: refinement.name,
            browseToken: refinement.browseToken,
            totalCount: totalCount
          };
        }, this);
      } else {
        return _.map(departmentRefinementGroups, function(refinementGroup) {
          // Only add the refinementGroup if it has more than 0
          var totalCount = parseInt(refinementGroup.totalCount, 10),
              departments, id;

          this.totalCount += totalCount;
          departments = _.sortBy(_.map(refinementGroup.refinements, function(refinement) {
            // All the children's parent id are equal.  Only problem is when
            // the parent has no children so we won't be able to get an id.
            id = refinement.parent;
            return {
              id: refinement.id,
              name: refinement.name,
              browseToken: refinement.browseToken,
              totalCount: parseInt(refinement.stats, 10)
            };
          }), searchDepartmentsComparator);

          return {
            id: id,
            name: refinementGroup.name,
            // TODO: Top level browseToken is not encoded
            browseToken: Phoenix.Data.encode64(refinementGroup.browseToken),
            totalCount: totalCount,
            departments: departments,
            hasDepartments: departments.length > 0
          };
        }, this);
      }
    }
  },

  numberOfDepartmentsWithChildren: function() {
    var count = 0;
    this.models.forEach(function(department) {
      if (department.attributes.departments && department.attributes.departments.length > 0) {
        ++count;
      }
    });
    return count;
  },

  sortBySelectedBrowseToken: function(browseToken) {
    this.models = this.sortBy(function(department) {
      var value = searchDepartmentsComparator(department.attributes),
      parentMatches = department.attributes.browseToken === browseToken,
      childMatches = false;
      department.attributes.departments = _.sortBy(department.attributes.departments, function(childDepartment) {
        var childValue = searchDepartmentsComparator(childDepartment);
        if (childDepartment.browseToken === browseToken) {
          childValue = '0' + childValue;
          childMatches = true;
        }
        return childValue;
      });
      if (parentMatches || childMatches) {
        value = '0' + value;
      }
      return value;
    });
    this.trigger('reset', this);
  },

  _findLeaf: function(key, value) {
    // This finds a leaf in the current models
    var departments,
        children,
        child,
        found;

    var root = this.getSelectedDept();
    if (root && root[key] === value) {
      return root;
    }

    children = this.models;
    for (var i = 0, l = children.length; i < l; i++) {
      child = this.at(i);
      if (child.get(key) === value) {
        found = child.attributes;
      } else {
        departments = child.get('departments');
        found = _.find(departments, function(department) {
          return department[key] === value;
        });
      }
      if (found) {
        break;
      }
    }

    return found;
  },

  setSelectedById: function(id) {
    if (!id) { return; }
    var leaf = this._findLeaf('id', id);
    if (leaf) {
      this.setSelectedDept(leaf);
    }
  },

  setSelectedDept: function(leaf) {
    if (!_.isUndefined(leaf)) {
      this._selectedDept = {
        id: leaf.id,
        name: leaf.name,
        selected: true,
        totalCount: parseInt(leaf.totalCount, 10),
        browseToken: leaf.browseToken
      };
    } else {
      this._selectedDept = leaf;
    }
  },

  getSelectedDept: function(property) {
    if (property && this._selectedDept) {
      return this._selectedDept[property];
    }
    return this._selectedDept;
  }

});

// Helper function to sort an array to be used for comparison
function sortIf(value) {
  return _.isArray(value) ? value.sort() : value;
}

function processFilters(filters, collater, property) {
  if (!filters) {
    return collater;
  }

  // We are no longer going to 'set' the active filters. Now we are going to go
  // through each filter and if item is present then we will remove it,
  // otherwise we will add it.
  _.each(filters, function(filter) {
    var value = filter[property],
        idx = _.indexOf(collater, value);

    if (idx >= 0) {  // In there so remove it
      collater = _.without(collater, value);
    } else {         // Not in there so add it.
      collater.push(value);
    }
  });
  return collater;
}

function buildFacetUrl(options) {
  options || (options = {});
  var pageNum = options.pageNum,
      pageSize = options.pageSize,
      searchTerm = options.searchTerm,
      filterIds = options.filterIds,
      departmentId = options.departmentId,
      url = options.url || 'http://www.walmart.com/search/search-ng.do?',
      encode = options.encode || false;

  var query = {
    '_refineresult': true,
    'ic': [pageSize, pageNum].join('_'),
    'search_constraint': 0,
    'tab_value': 'All'
  };
  if (searchTerm) {
    _.extend(query, {
      'search_query': searchTerm.replace(/ /g, '+'),
    });
  }
  if (filterIds && filterIds.length) {
    _.extend(query, {
      'facet': filterIds.join('||').replace(/ /g, '+')
    });
  }
  if (departmentId) {
    _.extend(query, {
      'cat_id': departmentId
    });
  }
  url += Backbone.Router.stringify(query).replace(/%2B/g, '+');
  if (encode) {
    url = Phoenix.Data.encode64(url);
  }
  return url;
}

// Ultimately we want this logic to move to the server,
// https://wmobile.atlassian.net/browse/SERV-1115
function bayesianAvg(refinements) {
  // Bayesian average for hiding sub departments.
  //
  // Calculating the Bayesian average uses the prior mean m and
  // a constant C. C is assigned a value that is proportional to the
  // typical data set size. The value is larger when the expected
  // variation between data sets (within the larger population) is
  // small. It is smaller, when the data sets are expected to vary
  // substantially from one another.
  //
  // x = ( Cm + Sum(values) ) / ( C + n )
  //
  // In cases where the averages' relative values are the only result
  // of importance, m can be replaced with zero. C can be calculated
  // based on the priors regarding variance between data sets. In
  // circumstances where that kind of rigor is desired, other more
  // expressive measures of statistical power are likely to be used. As
  // a result, C is usually assigned a value in an ad-hoc manner.
  var deptLength = 0,
      deptTotalCount = 0,
      refinementCount = 0,
      C = 6;

  // Remove all empty refinements
  refinements = _.filter(refinements, function(refinement) {
    return refinement.totalCount > 0;
  });

  _.each(refinements, function(refinement) {
    refinementCount++;
    deptLength += refinement.departments.length;
    deptTotalCount += refinement.totalCount;
  });

  var avgTotalCount = deptTotalCount / deptLength;
  var xC = ((C * avgTotalCount) + deptTotalCount) / (C + deptLength);

  var avgLength = deptLength / refinementCount;
  var xL = ((C * avgLength) + deptLength) / (C + refinementCount);

  xL = Math.ceil(xL);
  xC = Math.ceil(xC);

  _.each(refinements, function(refinement) {
    if (refinement.departments.length <= xL) {
      if (refinement.totalCount < xC) {
        refinement.departments = [];
        refinement.hasDepartments = false;
      }
      else if (_.all(refinement.departments, function(department) {
        return department.totalCount <= xC; }))
      {
        refinement.departments = [];
        refinement.hasDepartments = false;
      }
    }
  });

  return refinements;
}


;;
/*global LocalCache, itemUrl */

var ManualShelf = Phoenix.Collection.extend({
  previewClass: 'item',
  ttl: LocalCache.TTL.DAY,
  includeOutOfStock: true,

  sortInfo: {
    sorts: [
      {value: 'TOPRATED', name: 'Top Rated'},
      {
        value: 'PRICE_LOHI',
        name: 'Price',
        selected: 'Low to High',
        reverse: { value: 'PRICE_HILO', selected: 'High to Low' }
      }
    ],
    defaultSort: 'RELEVANCE'
  },

  applySort: function(sortValue) {
    this.sortConfig = sortValue;
    this.sort();
  },

  url: function() {
    var maxItems = this.maxItems;
    if (!maxItems) {
      maxItems = (getShelfData(this.id) || {}).maxItems;
    }
    return '/m/j?service=ManualShelf&method=getExtendedShelf&p1=' + this.id + '&p2=' + (maxItems || 25) + '&p3=' + !!this.includeOutOfStock;
  },

  parse: function(data) {
    this.id = data.id;

    // WARN: This assumes reset operations only...
    _.each(data.items, function(value, index) {
      value.url = itemUrl(value.url);
      value.originalIndex = index;
    });

    return data.items;
  },

  name: function() {
    return (getShelfData(this.id) || {}).name;
  },

  comparator: function(a, b) {
    a = a.attributes;
    b = b.attributes;
    if (this.sortConfig === 'TOPRATED') {
      return parseFloat(b.rating || -1) - parseFloat(a.rating || -1);
    } else if (this.sortConfig === 'PRICE_LOHI') {
      return this._parsePrice(a) - this._parsePrice(b);
    } else if (this.sortConfig === 'PRICE_HILO') {
      return this._parsePrice(b) - this._parsePrice(a);
    } else {
      return a.originalIndex - b.originalIndex;
    }
  },

  // This method is currently only used by comparator, but we don't want to put it
  // inside comparator function for performance reasons. Comparator is called many times
  // when sorting so we don't want to create _parsePrice function on every comparator call
  // (which would be the case if it was declared inside comparator).
  _parsePrice: function(a) {
    if (_.isNumber(a.price)) {
      return a.price;
    }

    var match = /\d+(?:\.\d{1,2})?/.exec(a.price.replace(/,/g, ''));
    if (match) {
      return parseFloat(match[0]);
    } else {
      return -1;
    }
  }
});

var MerchandisingCollection = ManualShelf.extend({
  maxSize: 10,
  includeOutOfStock: false
});

function getShelfData(id) {
  var merchData = Phoenix.config.merchData || {},
      shelfData = merchData.shelfData || {};
  return shelfData[id];
}

;;
/*global getShelfData */
var ManualShelves = Phoenix.Collection.extend({
  url: function() {
    return '/m/j?service=ManualShelf&method=getShelves&p1=' + JSON.stringify(this.ids);
  },
  parse: function(data) {
    data = _.map(data, function(shelf) {
      if (shelf.items.length) {
        var item = _.extend(shelf.items[0], {shelfId: shelf.id}),
            shelfConfig = getShelfData(shelf.id);
        if (shelfConfig) {
          item.shelfName = shelfConfig.name;
        }
        return item;
      }
    });
    return _.filter(data, function(shelf) { return shelf; });
  }
});

;;
/*global RefinementCategory, searchDepartmentsComparator*/
var RefinementCategories = Phoenix.Collection.extend({
  model: RefinementCategory,
  comparator: function(filter) {
    return searchDepartmentsComparator(filter.attributes);
  },
  setSelState: function(selectedRefinementIds, options) {
    if (!_.isArray(selectedRefinementIds) || _.isEmpty(selectedRefinementIds) ) {
      return;
    }
    this.each(function(model) {
      options = _.extend({silent: true}, options || (options = {}));
      var selectedItems = model.items.filter(function(item) {
        return _.indexOf(selectedRefinementIds, item.id) >= 0;
      });
      _.each(selectedItems, function(item) {
        item.set({selected:true}, options);
      });
    });
  },
  saveSelState: function() {
    // We need to store the previously selected refinements so when the fetch
    // returns we can re-mark then as selected. Each new refinement returns
    // a new list of narrower refinements.
    var selectedRefinementIds = [],
        selections;

    this.each(function(model) {
      selections = model.getSelectedItems();
      selectedRefinementIds = _.union(selectedRefinementIds, _.pluck(selections, 'id'));
    });
    this.previousSelections = selectedRefinementIds;
  },
  getSelectedState: function() {
    return this.previousSelections;
  },
  restoreSelState: function(models) {
    // Set **selected** on previously selected models (if they were returned in
    // new set). The difference between this and setSelState is that this runs
    // over raw models.
    var selectedRefinementIds = this.previousSelections || [],
        foundRefinements = [];

    if (selectedRefinementIds.length > 0) {
      _.each(models, function(model) {
        _.each(model.items, function(item) {
          if (_.indexOf(selectedRefinementIds, item.id) >= 0) {
            item.selected = true;
            foundRefinements.push({
              id: item.id,
              browseToken: item.browseToken
            });
          }
        });
      });
      delete this.previousSelections;
    }
    return foundRefinements;
  },
  parse: function(refinementGroups) {
    this.totalCount = 0;

    var pureFilterGroups = _.reject(refinementGroups, function(refinementGroup) {
      var isDepartment = Phoenix.Data.boolean(refinementGroup.isDepartment);
      if (isDepartment) {
        return true;
      }

      // Reject departments with no items
      refinementGroup.totalCount = parseInt(refinementGroup.totalCount, 10);
      if (refinementGroup.totalCount === 0) {
        return true;
      }
    });

    return _.map(pureFilterGroups, function(refinementGroup) {
      this.totalCount += refinementGroup.totalCount;
      var refinements = _.map(refinementGroup.refinements, function(refinement) {
        return {
          id: refinement.id,
          name: refinement.name,
          browseToken: refinement.browseToken,
          count: parseInt(refinement.stats, 10)
        };
      });
      refinements = _.sortBy(refinements, refinementsComparator);

      return {
        id: refinementGroup.name,
        name: refinementGroup.name,
        count: refinementGroup.totalCount,
        items: refinements
      };
    }, this);
  },
  getPropertyById: function(id, property) {
    var retval = this.getRefinement(id);
    return retval ? retval.get(property) : null;
  },
  getRefinement: function(id) {
    var retval;
    this.find(function(model) {
      return (retval = model.items.get(id));
    });
    return retval;
  }

});

var _refinementWithNumberPattern = /^\$?([\d,\+]+)\b.*/;
var _refinementNumberCleanupPattern = /[,\+]/i;
function refinementsComparator(refinement) {
  var match = refinement.name.match(_refinementWithNumberPattern);
  if (match) {
    var val = match[1].replace(_refinementNumberCleanupPattern, '');
    return parseInt(val, 10);
  } else {
    return refinement.name;
  }
}


;;
var SortSelectorView = Phoenix.View.extend({
  name: 'sort-selector',
  className: 'button-container',
  nonBlockingLoad: true,
  ignoreFetchError: true,

  events: {
    'click label': function(event) {
      event.preventDefault();

      // handle sorting
      var sort = this.getSort(),
          id = event.currentTarget.getAttribute('for'),
          value = id && this.$('#' + id).val();

      if (value) {
        // Reverse if reversible
        if (sort && sort.reverse && (sort.value === value || sort.reverse.value === value)) {
          this.setSort(sort.value === this.sort ? sort.reverse.value : sort.value);
        } else if (!sort || sort.value !== value || this._isDefaultSort) {
          this.setSort(value);
        } else if (this.model.sortInfo.defaultSort){
          this.setSort(this.model.sortInfo.defaultSort, {isDefaultSort: true});
        }
      }
    }
  },

  getSort: function() {
    return this._getSortObject(this.sort);
  },

  setSort: function(sort, options) {
    options = options || {};
    if (this.sort) {
      this._updateUI(this.sort, false);
    }
    if (!options.isDefaultSort) {
      this._updateUI(sort, true);
    }
    this.sort = sort;
    this._isDefaultSort = !!options.isDefaultSort;
    if (!options.doNotSort) {
      this.model.applySort(this.sort);
    }
    if (!options.silent) {
      this.trigger('change:sort');
    }
  },

  _getSortObject: function(sortValue) {
    var sortInfo = this.model.sortInfo;
    if (sortInfo.defaultSort === sortValue) {
      return {value: sortInfo.defaultSort};
    }
    return _.filter(sortInfo.sorts, function(sort) {
      return sort.value === sortValue || (sort.reverse && sort.reverse.value === sortValue);
    })[0];
  },

  _getInput: function(sortObj) {
    var input = this.$('input[value="' + sortObj.value + '"]');
    if (!input[0] && sortObj.reverse) {
      input = this.$('input[value="' + sortObj.reverse.value + '"]');
    }
    return input;
  },

  _updateUI: function(sortValue, selected) {
    var sortObj = this._getSortObject(sortValue),
        input = this._getInput(sortObj),
        label = this.$('label[for="' + (input[0] || {}).id + '"]');
    if (selected) {
      var realSort = (sortObj.value === sortValue) ? sortObj : sortObj.reverse;
      input.attr('checked', true);
      label.text(realSort.selected);
      input.attr('value', realSort.value);
    } else {
      input.removeAttr('checked');
      label.text(sortObj.name);
      input.attr('value', sortObj.value);
    }
  },

  show: function() {
    $(this.el).show();
  },

  hide: function() {
    $(this.el).hide();
  },

  context: function() {
    return this.model && this.model.sortInfo;
  },
  renderTemplate: function() {
    // Kill off any whitespace so we can do proper empty rendering
    var ret = Phoenix.View.prototype.renderTemplate.apply(this, arguments);
    return ret && ret.trim();
  }
});

;;
Thorax.templates['sort-selector'] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [2,'>= 1.0.0-rc.3'];
helpers = helpers || Handlebars.helpers; data = data || {};
  var buffer = "", stack1, functionType="function", escapeExpression=this.escapeExpression, self=this;

function program1(depth0,data,depth1) {
  
  var buffer = "", stack1;
  buffer += "\n  <input type=\"radio\" value=\""
    + escapeExpression(((stack1 = depth0.value),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\" name=\""
    + escapeExpression(((stack1 = depth1.cid),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "-sort\" id=\""
    + escapeExpression(((stack1 = depth1.cid),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "-"
    + escapeExpression(((stack1 = depth0.value),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\">\n  <label for=\""
    + escapeExpression(((stack1 = depth1.cid),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "-"
    + escapeExpression(((stack1 = depth0.value),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\">\n    "
    + escapeExpression(helpers.i18n.call(depth0, depth0.name, {hash:{},data:data}))
    + "\n  </label>\n";
  return buffer;
  }

  stack1 = helpers.each.call(depth0, depth0.sorts, {hash:{},inverse:self.noop,fn:self.programWithDepth(program1, data, depth0),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n";
  return buffer;
  });var ShelfDepartmentPicker = Phoenix.View.extend({
  name: 'shelf/department-picker',
  tagName: 'button',
  attributes: {
    type: 'button'
  },
  events: {
    'click': function() {
      if (this.isOpen) {
        this.hide();
      } else {
        this.show();
      }
    }
  },
  initialize: function() {
    this.render();
    this.setLabel();
  },
  show: function() {
    if (this.isOpen) {
      return;
    }
    this.isOpen = true;
    $(this.el).addClass('open');
    this.trigger('show');
  },
  hide: function() {
    if (!this.isOpen) {
      return;
    }
    this.isOpen = false;
    $(this.el).removeClass('open');
    this.trigger('hide');
  },
  disable: function(label) {
    this.setLabel(label || Phoenix.i18n('Search Results'));
    $(this.el).attr('disabled', 'disabled');
  },
  setLabel: function(label) {
    this.label = label;
    this.hide();
    $(this.el).removeAttr('disabled');
    this.html('<span>' + (label || Phoenix.i18n('Departments')) + '</span>');
  },
  render: function() {
    this.setLabel(this.label);
  }
});

//timeout before closing the picker
var DEPARTMENT_PICKER_CLOSE_TIMEOUT = 250;
var ShelfDepartmentList = Phoenix.CollectionView.extend({
  name: 'shelf/department-list',
  events: {
    'click .filter-item': function(event) {
      var target = $(event.target);
      if (target.hasClass('trigger')) {
        return;
      }
      var row = $(event.currentTarget);
      if (row.hasClass('all-departments')) {
        this.selectAllDepartments();
      } else {
        var browseToken = row.data('browsetoken'),
            id = row.data('id');

        this.collection.setSelectedById(id);
        this.selectNodeByBrowseToken({id: id, browseToken: browseToken});
      }
    },
    rendered: 'hideAllDepartments',
    'click .parent .trigger': function(event) {
      var target = $(event.target).parent('[data-tree-parent]'),
          parentId = target.attr('data-tree-parent');
      if (!target.hasClass('empty')) {
        if (target.hasClass('open')) {
          this.closeNode(parentId);
        } else {
          this.openNode(parentId);
        }
      }
    },
    collection: {
      reset: function(collection) {
        this.totalCount = collection.totalCount; // For all departments count in template
        $(this.el).toggleClass('no-children', !collection.numberOfDepartmentsWithChildren());
      }
    },
    'selected:all': function() {
      this.hideAllDepartments();
      this.collection.sort();
    }
  },
  openNode: function(parentId) {
    this.$('.parent[data-tree-parent="' + parentId + '"]').addClass('open');
    this.$('.child[data-tree-parent="' + parentId + '"]').show();
  },
  closeNode: function(parentId) {
    this.$('.parent[data-tree-parent="' + parentId + '"]').removeClass('open');
    this.$('.child[data-tree-parent="' + parentId + '"]').hide();
  },
  selectNodeByBrowseToken: function(obj, options) {
    options || (options = {});
    this.selectedDept = obj;
    this.$('.selected').removeClass('selected');
    var selectedNode = this.$('[data-browseToken="' + obj.browseToken + '"]');
    selectedNode.addClass('selected');
    if (selectedNode.hasClass('child')) {
      this.openNode(selectedNode.attr('data-tree-parent'));
    }
    if (!options.silent) {
      this._delayedTrigger('selected:browseToken', obj, this.labelFromBrowseToken(obj.browseToken));
    }
    return selectedNode;
  },
  selectAllDepartments: function(options) {
    options || (options = {});
    this.$('.selected').removeClass('selected');
    this.$('.department.all-departments').addClass('selected');
    this.selectedDept = false;
    this._delayedTrigger('selected:all');
  },
  labelFromBrowseToken: function(browseToken) {
    return this.$('[data-browseToken="' + browseToken + '"] .name p').html();
  },
  _delayedTrigger: function() {
    var args = arguments;
    if (this._waitingToTrigger) {
      return;
    }
    this._waitingToTrigger = true;
    _.delay(_.bind(function() {
      try {
        this._waitingToTrigger = false;
        this.trigger.apply(this, args);
      } catch (err) {
        Phoenix.trackCatch('department.trigger', err);
      }
    }, this), DEPARTMENT_PICKER_CLOSE_TIMEOUT);
  },
  show: function() {
    // Called by shelf view in response to events from DepartmentPicker
    $(this.el).show();
  },
  hide: function() {
    $(this.el).hide();
    this.sortBySelected();
    if (this.selectedDept) {
      this.showAllDepartments();
    }
  },
  sortBySelected: function() {
    if (this.collection && this.selectedDept) {
      this.collection.sortBySelectedBrowseToken(this.selectedDept.browseToken);
      this.selectNodeByBrowseToken(this.selectedDept, {silent: true});
    }
  },
  hideAllDepartments: function() {
    this.$('.department.all-departments').hide();
  },
  showAllDepartments: function() {
    this.$('.department.all-departments').show();
  }
});


;;
Thorax.templates['shelf/department-list'] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [2,'>= 1.0.0-rc.3'];
helpers = helpers || Handlebars.helpers; data = data || {};
  var buffer = "", stack1, escapeExpression=this.escapeExpression, functionType="function";


  buffer += "<div class=\"filter-item department all-departments parent\">\n  <div class=\"name\"><p>"
    + escapeExpression(helpers.i18n.call(depth0, "All Departments", {hash:{},data:data}))
    + "</p></div>\n  <div class=\"count\"><p>"
    + escapeExpression(((stack1 = depth0.totalCount),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</p></div>\n</div>\n<div class=\"collection tree\">\n</div>\n";
  return buffer;
  });Thorax.templates['shelf/department-list-empty'] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [2,'>= 1.0.0-rc.3'];
helpers = helpers || Handlebars.helpers; data = data || {};
  var buffer = "";


  buffer += "\n\n";
  return buffer;
  });Thorax.templates['shelf/department-list-item'] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [2,'>= 1.0.0-rc.3'];
helpers = helpers || Handlebars.helpers; data = data || {};
  var buffer = "", stack1, stack2, functionType="function", escapeExpression=this.escapeExpression, self=this;

function program1(depth0,data) {
  
  
  return " ";
  }

function program3(depth0,data) {
  
  
  return " empty";
  }

function program5(depth0,data,depth1) {
  
  var buffer = "", stack1;
  buffer += "\n    <div class=\"filter-item department child\" data-tree-parent=\""
    + escapeExpression(((stack1 = depth1.cid),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\" style=\"display: none;\" data-browseToken=\""
    + escapeExpression(((stack1 = depth0.browseToken),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\" data-id=\""
    + escapeExpression(((stack1 = depth0.id),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\">\n      <button class=\"trigger\" type=\"button\"></button>\n      <div class=\"name\"><p>"
    + escapeExpression(((stack1 = depth0.name),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</p></div>\n      <div class=\"count\"><p>"
    + escapeExpression(((stack1 = depth0.totalCount),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</p></div>\n    </div>\n  ";
  return buffer;
  }

  buffer += "<div>\n  <div class=\"filter-item department parent";
  stack1 = helpers['if'].call(depth0, depth0.hasDepartments, {hash:{},inverse:self.program(3, program3, data),fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\" data-tree-parent=\""
    + escapeExpression(((stack1 = depth0.cid),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\" data-browseToken=\""
    + escapeExpression(((stack1 = depth0.browseToken),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\" data-id=\""
    + escapeExpression(((stack1 = depth0.id),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\">\n    <button class=\"trigger\" type=\"button\"></button>\n    <div class=\"name\"><p>"
    + escapeExpression(((stack1 = depth0.name),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</p></div>\n    <div class=\"count\"><p>"
    + escapeExpression(((stack1 = depth0.totalCount),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</p></div>\n  </div>\n  ";
  stack2 = helpers.each.call(depth0, depth0.departments, {hash:{},inverse:self.noop,fn:self.programWithDepth(program5, data, depth0),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n</div>\n";
  return buffer;
  });Thorax.templates['shelf/department-picker'] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [2,'>= 1.0.0-rc.3'];
helpers = helpers || Handlebars.helpers; data = data || {};
  


  return " ";
  });var RefinementCategoryView = Phoenix.CollectionView.extend({
  name: 'shelf/refinement-category',
  tagName: 'li',
  className: 'refinement-category',
  events: {
    'click .refinement-category-btn': 'toggle',
    'click .refinement-item > button': 'onItemClick',
    'click .selected-refinement-items button': 'onItemClick',
    collection: {
      'change:selected': function(model) {
        // update the selected set of items
        this.$('.selected-refinement-items').html(this.renderTemplate('shelf/selected-refinement-items', this.context()));
        this.$('li[data-model-cid="' + model.cid + '"]').toggleClass('selected', model.attributes.selected);
        this.refreshState();
      }
    },
    close: function() {
      this.toggle(false);
    }
  },
  initialize: function(options) {
    this.setCollection(options.model.items);
    this.$el.addClass('closed');
    this.refreshState();
  },
  context: function() {
    var rtn = Phoenix.View.prototype.context.apply(this, arguments);
    var selectedItems = [];
    if (this.model) {
      selectedItems = this.model.getSelectedItems();
    }
    return _.extend({selectedItems: selectedItems}, rtn);
  },
  refreshState: function() {
    var selectedItems = [];
    if (this.model) {
      selectedItems = this.model.getSelectedItems();
    }
    this.$el.toggleClass('has-selected', (selectedItems.length > 0));
  },
  toggle: function(open) {
    var fetching = this.model.collection.collection.isLoading();
    var hasClosed = this.$el.hasClass('closed');
    if (fetching && hasClosed) {
      var parent = this.$el.closest('.refinement-category');
      $('.collection.refinement-items', parent)
          .html(this.renderTemplate('inline-loading-indicator', {
            label: 'Loading filter options'
          }));
    }
    open = _.isBoolean(open) ? open : hasClosed;
    this.$el.toggleClass('closed', !open);
  },
  onItemClick: function(event) {
    var btn = $(event.currentTarget);
    // only allow selection if category is expanded
    var container = btn.closest('.refinement-item'),
        cid = container.attr('data-model-cid');
    if (cid) {
      var model = this.collection.getByCid(cid);
      model.select(!model.attributes.selected);
    }
  }
});


;;
Thorax.templates['shelf/refinement-category'] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [2,'>= 1.0.0-rc.3'];
helpers = helpers || Handlebars.helpers; data = data || {};
  var buffer = "", stack1, functionType="function", escapeExpression=this.escapeExpression;


  buffer += "<button type=\"button\" class=\"refinement-category-btn\">\n  "
    + escapeExpression(((stack1 = depth0.name),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\n</button>\n<ul class=\"collection refinement-items\"></ul>\n<ul class=\"selected-refinement-items\">\n  "
    + escapeExpression(helpers.template.call(depth0, "shelf/selected-refinement-items", {hash:{},data:data}))
    + "\n</ul>";
  return buffer;
  });Thorax.templates['shelf/selected-refinement-items'] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [2,'>= 1.0.0-rc.3'];
helpers = helpers || Handlebars.helpers; data = data || {};
  var buffer = "", stack1, functionType="function", escapeExpression=this.escapeExpression, self=this;

function program1(depth0,data) {
  
  var buffer = "", stack1, stack2;
  buffer += "\n  <li class=\"refinement-item\" data-model-cid=\""
    + escapeExpression(((stack1 = depth0.cid),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\">\n    ";
  stack2 = helpers['with'].call(depth0, depth0.attributes, {hash:{},inverse:self.noop,fn:self.program(2, program2, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n  </li>\n";
  return buffer;
  }
function program2(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n      <button>\n        <div class=\"name\">\n          "
    + escapeExpression(((stack1 = depth0.name),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\n        </div>\n        <div class=\"count\">\n          <span>"
    + escapeExpression(((stack1 = depth0.count),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</span>\n        </div>\n      </button>\n    ";
  return buffer;
  }

  stack1 = helpers.each.call(depth0, depth0.selectedItems, {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n";
  return buffer;
  });Thorax.templates['shelf/refinement-category-item'] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [2,'>= 1.0.0-rc.3'];
helpers = helpers || Handlebars.helpers; data = data || {};
  var buffer = "", stack1, self=this, functionType="function", escapeExpression=this.escapeExpression;

function program1(depth0,data) {
  
  
  return " selected";
  }

  buffer += "<li class=\"refinement-item";
  stack1 = helpers['if'].call(depth0, depth0.selected, {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\">\n  <button type=\"button\">\n    <div class=\"name\">\n      "
    + escapeExpression(((stack1 = depth0.name),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\n    </div>\n    <div class=\"count\">\n      <span>"
    + escapeExpression(((stack1 = depth0.count),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</span>\n    </div>\n  </button>\n</li>\n";
  return buffer;
  });
/*global RefinementCategoryView*/
var RefinementList = Phoenix.CollectionView.extend({
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
        }]});
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
  },

  itemView: RefinementCategoryView,

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
      this.clearStoreSelectorlink = Phoenix.breadcrumb.override(this.renderTemplate('shelf/refinement-list-store-crumb')).find('a[href]');
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
    button.find('div').html(this.renderTemplate('shelf/refinement-list-store', this));
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
    this.trigger('hide');
  },

  onApply: function() {
    event.preventDefault();
    this.trigger('hide');
  },

  rendered: function() {
    if (this.isSearch) {
      this.$('.select-refinement-store').hide();
    }
  }

});


;;
Thorax.templates['shelf/refinement-list'] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [2,'>= 1.0.0-rc.3'];
helpers = helpers || Handlebars.helpers; data = data || {};
  var buffer = "", stack1, escapeExpression=this.escapeExpression, self=this;

function program1(depth0,data) {
  
  
  return "checked";
  }

  buffer += "<div class=\"main\">\n  <div class=\"actions content\">\n    <div class=\"button-container\">\n      <button type=\"button\" class=\"button clear secondary-button\">"
    + escapeExpression(helpers.i18n.call(depth0, "Reset", {hash:{},data:data}))
    + "</button>\n      <button type=\"button\" class=\"button apply secondary-button primary-button icon\">"
    + escapeExpression(helpers.i18n.call(depth0, "Apply", {hash:{},data:data}))
    + "</button>\n    </div>\n  </div>\n\n  <button class=\"select-refinement-store ";
  stack1 = helpers['if'].call(depth0, depth0.selectedStore, {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\">\n    <div>\n      "
    + escapeExpression(helpers.template.call(depth0, "shelf/refinement-list-store", {hash:{},data:data}))
    + "\n    </div>\n  </button>\n\n  <ul class=\"collection refinement-container\"></ul>\n</div>\n"
    + escapeExpression(helpers.view.call(depth0, depth0.storeSelector, {hash:{},data:data}));
  return buffer;
  });Thorax.templates['shelf/refinement-list-store'] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [2,'>= 1.0.0-rc.3'];
helpers = helpers || Handlebars.helpers; data = data || {};
  var buffer = "", stack1, escapeExpression=this.escapeExpression, self=this;

function program1(depth0,data) {
  
  var buffer = "", stack1, stack2;
  buffer += "\n  ";
  stack2 = helpers['with'].call(depth0, ((stack1 = ((stack1 = depth0.selectedStore),stack1 == null || stack1 === false ? stack1 : stack1.attributes)),stack1 == null || stack1 === false ? stack1 : stack1.address), {hash:{},inverse:self.noop,fn:self.program(2, program2, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n";
  return buffer;
  }
function program2(depth0,data) {
  
  var buffer = "";
  buffer += "\n    <p>"
    + escapeExpression(helpers.i18n.call(depth0, "{{city}}, {{state}} {{zip}}", {hash:{
    'expand-tokens': (true)
  },data:data}))
    + "</p>\n  ";
  return buffer;
  }

function program4(depth0,data) {
  
  var buffer = "";
  buffer += "\n  <p>"
    + escapeExpression(helpers.i18n.call(depth0, "Set your store", {hash:{},data:data}))
    + "</p>\n";
  return buffer;
  }

  buffer += "<em>"
    + escapeExpression(helpers.i18n.call(depth0, "In-Store Items Only", {hash:{},data:data}))
    + "</em>\n";
  stack1 = helpers['if'].call(depth0, depth0.selectedStore, {hash:{},inverse:self.program(4, program4, data),fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n";
  return buffer;
  });Thorax.templates['shelf/refinement-list-store-crumb'] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [2,'>= 1.0.0-rc.3'];
helpers = helpers || Handlebars.helpers; data = data || {};
  var buffer = "", escapeExpression=this.escapeExpression;


  buffer += "<div class=\"crumbs\">\n  <span class=\"crumb\">\n    <a href=\"filter\" class=\"crumb\">"
    + escapeExpression(helpers.i18n.call(depth0, "Filter", {hash:{},data:data}))
    + "</a>\n  </span>\n  <span class=\"crumb\">\n    <a class=\"label\">"
    + escapeExpression(helpers.i18n.call(depth0, "Store Selector", {hash:{},data:data}))
    + "</a>\n  </span>\n</div>\n";
  return buffer;
  });Phoenix.Views.ShelfItemCount = Phoenix.View.extend({
  name: 'shelf/item-count',

  setItemCount: function(count, total) {
    this.visible = total || Number(total) !== 0;
    this.count = count;
    this.total = total;
    this.render();
  }
});

;;
Thorax.templates['shelf/item-count'] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [2,'>= 1.0.0-rc.3'];
helpers = helpers || Handlebars.helpers; data = data || {};
  var buffer = "", escapeExpression=this.escapeExpression;


  buffer += escapeExpression(helpers.i18n.call(depth0, "{{count}} of {{total}} Results", {hash:{
    'expand-tokens': (true)
  },data:data}))
    + "\n\n";
  return buffer;
  });/*global RefinementList, SortSelectorView, ShelfDepartmentList, ShelfDepartmentPicker, largeThumbnail, getFlags, outOfStock, buildFacetUrl */
var ShelfView = Phoenix.CollectionView.extend({
  name: 'shelf/shelf',
  className: 'body',
  _collectionSelector: '.shelf-list',
  nonBlockingLoad: true,

  emptyMessage: 'Currently, we don\'t have any items available in this category.',

  events: {
    collection: {
      add: 'toggleControls',
      reset: 'toggleControls',
      'load:start': function() {
        if (this.isReset) {
          this.$('.shelf-list').append($('<div class="partial-loading-mask">'));

          // Custom loading dispatch for this case
          this.paginator.hide();

          // Forward the load to the global object for a nonModal load. The global
          // object should see this only once due to the nonBlockingLoad for the view
          Phoenix.trigger('load:start', undefined, {nonModal: true}, this.collection);
        }
      },
      'load:end': function() {
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
      this.refinementsLink = links.add(_.bind(this.toggleRefinements, this), $(this.renderTemplate('breadcrumb-choice', {
        type: 'filter-button full',
        text: 'Filter'
      })));
      links.add(_.bind(this.toggleGridList, this), $(this.renderTemplate('breadcrumb-choice', {
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
        _.invoke(this._elementsToToggle(['shelf-department-list']), 'hide');
      },this);
      this.departmentPicker.bind('hide', function(){
        this.departmentList.hide();
        var excludes = ['shelf-department-list', 'shelf-refinement-list'];
        if (this.collection.numOfPages() < 2) {
          excludes.push('paginator');
        }
        _.invoke(this._elementsToToggle(excludes), 'show');
      },this);
    }
    this.itemCount = new Phoenix.Views.ShelfItemCount;

    this.refinementList = new RefinementList({
      isSearch: this.isSearch()
    });
    this.refinementList.$el.hide();
    this.refinementList.bind('hide', function(){
        this.toggleRefinements(false);
      },this);
    this.refinementList.on('applyStoreAndFilters', this.onApplyStoreAndFilters, this);

    this.paginator = new Phoenix.Views.Paginator;
    this.paginator.bind('paginate', this.onPaginate, this);
    this.mixin('ScrollPosition');

    // Ensure that we are properly seededfor grid display if passed on init
    if (this.type === 'grid') {
      this.updateType();
    }
  },
  rendered: function() {
    var phrase = this.collection && this.collection.correctedSearchPhrase;
    if (phrase) {
      this.$('.search-suggestion').text(phrase).attr('href', '/search/' + encodeURIComponent(phrase));
      this.$('.corrected-search-container').show();
    }
  },
  onCollectionLoaded: function() {
    this.logSearch();
  },
  setCollection: function(collection, options) {
    Phoenix.View.prototype.setCollection.call(this, collection, options);
    if (this.sort) {
      this.sort.setModel(collection, options);
    }

    this.refinementList.setCollection(collection.filters, options);
    this.paginator.setCollection(collection, options);

    var self = this,
        departmentList = this.departmentList;

    function setupDepartments() {
      var selected = collection.departments.getSelectedDept();
      if (collection.departments.totalCount > 0) {
        if (selected) {
          self.departmentPicker.setLabel(selected.name);
          departmentList.selectNodeByBrowseToken({
            id: selected.id,
            browseToken: selected.browseToken
          }, {silent: true});
          departmentList.sortBySelected();
          departmentList.showAllDepartments();
        } else {
          self.departmentPicker.setLabel();
        }
      } else {
        if (selected && selected.totalCount > collection.departments.totalCount) {
          // Parsing didn't take into account the parent's totals
          self.departmentPicker.disable(selected.name);
        } else {
          self.departmentPicker.disable();
        }
      }
    }

    if (this.isSearch()) {
      this.departmentList.setCollection(collection.departments, options);
      collection.on('load:end', function() {
        if (collection.isOnFirst()) {
          setupDepartments();
        }
      });

      collection.on('reset', function(options) {
        options = options || {};
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
      });
    }

    this.toggleControls();
    if (collection.isPopulated()) {
      this.logSearch();
    }

    collection.on('load:start', function(background, child) {
      if (collection.isOnFirst()) {

        // Clear out the collection - it will be reloaded when fetched.
        self.$('.shelf-list').html('');

        // Only allow the paginator to show itself when the paged collection's
        // fetch is called. Otherwise, we see it when the selected filters
        // changes and a fetch from the search collection is called.
        self.paginator.hide();
      }
    });
    collection.on('load:end', function(child) {
      if (collection.isOnFirst()) {
        // TODO pangea: no refinementsLink
        //self.refinementsLink.toggleClass('filtered', child.prefStore || child.curFilters.length);
      }
    });
  },

  onApplyStoreAndFilters: function(obj) {
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
      _.invoke(this._elementsToToggle(['shelf-refinement-list']), 'hide');
      this.refinementList.$el.show();
    } else {
      this.refinementList.$el.hide();
      var excludes = ['shelf-refinement-list', 'shelf-department-list'];
      if (this.collection.numOfPages() < 2) {
        excludes.push('paginator');
      }
      _.invoke(this._elementsToToggle(excludes), 'show');
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
    var show = this.collection.size();
    if (!show && this.collection.isPopulated() && this.sort) {
      // We only hide
      this.sort.hide();
    }

    if (this.isSearch()) {
      this.departmentPicker.hide();
    }
    this.itemCount.setItemCount(this.collection.length, show ? this.collection.totalCount : 0);
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
    if (this.itemType && rtn.itemPage) {
      rtn.itemPage += (rtn.itemPage.indexOf('?') !== -1 ? '&' : '?') + 'type=' + this.itemType;
    }
    return rtn;
  },
  logSearch: function() {
    if (!this.searchLogged) {
      if (this.analyticsType) {
        Phoenix.Track.customShelf(this.browseLabel, this.collection.totalCount, this.analyticsType);
      } else if (this.collection.curDepartment) {
        // log taxonomy shelf
        if (this.type === 'rollbacks') {
          Phoenix.Track.rollbacksShelf(this.browseLabel, this.collection.totalCount);
        } else {
          Phoenix.Track.departmentShelfBrowse(this.browseLabel, this.collection.totalCount);
        }
      } else {
        if (this.itemType === 'localAd') {
          Phoenix.Track.localAdShelf(this.browseLabel, this.collection.totalCount);
        } else {
          // log search
          Phoenix.Track.itemSearch(this.collection.searchTerm, this.collection.totalCount);
        }
      }
      this.searchLogged = true;
    }
  },
  _elementsToToggle: function(excludes) {
    var elements = [
      this.$('.shelf-list'),
      $(Phoenix.footer.el)
    ];
    if (this.sort) {
      elements.push($(this.sort.el));
    }
    var excluded = _.difference(['paginator', 'shelf-refinement-list', 'shelf-department-list', 'shelf-item-count'], excludes);
    elements = elements.concat(_.map(excluded, function(val) {
      return this.$('.' + val);
    }, this));
    return elements;
  },
  wwwUrl: function() {
    if (this.isSearch()) {
      return '/search/search-ng.do?search_query=' + encodeURIComponent(this.collection.searchTerm);
    }
    var rootPath = '/cp/' + Phoenix.config.rootDepartmentId;
    if (this.collection.curDepartment) {
      return Phoenix.Data.getEncodedUrlPath(this.curDepartment.browseToken, rootPath);
    } else {
      return rootPath;
    }
  }
});


;;
Thorax.templates['breadcrumb-choice'] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [2,'>= 1.0.0-rc.3'];
helpers = helpers || Handlebars.helpers; data = data || {};
  var buffer = "", stack1, functionType="function", escapeExpression=this.escapeExpression;


  buffer += "<button class=\"button secondary-button "
    + escapeExpression(((stack1 = depth0.type),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\"><span>"
    + escapeExpression(helpers.i18n.call(depth0, depth0.text, {hash:{},data:data}))
    + "</button>\n";
  return buffer;
  });Thorax.templates['shelf/shelf'] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [2,'>= 1.0.0-rc.3'];
helpers = helpers || Handlebars.helpers; data = data || {};
  var buffer = "", stack1, escapeExpression=this.escapeExpression, functionType="function";


  buffer += "<div class=\"corrected-search-container\" style=\"display: none\">\n  Did you mean <a href=\"#\" class=\"search-suggestion\"></a>?\n</div>\n"
    + escapeExpression(helpers.view.call(depth0, depth0.sort, {hash:{},data:data}))
    + "\n<ul class=\"shelf-list tap-list "
    + escapeExpression(((stack1 = depth0.type),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\"></ul>\n"
    + escapeExpression(helpers.view.call(depth0, depth0.paginator, {hash:{},data:data}))
    + "\n"
    + escapeExpression(helpers.view.call(depth0, depth0.departmentList, {hash:{},data:data}))
    + "\n"
    + escapeExpression(helpers.view.call(depth0, depth0.refinementList, {hash:{},data:data}))
    + "\n"
    + escapeExpression(helpers.view.call(depth0, depth0.itemCount, {hash:{},data:data}));
  return buffer;
  });Thorax.templates['shelf/shelf-empty'] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [2,'>= 1.0.0-rc.3'];
helpers = helpers || Handlebars.helpers; data = data || {};
  var buffer = "", stack1, escapeExpression=this.escapeExpression, functionType="function", self=this;

function program1(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n    <h2>"
    + escapeExpression(helpers.i18n.call(depth0, "No Results for", {hash:{},data:data}))
    + " <span class=\"term\">&ldquo;"
    + escapeExpression(((stack1 = depth0.searchTerm),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "&rdquo;</span></h2>\n    <ul>\n      <li>"
    + escapeExpression(helpers.i18n.call(depth0, "Make sure words are spelled correctly", {hash:{},data:data}))
    + "</li>\n      <li>"
    + escapeExpression(helpers.i18n.call(depth0, "Turn all filters and sorting off", {hash:{},data:data}))
    + "</li>\n      <li>"
    + escapeExpression(helpers.i18n.call(depth0, "Try more generic keywords", {hash:{},data:data}))
    + "</li>\n    </ul>\n  ";
  return buffer;
  }

function program3(depth0,data) {
  
  var buffer = "";
  buffer += "\n    <h2>"
    + escapeExpression(helpers.i18n.call(depth0, depth0.emptyMessage, {hash:{},data:data}))
    + "</h2>\n  ";
  return buffer;
  }

  buffer += "<li class=\"empty-shelf error-page\">\n  ";
  stack1 = helpers['if'].call(depth0, depth0.searchTerm, {hash:{},inverse:self.program(3, program3, data),fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n</li>\n";
  return buffer;
  });Thorax.templates['shelf/shelf-item'] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [2,'>= 1.0.0-rc.3'];
helpers = helpers || Handlebars.helpers; data = data || {};
  var buffer = "", stack1, stack2, options, escapeExpression=this.escapeExpression, functionType="function", self=this, helperMissing=helpers.helperMissing;

function program1(depth0,data) {
  
  
  return " class=\"out-of-stock\"";
  }

function program3(depth0,data) {
  
  var buffer = "";
  buffer += "<a href=\""
    + escapeExpression(helpers.url.call(depth0, depth0.itemPage, {hash:{},data:data}))
    + "\"";
  return buffer;
  }

function program5(depth0,data) {
  
  
  return "<div";
  }

function program7(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n        <span class=\"price "
    + escapeExpression(((stack1 = depth0.varyingPriceClass),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\">"
    + escapeExpression(helpers.price.call(depth0, depth0.price, {hash:{},data:data}))
    + "</span>\n      ";
  return buffer;
  }

function program9(depth0,data) {
  
  
  return "</a>";
  }

function program11(depth0,data) {
  
  
  return "</div>";
  }

  buffer += "<li";
  stack1 = helpers['if'].call(depth0, depth0.outOfStock, {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += " data-id=\""
    + escapeExpression(((stack1 = depth0.id),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\">\n  ";
  stack2 = helpers['if'].call(depth0, depth0.itemPage, {hash:{},inverse:self.program(5, program5, data),fn:self.program(3, program3, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += " class=\"shelf-item item-preview\">\n    <div class=\"item-image-container item-preview-image\">\n      <img src=\""
    + escapeExpression(((stack1 = depth0.thumbnail),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\" alt=\""
    + escapeExpression(((stack1 = depth0.name),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\">\n      ";
  stack2 = helpers['if'].call(depth0, depth0.price, {hash:{},inverse:self.noop,fn:self.program(7, program7, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n    </div>\n    <div class=\"item-preview-text\">\n      <div class=\"price\">"
    + escapeExpression(helpers.price.call(depth0, depth0.price, {hash:{},data:data}))
    + "</div>\n      ";
  options = {hash:{},data:data};
  buffer += escapeExpression(((stack1 = helpers['flag-list']),stack1 ? stack1.call(depth0, depth0.flags, options) : helperMissing.call(depth0, "flag-list", depth0.flags, options)))
    + "\n      <div class=\"name\">";
  stack2 = ((stack1 = depth0.name),typeof stack1 === functionType ? stack1.apply(depth0) : stack1);
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "</div>\n      "
    + escapeExpression(helpers['star-rating'].call(depth0, depth0.rating, {hash:{},data:data}))
    + "\n    </div>\n  ";
  stack2 = helpers['if'].call(depth0, depth0.itemPage, {hash:{},inverse:self.program(11, program11, data),fn:self.program(9, program9, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n</li>\n";
  return buffer;
  });/*global largeThumbnail */
var FeaturedStories = Phoenix.CollectionView.extend({
  name: 'shelf/featured-stories',

  crumbs: {
    name: 'Featured Stories',
    type: 'root'
  },
  events: {
    'initialize:before': function() {
      var merchData = Phoenix.config.merchData || {},
          featuredCategories = merchData.featuredCategories || {},
          crumb = featuredCategories.title || featuredCategories.name;
      if (crumb) {
        this.crumbs.name = crumb;
      }

      this.theme = featuredCategories.theme || this.theme;
    },
    'click a.button': function(event) {
      var el = $(event.currentTarget);
      Phoenix.Track.miniStoryView(el.data('id'), el.data('position'));
    }
  },

  itemContext: function(item, index) {
    return _.defaults({
        thumbnail: largeThumbnail(item.attributes),
        position: (index + 1)
      },
      item.attributes);
  }
});

;;
Thorax.templates['shelf/featured-stories'] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [2,'>= 1.0.0-rc.3'];
helpers = helpers || Handlebars.helpers; data = data || {};
  


  return "<ul class=\"featured-stories collection\"></ul>\n";
  });Thorax.templates['shelf/featured-stories-item'] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [2,'>= 1.0.0-rc.3'];
helpers = helpers || Handlebars.helpers; data = data || {};
  var buffer = "", stack1, functionType="function", escapeExpression=this.escapeExpression;


  buffer += "<li class=\"featured-story\">\n  <div class=\"story-background\">\n    <p>"
    + escapeExpression(((stack1 = depth0.shelfName),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</p>\n\n    <img src=\""
    + escapeExpression(((stack1 = depth0.thumbnail),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\" alt=\""
    + escapeExpression(((stack1 = depth0.name),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\">\n\n    <a class=\"button secondary-button add-button\" href=\""
    + escapeExpression(helpers.url.call(depth0, "shelf/{{shelfId}}", {hash:{
    'expand-tokens': (true)
  },data:data}))
    + "\" data-position=\""
    + escapeExpression(((stack1 = depth0.position),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\" data-id=\""
    + escapeExpression(((stack1 = depth0.shelfId),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\">\n      "
    + escapeExpression(helpers.i18n.call(depth0, "Shop", {hash:{},data:data}))
    + "\n    </a>\n  </div>\n</li>\n";
  return buffer;
  });Thorax.templates['shelf/featured-stories-empty'] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [2,'>= 1.0.0-rc.3'];
helpers = helpers || Handlebars.helpers; data = data || {};
  var buffer = "", escapeExpression=this.escapeExpression;


  buffer += "<div>"
    + escapeExpression(helpers.i18n.call(depth0, "No featured stories right now. Please check back!", {hash:{},data:data}))
    + "</div>\n";
  return buffer;
  });
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
    query || (query = {});
    var departmentId = query.department,
        filterIds = query.refinements,
        oneResultRedirect = true;

    if (departmentId || filterIds) {
      // we don't want to redirect because we still have to make the
      // corresponding selections.
      oneResultRedirect = false;
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
  var url = 'search';
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


;;


  if (Phoenix['browse-search'] !== module.exports) {
    console.warn("Phoenix['browse-search'] internally differs from global");
  }
  return module.exports;
}).call(this, Phoenix, Phoenix.View, Handlebars);

//@ sourceMappingURL=browse-search.js.map
