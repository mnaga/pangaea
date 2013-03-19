/*global Bridge, View, expandToken, i18n */

// Minimizer define
var escapeExpression = Handlebars.Utils.escapeExpression,
    SafeString = Handlebars.SafeString,
    // the galaxy note sometimes crashes when the user clicks on a number type field
    _supportsInputNumber = navigator.userAgent.indexOf('SAMSUNG-SGH-I717') < 0;

function formField(options, content) {
  var className = escapeExpression(options.hash.fieldClass) || '';
  return new SafeString('<div class="form-field ' + className + '">' + content + '</div>');
}

function inputNumber(options, form, scope) {
  if (!exports.isDesktop() && _supportsInputNumber) {
    var isiOS = Bridge.nativeHost ? (Bridge.nativeHost === 'iphone' || Bridge.nativeHost === 'ipad') : Phoenix.Data.isIphone || Phoenix.Data.isIpad;
    // chrome and iOS like to format "number" fields with commas
    // pattern will still bring up the numeric keyboard
    if (!options.hash.type) {
      options.hash.type = isiOS ? 'text' : 'number';
    }
    options.hash.pattern = "[0-9]*";
  }
  return inputText(options, form, scope);
}

function inputText(options, form, scope) {
  options.hash.type = options.hash.type || 'text';
  options.hash.id = options.hash.id ? Thorax.Util.expandToken(options.hash.id, scope) : _.uniqueId('txt');

  var label = '',
      labelClass = options.hash.labelClass === undefined? 'text-label' : options.hash.labelClass;
  if (form && options.hash.label) {
    label = i18n(options.hash.label);
    options.hash.placeholder = options.hash.placeholder || label;

    label = '<label class="' + labelClass + '" for="' + escapeExpression(options.hash.id) + '">' + label + '</label>';
  }

  var attributes = [];
  for (var key in options.hash) {
    var value = options.hash[key];
    if (key === 'placeholder') {
      value = i18n.call(scope, value);
    }
    if (key === 'disabled') {
      if (value) {
        attributes.push(key);
      }
    } else if (key !== 'label') {
      attributes.push(key + '="' + escapeExpression(value) + '"');
    }
  }

  var html = options.hash.type === 'textarea' ?
    label + '\n<textarea ' + attributes.join(' ') + '></textarea>' :
    label + '\n<input ' + attributes.join(' ') + '>';

  if (form) {
    return formField(options, html);
  } else {
    return new SafeString(html);
  }
}

var helpers = {
  nameAndAddress: function(nameAndAddress) {
    return new SafeString(nameAndAddress.name + '<br>' + this.address(nameAndAddress.address));
  },
  address: function(address) {
    if (!address) {
      return;
    }

    var components = [address.street1];
    if (address.street2 && address.street2) {
      components.push(address.street2);
    }
    components.push(address.city + ', ' + address.state + ' ' + address.zip);
    components = _.map(components, escapeExpression);
    return new SafeString('<div>' + components.join('</div><div>') + '</div>');
  },
  'directions-link': function(address) {
    // Android will default to current location, iOS < 6 needs 'Current Location' explicitly
    // iOS 6 does not support passing the current location flag but the user can select
    // this easily if we do not include it.
    var start = '';
    if ($.os.ios && parseFloat($.os.version) < 6) {
      start = 'saddr=Current+Location&';
    }
    return 'http://maps.apple.com/maps?' + start + 'daddr=' + encodeURIComponent([
      address.street1 + (address.street2 ? ' ' + address.street2 : ''),
      address.city,
      address.state,
      address.zip
    ].join(','));
  },
  'search-location': function(search) {
    if (search.city && search.state) {
      return search.city + ', ' + search.state;
    } else if (search.zipcode) {
      return search.zipcode;
    } else {
      return i18n('your current location');
    }
  },
  // show a loading indicator while an image is loading.
  // param can either be image src or named params (src, alt, loadingText).
  // content can a nested block or nothing for a simple image
  'loaded-image': function(options, block) {
    var src = _.isString(options) && options;
    var alt = "";
    var loadingText = "Loading...";
    if (options && options.hash) {
      // if parameters were named
      src = (options.hash.src && options.hash.src) || src;
      alt = options.hash.alt || alt;
      loadingText = options.hash.loadingText || loadingText;
      block = options;
    }

    // functions to return content to display
    var id;
    function getLoading() {
      id = _.uniqueId('img_');
      if (options.hash && options.hash.hidden) {
        return '<div id="' + id + '"></div>';
      }
      return '<div id="' + id + '" class="loading-image">' + Thorax.Util.getTemplate('inline-loading-indicator')({label: loadingText}) + '</div>';
    }
    var content = options && options.fn && options.fn(this) || '<img src="' + src + '" alt="' + alt + '">';
    // write the image/inner block or a loading indicator to be replaced when image is loaded
    if (!src || !content) {
      // if the value is empty, assume the template will be re-rendered later
      return new SafeString(getLoading());
    } else {
      var img = new Image();
      img.onload = function() {
        // reset the element
        $('#' + id).replaceWith(content);
      };
      img.onerror = function() {
        $('#' + id).remove();
        exports.trackError('image-error', src);
      };
      img.src = src;
      if (img.complete) {
        // it's already loaded
        return new SafeString(content);
      } else {
        // onload will reset
        return new SafeString(getLoading());
      }
    }
  },
  date: function(date) {
    if (_.isString(date)) {
      // Manually parse iso8061 date strings as not all implementations support this
      var iso8061 = /(\d{4})(?:-(\d{2})(?:-(\d{2})))/.exec(date);
      if (iso8061) {
        var year = iso8061[1],
            month = iso8061[2],
            day = iso8061[3];

        // Manually format The short dates numerically for now. We may want to revisit
        // this when examinging proper i18n
        if (!month) {
          return year;
        }
        if (!day) {
          return i18n.call({month: month, year: year}, '{{month}}/{{year}}', {'expand-tokens': true});
        }

        date = new Date(year, parseInt(month, 10)-1, day);
      }
    }
    if (date && !_.isDate(date)) {
     date = new Date(date);
    }
    return date && date.toLocaleDateString();
  },

  hasCCExpirationDate: function(options) {
    if (!exports.checkout.isStoreCard(this.type)) {
      return options.fn(this);
    }
  },
  isMweb: function(options) {
    if (!Bridge.nativeHost) {
      return options.fn(this);
    } else {
      return options.inverse(this);
    }
  },
  isAndroid: function(options) {
    if (Bridge.nativeHost === 'android') {
      return options.fn(this);
    } else {
      return options.inverse(this);
    }
  },
  isiPhone: function(options) {
    if (Bridge.nativeHost === 'iphone') {
        return options.fn(this);
    } else {
      return options.inverse(this);
    }
  },
  isiPad: function(options) {
    if (Bridge.nativeHost === 'ipad') {
        return options.fn(this);
    } else {
      return options.inverse(this);
    }
  },

  ifHasBundle: function(options) {
    if (this.bundleConfig && this.bundleConfig.components && this.bundleConfig.components.length) {
      return options.fn(this);
    } else {
      return options.inverse(this);
    }
  },

  bundleNameLink: function() {
    var link = "<a href='" + Phoenix.View.url("ip/" + this.itemId) + "'>" + this.name + "</a>";
    return new SafeString(i18n.call({name: link}, "Your {{name}} includes", {'expand-tokens': true}));
  },
  'star-rating': function(rating) {
    rating = parseFloat(rating);
    if (isNaN(rating) || rating < 0) {
      return;
    }
    var rounded = Math.round(rating * 10),
        tenths = rounded % 10;
    rounded = rounded/10;

    var stars = [1,2,3,4,5].map(function(index) {
      return '<span class="star' + (index <= rounded ? ' rated' : (index === Math.floor(rounded+1) && tenths) ? ' partial partial' + tenths : '') + '"></span>';
    }).join('');
    return new SafeString('<div class="stars">'
        + stars
        + '<span class="rating">' + i18n.call({rating: rounded}, '{{rating}} star rating', {'expand-tokens': true}) + '</span>'
      + '</div>');
  },

  'input-tagged-text': function(options) {
    var className = options.hash['class'] || '',
        tagClass = options.hash['tag-class'] || '',
        tagText = options.hash['tag-text'] || '';
    delete options.hash['class'];
    delete options.hash['tag-class'];
    delete options.hash['tag-text'];

    var html =
      '<div class="tagged-text ' + className + '">'
      + inputText(options, false, this)
      + '<button type="button" class="' + tagClass + '">' + i18n.call(this, tagText) + '</button>'
      + '</div>';

    return new SafeString(html);
  },

  'view-form': function(options) {
    var className = (options.hash && escapeExpression(options.hash['class'])) || '';
    return '<form action="#" class="' + className + '">'
              + options.fn(this)
              + '<input class="hidden-submit" type="submit" value="' + i18n('Submit') + '">'
            + '</form>';
  },
  'form-section': function(options) {
    var className = (options.hash && escapeExpression(options.hash['class'])) || '';
    return '<div class="form-section ' + className + '">'
              + '<div class="form-layout">'
                + options.fn(this)
              + '</div>'
            + '</div>';
  },
  'form-checkbox': function(options) {
    var label = escapeExpression(options.hash.label),
        name = escapeExpression(options.hash.name),
        value = escapeExpression(options.hash.value),
        id = escapeExpression(options.hash.id) || _.uniqueId('txt'),

    input = '<input type="checkbox" id="' + id + '"' + (name ? ' name="' + name + '"' : '') + (value ? ' value="' + value + '"' : '');
    // Used to signal that the checked boolean value should be serialized as opposed to the string field value.
    if (options.hash.onOff) {
      input += ' data-onOff="true"';
    }
    input += '>',
    label = '<label class="checkbox-label" for="' + id + '">' + i18n(label) + '</label>';

    var nativeHost = Bridge.nativeHost;
    return formField(options, nativeHost === 'iphone' || nativeHost === 'ipad' ? label + '\n' + input : input + label);
  },

  'form-textarea': function(options) {
    options.hash.type = 'textarea';
    return inputText(options, true, this);
  },
  'form-text': function(options) {
    return inputText(options, true, this);
  },
  'form-email': function(options) {
    options.hash.type = 'email';
    return inputText(options, true, this);
  },
  'form-password': function(options) {
    options.hash.type = 'password';
    options.hash.autocorrect = "off";
    options.hash.autocomplete = "off";
    options.hash.autocapitalize = "off";
    return inputText(options, true, this);
  },
  'form-number': function(options) {
    return inputNumber(options, true, this);
  },
  'form-telephone': function(options) {
    options.hash.type = 'tel';
    return inputText(options, true, this);
  },

  'input-text': function(options) {
    return inputText(options, false, this);
  },
  'input-number': function(options) {
    return inputNumber(options, false, this);
  },

  'radio-item': function(options) {
    var label = escapeExpression(options.hash.label),
        name = escapeExpression(options.hash.name),
        value = escapeExpression(options.hash.value),
        selected = options.hash.selected,
        disabled = options.hash.disabled,
        editUrl = escapeExpression(options.hash.editUrl) || '',
        id = escapeExpression(options.hash.id) || _.uniqueId('txt'),
        itemClass = options.hash.itemClass ? ' ' + escapeExpression(options.hash.itemClass) : '',
        labelClass = options.hash.labelClass ? ' ' + escapeExpression(options.hash.labelClass) : '';
    if (disabled) {
      labelClass = 'disabled' + labelClass;
    }

    if (editUrl) {
      editUrl = '<div class="edit"><a href="' + editUrl + '" class="button">' + i18n('Edit') + '</a></div>';
    }
    if (!label) {
      label = options.fn(_.extend({radioId: id}, this));
    }

    if (label && !options.hash.customLabel) {
      label = '<label' + (labelClass ? ' class="' + labelClass + '"' : '') + ' for="' + id + '">' + i18n(label) + '</label>';
    } else if (label) {
      label = '<span class="radio-item-descriptor' + (disabled ? ' disabled' : '') + '">' + label + '</span>';
    }

    return new SafeString(
      '<div class="radio-item item' + itemClass + '">'
        + '<div>'
          + '<input type="radio" id="' + id + '"'
              + (name ? ' name="' + name + '"' : '')
              + (selected ? ' checked' : '')
              + (disabled ? ' disabled' : '')
              + (value ? ' value="' + value + '"' : '')
            + '>'
        + '</div>'
        + label
        + editUrl
      + '</div>');
  },
  'variant-list': function(items) {
    var rtn = "";
    if (items && items.length) {
      rtn += '<div class="variant-list">';
      _.each(items, function(item) {
        rtn += '<span class="variant">';
        rtn += item.name;
        rtn += ': ';
        // look for i18n values 'variant.{type}.{value}
        var key = "variant." + item.type + "." + item.value;
        var value = i18n(key);
        if (value === key) {
          // no match - use the item variant data as the value
          rtn += item.value;
        } else {
          rtn += value;
        }
        rtn += "</span>";
      });
      rtn += "</div>";
    }
    return new SafeString(rtn);
  },

  'bundle-component-display': function(bundleConfigComponents) {
    //hide item name if they are all the same and have variants
    var output = '';
    bundleConfigComponents.forEach(function(component){
      component.componentChildren.forEach(function(child) {
        var rowOutput = child.itemName + (child.variants ? '<br>' : '');
        if (child.variants && child.variants.length) {
          rowOutput += '<span class="variant-list">';
          child.variants.forEach(function(variant) {
            rowOutput += '<span class="variant">' + variant.name + ': ' + variant.value + '</span>';
          });
          rowOutput += '</span>';
        }
        if (rowOutput !== '') {
          output += '<li class="bundle-item">' + rowOutput + '</li>';
        }
      });
    });
    return new SafeString(output);
  },

  'encodeURIComponent': function(value) {
    return new SafeString(encodeURIComponent(value));
  },

  'flag-list': function(flags) {
    if (!flags || _.keys(flags).length === 0) {
      return '';
    }
    var output = '<div class="flags">';
    _.each(flags, function(flag) {
      output += '<div class="flag ' + flag.type + '">' + flag.name + '</div>';
    });
    return new SafeString(output + '</div>');
  },

  'dasherize': exports.Util.dasherize,

  'location-collection': function(options) {
    var collection = options.data.view.collection;
    options = options.hash;
    var loadingText = options['loading-text'];

    var ret = '<div class="' + (options['class'] || 'collection') + '">';
    if (loadingText) {
      if (!collection.isPopulated() || options['show-loading-indicator']) {
        ret += '<div class="collection-loading">'
            + Thorax.Util.getTemplate('inline-loading-indicator')({})
            + '<div>' + i18n(loadingText) + '</div>'
            + '</div>';
      }
    }
    return new SafeString(ret + '</div>');
  },

  openTarget: function(block) {
    return Phoenix.openTarget;
  }
};

for(var helper_name in helpers) {
  View[helper_name] = helpers[helper_name];
  Handlebars.registerHelper(helper_name, helpers[helper_name]);
}

View.url = Handlebars.helpers.url;

Handlebars.registerHelper('options-list', function(currentValue, options) {
  var ret = '',
      isArray = _.isArray(options);

  _.each(options, function(display, data) {    // display is the value in the source hash. data is the key
    var value;
    if (_.isArray(display)) {
      value = display[0];
      display = display[1];
    } else {
      value = isArray ? display : data;
    }

    ret += '<option value="' + escapeExpression(value) + '"';
    if (data === currentValue) {
      ret += ' selected';
    }
    ret += '>' + escapeExpression(i18n(display)) + '</option>';
  });

  return new SafeString(ret);
});
