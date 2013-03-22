View.extend({
  name: 'click-paginator',
  events: {
    'click .page-previous': function(event) {
      if (this.collection.page > 0) {
        this.setPage(this.collection.page - 1);
      }
    },
    'click .page-next': function(event) {
      if (this.collection.hasMore()) {
        this.setPage(this.collection.page + 1);
      }
    }
  },
  render: function() {
    this.setAttrs();
    return View.prototype.render.apply(this, arguments);
  },
  setPage: function(page) {
    this.collection.page = page;
    this.collection.fetch({
      add: true,
      update: true,
      remove: true
    });
    this.trigger('change:page', page);
    this.render();
  },
  setCollection: function(collection) {
    this.collection = collection;
    if (!this.collection.length) {
      this.hide();
      this.listenTo(this.collection, 'reset', function() {
        this.show();
        this.render();
      });
    } else {
      this.render();
    }
  },
  setAttrs: function() {
    if (this.collection) {
      this.totalCount = this.collection.totalCount;
      this.numOfPages = this.collection.numOfPages();
      this.showButtons = this.numOfPages > 1;
      this.page = this.collection.page + 1;
    }
  },
  hide: function() {
    this.$el.addClass('hidden');
  },
  show: function() {
    this.$el.removeClass('hidden');
  }
});
