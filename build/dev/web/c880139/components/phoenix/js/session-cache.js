var SessionCache = (function() {
  var sessionCacheData = {};

  // When session storage is not available or disabled, such as in the case
  // of iOS private browsing mode, create a "best possible" session storage
  // standin that stores data in javascript space.
  //
  // See http://m.cg/post/13095478393/detect-private-browsing-mode-in-mobile-safari-on-ios5
  try {
    sessionStorage.setItem('available-test', '1');
    sessionStorage.removeItem('available-test');

    // Return an object for stubability
    return {
      getItem: function(name) {
        return sessionStorage.getItem(name);;
      },
      setItem: function(name, value) {
        sessionStorage.setItem(name, value);
      },
      removeItem: function(name) {
        sessionStorage.removeItem(name);
      }
    };
  } catch (err) {
    return {
      getItem: function(name) {
        return sessionCacheData[name];
      },
      setItem: function(name, value) {
        sessionCacheData[name] = value;
      },
      removeItem: function(name) {
        delete sessionCacheData[name];
      }
    };
  }
})();
