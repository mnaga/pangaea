/*global Connection, authentication */
Connection.on('start', function(event) {
  event.sessionId = authentication.sessionId;

  if (event.options.authed && authentication.isAuthed() === false) {
    // Short circuit the connection attempt if we know we are not authenticated
    event.status = Connection.SESSION_EXPIRED;
  }
});

Connection.on('data', function(event) {
  if (event.options.authed && event.status === Connection.SUCCESS) {
    authentication.sessionActivity(true);
  }
});

Connection.on('end', function(event) {
  if (event.status === Connection.SESSION_EXPIRED && authentication.isAuthed() !== false) {
    // Notify the auth object of the change if we think that we are authed or do not know
    // Truthy value of ignoreErrors will prevent from emitting `session-expired` event
    authentication.sessionExpired(event.sessionId, event.options.ignoreErrors);
  }
});
