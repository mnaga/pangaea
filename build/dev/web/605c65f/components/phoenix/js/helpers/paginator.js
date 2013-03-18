var INFINITE_SCROLL_LISTENER_INTERVAL = 250,
    //height in pixels before indicator is visible where pagination will be triggered
    INFINITE_SCROLL_THRESHOLD_PADDING = 3500; //roughly the height 30 items on one shelf + header

var Paginator = Thorax.HelperView.extend({
  name: 'paginator',
  nonBlockingLoad: true,

  events: {
    collection: {
      'load:start': 'handler'
    },
    ready: '_startInfiniteScroll',
    destroyed: '_cleanupInfiniteScroll'
  },

  initialize: function() {
    Thorax.HelperView.prototype.initialize.apply(this, arguments);

    this.handler = Thorax.loadHandler(
        function() {
          this.$el.show();
        },
        function() {
          if (!this._collection.hasMore || !this._collection.hasMore()) {
            this.$el.hide();
          }
        },
        this);
  },

  _startInfiniteScroll: function() {
    if (!this._infiniteScrollHandler) {
      this._infiniteScrollHandler = _.debounce(_.bind(function() {
        if (this.isVisible() && $(this.el).offset().top < (window.scrollY + window.innerHeight + INFINITE_SCROLL_THRESHOLD_PADDING)) {
          this.paginate();
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

  isVisible: function() {
    return this.el && !!this.el.offsetHeight;
  },
  paginate: function() {
    if (!this.loading && this._collection.hasMore()) {
      this._collection.nextPage();
    }
  }
});

Handlebars.registerViewHelper('paginator', Paginator, function(collection, view) {
  if (view.template === Handlebars.VM.noop) {
    view.template = undefined;
  }

  // If they are running a paginator they will want to be non blocking.
  if (!view.options.blocking) {
    view.parent.nonBlockingLoad = true;
  }

  if (collection) {
    view._collection = collection;
    view.bindDataObject('collection', collection);
  }
  if (!collection || !collection.hasMore || !collection.hasMore()) {
    view.$el.hide();
  }
});
