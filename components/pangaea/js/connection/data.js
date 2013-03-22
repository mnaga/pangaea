/*global Connection, Util */
Connection.on('start', function(event) {
  var options = event.options;

  options.data = Connection.serialize(options.data);

  if (options.extended) {
    options.url = Util.appendParams(options.url, 'responsegroup=Extended');
  }
});

Connection.serialize = function(value) {
  if (_.isArray(value)) {
    // Per Arun:
    // There is no need to escape the values here as the server only looks for arrays on specific
    // fields that will not have , values in them (mostly quanitities and internal id values)
    value = _.map(value, Connection.serialize).join(',');
  } else if (_.isObject(value)) {
    value = _.clone(value);
    _.each(value, function(child, key) {
      value[key] = Connection.serialize(child);
    });
  }

  return value;
};
