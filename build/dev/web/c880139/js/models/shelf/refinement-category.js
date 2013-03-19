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

