View.extend({
  name: 'header',
  el: function() {
    return $('body > .header')[0];
  },
  initialize: function() {
    this.searchInput = new Phoenix.Views['search-input'];
  },
  toggleSearch: function() {
    Phoenix.trigger('toggle:search');
  }
});
