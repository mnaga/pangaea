View.extend({
  name: 'grid-toggle',
  tagName: 'ul',
  events: {
    'click li': function(event) {
      this.activateToggle($(event.target).closest('li'));
    },
    ready: function() {
      this.activateToggle(this.$('li').first());
    }
  },
  activateToggle: function($el) {
    this.$('li').removeClass('active');
    $el.addClass('active');
    this.trigger('change:toggle', $el.attr('data-toggle-value'));
  }
});