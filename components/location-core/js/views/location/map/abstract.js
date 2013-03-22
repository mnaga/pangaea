Phoenix.Views.AbstractMap = Phoenix.View.extend({
  name: 'location/map',

  pins: [],

  dispose: function() {
    this.map && this.map.dispose && this.map.dispose();
    this.disposed = true;
  },

  _zoomControlTemplate: '<div class="map-zoom-control"><a class="in">+</a><a class="out">−</a></div>'
});
