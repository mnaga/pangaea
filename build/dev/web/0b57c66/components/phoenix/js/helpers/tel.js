Handlebars.registerHelper('tel', function(displayNumber, options) {
  var rtn = '<a href="tel:' + displayNumber.replace(/[^\d]/g, '') + '">';
  if (options && options.fn) {
    rtn += options.fn.call(this);
  } else {
    rtn += displayNumber;
  }
  rtn += '</a>';
  return new Handlebars.SafeString(rtn);
});
