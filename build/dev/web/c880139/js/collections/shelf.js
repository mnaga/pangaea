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

