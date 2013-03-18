var PagedCollection = exports.PagedCollection = exports.Collection.extend({
  collectionField: 'item',
  countField: 'totalCount',
  pageSize: 20,
  page: 0,

  offset: function() {
    return this.pageSize * this.page;
  },

  nextPage: function(callback, error, options) {
    if (!this.hasMore()) {
      return;
    }

    ++this.page;

    this.fetch(_.defaults({
      ignoreErrors: !error,
      add: true,
      update: true,
      remove: false,
      success: callback,
      error: error
    }, options));
  },

  hasMore: function() {
    return this.totalCount > this.offset() + this.pageSize;
  },

  parse: function(response) {
    this.totalCount = parseFloat(response[this.countField]);
    return response[this.collectionField];
  }
});

/*
 * Helper method that allows collections pulling from paged server sources
 * to expose a since request API to consumers.
 *
 * Delegates to the owner's url and parse methods.
 * Optionally accepts fetchOptions hash with countField, pageSize and collectionField attributes.
 *
 * Usage:
 *   Collection.extend({
 *     // Flag that we are loadable
 *     url: function() {
 *       return 'cart/view?basketid=' + this.id;
 *     },
 *     secureUrl: true,
 *     fetch: PagedCollection.mergeFetch()
 */
exports.PagedCollection.mergeFetch = function(fetchOptions) {
  fetchOptions = fetchOptions || {};
  return function(options) {
    // Custom fetch implementation to make the paged API not
    // paged on the client... such is life.
    var self = this;

    options = options || {};

    var worker = new (PagedCollection.extend({
      countField: fetchOptions.countField || self.countField || PagedCollection.prototype.countField,
      collectionField: fetchOptions.collectionField || self.collectionField || PagedCollection.prototype.collectionField,
      pageSize: fetchOptions.pageSize || self.pageSize || 50,
      model: self.model,

      ttl: self.ttl,
      url: function() {
        return _.result(self, 'url') + this.offsetParams(true);
      },
      secureUrl: self.secureUrl,

      parse: function(data) {
        data = self.parse(data);

        return PagedCollection.prototype.parse.call(this, data);
      }
    }))();
    worker.on('error', _.bind(this.trigger, this, 'error'));

    function cleanup(callback) {
      return function() {
        self.loadEnd();
        worker.off();
        callback && callback.apply(this, arguments);
        options.complete && options.complete.call(this);
      };
    }
    var error = cleanup(options.error);

    function success() {
      if (worker.hasMore()) {
        worker.nextPage(success, error, {resetQueue: true});
      } else {
        // Pull the models out of the worker collection
        var resetOptions = {};
        worker.reset([], resetOptions);

        // And put them in our collection
        // We need to remove then add so this collection can take full ownership of the
        // models from the worker.
        self.reset(resetOptions.previousModels);

        cleanup(options.success).apply(this, arguments);
      }
    }

    self.loadStart();

    if (options.seed) {
      worker.page = 1;
      worker.reset(options.seed, {parse: true});
      success();
    } else {
      worker.fetch({
        success: success,
        error: error
      });
    }
  };
};
