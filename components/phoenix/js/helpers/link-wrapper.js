Handlebars.registerHelper('link-wrapper', function(options) {
  if (!options.hash) {
    return options.fn(this);
  }
  var altTagName = options.hash.altTagName,
      className = options.hash.className || '';

  if (className) {
    className = ' class="' + className + '"';
  }

  if (options.hash.isLink) {
    return '<a href="' + Handlebars.helpers.url(options.hash.url) + '"'
        + className + '>'
        + options.fn(this)
        + '</a>';
  } else if (altTagName) {
    return '<' + altTagName
        + className + '>'
        + options.fn(this)
        + '</' + altTagName + '>';
  } else {
    return options.fn(this);
  }
});
