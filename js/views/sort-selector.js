var SortSelectorView = Phoenix.View.extend({
  name: 'sort-selector',
  tagName: 'ul',
  events: {
    'click li[data-sort-value]': function(event) {
      event.preventDefault();
      this.activateSort($(event.target).closest('li'));
    }
  },
  activateSort: function($el) {
    if ($el.hasClass('active')) {
      $el.removeClass('active');
      this.trigger('change:sort', 'RELEVANCE');
    } else {
      this.$('li[data-sort-value]').removeClass('active');
      $el.addClass('active');
      this.trigger('change:sort', $el.attr('data-sort-value'));
    }
  }
});
