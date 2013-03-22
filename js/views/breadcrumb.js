View.extend({
  name: 'breadcrumb',
  tagName: 'nav',
  events: {
    "click a.departments-nav": 'toggleNav',
    "rendered":'postRender'
  },
  initialize: function() {
    this.nav = new Phoenix.Views['departments-global'];
  },
  postRender:function() {
    this.$el.find("a.departments-nav").delayedHover({mouseoutDelay:500});
    //Not sure why setting the event in the backbone hash doesn't work...
    this.$el.find("a.departments-nav").on("delayed_hover:enter", this.toggleNav.bind(this))
  },
  setTerm: function(term) {
    this.searchTerm = term;
    this.render();
  },
  toggleNav:function() {
    this.nav.trigger("toggle")
  }

});