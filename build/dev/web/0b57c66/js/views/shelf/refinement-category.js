var RefinementCategoryView = Phoenix.View.extend({
  name: 'shelf/refinement-category',
  tagName: 'li',
  className: 'refinement-category',
  events: {
    'click .refinement-category-btn': 'toggle',
    'click .refinement-item > button': 'onItemClick',
    'click .selected-refinement-items button': 'onItemClick',
    collection: {
      'change:selected': function(model) {
        // update the selected set of items
        this.$('.selected-refinement-items').html(this.template('shelf/selected-refinement-items', this.context()));
        this.$('li[data-model-cid="' + model.cid + '"]').toggleClass('selected', model.attributes.selected);
        this.refreshState();
      }
    },
    close: function() {
      this.toggle(false);
    }
  },
  initialize: function(options) {
    if (this.parent && !this.parent.getOpened(this.model.id)) {
      this.$el.addClass('closed');
    }
    this.setCollection(options.model.items);
    this.refreshState();
  },
  context: function() {
    var rtn = Phoenix.View.prototype.context.apply(this, arguments);
    var selectedItems = [];
    if (this.model) {
      selectedItems = this.model.getSelectedItems();
    }
    return _.extend({selectedItems: selectedItems}, rtn);
  },
  refreshState: function() {
    var selectedItems = [];
    if (this.model) {
      selectedItems = this.model.getSelectedItems();
    }
    this.$el.toggleClass('has-selected', (selectedItems.length > 0));
  },
  toggle: function(open) {
    var fetching = this.model.collection.collection.isLoading();
    var hasClosed = this.$el.hasClass('closed');
    if (fetching && hasClosed) {
      var parent = this.$el.closest('.refinement-category');
      $('.collection.refinement-items', parent)
          .html(this.renderTemplate('inline-loading-indicator', {
            label: 'Loading filter options'
          }));
    }
    open = _.isBoolean(open) ? open : hasClosed;
    if (this.parent) {
      this.parent.setOpened(this.model.id, open);
    }
    this.$el.toggleClass('closed', !open);
  },
  onItemClick: function(event) {
    var btn = $(event.currentTarget);
    // only allow selection if category is expanded
    var container = btn.closest('.refinement-item'),
        cid = container.attr('data-model-cid');
    if (cid) {
      var model = this.collection.getByCid(cid);
      model.select(!model.attributes.selected);
    }
  }
});

