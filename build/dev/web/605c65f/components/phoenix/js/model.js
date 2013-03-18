/*global Connection */
var Model = exports.Model = Thorax.Model.extend({
  sync: Connection.sync,
  ajax: Connection.ajax,

  initialize: function(attributes, options) {
    Thorax.Model.prototype.initialize.call(this, attributes, options);

    this.bind('change', _.bind(function() {
      this.needsUpdate = true;
    }, this));
  },

  shortCircuitUpdate: function() {
    return (!this.needsUpdate && (!this.changed || _.isEmpty(this.changed)));
  }
});
