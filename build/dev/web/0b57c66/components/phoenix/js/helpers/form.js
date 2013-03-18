/*global escapeExpression, i18n */

Handlebars.registerHelper('form', function(options) {
  var className = (options.hash && escapeExpression(options.hash['class'])) || '';
  return '<form action="#" class="' + className + '">'
            + options.fn(this)
            + '<input class="hidden-submit" type="submit" value="' + i18n('Submit') + '">'
          + '</form>';
});

Handlebars.registerHelper('form-section', function(options) {
  var className = (options.hash && escapeExpression(options.hash['class'])) || '';
  return '<div class="form-section ' + className + '">'
            + options.fn(this)
          + '</div>';
});
