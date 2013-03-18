/*global SafeString, escapeExpression, expandToken, formField,  */
Handlebars.registerHelper('input', function(options) {
  var hash = options.hash;

  if (hash.type === 'number') {
    // chrome and iOS like to format "number" fields with commas
    // pattern will still bring up the numeric keyboard
    hash.type = $.os.ios ? 'text' : 'number';
    hash.pattern = '[0-9]*';
  } else if (hash.type === 'password') {
    hash.autocorrect = hash.autocomplete = hash.autocapitalize = 'off';
  }
  hash.type = hash.type || 'text';
  if (!hash.checked) {
    delete hash.checked;
  }

  return wrapField({
    options: options,
    filter: function(key, value) {
      return (key == 'type' && value == 'textarea');
    },
    content: function(label, attributes) {
      if (hash.type === 'textarea') {
        return label + '\n<textarea ' + attributes.join(' ') + '>' + fnBody(options, this) + '</textarea>';
      } else if (hash.type === 'checkbox' || hash.type === 'radio') {
        return '\n<input ' + attributes.join(' ') + '>' + label;
      } else {
        return label + '\n<input ' + attributes.join(' ') + '>';
      }
    }
  }, this);
});

Handlebars.registerHelper('textarea', function(options) {
  options.hash.type = 'textarea';
  return Handlebars.helpers.input.call(this, options);
});

Handlebars.registerHelper('select', function(options) {
  return wrapField({
    options: options,
    filter: function(key) {
      return (key == 'placeholder' || key == 'options' || key == 'value' || key == 'valueProp' || key == 'displayProp');
    },
    content: function(label, attributes) {
      var rtn = label + '\n<select ' + attributes.join(' '),
          hash = options.hash,
          value = options.hash.value;

      // use placeholder to indicate the blank entry
      if (hash.placeholder) {
        rtn += ' data-placeholder="true">';
        if (hash['expand-tokens']) {
          hash.placeholder = expandToken(i18n(hash.placeholder), this);
        }
        rtn += ('<option value="">' + hash.placeholder + '</option>');
      } else {
        rtn += '>';
      }

      // append all options from a list
      if (hash.options) {
        _.each(hash.options, function(item) {
          rtn += '<option value="';
          var itemValue = getHashValue(hash.valueProp || 'id', item, true);
          rtn += itemValue;
          rtn += '"';
          if (value === item || value === itemValue) {
            rtn += ' selected';
          }
          rtn += '>';
          rtn += getHashValue(hash.displayProp || 'name', item);
          rtn += '</option>'
        });
      }

      // allow additional options to be provided in the body
      if (options.fn) {
        rtn += fnBody(options, this);
      }
      rtn += '</select>';
      return rtn;
    }
  }, this);
});

function getHashValue(key, obj, doEscape) {
  var rtn;
  if (key === '*') {
    rtn = JSON.stringify(obj);
  } else {
    return obj[key];
  }
  if (rtn && doEscape) {
    rtn = escape(rtn);
  }
  return rtn;
}

// remove the placeholder value once the user makes another selection
$(document).delegate('select[data-placeholder]', 'change', function(event) {
  var select = event.currentTarget;
  if (select.options.length && select.options[0].value === '' && $(select).val()) {
    select.removeChild(select.options[0]);
  }
});
