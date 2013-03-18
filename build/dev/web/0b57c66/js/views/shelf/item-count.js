Phoenix.Views.ShelfItemCount = Phoenix.View.extend({
  name: 'shelf/item-count',

  setItemCount: function(count, total) {
    this.visible = total || Number(total) !== 0;
    this.count = count;
    this.total = total;
    this.render();
  }
});
