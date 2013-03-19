var Bridge = {
  nativeHost: false
};

var $getTemplate = Thorax.Util.getTemplate,
    $anchorClick = Thorax.LayoutView.prototype._anchorClick,
    $getInputValue = Thorax.View.prototype._getInputValue,
    $ensureElement = Thorax.View.prototype._ensureElement,
    $addEvent = Thorax.View.prototype._addEvent;

Thorax.Util.getTemplate = function(file, ignoreErrors) {
  var fileName = file + (file.match(/\.handlebars$/) ? '' : '.handlebars'),
      platform = (Bridge.nativeHost || 'mweb') + '/' + fileName,
      generic = fileName;
  return $getTemplate(platform, true) || $getTemplate(generic, ignoreErrors);
};

// Add support for "data-external" attribute
Thorax.LayoutView.prototype._anchorClick = function(event) {
  var target = $(event.currentTarget);
  if (target.attr("data-external") || event.defaultPrevented) {
    return;
  }
  return $anchorClick.apply(this, arguments);
};

var FIELD_ERROR_CLASS = 'error';

// Set directly on Thorax.View.prototype so all classes will recieve

_.extend(Thorax.View.prototype, {
  // Remove loading timeout delay here as this can introduce up to two second delay for cases
  // that we will likely want to display the indicator anyway
  _loadingTimeoutDuration: 0,

  continueText: 'Continue',

  // Add support for "data-onOff" attribute
  _getInputValue: function(input, options, errors) {
    if ((input.type === 'checkbox' || input.type === 'radio') && $(input).attr('data-onOff')) {
      return this.checked;
    } else {
      return $getInputValue.apply(this, arguments);
    }
  },

  view: function(name, options) {
    var instance;
    if (typeof name === 'object' && name.hash && name.hash.name) {
      // named parameters
      options = name.hash;
      name = name.hash.name;
      delete options.name;
    }

    if (typeof name === 'string') {
      if (!Thorax.Views[name]) {
        throw new Error('view: ' + name + ' does not exist.');
      }
      instance = new Thorax.Views[name](options);
    } else {
      instance = name;
    }
    this._addChild(instance);
    return instance;
  },

  // Attempts to load a given model from the current view, if available
  lookupModel: function(id, clazz) {
    var collection = this.collection,

        // Final view.model is to force return of the model itself. The first is to prevent a NPE
        model = (collection && collection.get(id)) || (this.model && this.model.id === id && this.model);

    if (model && (!clazz || (collection && collection.previewClass === clazz) || model.previewClass === clazz)) {
      return model;
    }

    // Scan all children to see if they have any instances
    var childResult;
    _.find(this.children, function(view) {
      return childResult = view.lookupModel(id, clazz);
    });
    return childResult;
  },

  //TODO: use of CSS class name from 'name' attribute is deprecated, use [data-view="name"] instead
  _ensureElement: function() {
    $ensureElement.call(this);
    if (this.className == null && this.name) {
      $(this.el).addClass(this.name.replace(/\//g,'-'));
    }
  },

  _addEvent: function(params) {
    this._domEvents = this._domEvents || [];
    if (params.type === "DOM") {
      this._domEvents.push(params.originalName);
    }

    var nativeEvents = [],
        nativeMatch = /^native(?:\s+(\S+))?\s+(\S+)$/.exec(params.originalName);
    if (nativeMatch) {
      // "native [specificHost] nativeMethodName": "functionName"
      if (Bridge.nativeHost) {
        if (nativeMatch[1] && Bridge.nativeHost !== nativeMatch[1]) {
          return;
        }
        var event = params.handler;
        _.each(_.isArray(event) ? event : [event], function(handler) {
          nativeEvents.push({
            name: nativeMatch[2],
            handler: _.isFunction(handler) ? handler : this[handler]
          });
        }, this);
        if (nativeEvents.length) {
          this.bind('activated', function() {
            for (var i = 0; i < nativeEvents.length; i++) {
              Bridge.bind(nativeEvents[i].name, nativeEvents[i].handler, this);
            }
          }, this);
          this.bind('deactivated', function() {
            for (var i = 0; i < nativeEvents.length; i++) {
              Bridge.unbind(nativeEvents[i].name, nativeEvents[i].handler);
            }
          });
        }
      }
    } else {
      return $addEvent.call(this, params);
    }
  },

  renderMessage: function(template) {
    var message = this.renderTemplate('messages/' + this.name + (template ? '-' + template : ''), {}, true);
    this.$('#info-header-container').html('<div class="message">' + message + '</div>');
  },

  _handleNativeMenuSelect: function(options) {
    // Generic handler for done button click
    if (options.key === 'done') {
      // Trigger the submit event for the View
      this.submitForm(this.$('form'));
    } else if (options.key === 'cancel') {
      this.onCancel();
    }
  },
  onCancel: function() {
    Backbone.history.back(true);
  },
  submitForm: function(form) {
    if (!form.attr('data-submit-wait')) {
      form.attr('data-submit-wait', 'true');
      this._handleSubmit();
    }
  },

  _checkFirstRadio: function(){
    var fields = {};
    _.each(this.$('input[type=radio]:not([disabled])'), function(el) {
      var col = fields[el.name] = fields[el.name] || [];
      col.push(el);
    });
    _.each(fields, function(elements, name) {
      if (!_.detect(elements, function(element) { return element.checked; })) {
        elements[0].checked = true;
      }
    });
  },

  _ensureCookiesEnabled: function() {
    if (!navigator.cookieEnabled) {
      this.renderInfoHeader(i18n('To use this site, cookies must be enabled.'), [], 'error');
    }
  }
});


var View = exports.View = Thorax.View,
    CollectionView = exports.CollectionView = Thorax.CollectionView.extend({
      _collectionSelector: '.collection'
    });

// add events to all Phoenix.View instances
View.on({
  // Propagate 'populate' event to children
  populate: function(attributes) {
    if (this.children) {
      _.each(this.children, function(view) {
        view.trigger('populate', attributes);
      });
    }
  },

  // Expand the tap sections for form and .item elements
  'click .item, click .form-field': function(event) {
    var input = $('input[type=radio]:not([disabled]), input[type=checkbox]:not([disabled])', event.currentTarget);
    if (input.length !== 1) {
      return;
    }
    input = input.get(0);
    if (input === event.target) {
      return;
    }
    input.checked = input.type === 'radio' || !input.checked;
    if ($(event.target).closest('a', event.currentTarget).length === 0) {
      event.preventDefault();
    }
  },

  'change .form-field input[type="checkbox"]': function(event) {
    // don't process the change events on checkboxes
    event.stopPropagation();
  },
  'keypress .error': removeErrorState,
  'change .error': removeErrorState,
  'rendered': function() { suppressTapHighlights(this.el); },

  // Even though this will apply only to CollectionView and CollectionHelperView
  // declare here so both will recieve
  'rendered:item': function(collectionView, collection, model, el) {
    suppressTapHighlights(el);
  },

  error: function() {
    Thorax.Util.scrollToTop();
  },

  //this will only be called when view is passed to Phoenix.layout.setView()
  //if interaction with InfoHeader and breadcrumbView are needed add events
  //where appropriate and bind event handlers as objects will not be available
  //when the view is initialized
  activated: function() {
    //expected mixins
    //try {
    //  this.mixin('InfoHeader');
    //} catch (err) {
    //  exports.trackCatch('InfoHeader:init', err);
    //}

    //breadcrumbs
    if (exports.breadcrumb) {
      try {
        exports.breadcrumb.updateCrumbs(this);
      } catch (err) {
        exports.trackCatch('updateCrumbs', err);
      }
    }
  },

  'native execMenu': function(options) {
    this._handleNativeMenuSelect(options);
  },

  validate: function(attributes, errors) {
    if (this.model && this.model.validateInput) {
      var modelOptions = this._objectOptionsByCid[this.model.cid];
      if (modelOptions.validate === true || typeof modelOptions.validate === 'undefined') {
        (this.model.validateInput(attributes) || []).forEach(function(error) {
          errors.push(error);
        });
      }
    }
  }
});

// Suppress tap highlights for form fields and .item elements with checkboxes or radio buttons
function suppressTapHighlights(context) {
  $('.item, .form-field', context).forEach(function(el) {
    var input = $('input[type=radio], input[type=checkbox]', el);
    if (input.length === 1) {
      $(el).addClass('no-tap-highlight');
    }
  });
}

/**
 * Mark the field to be in an error state
 */
function markErrorState(field) {
  // just in case it isn't already
  field = $(field);
  field.addClass(FIELD_ERROR_CLASS);
  var label = getFieldLabel(field);
  if (label.length) {
    label.addClass(FIELD_ERROR_CLASS);
    return label.text();
  } else {
    // give ability to associate a label for validation messages even if there is no label element
    return field.attr('aria-label');
  }
}

/**
 * Once a field in error has been changed, provide instant visual feedback that it is no longer in error.
 * While it truly may still be in error, a serialize or form submit will repaint the field correctly.
 */
function removeErrorState(event) {
  var field = event.target ? $(event.target) : $(event);
  field.removeClass(FIELD_ERROR_CLASS);
  getFieldLabel(field).removeClass(FIELD_ERROR_CLASS);
}

/**
 * Return a zepto-wrapped field label selector for the provided field
 */
function getFieldLabel(field) {
  var input = $(field),
      label = $('label[for="' + input.attr('id') + '"]');
  if (!label.length) {
    label = input.closest('label');
  }
  return label;
}