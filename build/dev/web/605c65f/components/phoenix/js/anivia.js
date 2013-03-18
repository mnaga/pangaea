/*jshint bitwise: false */
/*global Bridge, LocalCache, setCookie */
var ANIVIA_TIMEOUT = 2000,
    ANIVIA_SESSION = 29*60*1000,  // 29 minutes in milliseconds
    SID_COOKIE = '_px_sid',
    VID_COOKIE = '_px_vid';

var _aniviaConfig;

exports.trackEvent = function(eventType, properties) {
  if (!exports.config.analyticsEnabled) {
    return;
  }

  if (shouldSendAniviaEvent(eventType, properties)) {
    aniviaConfig().queue.push(getEvent(eventType, properties));
    aniviaSaveConfig();

    sendAniviaPacket();
  }
};
exports.aniviaConfig = function() {
  return {
    vid: visitorId(),
    sid: visitId()
  };
};

var sendAniviaPacket = _.debounce(function() {
  var obj = aniviaConfig();
  if (!obj.queue.length) {
    // This shouldn't happen but to be safe lets not send junk data
    return;
  }

  var payload = {
    vid: visitorId(),
    sid: visitId(),

    aVer: window.lumbarLoadPrefix,
    aid: location.hostname,

    pid: Phoenix.platformName,

    mts: Date.now(),

    events: obj.queue
  };

  $.ajax({
    type: 'POST',
    crossDomain: true,
    url: exports.isProd ? exports.config.anivia : exports.config.aniviaQA,
    contentType: 'application/json',
    data: JSON.stringify(payload),

    complete: function(xhr, status) {
      // If we have a connection error push a notification event on to the queue for later processing
      if (status === 'error' || !xhr.responseText) {
        // Sending directly here as we don't want to force another queue immediately
        aniviaConfig().queue.push(getEvent('error', { type: 'anivia-connection' }));
        aniviaSaveConfig();
      }
    }
  });

  obj.queue = [];
  aniviaSaveConfig();
}, ANIVIA_TIMEOUT);

function getEvent(eventType, properties) {
  return _.extend({event: eventType, ets: Date.now()}, properties);
}
function shouldSendAniviaEvent(eventType, properties) {
  // Connection errors are likely to come in in a single cascade. Filter it down to one.
  if (properties && properties.type === 'connection') {
    return !_.find(aniviaConfig().queue, function(entry) { return entry.type === 'connection'; });
  }
  return true;
}

function visitorId() {
  var obj = aniviaConfig();

  if (!obj.visitorId) {
    // Pull in the vid value from the config if provided or generate a new one
    obj.visitorId = exports.config.vid || genUUID();
    aniviaSaveConfig();

    // Update our cookie for the rare case that we generated our own
    if (!exports.config.vid) {
      setCookie(VID_COOKIE, obj.visitId);
    }
  }

  return obj.visitorId;
}
function visitId() {
  var obj = aniviaConfig(),
      visitId = obj.visitId;

  if (!visitId || visitId.expires < Date.now()) {
    visitId = obj.visitId = {
      // Pull in the sid value from the config if there and assume the expiration starts now
      uuid: exports.config.sid || genUUID()
    };

    // Remove the server config value if passed so we don't attempt to reuse after
    // session expiration.
    delete exports.config.sid;
  }

  // All operations push out the visit expiration time
  setCookie(SID_COOKIE, visitId.uuid, ANIVIA_SESSION);
  visitId.expires = Date.now() + ANIVIA_SESSION;
  aniviaSaveConfig();

  return visitId.uuid;
}
function aniviaConfig() {
  return _aniviaConfig || (_aniviaConfig = JSON.parse(LocalCache.get('anivia') || '{"queue":[]}'));
}
function aniviaSaveConfig() {
  if (_aniviaConfig) {
    if (!LocalCache.store('anivia', JSON.stringify(_aniviaConfig))) {
      // Log this error once and only once, otherwise we can get into an infinite loop
      if (!_aniviaConfig.storageError) {
        _aniviaConfig.storageError = true;
        exports.trackError('private-browsing', 'Failed to store anivia config');
      }
    }
  }
}

// rfc4122 version 4 compliant UUID generation
function genUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random()*16|0,
        v = c === 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
  });
}
