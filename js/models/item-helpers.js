function largeThumbnail(attr) {
  return (Phoenix.isDense && attr.itemImage215) || attr.itemImage150 || attr.imageThumbnailUrl || attr.thumbnail;
}
function smallThumbnail(attr) {
  return (Phoenix.isDense && attr.itemImage150) || attr.imageThumbnailUrl || attr.thumbnail;
}

function outOfStock(variant, attributes) {
  var info = attributes.generalProductInformationModule,
      availability = attributes.itemAvailability || (info && info.itemAvailability);

  // Unified data models
  if ((variant && 'outOfStock' in variant) || 'outOfStock' in attributes) {
    return variant ? variant.outOfStock : attributes.outOfStock;
  //for shelf
  } else if (!info && availability) {
    //special case: item may have flag of "Not Available at this time" but we want to show as in stock on a shelf
    if (availability.availability === 'Not Available at this time') {
      return false;
    //special case: items not sold by walmart.com should not be listed as out of stock
    } else if (parseInt(attributes.pcpSellerId, 10) !== 0) {
      return false;
    } else {
      return outOfStockValues.indexOf(availability.availability) !== -1;
    }

  //for main item page
  } else {
    info = info || {};

    var inStore = Phoenix.Data.boolean(info.availableInStore),
        online = Phoenix.Data.boolean(variant ? variant.addableToCart : info.availableOnline);
    return !inStore && !online;
  }
}

function itemUrl(url) {
  return url && url.replace(/https?:\/\/.*?\/(.*)/, '$1');
}

function getFlags(attr, variant, shelfType) {
  //shelfType will be "rollbacks", "search" or null
  var response = [];
  flagsOrder.forEach(function(type) {
    var flags = Flags[type],
        item_flags;
    if (flags.getValue) {
      item_flags = flags.getValue(attr, variant);
    } else {
      var variantFlags = variant && variant['variant' + type.charAt(0).toUpperCase() + type.slice(1)];
      item_flags = variantFlags && variantFlags.length ? variantFlags : attr[type];
    }
    if (item_flags) {
      for (var i = 0; i < item_flags.length; ++i) {
        if (shouldDisplayFlag(type, shelfType, item_flags[i], flags, attr, variant)) {
          response.push({name: item_flags[i], type: (flags._class || '') + ' ' + (flags[item_flags[i]] || '')});
        }
      }
    }
  });
  return response;
}

function isPickupTodayOnly(generalProductInformationModule) {
  // NOTE generalProductInformationModule has a putElgible flag, but
  // we are not sure if it is complete.
  //
  // A Pickup Today (PUT) item at store would not be available online and would
  // only be available in store. Checking the availability display is probably
  // not necessary and is added just for good measure.
  var info = generalProductInformationModule || {},
      inStore = Phoenix.Data.boolean(info.availableInStore),
      online = Phoenix.Data.boolean(info.availableOnline),
      onlyInStore = info.availabilityDisplay === 'Only in Stores';

  return inStore && !online && onlyInStore;
}

function isGiftCard(generalProductInformationModule) {
  var info = generalProductInformationModule || {},
      str = info.itemClass,
      starts = 'SHOPPING_CARD';

  if (!info.itemClass) { return false; }
  return str.length >= starts.length && str.slice(0, starts.length) === starts;
}

function isElectronicGiftCard(generalProductInformationModule) {
  // fixed price gift cards have itemClass equal to SHOPPING_CARD_B2B
  return (generalProductInformationModule || {}).itemClass === 'SHOPPING_CARD';
}

function getGiftCardPriceRange(attributes) {
  attributes = attributes || {};
  var sellerModule = _.first(attributes.sellersModule || []) || {},
      sellerItem = sellerModule.sellerItem || {};

  return [parseInt(sellerItem.minPrice, 10), parseInt(sellerItem.maxPrice, 10)];
}

function isVariableGiftCard(attributes) {
  attributes = attributes || {};
  var info = attributes.generalProductInformationModule || {};

  if (isGiftCard(info)) {
    var range = getGiftCardPriceRange(attributes);
    return range[0] !== range[1];
  }
  return false;
}


//used by outOfStock, "Out of stock online", "In Stock" and "Preorder Now" will not appear as being out of stock
var outOfStockValues = [
  'Out of Stock',
  'Out of stock online',
  'Not Available at this time',
  'Temporarily Out of Stock'
];

//only display these flags on a shelf
var shelfFlags = [
  'Out of Stock',
  'Temporarily Out of Stock',
  'Not Available at this time',
  'Free Shipping to Home',
  '97 Cent Shipping',
  'No Cost Shipping'
];

//shelfType will be "rollbacks", "search" or null
//flagType will be "priceFlags", "merchFlags", "shipFlags" or "availabilityFlags"
function shouldDisplayFlag(flagType, shelfType, flag, flags, attr, variant) {
  if (!shelfType) {
    return true;
  } else {
    //special case: If the item-level out of stock state is not triggered then
    // filter out any out of stock flags.
    if (shelfType && flags[flag] === 'out-of-stock' && !outOfStock(variant, attr)) {
      return false;
    //special case: do not show 'Not Available at this time' on shelf if walmart.com
    //is not the seller (pcpSellerId == 0)
    } else if (shelfType && flag === 'Not Available at this time' && parseInt(attr.pcpSellerId, 10) !== 0) {
      return false;
    } else {
      return shelfFlags.indexOf(flag) !== -1;
    }
  }
}

var flagsOrder = ['availabilityFlags', 'shipFlags', 'priceFlags', 'merchFlags'];

var Flags = {
  priceFlags: {
    _class: 'price-flags',

    "Rollback": "rollback"
    /*  Known values, uncomment items if custom styles are needed
    "Dare to Compare": "dare-to-compare",
    "Clearance": "clearance",
    "Below List Prices": "below-list-prices",
    "Strikeout": "strikeout",
    "97 Cent Shipping": "shipping-97-cent",
    "Same Day Delivery": "same-day-delivery",
    "Reduced Price": "reduced-price",
    */
  },
  merchFlags: {
    _class: 'merch-flags'
    /*  Known values, uncomment items if custom styles are needed
    "Special Buy": "special-buy",
    "New": "new",
    "No Cost Shipping": "no-cost-shipping",
    "As Advertised": "as-advertised",
    "As Seen On TV": "as-seen-on-tv",
    "Online Only": "online-only",
    "Rebate Available": "rebate-available",
    "Wal-Mart Exclusive": "wal-mart-exclusive",
    "Certified": "certified",
    "Also In Many Stores": "also-in-many-stores",
    "Coming Soon": "coming-soon",
    "Save On Shipping": "save-on-shipping",
    "En Espanol": "en-espanol",
    "Award-Winning": "award-winning",
    "Personalize It": "personalize-it",
    */
  },
  shipFlags: {
    _class: 'shipping-flags'
    /*  Known values, uncomment items if custom styles are needed
    "97 Cent Shipping": "shipping-97-cent",
    "Free Shipping to Home": "free-shipping",
    "No Cost Shipping": "free-shipping"
    */
  },
  availabilityFlags: {
    getValue: function(attr, variant) {
      //attr.availabilityFlags is added by Phoenix in local ads
      var itemAvailability = (variant ? variant.variantItemAvailability : attr.itemAvailability) || {},
          value = itemAvailability.availability || attr.availabilityDisplay || attr.availabilityFlags;

      // Exception: Can this be a Pickup Today (PUT) in store only item?
      if (isPickupTodayOnly(attr)) {
        value = 'Only available from full site';
      }

      if (value) {
        return [value];
      }
    },

    "In Stock": "in-stock",
    "Not Available at this time": "out-of-stock",
    "Temporarily Out of Stock": "out-of-stock",
    "Out of stock online": "out-of-stock",
    "Out of Stock": "out-of-stock",
    "Preorder Now": "preorder-now",
    "Only in Stores": "only-in-stores", //this is a flag created by Phoenix for local ads
    "Only available from full site": "only-in-stores" //this is a flag created by Phoenix for PUT
  }
};

function normalizePricingInformation(attr, pricingInfo) {
  if (pricingInfo && pricingInfo.price) {
    var matches = pricingInfo.price.match(/.([\d,\.]+) - .([\d,\.]+)/);
    if (matches) {
      // mobile displays price range as "From {lower price}"
      var context = {
        from: Phoenix.View.price(matches[1]),
        to: Phoenix.View.price(matches[2]),
      };
      attr.price = Phoenix.View.i18n.call(context, "{{from}} - {{to}}", {'expand-tokens': true});
    }
  }
}
