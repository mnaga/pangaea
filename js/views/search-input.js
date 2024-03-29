View.extend({
  name: 'search-input',
  tagName: 'form',
  events: {
    'submit': 'submit'
  },
  initialize: function() {
    Phoenix.on('toggle:search', function() {
      $('.search-input').toggleClass('active');
      $('.header').toggleClass('expanded');
    });
  },
  submit: function(event) {
    event && event.preventDefault();
    var query = this.$('input[type="search"]').val();
    Backbone.history.navigate(query, {trigger: true});
    this.trigger('change:search', query);
  },
  setSearchTerm: function(term) {
    this.$('input[type="search"]').val(term);
  }
});