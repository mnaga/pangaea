/*global RefinementList, SortSelectorView, ShelfDepartmentList, ShelfDepartmentPicker, largeThumbnail, getFlags, outOfStock, buildFacetUrl */
var ShelfView = Phoenix.CollectionView.extend({
  name: 'index',
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
    },
    'rendered:collection': function() {
      if (typeof window.callPhantom === 'function' && this.collection.length) {
        window.callPhantom({
          ready: true
        });
      }
      
      overlayDyanmicPricing.call(this);

      Abba('zebra-stripes')
        .control('no-stripes', {weight: 20}, function(){})
        .variant('stripes', _.bind(function() {
          this.$('.shelf-list [data-model-cid]').each(function(i) {
            if (i % 2 === 0) {
              $(this).css({backgroundColor: '#aaa'});
            }
          })
        }, this))
        .start();
      this.$('.shelf-list [data-model-cid]').click(function(event) {
        event.preventDefault();
        Abba('zebra-stripes').complete();
      });
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
    }
    //links: function(links) {
    //  this.refinementsLink = links.add(_.bind(this.toggleRefinements, this), $(this.renderTemplate('breadcrumb-choice', {
    //    type: 'filter-button full',
    //    text: 'Filter'
    //  })));
    //  links.add(_.bind(this.toggleGridList, this), $(this.renderTemplate('breadcrumb-choice', {
    //    type: 'show-grid icon full',
    //    text: 'Grid'
    //  })));
//
    //  links.links.addClass('button-container choice-group list-grid-buttons');
    //}
  },

  isSearch: function() {
    return this.type === 'search';
  },

  initialize: function() {
    this.gridToggle = new Phoenix.Views['grid-toggle'];
    this.listenTo(this.gridToggle, 'change:toggle', function(toggle) {
      this.displayType = toggle;
      this.toggleGridList();
    });
    
    this.breadcrumb = new Phoenix.Views.breadcrumb({
      searchTerm: this.searchTerm
    });

    this.sort = new SortSelectorView({
      model: this.collection
    });
    this.listenTo(this.sort, 'change:sort', function(sort) {
      this.isReset = true;
      this.collection.applySort(sort);
    });

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
        if (!Phoenix.isDesktop) {
          this.toggleRefinements(false);
          _.invoke(this._elementsToToggle(['shelf-department-list']), 'hide');
        }
      },this);
      this.departmentPicker.bind('hide', function(){
        this.departmentList.hide();
        if (!Phoenix.isDesktop) {
          var excludes = ['shelf-department-list', 'shelf-refinement-list'];
          if (this.collection.numOfPages() < 2) {
            excludes.push('paginator');
          }
          this._elementsToToggle(excludes).forEach(function(el) {
            el.css({display: null});
          });
        }
      },this);
    }
    //this.itemCount = new Phoenix.Views.ShelfItemCount;

    this.refinementList = new RefinementList({
      isSearch: this.isSearch()
    });
    this.refinementList.hide();
    this.refinementList.bind('hide', function(){
        this.toggleRefinements(false);
      },this);
    this.refinementList.on('applyStoreAndFilters', this.onApplyStoreAndFilters, this);

    this.clickPaginatorTop = new Phoenix.Views['click-paginator']({
      searchTerm: this.searchTerm
    });
    this.clickPaginatorBottom = new Phoenix.Views['click-paginator']({
      searchTerm: this.searchTerm
    });
    this.clickPaginatorBottom.on('change:page', function() {
      this.clickPaginatorTop.render();
    }, this);
    this.clickPaginatorTop.on('change:page', function() {
      this.clickPaginatorBottom.render();
    }, this);

    this.paginator = new Phoenix.Views.Paginator;
    this.paginator.bind('paginate', this.onPaginate, this);
    this.mixin('ScrollPosition');

    // Ensure that we are properly seededfor grid display if passed on init
    if (this.type === 'grid') {
      this.updateType();
    }
  },
  rendered: function() {
    this.refinementsLink = this.$('.refinements-toggle');
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

    if (!exports.isDesktop) {
      this.collection.once('load:end', function() {
        this.paginator.show();
      }, this);
    }

    this.clickPaginatorTop.setCollection(collection);
    this.clickPaginatorBottom.setCollection(collection);

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
        if (collection.length === 0) {
          this.departmentPicker.hide();
          this.refinementList.hide();
        } else {
          this.departmentPicker.show();
          this.refinementList.show();
        }
      }, this);

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
      if (!parseInt(collection.totalCount, 10)) {
        this.clickPaginatorTop.hide();
        this.clickPaginatorBottom.hide();
      } else {
        this.clickPaginatorTop.show();
        this.clickPaginatorBottom.show();
      }

      this.$('[data-model-cid]:nth-child(3n) .price').addClass('original-price').each(function() {
        var priceElement = $(this);
        var originalPrice = cleanPrice(priceElement.text());

        priceElement.parent().append('<div class="price dynamic-price">' + replaceNumbers('$' + originalPrice, '$' + originalPrice) + '</div>');
        priceElement.hide();
      });

      /*
      if (parseInt(collection.totalCount, 10) === 0) {
        this.departmentPicker.hide();
      } else {
        this.departmentPicker.show();
      }
      */



    }, this);
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
      this.refinementList.show();
    } else {
      this.refinementList.hide();
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

    this.$('.shelf-list').toggleClass('grid', this.displayType !== 'grid');

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

    if (this.isSearch()) {
      this.departmentPicker.hide();
    }
    //this.itemCount.setItemCount(this.collection.length, show ? this.collection.totalCount : 0);
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
      this.$('.shelf-list')
    ];
    if (Phoenix.isDesktop) {
      elements.push(this.clickPaginatorTop.$el);
      elements.push(this.clickPaginatorBottom.$el);
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

var overlayDyanmicPricing = _.once(function () {
  $.ajax({
    url: 'http://delayed-data.herokuapp.com/prices.json?callback=?',
    format: 'jsonp',
    success: function(prices) {
      this.$('[data-model-cid] .dynamic-price').each(function() {
        updatePrice($(this), prices[_.random(prices.length)]);
      });
    }
  });
});

function updatePrice($el, newPrice) {
  setTimeout(function() {
    if (newPrice && $el.length) {
      var oldPrice = $el.parent().find('.original-price').text();
      console.log(oldPrice);
      if (!oldPrice.match(/(from|varies)/i)) {
        oldPrice = cleanPrice(oldPrice);
        newPrice = cleanPrice(newPrice);
        if (oldPrice.length === 6 && newPrice.length === 5) {
          newPrice = '1' + newPrice;
        }
        if (oldPrice.length === 5 && newPrice.length === 4) {
          newPrice = '1' + newPrice;
        }
        if (newPrice.length > oldPrice.length) {
          newPrice = newPrice.replace(/^\d/, '');
        }

        $el.html(replaceNumbers('$' + oldPrice, '$' + newPrice));

        setTimeout(function() {
          animateCards($el);
        }, 300);
      }
    }
  }, _.random(1000));
}
function cleanPrice(price) {
  price = price.replace(/^\$/, '');
  var bits = price.split('.');
  if (bits[1].length < 2) {
    bits[1] = bits[1] + '0';
  }
  price = bits.join('.');
  return price;
}

function animateCards(priceCards) {
  var oldCard = priceCards.find('.old-price');
  var newCard = priceCards.find('.new-price');

  var indexLength = oldCard.children().length;
  var index = [];

  for (var i = 0; i < indexLength; i++) {
    index.push(i);
  }

  var timer = setInterval(function() {
    var randomCard = index[Math.floor(Math.random() * index.length)];
    var randomCardPos = index.indexOf(randomCard);

    $(oldCard.children().get(randomCard)).addClass('flipped');
    $(newCard.children().get(randomCard)).addClass('flipped');

    index.splice(randomCardPos, 1);

    if (index.length < 1) {
      clearInterval(timer);
    }
  }, 300);
}

replaceNumbers = function(oldPrice, newPrice) {
  var digit, output;
  digit = function(d, isDecimal) {
    var output,
        special = d.match(/(\$|\.)/),
        className = special ? 'special' : (isDecimal ? 'decimal' : 'digit');
    output = '<span class="' + className + '"><span class="top"><span>' + d + '</span></span>';
    return output += '<span class="bottom"><span>' + d + '</span></span></span>';
  };
  output = '<div class="old-price">';
  oldPrice.split('.')[0].split('').forEach(function(d) {
    return output += digit(d, false);
  });
  output += digit('.', false);
  oldPrice.split('.')[1].split('').forEach(function(d) {
    return output += digit(d, true);
  });
  output += '</div><div class="new-price">';
  newPrice.split('.')[0].split('').forEach(function(d) {
    return output += digit(d, false);
  });
  output += digit('.', false);
  newPrice.split('.')[1].split('').forEach(function(d) {
    return output += digit(d, true);
  });
  output += '</div>';
  return output;
};
