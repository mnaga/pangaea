/*global Loader */

var currentTheme;

var Themes = exports.Themes = {
  preload: function(theme, callback) {
    if (!theme) {
      callback();
    } else {
      Loader.loader.loadModule('theme-' + theme, callback);
    }
  },
  useTheme: function(theme) {
    var themeName = 'theme-' + theme;

    if (currentTheme) {
      // No need to load the theme twice
      if (currentTheme.name === themeName) {
        return;
      }

      // Kill the current theme
      $('html, .flex').removeClass(currentTheme.name);

      if (currentTheme.module && currentTheme.module.resetTheme) {
        currentTheme.module.resetTheme();
      }
      currentTheme = undefined;
    }

    if (!theme) {
      return;
    }

    // Load the new theme
    this.preload(theme, function(err) {
      if (err) {
        return;
      }

      var module = exports[themeName];
      currentTheme = {name: themeName, module: module};

      $('html, .flex').addClass(themeName);
      if (module && module.applyTheme) {
        module.applyTheme();
      }
    });
  }
};

exports.bind('init-complete', function() {
  exports.layout.bind('change:view:start', function(newView, oldView) {
    Themes.useTheme(newView.theme);
  });
});
