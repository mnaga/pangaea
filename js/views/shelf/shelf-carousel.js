/*global PagedCarousel */

exports.Views.ShelfCarousel = Carousel.extend({
  name: 'shelf/shelf-carousel',
  nonBlockingLoad: true,
  ignoreFetchError: true,

  itemsPerPage: 2,
  minItemWidth: 120,    // Rough size of the image + price badge.

  className: 'shelf-carousel',
  events: {
    'click .carousel-item': 'onClick'
  },

  onClick: function(event) {
    // it was an anchor, just trigger an event for notification
    var id = event.currentTarget.getAttribute('data-id'),
        model = this.collection.get(id),
        index = this.collection.indexOf(model);

    this.trigger('item:click', index, model);

    if (model.pingBack) {
      model.pingBack();
    }
    if (this.location) {
      // tracking data is {page name}:{1-based merchandising "thing" index}:{1-based position of carousel item clicked} - MOWEB-555
      var itemData = this.location + ':' + (index + 1);
      Phoenix.Track.setMerchandisingData(model.id, itemData);
      Phoenix.Track.trackLink(itemData);
    }
  },

  itemContext: function(model) {
    var attr = model.attributes;
    return _.defaults({
      itemImage: attr.itemImage150,
      rating: Math.max(parseFloat(attr.rating) || 0, 0)
    }, attr);
  },

  renderEmpty: function() {
    return '';
  }
});
