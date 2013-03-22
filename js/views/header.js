View.extend({
  name: 'header',
  el: function() {
    return $('body > .header')[0];
  },
  events: {
    "click .header-action[data-action='cart']": 'openCart'
  },
  initialize: function() {
    this.searchInput = new Phoenix.Views['search-input'];
    this.cartMini = new Phoenix.Views['cart-mini'];
  },
  toggleSearch: function() {
    Phoenix.trigger('toggle:search');
  },
  openCart:function() {
    this.cartMini.trigger("toggle")
  }
});
