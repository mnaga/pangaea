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
