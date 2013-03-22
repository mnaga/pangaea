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

