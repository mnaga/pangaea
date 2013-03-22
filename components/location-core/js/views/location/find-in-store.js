/*global LocationSearchBar */
Phoenix.Views.FindInStore = Phoenix.CollectionView.extend({
  name: 'location/find-in-store',
  nonBlockingLoad: true,

  crumbs: {
    name: 'Find In Store',
    data: {type: 'subItemPage'}
  },
  initialize: function() {
    this.searchBar = new Phoenix.locationCore.LocationSearchBar({
      parent: this,
      baseUrl: 'find-in-store/' + this.itemId,
      queryLabel: this.queryLabel,
      hideControls: true
    });

    // Store the item for reuse by future searches
    this.model = this.item;

    var info = this.item && this.item.attributes.generalProductInformationModule;
    if (info) {
      this.item = {
        name: info.name,
        uPC: info.upc,
        productImageUrl: info.productImageUrl
      };
    } else {
      this.item = undefined;
    }
  },
  context: function() {
    var item = this.collection.item || this.item;
    return _.extend({}, this.collection, {
      queryLabel: this.queryLabel || Phoenix.View.i18n('your location'),
      upc: item.uPC && this.formatUPC(item.uPC),
      name: item.name,
      itemUrl: 'ip/' + this.itemId,
      thumbnail: item.productImageUrl
    });
  },

  renderEmpty: function() {
    // TODO : Should allow for some sort of empty context in thorax level
    return this.renderTemplate(this.name + '-empty.handlebars', this.collection);
  },

  //item in this case means store in store list not the product
  itemContext: function(store) {
    return _.extend({}, store.attributes, {
      stockStatusClassName: stockStatusClassNameFromStockStatus(store.attributes.stockStatus)
    });
  },
  formatUPC: function(upc) {
    return [
      upc.substring(0, 1),
      upc.substring(1, 7),
      upc.substring(7, 13)
    ].join(' ');
  }
});

//will create "limited-stock" and "out-of-stock" class names
function stockStatusClassNameFromStockStatus(status) {
  //"Limited stock " had an extra space at the end, so clean strings
  //as if they may have space on either side
  return status.replace(/(^\s|\s$)/, '').replace(/\s/g, '-').toLowerCase();
}
