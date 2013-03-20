View.extend({
  name: 'breadcrumb',
  tagName: 'nav',
  setTerm: function(term) {
    this.searchTerm = term;
    this.render();
  }
});