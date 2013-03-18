/*global SafeString, View, i18n */
Handlebars.registerHelper('star-rating', function(rating) {
  rating = parseFloat(rating);
  if (isNaN(rating) || rating < 0) {
    return;
  }
  var rounded = Math.round(rating * 10),
      tenths = rounded % 10;
  rounded = rounded / 10;

  var stars = [1, 2, 3, 4, 5].map(function(index) {
    return '<span class="star' + (index <= rounded ? ' rated' : (index === Math.floor(rounded + 1) && tenths) ? ' partial partial' + tenths : '') + '"></span>';
  }).join('');
  return new SafeString('<div class="stars">'
      + stars
      + '<span class="rating">' + i18n.call({rating: rounded}, '{{rating}} star rating', {'expand-tokens': true}) + '</span>'
    + '</div>');
});
