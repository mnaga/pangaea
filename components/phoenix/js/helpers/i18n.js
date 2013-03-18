function _i18n(dict, token, pNum) {
  if (!dict) {
    return;
  }

  var rtn;

  if (_.isNumber(pNum) && pNum >= 0) {
    // plural
    var checkList = [];
    if (pNum >= 0) {
      if (pNum === 0) {
        checkList = [ '0', 'few', 'many' ];
      } else if (pNum === 1) {
        checkList = [ '1' ];
      } else if (pNum === 2) {
        checkList = [ '2', 'few', 'many' ];
      } else if (pNum < 10) {
        checkList = [ 'few', 'many' ];
      } else {
        checkList = [ 'many' ];
      }
    }
    if (checkList.length) {
      for (var i = 0; i < checkList.length && !rtn; i++) {
        rtn = dict[token + '[' + checkList[i] + ']'];
      }
    }
  }

  // if there was no plural match
  rtn = rtn || dict[token];

  return rtn;
}

function i18nLookup(token, pNum) {
  var rtn;

  // check locales
  var locales = i18n.dictionary && i18n.dictionary._locale;
  if (locales) {
    for (var i = 0; i < _localeLookups.length; i++) {
      var dict = locales[_localeLookups[i]];
      if (dict) {
        rtn = _i18n.call(this, dict, token, pNum);
        if (rtn) {
          break;
        }
      }
    }
  }

  // if still no match, use the default dictionary
  return rtn || _i18n.call(this, i18n.dictionary, token, pNum);
}

function i18n(token, pNum, defaultValue /*, options */) {
  var options = arguments[arguments.length - 1],
      hash = (options && options.hash) || options;

  // Ignore options if the user didn't pass a 3rd value
  if (!_.isString(defaultValue)) {
    defaultValue = undefined;
  }

  var rtn = i18nLookup(token, pNum) || defaultValue || token;

  // And interpolate if requested
  if (hash && hash['expand-tokens']) {
    rtn = expandToken(rtn, this);
  }
  return rtn;
}

// Handle the case where the token input is a handlebars token itself
function expandToken(input, scope) {
  function deref(token, scope) {
    var segments = token.split('.'),
        len = segments.length;
    for (var i = 0; scope && i < len; i++) {
      if (segments[i] !== 'this') {
        scope = scope[segments[i]];
      }
    }
    return scope;
  }

  if (input && input.indexOf && input.indexOf('{{') >= 0) {
    /*jshint boss:true */
    var re = /(?:\{?[^{]+)|(?:\{\{([^}]+)\}\})/g,
        match,
        ret = [];
    while (match = re.exec(input)) {
      if (match[1]) {
        var params = match[1].split(/\s+/);
        if (params.length > 1) {
          var helper = params.shift();
          params = params.map(deref);
          if (Handlebars.helpers[helper]) {
            ret.push(Handlebars.helpers[helper].apply(scope, params));
          } else {
            // If the helper is not defined do nothing
            ret.push(match[0]);
          }
        } else {
          ret.push(deref(params[0], scope));
        }
      } else {
        ret.push(match[0]);
      }
    }
    input = ret.join('');
  }
  return input;
}


var _localeLookups = [],
    _locale;

_.extend(i18n, {
  setLocale: function(language, country) {
    _locale = {
      country: country && country.toLowerCase(),
      language: language && language.toLowerCase()
    };

    // generate the locale lookup values
    _localeLookups = [];
    if (_locale.language) {
      if (_locale.country) {
        _localeLookups.push(_locale.language + '-' + _locale.country);
      }
      _localeLookups.push(_locale.language);
    }
  },
  getLocale: function() {
    return _locale;
  },
  getLocaleLookups: function() {
    return _localeLookups;
  }
});

Phoenix.i18n = i18n;
Phoenix.i18nLookup = i18nLookup;
Handlebars.registerHelper('i18n', i18n);
