View.extend({
  name: 'breadcrumb',
  tagName: 'nav',
  events: {
    "click a.departments-nav": 'toggleNav',
    "rendered":'postRender'
  },
  initialize: function() {
    this.nav = new Phoenix.Views['departments-global'];
    this.toggleNav = _.bind(this.toggleNav, this);
  },
  postRender:function() {
    this.$el.find("a.departments-nav").delayedHover({mouseoutDelay:500});
    this.$el.find("a.departments-nav").on("delayed_hover:enter", this.toggleNav)
  },
  setTerm: function(term) {
    this.searchTerm = term;
    this.render();
  },
  toggleNav:function() {
    this.nav.trigger("toggle")
  }

});