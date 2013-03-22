View.extend({
  name: 'grid-toggle',
  tagName: 'ul',
  events: {
    'click li': function(event) {
      event.preventDefault();
      var $el = $(event.target).closest('li');
      this.activateToggle($el);
      sessionStorage.setItem('grid-toggle', $el.attr('data-toggle-value'));
    },
    ready: function() {
      var key = sessionStorage.getItem('grid-toggle'),
          $el = key && this.$('li[data-toggle-value="' + key + '"]');
      this.activateToggle($el || this.$('li').first());
    }
  },
  activateToggle: function($el) {
    this.$('li').removeClass('active');
    $el.addClass('active');
    this.trigger('change:toggle', $el.attr('data-toggle-value'));
  }
});