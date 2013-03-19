/*global Connection */

exports.Model = Thorax.Model.extend({
  sync: Connection.sync,

  initialize: function(attributes, options) {
    Thorax.Model.prototype.initialize.call(this, attributes, options);

    this.bind('change', _.bind(function() {
      this.needsUpdate = true;
    }, this));
  },

  fetch: function(options) {
    if (!_.isUndefined(this.ignoreFetchError) && (!options || _.isUndefined(options.ignoreErrors))) {
      options = options || {};
      options.ignoreErrors = this.ignoreFetchError;
    }
    Thorax.Model.prototype.fetch.call(this, options);
  },

  shortCircuitUpdate: function() {
    return (!this.needsUpdate && (!this.changed || _.isEmpty(this.changed)));
  },

  postAttributes: function(ordered_attributes) {
    var ret = {},
        attributes = this.attributes;

    ordered_attributes.forEach(function(attribute_name, i){
      var value = _valueFromAttrName(attributes, attribute_name) || '';
      ret['p' + (i + 1)] = value;
    });

    return ret;
  },
  ajax: Connection.ajax,

  _validateInvalidCharacters: function(attributes, attribute_names) {
    return exports.Model._validateInvalidCharacters(attributes, attribute_names, this._invalidCharPattern);
  }
},{
  _validateEmpty: function(attributes, attribute_names) {
    var errors = [];
    attribute_names.forEach(function(attribute_name) {
      if (typeof(attribute_names) === 'undefined' || _valueFromAttrName(attributes, attribute_name).replace(/\s+/g, '') === '') {
        errors.push({
          name: attribute_name,
          message: {
            format: '{{attribute}} cannot be blank'
          }
        });
      }
    });
    return errors;
  },

  _validateInvalidCharacters: function(attributes, attribute_names, invalidCharPattern) {
    var errors = [];
    attribute_names.forEach(function(attribute_name) {
      var pattern = (invalidCharPattern && invalidCharPattern[attribute_name]) || DEFAULT_INVALID_CHARS;
      var value = _valueFromAttrName(attributes, attribute_name);
      var matched = value.match(pattern);
      if (matched) {
        errors.push({
          name: attribute_name,
          message: {
            value: matched[0],
            format: '{{attribute}} cannot contain \'{{value}}\''
          }
        });
      }
    });
    return errors;
  }
});

// Attempts to loda a given model from the current view, if available
exports.Model.fromCurrent = function(id, clazz) {
  var view = exports.layout.getView();
  return view && view.lookupModel && view.lookupModel(id, clazz);
};

var DEFAULT_INVALID_CHARS = /[!?+~{}\/\\|*<>%^]/g;

function _valueFromAttrName(attributes, attribute_name) {
  var value = attributes;
  attribute_name.replace(/\]/g,'').split('[').forEach(function(name_fragment) {
    value = value[name_fragment];
  });
  return value || '';
}
