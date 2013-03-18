// Minimizer define
var escapeExpression = Handlebars.Utils.escapeExpression,
    SafeString = Handlebars.SafeString;

function fnBody(options, context) {
  if (options.fn) {
    return options.fn(context);
  }
  return '';
}

function formField(options, content) {
  var className = escapeExpression(options.hash.fieldClass) || '';
  return new SafeString('<div class="form-field ' + className + ' ' + options.hash.type + '">' + content + '</div>');
}

function wrapField(data, context) {
  var options = data.options,
      hash = options.hash,
      content = data.content,
      replacedPlaceholder;
  hash.id = hash.id ? expandToken(hash.id, context) : _.uniqueId('txt');

  var labelClass = hash.labelClass === undefined ? 'text-label' : hash.labelClass,
      label = '';
  if (hash['form-field'] || hash.label) {
    label = i18n(hash.label);
    if (hash['expand-tokens']) {
      label = expandToken(label, context);
    }
    if (!hash.placeholder) {
      hash.placeholder = label;
      replacedPlaceholder = true;
    }

    label = '<label class="' + labelClass + '" for="' + escapeExpression(hash.id) + '">' + label + '</label>';
  }

  var attributes = [];
  _.each(hash, function(value, key) {
    if (key === 'placeholder' && !replacedPlaceholder) {
      value = i18n.call(this, value);
    }
    if (key === 'disabled') {
      if (value) {
        attributes.push(key);
      }
    } else if (key !== 'label' && key !== 'form-field' && key !== 'expand-tokens' && (!data.filter || !data.filter(key, value))) {
      attributes.push(key + '="' + escapeExpression(value) + '"');
    }
  });

  var rtn = '';
  if (content) {
    rtn += content.call(context || window, label, attributes);
  }

  if (hash['form-field'] !== false) {
    return formField(options, rtn);
  } else {
    return new SafeString(rtn);
  }
}
