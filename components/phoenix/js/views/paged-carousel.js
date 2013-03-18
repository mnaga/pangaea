/*global Carousel */

// Sets sensible defaults for paged carousels. Adds page indicators and autoAdvance option
// (if true, slides the carousel every 10 seconds, or can be set to a number of seconds)

var PagedCarousel = Phoenix.Views.PagedCarousel = Carousel.extend({
  name: 'paged-carousel',
  snapTo: true,
  itemsPerPage: 1,

  setCollection: function() {
    Carousel.prototype.setCollection.apply(this, arguments);
    if (this.collection.isPopulated()) {
      this.dataLoad();
    }
  },
  dataLoad: function() {
    var itemsPerPage = this.oneUp ? 1 : this.itemsPerPage;
    this.numPages = Math.ceil(this.collection.size() / itemsPerPage);
    if (!this.numPages) {
      this.$el.hide();
    }

    if (!this.useNativeScroll) {
      var pages = this.pages = [],
          pageList = this.$('.page-list').html('');
      for (var i=0; i<this.numPages; i++) {
        pages.push({number: i});
        if (pageList.length) {
          pageList.append('<div class="page-indicator">');
        }
      }
      this.positionChanged();
    }
  },

  positionChanged: function() {
    if (!this.useNativeScroll) {
      // reset page marker
      var itemsPerPage = this.oneUp ? 1 : this.itemsPerPage,
          current = Math.floor(this.firstItem / itemsPerPage),
          last = Math.floor((this.lastItem || this.firstItem) / itemsPerPage),

          // Handle the page fill algorithm where we have a partial last page
          // We should only see last !== current for that edge case since we are in
          // itemsPerPage mode
          select = Math.max(current, last);


      $(this.$('.page-indicator').removeClass('selected').get(select)).addClass('selected');
    }
  },

  start: function() {
    var self = this;
    this.interval = setInterval(function() {
      try {
        if (self.lastItem >= self.collection.length - 1) {
          self.goto(0);
        } else {
          self.next();
        }
      } catch (err) {
        Phoenix.trackCatch('merch:animate', err);
      }
    }, _.isNumber(self.autoAdvance) ? self.autoAdvance * 1000 : 10000);
  },

  stop: function() {
    clearInterval(this.interval);
  },

  ready: function() {
    if (this.autoAdvance) {
      this.start();
    }
  }
});

PagedCarousel.on({
  'collection': {
    'reset': 'dataLoad',
    'add': 'dataLoad',
    'remove': 'dataLoad'
  },
  'position': 'positionChanged',
  'ready': 'ready',
  'destroyed': 'stop',

  'nested touchstart': 'stop',
  'nested mousedown': 'stop'
});
