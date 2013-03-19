/*global Connection */
var Collection = Phoenix.Collection = Thorax.Collection.extend({
  sync: Connection.sync,
  ajax: Connection.ajax,
  parseModels: function(models, options) {
    options = _.defaults(options || {}, {
      parse: true
    });
    return _.map(models, function(model) {
      return this._prepareModel(model, options);
    }, this);
  }
});
