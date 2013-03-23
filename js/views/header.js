View.extend({
  name: 'header',
  el: function() {
    return $('body > .header')[0];
  },
  events: {
    "click .header-action[data-action='cart']": 'openCart',
    'rendered': 'postRender'
  },
  initialize: function() {
    this.searchInput = new Phoenix.Views['search-input'];
    this.cartMini = new Phoenix.Views['cart-mini'];
  },
  postRender:function() {
    if (Phoenix.isDesktop) {
      this.$el.find(".header-action[data-action='cart']").delayedHover({mouseoutDelay:500});

      this.$el.find(".header-action[data-action='cart']")
        .on("delayed_hover:enter",
          function() {
            this.cartMini.trigger("show")
          }.bind(this));
    }
  },
  toggleSearch: function() {
    Phoenix.trigger('toggle:search');
  },
  openCart:function() {
    this.cartMini.trigger("toggle")
  }
});
