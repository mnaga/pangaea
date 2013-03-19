var LoadingIndicator = Thorax.View.extend({
  name: 'loading-indicator',
  initialize: function() {
    this._boundPosition = _.bind(this._position, this);
  },
  start: function(nonModal) {
    $('body').append(this.el);
    this._position();
    $(this.el).toggleClass('non-modal', nonModal || false);
    $(window).bind('scroll', this._boundPosition);
    $(window).bind('resize', this._boundPosition);
  },
  stop: function() {
    $(this.el).remove();
    $(window).unbind('scroll', this._boundPosition);
    $(window).unbind('resize', this._boundPosition);
  },
  _position: function() {
    var frame = this.$('.loading-frame'),
        height = window.innerHeight,
        width = window.innerWidth,
        offset = frame.offset(),
        scrollY = window.scrollY;

    // CSS hasn't yet loaded defer exection until it does
    if (!offset.height && this.el.parentNode) {
      setTimeout(_.bind(this._position, this), 100);

      return;
    }

    frame.css({
      top: (Math.floor((height - offset.height) / 2) + scrollY) + 'px',
      left: Math.floor((width - offset.width) / 2) + 'px'
    });
    $(this.el).css('min-height', height + 'px');
  }
});

exports.bind('init', function() {
  var instance;
  LoadingIndicator.get = function() {
    if (!instance) {
      instance = new LoadingIndicator();
      instance.render();
    }
    return instance;
  };

  // Top level blocking loading indicators
  exports.bind('load:start', Thorax.loadHandler(function(message, background) {
      if (exports.inlineLoading) {
        return;
      }
      $('body').addClass('loading');
      LoadingIndicator.get().start(background && background.nonModal);
    },
    function() {
      if (exports.inlineLoading) {
        exports.inlineLoading = false;
        return;
      }
      $('body').removeClass('loading');
      LoadingIndicator.get().stop();
    }));
});
