/*global View, SafeString */

function priceHelper (price) {
  var symbol = Phoenix.config.currencySymbol,
      prices;
  if (price || price === 0) {
    if (price.toFixed) {
      prices = [symbol + price.toFixed(2)];
    } else {
      // handle gift card prices of '$5.00 - $200.00'
      prices = price.split('-').map(function(price) {
        var trimmed = price.trim();
        if (price.indexOf(symbol) < 0 && !_.isNaN(parseFloat(trimmed))) {
          return symbol + trimmed;
        } else {
          return price;
        }
      });
    }
    prices = _.map(prices, function(price) {
      var price = price.toString();
      if (prices.length > 1) {
        price = price.trim();
      }
      return price.replace(/\.(\d+)/, '.<span class="decimal">$1</span>');
    });

    if (prices.length > 1) {
      return new SafeString(prices.join(' - '));
    }
    return new SafeString(prices[0]);
  }
  return '';
}

Phoenix.View.price = priceHelper;

Handlebars.registerHelper('price', priceHelper);
