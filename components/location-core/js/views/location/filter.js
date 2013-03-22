Phoenix.Views.LocationFilter = Phoenix.CollectionView.extend({
  name: 'location/filter',
  events: {
    'click li': function(event) {
      event.preventDefault();

      var target = $(event.currentTarget);
      target.toggleClass("selected");
    },

    'click button.apply': function(event) {
      event.preventDefault();

      this.applyFilters();
      this.hide();
    },

    'click button.clear': function(event) {
      event.preventDefault();

      this.clearFilters();
      // only when the user clicks the clear button should we trigger this
      // which re-renders the collection.
      this.trigger('apply', false);
    }
  },

  isOpen: true,
  isDisabled: false,
  hasApplied: false,

  renderCollection: function() {
    Phoenix.CollectionView.prototype.renderCollection.call(this);

    var slugs = this.$('li').each(function(element) {
      var slug = this.getAttribute('data-slug');
      if (selectedSlugs.indexOf(slug) >= 0) {
        $(this).addClass('selected');
      }
    });
  },

  getSelected: function() {
    return this.$('li.selected').map(function() {
      return this.getAttribute('data-slug');
    });
  },

  clearFilters: function() {
    this.$('li.selected').removeClass('selected');
    $('.breadcrumbs .location-filter-button').removeClass('filtered');
    this.hasApplied = false;
    selectedSlugs = [];
    // location/base also calls this function from within it's results:empty
    // and by triggering the apply, the location/base will basically re-render
    // the collection and kill our error message.
  },

  applyFilters: function() {
    var slugs = selectedSlugs = this.getSelected();

    this.hasApplied = true;
    this.trigger('apply', slugs);
    $('.breadcrumbs .location-filter-button').addClass('filtered');
  },

  toggle: function() {
    this.isOpen? this.hide() : this.show();
  },

  show: function() {
    if (this.isDisabled || this.isOpen) {
      return;
    }
    this.isOpen = true;
    $(this.el).show();
    this.trigger('show');
  },

  hide: function(options) {
    if (!this.isOpen) {
      return;
    }

    this.isOpen = false;
    $(this.el).hide();
    this.trigger('hide');
  },

  disable: function() {
    this.isDisabled = true;
  },

  enable: function() {
    this.isDisabled = false;
  }

});

