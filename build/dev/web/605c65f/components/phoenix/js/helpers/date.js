Handlebars.registerHelper('date', function(date, format) {
  return dateFormat(date, format);
});
