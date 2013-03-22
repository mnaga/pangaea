var INFINITE_SCROLL_LISTENER_INTERVAL = 250,
    //height in pixels before indicator is visible where pagination will be triggered 
    INFINITE_SCROLL_THRESHOLD_PADDING = 3500; //roughly the height 30 items on one shelf + header

Phoenix.Views.Paginator = Phoenix.View.extend({
  name: 'paginator',
  nonBlockingLoad: true,
  pagingPadding: INFINITE_SCROLL_THRESHOLD_PADDING,

  events: {
    collection: {
      'load:start': function() {
        this.setState('loading');
      },
      'load:end': 'updateState'
    },
    rendered: '_startInfiniteScroll',
    destroyed: '_cleanupInfiniteScroll'
  },
  show: function() {
    if (!this.noMas) {
      $(this.el).show();
    }
    this.forceHide = false;
  },
  hide: function() {
    $(this.el).hide();
    this.forceHide = true;
  },

  setState: function(state) {
    this.loading = state === 'loading';
    $(this.el).toggleClass('loading', this.loading);

    if (state === 'no-more') {
      $(this.el).hide();
      this.noMas = true;
    } else if (!this.forceHide) {
      $(this.el).show();
    }
  },
  isVisible: function() {
    return this.el && !!this.el.offsetHeight;
  },
  updateState: function() {
    if (this.collection.hasMore && this.collection.hasMore()) {
      this.setState('more');
    } else {
      this.setState('no-more');
    }
  },

  setCollection: function(collection) {
    this.constructor.__super__.setCollection.call(this, collection, {fetch: false});

    // If we already have data display as such. Otherwise assume
    // that we are or will be loading soon. This prevents
    // race conditions with the load:start event
    if (collection.isPopulated()) {
      this.updateState();
    } else {
      this.setState('loading');
      $(this.el).addClass('loading');
    }
  },

  //no render operations in paginator for collections
  renderCollection: Phoenix.View.prototype.render,
  appendItem: function(){},
  html: function(html) {
    $(this.el).html(html);
  },

  _startInfiniteScroll: function() {
    if (!this._infiniteScrollHandler) {
      this._infiniteScrollHandler = _.debounce(_.bind(function() {
        try {
          // Handle possible race condition between debounce and destroy
          if (!this.el) {
            return;
          }

          var contentLength = $(this.el).offset().top,
              bottomOfScreen = window.scrollY + window.innerHeight;

          if (this.isVisible() && contentLength < (bottomOfScreen + this.pagingPadding)) {
            this.paginate();
          }
        } catch (err) {
          Phoenix.trackCatch('paginator.infScroll', err);
        }
      }, this), INFINITE_SCROLL_LISTENER_INTERVAL);
      $(document).bind('scroll', this._infiniteScrollHandler);
    }
  },

  _cleanupInfiniteScroll: function() {
    if (this._infiniteScrollHandler) {
      $(document).unbind('scroll', this._infiniteScrollHandler);
    }
  },

  paginate: function() {
    if (!this.loading && this.collection.hasMore()) {
      //view using paginator should listen to this event
      //then trigger load on collection which will trigger
      //load:start -> updateState
      this.trigger('paginate');
    }
  }
});
