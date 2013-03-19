var DataMsgs = {
  'noApplyDiscountCode': 'Sorry, your discount can not be applied right now.',
  'noVerifyDiscountCodeTryAgain': 'We could not verify your discount card. Please try again.',
  'noVerifyDiscountCodeCustSvc': 'We could not verify your discount card. Please contact Customer Service.',

  'outOfStock': 'This item is currently out of stock.',
  'itemUnavailable': 'This item is currently unavailable.',
  'itemUnavailableS4L': 'An item(s) was unavailable.  It has been moved to Save For Later.'
}

var Data = exports.Data = {
  SESSION_EXPIRED: 'session_expired',
  SERVER_ERROR: 'server_error',
  UNKNOWN_ERROR: 'unknown_error',
  MAINTENANCE_ERROR: 'maintenance_error',
  _locale: {country: 'US', language: 'en'},
  _localeLookups: [],

  setLocale: function(language, country) {
    this._locale = {
      country: country && country.toLowerCase(),
      language: language && language.toLowerCase()
    };

    // generate the locale lookup values
    var _localeLookups = [];
    if (this._locale) {
      if (this._locale.language) {
        if (this._locale.country) {
          _localeLookups.push(this._locale.language + '-' + this._locale.country);
        }
        _localeLookups.push(this._locale.language);
      }
    }
    this._localeLookups = _localeLookups;
  },
  getLocale: function() {
    return this._locale;
  },
  getLocaleLookups: function() {
    return this._localeLookups;
  },

  i18n: {
    "language.en": "English",
    "language.es": "Espa&ntilde;ol",
    
    "app-download-android": "Shop smart with Walmart's free app for Android.",
    "app-download-iphone": "Create smart shopping lists with Walmart's free app for iPhone.",
    "app-download-ipad": "Create smart shopping lists with Walmart's free app for iPad.",
    
    // a hash of i18n values belong here... see docs for examples.

    // variants
    'variant.Size.S': "Small",
    'variant.Size.M': "Medium",
    'variant.Size.L': "Large",

    // Plural handling
    '{{shippingTypeName}} ({{count}} items)[0]': '{{shippingTypeName}} ({{count}} item)',
    'Saved items ({{length}} items)[1]': 'Saved items ({{length}} item)',
    'Track Items[1]': 'Track Item',
    '{{photos.length}} Photos[1]': '{{photos.length}} Photo',

    'userAlreadyExists': 'An account with that user name already exists.',

    // Cart status messages
    'cartService.quantityAdjustedItems': 'There is a problem with an item in your cart. See below for details.',
    'cartService.ineligibleItemsMoved': 'Some item(s) in your Cart cannot be purchased using Mobile Checkout.  View them in your Saved items below.',
    'cartService.unavailableItemsMoved': 'Some item(s) in your Cart are no longer eligible for purchase. View them in your Saved items below.',
    'cartService.cartItem.notAvailableForSelectedRetailer': DataMsgs.itemUnavailable,
    'cartService.cartItem.notAvailable': DataMsgs.itemUnavailable,
    'cartService.cartItem.bundleBaseItemNotavailable': DataMsgs.itemUnavailable,
    'cartService.cartItem.bundlecomponentItemsNotavailable': DataMsgs.itemUnavailable,
    'cartService.cartItem.bundleItemsOutOfStock': DataMsgs.outOfStock,
    'cartService.cartItem.preOrdersSoldOut': DataMsgs.outOfStock,
    'cartService.cartItem.ItemOutOfStock': DataMsgs.outOfStock,
    'cartService.cartItem.onlineDeliveryError': 'This item is not eligible for Ship to home.',
    'cartService.cartItem.updateQuantityMessage': 'The number of items you\'ve requested exceeds what we currently have in stock.',
    'cartService.cartItem.requestedItemUnavailable': DataMsgs.itemUnavailable,
    'cartService.cartItem.priceNotAvailable': DataMsgs.itemUnavailable,
    'cartService.cartItem.serviceInEligibleItem': 'This item cannot be purchased using Mobile Checkout, but can be purchased on <a href="http://www.walmart.com/index.gsp">www.walmart.com</a>',

    // shipping status messages
    'shippingService.shippingItem.getShippingOpionsFailed': 'An item(s) was unavailable. It has been moved to Save For Later',
    'storeService.INVALID_STORE': 'We are not able to ship to the selected store. Please select another store.',

    // Payment/order translations
    'paymentMethodService.paymentMethodResult.duplicate': 'The card you entered is already saved in your account.',
    'orderService.placeOrder.auth.DCARDREFUSED': 'We were unable to process the order with your credit card.  Please use a different credit card.',
    'orderService.placeOrder.auth.CID': 'We were unable to process your order. Please verify your credit card information and try again.',
    'orderService.placeOrder.auth.DAVSNO': 'We were unable to process your order. Please verify the billing name and address on your credit card and try again.',
    'orderService.placeOrder.auth.DINVALIDCARD': 'There was a problem with your credit card.  You may select or enter another card.',
    'orderService.placeOrder.auth.DCARDEXPIRED': 'Your credit card has expired.  Please select or enter another card.',
    'orderService.itemUnavailable': DataMsgs.itemUnavailableS4L,
    'orderService.s2sItemUnavailable': DataMsgs.itemUnavailableS4L,
    'orderService.placeOrder.auth.SC_SECURITY': 'We\'re sorry, the card you entered has been reported as lost or stolen. Please call Customer Service at 1-800-966-6546 for more information.',
    'orderService.placeOrder.auth.SC_INVALID_CARD': 'We\'re sorry, the card number you entered was not valid. Please check your number and try again.',
    'orderService.placeOrder.auth.SC_ERROR': 'We\'re sorry, we currently are unable to process payments using a Walmart Gift Card. Please use a different payment method.',
    'orderService.placeOrder.auth.SC_BALANCE_INQ_EXCEEDED': 'We\'re sorry, but you have exceeded the maximum allowable balance inquiries. Please contact Customer Service at 1-800-966-6546 for more information.',
    'orderService.placeOrder.auth.SC_HELD': 'We\'re sorry. Please contact Customer Service at 1-800-966-6546 for more information regarding activation of your Gift Card.',
    'orderService.placeOrder.auth.SC_NSF': 'No sufficient funds. Please use a different payment method.',
    'orderService.scUnavailable': 'Shopping card service unavailable. Please use a different payment method.',
    'orderService.register.SC_INVALID_ACCOUNT': 'We\'re sorry, the card number you entered was not valid. Please check your number and try again.',
    'orderService.register.SC_MAX_LIMIT': 'We\'re sorry, the maximum number of cards on the account has been reached.',
    'orderService.register.SC_ALREADY_REG': 'We\'re sorry, this card has already been added to your account.',
    
    'invalidEmail': 'Invalid Email Address',
    'invalidPasswordInReg': 'Invalid Password',
    'associate.associateStatusResponse.bvUnavailable': DataMsgs.noVerifyDiscountCodeTryAgain,
    'associate.associateStatusResponse.notAuthorized': DataMsgs.noVerifyDiscountCodeTryAgain,
    'associate.associateStatusResponse.Exception': DataMsgs.noVerifyDiscountCodeTryAgain,
    'associate.associateStatusResponse.genericError': DataMsgs.noVerifyDiscountCodeTryAgain,
    'associate.associateStatusResponse.adBlocked': DataMsgs.noVerifyDiscountCodeCustSvc,
    'associate.associateStatusResponse.adAccessMax': DataMsgs.noVerifyDiscountCodeCustSvc,
    'associate.associateStatusResponse.noAdService': DataMsgs.noVerifyDiscountCodeTryAgain,

    // Credit card type translations
    'WAL_MART_CREDIT_CARD': 'Walmart Credit Card',
    'DISCOVER': 'Discover',
    'VISA': 'VISA',
    'MASTERCARD': 'MasterCard',
    'AMEX': 'American Express'
  },

  states: {
    'AL': 'Alabama',
    'AK': 'Alaska',
    'AZ': 'Arizona',
    'AR': 'Arkansas',
    'CA': 'California',
    'CO': 'Colorado',
    'CT': 'Connecticut',
    'DE': 'Delaware',
    'DC': 'District Of Columbia',
    'FL': 'Florida',
    'GA': 'Georgia',
    'HI': 'Hawaii',
    'ID': 'Idaho',
    'IL': 'Illinois',
    'IN': 'Indiana',
    'IA': 'Iowa',
    'KS': 'Kansas',
    'KY': 'Kentucky',
    'LA': 'Louisiana',
    'ME': 'Maine',
    'MD': 'Maryland',
    'MA': 'Massachusetts',
    'MI': 'Michigan',
    'MN': 'Minnesota',
    'MS': 'Mississippi',
    'MO': 'Missouri',
    'MT': 'Montana',
    'NE': 'Nebraska',
    'NV': 'Nevada',
    'NH': 'New Hampshire',
    'NJ': 'New Jersey',
    'NM': 'New Mexico',
    'NY': 'New York',
    'NC': 'North Carolina',
    'ND': 'North Dakota',
    'OH': 'Ohio',
    'OK': 'Oklahoma',
    'OR': 'Oregon',
    'PA': 'Pennsylvania',
    'RI': 'Rhode Island',
    'SC': 'South Carolina',
    'SD': 'South Dakota',
    'TN': 'Tennessee',
    'TX': 'Texas',
    'UT': 'Utah',
    'VT': 'Vermont',
    'VA': 'Virginia',
    'WA': 'Washington',
    'WV': 'West Virginia',
    'WI': 'Wisconsin',
    'WY': 'Wyoming',
    'AA': 'Armed Forces Americas',
    'AP': 'Armed Forces Pacific',
    'AE': 'Armed Forces other',
    'AS': 'American Samoa',
    'GU': 'Guam',
    'MP': 'Northern Mariana Islands',
    'PR': 'Puerto Rico',
    'VI': 'Virgin Islands'
  },

  resolveState: function(state) {
    if (!state || state.length === 2) return state;
    var _check = state.toUpperCase();
    for (var name in this.states) {
      if (this.states[name].toUpperCase() === _check) {
        return name;
      }
    }
    return state;
  },

  float: function(value, decimalPlaces) {
    return parseFloat(value).toFixed(decimalPlaces);
  },
  boolean: function(value) {
    // Anything that is falsy or the string literal "false" is false
    return !(!value || value === "false");
  },
  latLng: function(value) {
    // Reduce precision to 3 places, approximately 111m resolution at the equator.
    // This produces cleaner urls and improves the odds of a warm cache hit for requests
    return Math.floor(parseFloat(value)*1000)/1000;
  },

  hasStatusMessage: function(obj, messageKey) {
    var msgs = (obj.attributes && obj.attributes.statusMessages) || obj.statusMessages;
    return _.any(msgs, function(msg) { return msg.key === messageKey; });
  },

  processStatusMessage: function(msgs, dataObject) {
    exports.trackError('status-msg', JSON.stringify(_.pluck(msgs, 'key')));

    for (var i=0; i<msgs.length; i++) {
      var route = Data.messageRoutes[msgs[i].key];
      if (route && route !== Backbone.history.getFragment()) {
        // before navigating bind so new view will show the error message 
        exports.layout.bind('change:view:end', showMessage);
        
        // navigate
        Backbone.history.navigate(route, true);

        // show message after new view is rendered
        function showMessage(view) {
          exports.layout.unbind('change:view:end', showMessage);
          view.trigger('error', msgs.map(function(message) {
            return {
              key: message.key,
              name: Data.fieldErrors[message.key],
              message: i18n(message.key, -1, message.description)
            }
          }));
        }
        return;
      }
    }

    dataObject.trigger('error', dataObject, msgs.map(function(message) {
      return {
        key: message.key,
        name: Data.fieldErrors[message.key],
        message: i18n(message.key, -1, message.description)
      }
    }));
  },

  translateAttributeNames: function(data){
    var translations = { 'iD': 'id' };

    (function iterate(object) {
      _.each(object, function(value, key) {
        if (typeof value === 'object') {
          iterate(value);
        } else if (translations[key]) {
          object[translations[key]] = value;
          delete object[key];
        }
      });
    })(data);

    return data;
  },

  // indicator to represent message categories.  valid states are 'success'
  messageCategories: {
    'associate.associateStatusResponse.isdOK': 'success'
  },

  cachedSingletonMixin: function(dataClass, type, expires) {
    var instance;
    var lastAccessTime = new Date().getTime();
    dataClass.get = function(noCreate) {
      if (noCreate) {
        return instance;
      }
      var curTime = new Date().getTime();
      if ((curTime - lastAccessTime) > (expires || authentication.SESSION_DURATION)) {
        dataClass.release();
      }
      if (!instance) {
        instance = new dataClass();
      }
      lastAccessTime = curTime;
      return instance;
    };
    dataClass.release = function() {
      lastAccessTime = 0;

      // Clearing here rather than clearing the instance object so any long lived
      // binds will survive and not leak.
      if (instance) {
        instance.reset && instance.reset();
        instance.clear && instance.clear();
      }
    };

    // Clear all data if an order has been made, an error occurs, or the user changes
    exports.bind('order:complete', dataClass.release);
    exports.bind('fatal-error', dataClass.release);
    authentication.bind('loggedout', dataClass.release);

    Bridge.bind('resetData', function(options) {
      if (!options.type || options.type === 'all' || options.type === type) {
        dataClass.release();
      }
    });
  },

  // all messages that require routing to another page
  // '{message key}': 'route' or hash: { route: 'route' or routeFunction(msg), replace: true/false }
  messageRoutes: {
    'orderService.placeOrder.auth.DCARDREFUSED': 'checkout/payment/card-error',
    'orderService.placeOrder.auth.DAVSNO': 'checkout/payment/card-error',
    'orderService.placeOrder.auth.DINVALIDCARD': 'checkout/payment/card-error',
    'orderService.placeOrder.auth.DCARDEXPIRED': 'checkout/payment/card-error',
    'orderService.placeOrder.auth.CID': 'checkout/payment/cin-error',
    'orderService.itemUnavailable': 'cart',
    'orderService.s2sItemUnavailable': 'cart',
    'orderService.placeOrder.auth.SC_SECURITY': 'checkout/order/place',
    'orderService.placeOrder.auth.SC_INVALID_CARD': 'checkout/order/place',
    'orderService.placeOrder.auth.SC_ERROR': 'checkout/payment/choose?reset=t&show=gc',
    'orderService.placeOrder.auth.SC_BALANCE_INQ_EXCEEDED': 'checkout/order/place',
    'orderService.placeOrder.auth.SC_HELD': 'checkout/order/place',
    'orderService.placeOrder.auth.SC_NSF': 'checkout/payment/choose?reset=t&show=gc',
    'orderService.scUnavailable': 'checkout/payment/choose?reset=t&show=gc',
    'orderService.register.SC_INVALID_ACCOUNT': 'checkout/payment/choose?reset=t&show=gc',
    'orderService.register.SC_MAX_LIMIT': 'checkout/order/place',
    'orderService.register.SC_ALREADY_REG': 'checkout/payment/choose?reset=t&show=gc',
    'storeService.INVALID_STORE': 'checkout/site-to-store/error'
  },

  //errors for specific form fields
  fieldErrors: {
    // account errors
    'userAlreadyExists': 'email',
    'invalidEmail': 'email',
    'invalidPasswordInReg': 'password',

    //address errors
    'addressBookService.addressRecordResult.noFirstName': 'firstName',
    'paymentMethodService.paymentMethodResult.noFirstName': 'firstName',
    'addressBookService.addressRecordResult.invalidFirst': 'firstName',
    'paymentMethodService.paymentMethodResult.invalidFirst': 'firstName',
    'addressBookService.addressRecordResult.noLastName': 'lastName',
    'paymentMethodService.paymentMethodResult.noLastName': 'lastName',
    'addressBookService.addressRecordResult.invalidLast': 'lastName',
    'paymentMethodService.paymentMethodResult.invalidLast': 'lastName',
    'addressBookService.addressRecordResult.noStreetAddress': 'address[street1]',
    'paymentMethodService.paymentMethodResult.noStreetAddress': 'address[street1]',
    'addressBookService.addressRecordResult.invalidStreet1': 'address[street1]',
    'paymentMethodService.paymentMethodResult.invalidStreet1': 'address[street1]',
    'addressBookService.addressRecordResult.invalidStreet2': 'address[street2]',
    'paymentMethodService.paymentMethodResult.invalidStreet2': 'address[street2]',
    'addressBookService.addressRecordResult.noCity': 'address[city]',
    'paymentMethodService.paymentMethodResult.noCity': 'address[city]',
    'addressBookService.addressRecordResult.invalidCity': 'address[city]',
    'paymentMethodService.paymentMethodResult.invalidCity': ['address[city]', 'address[state]', 'address[zip]'],
    'addressBookService.addressRecordResult.noState': 'address[state]',
    'paymentMethodService.paymentMethodResult.noState': 'address[state]',
    'addressBookService.addressRecordResult.invalidState': 'address[state]',
    'paymentMethodService.paymentMethodResult.invalidState': 'address[state]',
    'addressBookService.addressRecordResult.noZip': 'address[zip]',
    'paymentMethodService.paymentMethodResult.noZip': 'address[zip]',
    'addressBookService.addressRecordResult.invalidZip': 'address[zip]',
    'paymentMethodService.paymentMethodResult.invalidZip': 'address[zip]',
    'addressBookService.addressRecordResult.noPhone': 'phoneNumber',
    'paymentMethodService.paymentMethodResult.noPhone': 'phoneNumber',
    'addressBookService.addressRecordResult.badPhone': 'phoneNumber',
    'paymentMethodService.paymentMethodResult.badPhone': 'phoneNumber',
    'cc_edit.errors.form.badPhone': 'phoneNumber',

    //credit card errors
    'billingPageAddCreditCard.errors.form.selectCard': 'type',
    'cc_edit.errors.form.invalidCard': 'cardNumber',
    'cc_edit.errors.form.invalidWMCard': 'cardNumber',
    'paymentMethodService.paymentMethodResult.invalidCard': 'cardNumber',
    'paymentMethodService.paymentMethodResult.invalidFullName': 'nameOnCard',
    'paymentMethodService.paymentMethodResult.invalidWMCard': 'cardNumber',
    'paymentMethodService.paymentMethodResult.invalidCid': 'CID',
    'billingPageAddCreditCard.errors.form.invalidCid': 'CID',
    'orderService.placeOrder.auth.CID': 'CID',
    'paymentMethodService.paymentMethodResult.badExpirDate': 'expiryMonth',
    'cc_edit.errors.form.badExpirDate': 'expiryMonth',
    'cc_edit.errors.form.noName': 'nameOnCard'
  },

  isNativeClient: !!( $.os.ipad || $.os.iphone || $.os.android ),

  isNativeEmbedded: function() {
    var uagent = navigator.userAgent.toLowerCase();
    return uagent.match(/(walmart|wm )/);
  },

  isIphone: !!$.os.iphone,
  isIpad: !!$.os.ipad,
  isIos: !!$.os.ipad || !!$.os.iphone,
  isAndroid: !!$.os.android,

  ensureArray: function(item) {
    if (!item) {
      return item;
    }
    if (_.isArray(item)) {
      return item;
    } else {
      return [item];
    }
  }
};
