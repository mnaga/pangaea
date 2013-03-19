/*global LocalCache */
var Authentication = Phoenix.Model.extend({
  SESSION_DURATION: (1000 * 60 * 30),
  sessionId: 1,


  initialize: function() {
    this.lastUserName = LocalCache.get('lastUserName');
    this.sessionActivity();
  },
  setLastUserName: function(userName) {
    this.lastUserName = userName;
    LocalCache.store('lastUserName', userName);
  },

  /*
   * Returns true if authed, false if not authed, undefined if unknown
   */
  isAuthed: function() {
    var loggedIn = this.get('loggedIn');
    if (loggedIn !== undefined) {
      var curTime = Date.now();
      if ((curTime - this.lastAccessTime) < this.SESSION_DURATION) {
        return loggedIn;
      }
    }
  },

  sessionExpired: function(sessionId, abandon) {
    // Prevent multiple auth errors from concurrent requests
    if (sessionId !== this.sessionId) {
      return;
    }
    this.sessionId++;

    if (!abandon) {
      this.trigger('session-expired');
    }

    this.sessionActivity(false);
  },
  sessionActivity: function(loggedIn) {
    if (loggedIn !== undefined) {
      this.set('loggedIn', loggedIn);
      this.trigger('session-activity');
    }

    this.lastAccessTime = Date.now();
  }
});

// Singleton authentication object
var authentication = exports.authentication = new Authentication();
