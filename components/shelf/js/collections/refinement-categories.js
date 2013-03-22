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

