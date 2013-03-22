/*global Connection, i18nLookup */
Connection.on('data', function(event) {
  var data = event.responseData;

  function errorInfo() { return _.pick(data, 'statusCode', 'errors'); }

  if (data && data.statusCode && data.statusCode !== '0') {
    var hasFatal;

    var info = _.map(data.errors, function(error) {
      if (FATAL_ERRORS[error.errorCode]) {
        event.status = FATAL_ERRORS[error.errorCode];
        hasFatal = true;
      }

      // Extract any additional that is embedded in the message
      var parser = ERROR_PARSER[error.errorCode],
          fields = (parser && parser(error)) || [undefined];
      return _.map(fields, function(field) {
        // Output format values when we are pulling from something we know is safe like i18n
        var token = i18nLookup(error.errorCode),
            msg = error.errorMessage || error.errorCode;
        if (token) {
          msg = {
            format: error.errorCode
          };
        }

        // For each field output an error
        return {
          key: error.errorCode,
          name: field,
          message: msg,
          buttons: ERROR_BUTTONS[error.errorCode]
        };
      });
    });
    info = _.flatten(info);

    event.errorInfo = errorInfo();
    if (!hasFatal) {
      // For less than fatal errors include just the messages to display to the user
      event.status = info;
    }
  } else if (data && data.errors && data.errors.length) {
    // Log any cases where there are errors but the status is zero
    exports.trackError('server-warning', JSON.stringify(errorInfo()));
  }
});

Connection.isFatal = function(event) {
  var errors = (event.responseData || {}).errors;
  return !event.options.ignoreErrors
      && (!errors || _.any(errors, function(error) { return FATAL_ERRORS[error.errorCode]; }));
};

var fatalError = Connection.UNKNOWN_ERROR,
    notFoundError = Connection.NOT_FOUND_ERROR;
var FATAL_ERRORS = {
  'ASDAGWS_LoginRequired': Connection.SESSION_EXPIRED,

  'ASDAGWS_InternalError': Connection.SERVER_ERROR,
  'ASDAGWS_TECHNICAL_ERROR': Connection.SERVER_ERROR,
  'ASDAGWS_ORDERIDMISSING': Connection.SERVER_ERROR,

  'ASDAGWS_MissingRequiredParameters': fatalError,
  'ASDAGWS_InvalidOperation': fatalError,
  'ASDAGWS_InvalidAPIKey': fatalError,
  'ASDAGWS_InvalidSignature': fatalError,
  'ASDAGWS_InvalidHTTPMethod': fatalError,
  'ASDAGWS_InvalidRepresentationFormat': fatalError,
  'ASDAGWS_InvalidProtocol': fatalError,
  'ASDAGWS_BASKETID': fatalError,
  'ASDAGWS_InvalidResponseGroup': fatalError,
  'ASDAGWS_InvalidParamsLength': fatalError,

  // Not found error cases
  'ASDAGWS_EMPTY_DEPT_ID': notFoundError,
  'ASDAGWS_INVALID_DEPT_ID': notFoundError,
  'ASDAGWS_EMPTY_DEPT_OR_AISLE_ID': notFoundError,
  'ASDAGWS_INVALIDCATEGORYID': notFoundError
};


function errorParamName(error) {
  var match = /\{(.*?)\}/.exec(error.errorMessage);
  if (match) {
    return match[1].split(',');
  }
}

var ERROR_PARSER = {
  'ASDAGWS_InvalidFormat': errorParamName,
  'ASDAGWS_ExceededParameterLimit': errorParamName,
  'ASDAGWS_InvalidParameterCombination': errorParamName
};

var ERROR_BUTTONS = {
};
