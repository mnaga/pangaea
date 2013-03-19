/*global Connection */
var originSecure = window.location.protocol === 'https:';

function corsURL(event) {
  var options = event.options;

  // Only apply CORS options to relative URLs.
  var isExernal = exports.config.apiHost,
      secureMismatch = options.secure !== originSecure,
      protocolDefined = /^https?:\/\//.test(options.url),
      havePorts = exports.config.port || exports.config.securePort;

  if (!protocolDefined && exports.config.apiEndpoint && !/^\//.test(options.url)) {
    options.url = exports.config.apiEndpoint + options.url;
  }

  if (havePorts && (isExernal || secureMismatch) && !protocolDefined) {
    options.beforeSend = function(xhr) {
      xhr.withCredentials = 'true';
    };
    options.crossDomain = true;

    var host = exports.config.apiHost || window.location.hostname;

    // Note that we have to strip default ports as production will redirect incorrectly if the host header
    // includes the port number. This only impacts a small number of clients as most clients will
    // automatically strip these values from the header.
    if (options.secure) {
      var port = exports.config.securePort;
      host = 'https://' + host + (port !== 443 ? ':' + port : '');
    } else {
      var port = exports.config.port;
      host = 'http://' + host + (port !== 80 ? ':' + port : '');
    }
    options.url = host + options.url;
  }
}

Connection.on('start', corsURL);
