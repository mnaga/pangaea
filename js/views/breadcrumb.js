View.extend({
  name: 'breadcrumb',
  tagName: 'nav',
  events: {
    "click a.departments-nav": 'toggleNav',
    "mouseover a.departments-nav": 'toggleNav'
  },
  initialize: function() {
    this.nav = new Phoenix.Views['departments-global'];
  },
  setTerm: function(term) {
    this.searchTerm = term;
    this.render();
  },
  toggleNav:function() {
    this.nav.trigger("toggle")
  }

});