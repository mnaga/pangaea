Thorax.View.registerMixin('ScrollPosition', function() {
  this._onScroll = _.throttle(_.bind(function() {
    try {
      this._lastScrollY = window.scrollY;
      this._lastScrollX = window.scrollX;
      this.trigger('scroll', this._lastScrollX, this._lastScrollY);
    } catch (err) {
      Phoenix.trackCatch('onScroll', err);
    }
  }, this), 50);
  this.bind('ready', _.bind(function() {
    $(window).bind('scroll', this._onScroll);
  }, this));
  this.bind('deactivated', _.bind(function() {
    $(window).unbind('scroll', this._onScroll);
  }, this));
});
