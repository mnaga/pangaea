/*global Connection, View, errorMessageStrings, i18n */

/*
 * Implements common field-level error handling as well
 * as message generation logic for handled errors.
 */

var FIELD_ERROR_CLASS = 'field-error';

View.on({
  'keypress .field-error': removeErrorState,
  'change .field-error': removeErrorState,

  error: function(msg, dataObject) {
    var terminate;
    if (this.errorHandler) {
      terminate = this.errorHandler(msg, dataObject) === false;
    }
    if (!terminate && this.parent) {
      this.parent.trigger('error', msg, dataObject);
    }
  }
});

/**
 * Defines generic error format of:
 *
 * {
 *    message: Message to display to the user may be a literal string or structure of
 *      format: expand-token formatted string to display to the user. Field name can
 *          be accessed with the {{attribute}} token.
 *    name: <string or array> name of field(s) the error applies to (optional)
 * }
 */
function applyErrors(scope, messages) {
  scope = (scope && scope.$el) || scope || $(document.body);

  var context = {
    messages: []
  };

  messages = sortErrors(scope, messages);
  messages.forEach(function(message) {
    var input, labelText;

    if (message.name) {
      //field specific error
      var names = _.isArray(message.name) ? message.name : [message.name];
      _.each(names, function(name) {
        input = $('[name="' + name + '"]', scope);
        if (input.length) {
          var curLabel = markErrorState(input);
          labelText = labelText || curLabel;
        } else {
          exports.trackError('javascript', 'Error message for unknown field: ' + JSON.stringify(message));
        }
      });
    }

    if (message.message) {
      context.messages.push(infoMessageText(message.message, labelText));
    }
  });

  return context;
}


function infoMessageText(message, labelText) {
  var context = message.format ? message : {};
  if (labelText) {
    context.attribute = labelText;
  }
  return i18n.call(context, processErrorMessage(message.format || message), context.count, {'expand-tokens': !!message.format});
}

function processErrorMessage(message) {
  if (_.isObject(message)) {
    message = Connection.UNKNOWN_ERROR;
  }

  if (typeof errorMessageStrings !== 'undefined'
      && message in errorMessageStrings) {
    return errorMessageStrings[message];
  } else {
    //remove <br> from message
    return (message + '').replace(/<br>/g, '');
  }
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


//sort errors by order of appearance of input on page
function sortErrors(scope, errors) {
  scope = (scope && scope.$el) || scope || $(document.body);

  var sortWeightByName = {};
  $('select, input, textarea', scope).each(function(i) {
    var name = this.getAttribute('name');
    if (name) {
      // Increment by one to prevent issues with the first offset being falsy
      sortWeightByName[name] = i + 1;
    }
  });


  function sorter(name) {
    return sortWeightByName[name] || -1;
  }

  // Sort the contents of the name field
  _.each(errors, function(error) {
    // WARN: Destructive, slightly
    if (_.isArray(error.name)) {
      error.name = _.sortBy(error.name, sorter);
    }
  });

  return _.sortBy(errors, function(error) {
    var name = error.name;
    if (_.isArray(name)) {
      name = name[0];
    }
    return sorter(name);
  });
}

function focusErrorField(scope) {
  scope = (scope && scope.$el) || scope || $(document.body);

  // click on error element focuses on the first input with an error
  var input = $(':not(label):not(div).' + FIELD_ERROR_CLASS, scope)[0];
  if (input) {
    input.focus();
  }
}
