/*global Connection, Authentication, authentication */
_.extend(Authentication.prototype, {
  url: 'user/view',
  secureUrl: true,
  syncOptions: function(method, options) {
    options.type = 'POST';
    options.data = {email: this.lastUserName};
  },

  parse: function(response) {
    parseUser(this)(response);
  },

  SESSION_DURATION: (1000 * 60 * 15),

  login: function(email, password, success) {
    this.ajax({
      url: 'user/login',
      type: 'POST',
      secure: true,
      data: {
        email: email,
        password: password
      },
      success: parseUser(this, email, success)
    });
  },
  logout: function(success) {
    var self = this;
    self.ajax({
      url: 'user/logout',
      type: 'POST',
      secure: true,
      success: function() {
        self.clear({silent: true});
        self.sessionActivity(false);

        if (success) {
          success();
        }
      }
    });
  },

  isPopulated: function() {
    // we can't fetch if we don't know the stored email address
    return (Phoenix.Model.prototype.isPopulated.call(this) || !this.lastUserName);
  },

  verify: function(success, options) {
    var self = this;

    // Short circuit if we already know the state locally
    if (this.isAuthed() !== undefined) {
      return success(this);
    }

    // If we don't have a stored email address we can not call the API
    // to determine if they user is authenticated or not. For most circumstances
    // we should have this value so for now we are assuming that the user is not
    // authenticated if we do not have a stored user name.
    if (!this.lastUserName) {
      self.sessionActivity(false);
      return success(this);
    }
    self.load(success, success, options);
  }
});

authentication.bind(Connection.SESSION_EXPIRED, function() {
  // Prevent stacked signin, i.e. signin/signin/foo. This shouldn't happen due to sessionId tracking
  // but playing it safe here
  var fragment = Backbone.history.getFragment();
  if (!/^signin\//.test(fragment)) {
    Backbone.history.navigate('signin/' + fragment, {trigger: true, replace: true});
  }

  // Blow away http caches for anything that can contain user-specific requests. For ASDA
  // services this is everything....
  // This operation will leave caches like the resource cache intact.
  Connection.invalidate('', {});
  Connection.invalidate('', {secure: true});
});

function parseUser(self, email, success) {
  return function(data) {
    delete data.statusCode;
    delete data.statusMessage;
    delete data.errors;

    self.clear({silent: true});
    self.set(data);

    self.sessionActivity(true);
    if (email) {
      self.setLastUserName(email);
    }

    if (success) {
      success(self);
    }
  };
}
