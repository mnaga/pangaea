var overlayDyanmicPricing = _.once(function () {
  $.ajax({
    url: 'http://delayed-data.herokuapp.com/prices.json?callback=?',
    format: 'jsonp',
    success: function(prices) {
      this.$('[data-model-cid] .dynamic-price').each(function() {
        updatePrice($(this), prices[_.random(prices.length)]);
      });
    }
  });
});

function updatePrice($el, newPrice) {
  setTimeout(function() {
    if (newPrice && $el.length) {
      var oldPrice = $el.parent().find('.original-price').text();
      if (!oldPrice.match(/(from|varies)/i)) {
        oldPrice = cleanPrice(oldPrice);
        newPrice = cleanPrice(newPrice);
        if (oldPrice.length === 6 && newPrice.length === 5) {
          newPrice = '1' + newPrice;
        }
        if (oldPrice.length === 5 && newPrice.length === 4) {
          newPrice = '1' + newPrice;
        }
        if (newPrice.length > oldPrice.length) {
          newPrice = newPrice.replace(/^\d/, '');
        }

        $el.html(replaceNumbers('$' + oldPrice, '$' + newPrice));

        setTimeout(function() {
          animateCards($el);
        }, 300);
      }
    }
  }, _.random(20000));
}
function cleanPrice(price) {
  price = price.replace(/^\$/, '');
  var bits = price.split('.');
  if (bits[1].length < 2) {
    bits[1] = bits[1] + '0';
  }
  price = bits.join('.');
  return price;
}

function animateCards(priceCards) {
  var oldCard = priceCards.find('.old-price');
  var newCard = priceCards.find('.new-price');

  var indexLength = oldCard.children().length;
  var index = [];

  for (var i = 0; i < indexLength; i++) {
    index.push(i);
  }

  var timer = setInterval(function() {
    var randomCard = index[Math.floor(Math.random() * index.length)];
    var randomCardPos = index.indexOf(randomCard);

    $(oldCard.children().get(randomCard)).addClass('flipped');
    $(newCard.children().get(randomCard)).addClass('flipped');

    index.splice(randomCardPos, 1);

    if (index.length < 1) {
      clearInterval(timer);
    }
  }, 300);
}

replaceNumbers = function(oldPrice, newPrice) {
  var digit, output;
  digit = function(d, isDecimal) {
    var output,
        special = d.match(/(\$|\.)/),
        className = special ? 'special' : (isDecimal ? 'decimal' : 'digit');
    output = '<span class="' + className + '"><span class="top"><span>' + d + '</span></span>';
    return output += '<span class="bottom"><span>' + d + '</span></span></span>';
  };
  output = '<div class="old-price">';
  oldPrice.split('.')[0].split('').forEach(function(d) {
    return output += digit(d, false);
  });
  output += digit('.', false);
  oldPrice.split('.')[1].split('').forEach(function(d) {
    return output += digit(d, true);
  });
  output += '</div><div class="new-price">';
  newPrice.split('.')[0].split('').forEach(function(d) {
    return output += digit(d, false);
  });
  output += digit('.', false);
  newPrice.split('.')[1].split('').forEach(function(d) {
    return output += digit(d, true);
  });
  output += '</div>';
  return output;
};
