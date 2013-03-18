var Validate = exports.Validate = {
  defaultInvalid: /[!?+~{}\/\\|*<>%\^]/g,
  email: /^[^\s]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,4}$/,
  // Checks that an input string is a decimal number, except that only zero
  // or two digits are allowed after the decimal point
  currency: /^\s*((\d+(\.\d\d)?)|(\.\d\d))\s*$/,

  /**
   * Validates a hash definition of validatiors implemented below
   * (or custom) against a set of arbitrary attributes.
   *
   * This hash defines key value pairs where each key maps to a value name in the
   *  attributes object and the value is a validator set  object whose name values
   *  map to either instances on the `Validate` object i.e. `same` or custom functions
   *  that will be executed to validate the given object.
   *
   * Example:
   *  { foo: {notEmpty: true, pattern: /bar/}}
   *
   *  Validates the field foo to be not empty and match the regular expression defined
   *  in the pattern field.
   *
   * Custom validators:
   *  Custom validators may be implemented by defining a custom function on the
   *  validator set object. These functions are passed the same values as the static
   *  validators and should return an arror object with zero or more validation errors.
   *  `Validate.validateFields` is provided as a helper to handle common validation
   *  concerns such as iterating over field values, etc.
   */
  validate: function(attributes, validators) {
    var errors = [];
    _.each(validators, function(validators, fieldName) {
      var fields = fieldName.split(/\s+/g);

      var fieldErrors = _.reduce(validators, function(memo, validators, validatorName) {
        // If we have already seen errors short circuit the operation
        if (memo) {
          return memo;
        }

        validators = _.isArray(validators) ? validators : [validators];
        return _.reduce(validators, function(memo, validator) {
          // If we have already seen errors short circuit the operation
          if (memo) {
            return memo;
          }

          var exec = _.isFunction(validator) ? validator : Validate[validatorName],
              options = {fields: fields};

          // Wrap primitives and inline objects to match the procedural API
          if (_.isObject(validator) && !_.isRegExp(validator)) {
            _.extend(options, validator);
          } else {
            options.options = validator;
          }

          var ret = exec(attributes, options);
          if (!_.isEmpty(ret)) {
            return ret;
          }
        }, undefined);
      }, undefined);
      if (fieldErrors) {
        errors.push.apply(errors, fieldErrors);
      }
    });

    return errors;
  },

  is: function(attributes, options) {
    return validateFields(attributes, options, function(value) {
      if (value !== options.value) {
        return { format: options.msg };
      }
    });
  },

  notEmpty: function(attributes, options) {
    return validateFields(attributes, options, function(value) {
      /*jshint eqnull: true */

      // Empty is null, undefined, or a whitespace only string
      if (_.isString(value)) {
        value = value.replace(/\s+/g, '') || null;
      }
      if (value == null) {
        return { format: '{{attribute}} cannot be blank' };
      }
    });
  },

  same: function(attributes, options) {
    // Check to see that all fields listed have the same values
    var values = [],
        fields = options.fields;
    if (options.as) {
      fields = fields.concat(options.as);
    }
    validateFields(attributes, {fields: fields}, function(value) { values.push(value); });
    if (_.unique(values).length > 1) {
      return [
        validatorMessage(fields, { format: '{{attribute}} must match.' }, options)
      ];
    } else {
      return [];
    }
  },
  pattern: function(attributes, options) {
    return validateFields(attributes, options, function(value, name) {
      var matched = value.match(validatorPattern(name, options) || options.options);
      if (!matched) {
        return {
          value: value,
          format: '{{attribute}} value {{value}} is invalid.'
        };
      }
    });
  },
  invalidCharacters: function(attributes, options) {
    var defaultRegex = Validate.defaultInvalid;
    if (_.isRegExp(options.options)) {
      defaultRegex = options.options;
    }

    return validateFields(attributes, options, function(value, name) {
      var matched = value.match(validatorPattern(name, options) || defaultRegex);
      if (matched) {
        return {
          value: matched[0],
          format: '{{attribute}} cannot contain \'{{value}}\''
        };
      }
    });
  },

  numeric: function(attributes, options) {
    return validateFields(attributes, options, function(value, name) {
      if (_.isNumber(value)) {
        return;
      }

      var pattern = validatorPattern(name, options) || /^\s*(\d+(?:\.\d*)?)\s*$/,
          match = pattern.exec(value),
          parsed = value;
      if (match) {
        parsed = match[1];
      }

      var newValue = parseFloat(parsed);
      if (isNaN(newValue) || parsed !== (newValue + '')) {
        return {
          value: value,
          format: '{{attribute}} must be a number.'
        };
      } else {
        attributes[name] = newValue;
      }
    });
  },
  range: function(attributes, options) {
    return validateFields(attributes, options, function(value) {
      /*jshint eqnull: true */

      if ((options.lt != null && value >= options.lt)
          || (options.lte != null && value > options.lte)
          || (options.gte != null && value < options.gte)
          || (options.gt != null && value <= options.gt)) {
        return {
          lt: options.lt || options.lte,
          gt: options.gt || options.gte,
          value: value,
          format: '{{attribute}} must be between {{lt}} and {{gt}}'
        };
      }
    });
  },

  validateFields: validateFields
};

function validatorPattern(name, options) {
  var pattern = options.pattern;
  return (pattern && pattern[name]) || pattern;
}
function validatorMessage(name, message, options) {
  if (options.msg) {
    if (_.isObject(options.msg)) {
      _.extend(message, options.msg);
    } else {
      message = options.msg;
    }
  }
  return {
    name: name,
    message: message
  };
}

function validateFields(attributes, options, callback) {
  var errors = [];
  _.each(options.fields || options, function(name) {
    var value = valueFromAttrName(attributes, name),
        message = callback(value, name);
    if (message) {
      errors.push(validatorMessage(name, message, options));
    }
  });
  return errors;
}
function valueFromAttrName(attributes, name) {
  /*jshint eqnull: true */
  var value = attributes;
  name.replace(/\]/g, '').split('[').forEach(function(fragment) {
    value = value && value[fragment];
  });
  return value != null ? value : '';
}
