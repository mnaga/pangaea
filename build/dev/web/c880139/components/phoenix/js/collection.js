/*global Connection */
var Collection = Phoenix.Collection = Thorax.Collection.extend({
  sync: Connection.sync,
  ajax: Connection.ajax
});
