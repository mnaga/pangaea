/*global Connection */
Connection.on('start', function(event) {
  var dataObject = event.dataObject;
  if (dataObject && dataObject.loadStart) {
    dataObject.loadStart(undefined, event.options.background);
  }
});
Connection.on('end', function(event) {
  var dataObject = event.dataObject;
  if (dataObject && dataObject.loadEnd) {
    dataObject.loadEnd();
  }
});
