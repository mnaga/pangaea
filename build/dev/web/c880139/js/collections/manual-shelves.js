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
