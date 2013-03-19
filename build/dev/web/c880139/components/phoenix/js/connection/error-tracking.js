/*global Connection */
Connection.on('data', function(event) {
  if (!event.responseData && event.options.dataType === 'json') {
    // We want valid json if that is what we selected
    event.status = Connection.PARSER_ERROR;
  }
});

Connection.on('error', function(event) {
  var dataObject = event.dataObject,
      options = event.options,
      errorInfo = event.errorInfo,
      xhr = event.xhr,

      responseText;

  // Simplify the output for the data connection lost case
  if (xhr && !xhr.status) {
    event.connectionError = true;
    event.status = Connection.CONNECTION_ERROR;
    event.errorInfo = errorInfo = undefined;

    // For connection errors reusue the responseText section to output the network state as the browser
    // knows it.
    responseText = 'online: ' + navigator.onLine + ' connection:' + (navigator.connection || {}).type;
  } else {
    responseText = event.status === Connection.PARSER_ERROR ? (xhr && xhr.responseText) : undefined;
  }

  if (!dataObject._aborted) {
    if (event.status !== Connection.SESSION_EXPIRED) {
      exports.trackError(event.status, JSON.stringify({
        ignored: options.ignoreErrors,
        type: options.url,
        text: errorInfo,
        status: xhr && xhr.status,
        responseText: responseText
      }));
    } else {
      exports.trackError('auth-expired', options.url);
    }
  }

  // Log but otherwise silently ignore errors for calls that opt in
  if (options.ignoreErrors) {
    dataObject.trigger('error:silent', dataObject, Connection.SERVER_ERROR);
  }
});
