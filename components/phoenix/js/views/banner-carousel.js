/*global PagedCarousel */

// Sets sensible defaults for a carousel of banners. Triggers 'loaded' event
// when all images are fully loaded, so it plays well with ViewLoader class.

var BannerCarousel = exports.BannerCarousel = PagedCarousel.extend({
  oneUp: true,
  autoAdvance: 10,
  itemTemplate: 'carousel-banner',

  triggerLoaded: function() {
    var self = this,
        images = self.$('img').get(),
        toLoad = images.length;

    function done() {
      self.trigger('loaded');
      self.sizeCarousel();
    }

    if (toLoad === 0) {
      done();
      return;
    }

    function loaded() {
      toLoad--;
      if (toLoad <= 0) {
        done();
      }
    }

    _.each(images, function(image) {
      Phoenix.Connection.loadImage(image, '', loaded, loaded);
    });
  }
});

BannerCarousel.on({
  'rendered:collection': 'triggerLoaded'
});
