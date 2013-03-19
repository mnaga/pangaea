/*!
  * $script.js Async loader & dependency manager
  * https://github.com/ded/script.js
  * (c) Dustin Diaz, Jacob Thornton 2011
  * License: MIT
  */
(function (name, definition, context) {
  if (typeof context['module'] != 'undefined' && context['module']['exports']) context['module']['exports'] = definition()
  else if (typeof context['define'] != 'undefined' && context['define'] == 'function' && context['define']['amd']) define(name, definition)
  else context[name] = definition()
})('$script', function () {
  var doc = document
    , head = doc.getElementsByTagName('head')[0]
    , validBase = /^https?:\/\//
    , list = {}, ids = {}, delay = {}, scriptpath
    , scripts = {}, s = 'string', f = false
    , push = 'push', domContentLoaded = 'DOMContentLoaded', readyState = 'readyState'
    , addEventListener = 'addEventListener', onreadystatechange = 'onreadystatechange'

  function every(ar, fn) {
    for (var i = 0, j = ar.length; i < j; ++i) if (!fn(ar[i])) return f
    return 1
  }
  function each(ar, fn) {
    every(ar, function(el) {
      return !fn(el)
    })
  }

  if (!doc[readyState] && doc[addEventListener]) {
    doc[addEventListener](domContentLoaded, function fn() {
      doc.removeEventListener(domContentLoaded, fn, f)
      doc[readyState] = 'complete'
    }, f)
    doc[readyState] = 'loading'
  }

  function $script(paths, idOrDone, optDone) {
    paths = paths[push] ? paths : [paths]
    var idOrDoneIsDone = idOrDone && idOrDone.call
      , done = idOrDoneIsDone ? idOrDone : optDone
      , id = idOrDoneIsDone ? paths.join('') : idOrDone
      , queue = paths.length
    function loopFn(item) {
      return item.call ? item() : list[item]
    }
    function callback() {
      if (!--queue) {
        list[id] = 1
        done && done()
        for (var dset in delay) {
          every(dset.split('|'), loopFn) && !each(delay[dset], loopFn) && (delay[dset] = [])
        }
      }
    }
    setTimeout(function () {
      each(paths, function (path) {
        if (scripts[path]) {
          id && (ids[id] = 1)
          return scripts[path] == 2 && callback()
        }
        scripts[path] = 1
        id && (ids[id] = 1)
        create(!validBase.test(path) && scriptpath ? scriptpath + path + '.js' : path, callback)
      })
    }, 0)
    return $script
  }

  function create(path, fn) {
    var el = doc.createElement('script')
      , loaded = f
    el.onload = el.onerror = el[onreadystatechange] = function () {
      if ((el[readyState] && !(/^c|loade/.test(el[readyState]))) || loaded) return;
      el.onload = el[onreadystatechange] = null
      loaded = 1
      scripts[path] = 2
      fn()
    }
    el.async = 1
    el.src = path
    head.insertBefore(el, head.firstChild)
  }

  $script.get = create

  $script.order = function (scripts, id, done) {
    (function callback(s) {
      s = scripts.shift()
      if (!scripts.length) $script(s, id, done)
      else $script(s, callback)
    }())
  }

  $script.path = function (p) {
    scriptpath = p
  }
  $script.ready = function (deps, ready, req) {
    deps = deps[push] ? deps : [deps]
    var missing = [];
    !each(deps, function (dep) {
      list[dep] || missing[push](dep);
    }) && every(deps, function (dep) {return list[dep]}) ?
      ready() : !function (key) {
      delay[key] = delay[key] || []
      delay[key][push](ready)
      req && req(missing)
    }(deps.join('|'))
    return $script
  }
  return $script
}, this);

;;
/**
 * Queue.js: https://github.com/mbostock/queue
 * This version is modified from original and awaiting pull request inclusion
 *     https://github.com/mbostock/queue/pull/5

 Copyright (c) 2012, Michael Bostock
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

Redistributions of source code must retain the above copyright notice, this
list of conditions and the following disclaimer.
Redistributions in binary form must reproduce the above copyright notice,
this list of conditions and the following disclaimer in the documentation
and/or other materials provided with the distribution.
The name Michael Bostock may not be used to endorse or promote products
derived from this software without specific prior written permission.
THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL MICHAEL BOSTOCK BE LIABLE FOR ANY DIRECT,
INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY
OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

(function() {
  if (typeof module === "undefined") self.queue = queue;
  else module.exports = queue;

  queue.version = "1.0.0";

  function queue(parallelism) {
    var queue = {},
        active = 0, // number of in-flight deferrals
        remaining = 0, // number of deferrals remaining
        head, tail, // singly-linked list of deferrals
        error = null,
        results = [],
        await = [],
        awaitAll = [];

    if (arguments.length < 1) parallelism = Infinity;

    queue.defer = function() {
      if (!error) {
        var node = arguments;
        node.index = results.push(undefined) - 1;
        if (tail) tail.next = node, tail = tail.next;
        else head = tail = node;
        ++remaining;
        pop();
      }
      return queue;
    };

    queue.await = function(f) {
      await.push(f);
      if (!remaining) notifyAwait(f);
      return queue;
    };

    queue.awaitAll = function(f) {
      if (!remaining) notifyAwaitAll(f);
      awaitAll.push(f);
      return queue;
    };

    function pop() {
      if (head && active < parallelism) {
        var node = head,
            f = node[0],
            a = Array.prototype.slice.call(node, 1),
            i = node.index;
        if (head === tail) head = tail = null;
        else head = head.next;
        ++active;
        a.push(function(e, r) {
          --active;
          if (error != null) return;
          if (e != null) {
            // clearing remaining cancels subsequent callbacks
            // clearing head stops queued tasks from being executed
            // setting error ignores subsequent calls to defer
            error = e;
            remaining = results = head = tail = null;
            notify();
          } else {
            results[i] = r;
            if (--remaining) pop();
            else notify();
          }
        });
        f.apply(null, a);
      }
    }

    function notify() {
      notifyType(await, notifyAwait);
      notifyType(awaitAll, notifyAwaitAll);
    }

    function notifyType(arr, func) {
      var length = arr.length;
      for (var i=0; i<length; i++) {
        func(arr[i]);
      }
    }

    function notifyAwait(callback) {
      callback.apply(null, error ? [error] : [null].concat(results));
    }

    function notifyAwaitAll(callback) {
      callback(error, error ? undefined : results);
    }

    return queue;
  }
})();

;;
this.LocalCache = (function constructor(localStorage) {
  var MS_IN_HOUR = 3600000,   // 60*60*1000
      MS_IN_DAY = 24*MS_IN_HOUR,
      PREFIX = 'LocalCache_',
      EXPIRES_KEY = 'Expires_',
      ACCESS_KEY = 'Access_',
      EXPIRES_REGEX = /^LocalCache_Expires_.*/,
      ALL_REGEX = /^LocalCache_.*/;

  var dailyExpiration = 10*MS_IN_HOUR;   // Default to 2am PST

  var TTL = {
    WEEK: function() {
      return (Math.floor(Date.now()/MS_IN_DAY)+1)*MS_IN_DAY*7 + dailyExpiration;
    },
    DAY: function() {
      return (Math.floor(Date.now()/MS_IN_DAY)+1)*MS_IN_DAY + dailyExpiration;
    },
    HOUR: function() {
      return (Math.floor(Date.now()/MS_IN_HOUR)+1)*MS_IN_HOUR;
    },
    hours: function(numHours) {
      return function() {
        return Date.now() + (MS_IN_HOUR * numHours);
      };
    }
  };

  function setKey(key, data, ttl) {
    if (ttl) {
      localStorage.setItem(PREFIX+EXPIRES_KEY+key, ttl());
      localStorage.setItem(PREFIX+ACCESS_KEY+key, Date.now());
    }
    localStorage.setItem(PREFIX+key, data);
  }
  function removeKey(key) {
    localStorage.removeItem(PREFIX+EXPIRES_KEY+key);
    localStorage.removeItem(PREFIX+ACCESS_KEY+key);
    localStorage.removeItem(PREFIX+key);
  }
  function loadByAccess() {
    var ret = [];
    for (var i = 0, len = localStorage.length; i < len; i++) {
      var key = localStorage.key(i);
      if (EXPIRES_REGEX.test(key)) {
        key = key.substring(PREFIX.length + EXPIRES_KEY.length);
        ret.push({
          key: key,
          access: parseInt(localStorage.getItem(PREFIX+ACCESS_KEY+key) || 0, 10)
        });
      }
    }
    ret.sort(function(a, b) { return a.access-b.access; });
    return ret;
  }

  function flushExpired() {
    var now = Date.now(),
        toRemove = [];

    // Iterate over everything, scanning for anything that may be expired
    for (var i = 0, len = localStorage.length; i < len; i++) {
      var key = localStorage.key(i);
      if (EXPIRES_REGEX.test(key)) {
        if (parseInt(localStorage.getItem(key), 10) < now) {
          toRemove.push(key.substring(PREFIX.length + EXPIRES_KEY.length));
        }
      }
    }

    // Actually remove everything
    for (var i = 0, len = toRemove.length; i < len; i++) {
      removeKey(toRemove[i]);
    }
  }

  // Kill any expired content that may be in the cache as soon as we get the chance
  setTimeout(flushExpired, 0);

  // And flush every hour, if we are on the same page for that long
  // No need to run more often than that as the shortest expiration time is 1 hour
  setInterval(flushExpired, MS_IN_HOUR);

  return {
    // Exposed for unit testing purposes
    constructor: constructor,

    TTL: TTL,

    store: function(key, data, ttl) {
      // Iterate until we can store the data, we block out the cache, or we
      // hit an exception that is not a quote exception
      var cullList;
      while (!cullList || cullList.length) {
        cullList && cullList.shift();

        try {
          // Attempt to set once before loading the whole cache
          setKey(key, data, ttl);
          return true;
        } catch (err) {
          // If quota drop the things that are closest to expiration out of the cache
          if (err.name === 'QUOTA_EXCEEDED_ERR') {
            cullList = cullList || loadByAccess();
            if (cullList.length) {
              removeKey(cullList[0].key);
            }
          } else {
            throw err;
          }
        }
      }
    },
    get: function(key) {
      var expires = localStorage.getItem(PREFIX+EXPIRES_KEY+key) || 0;
      if (expires && parseInt(expires, 10) < Date.now()) {
        // Kill anything that may have expired
        removeKey(key);
        return;
      }

      if (expires) {
        try {
          localStorage.setItem(PREFIX+ACCESS_KEY+key, Date.now());
        } catch (err) {
          /* NOP: This may occur in private browsing mode... Playing it safe in case cached data surivives there. */
        }
      }
      return localStorage.getItem(PREFIX+key);
    },
    remove: function(key) {
      removeKey(key);
    },
    reset: function(hard) {
      var toRemove = [];

      for (var i = 0, len = localStorage.length; i < len; i++) {
        var key = localStorage.key(i);
        if ((hard ? ALL_REGEX : EXPIRES_REGEX).test(key)) {
          toRemove.push(key.substring(PREFIX.length + (!hard ? EXPIRES_KEY.length : 0)));
        }
      }

      // Actually remove everything
      toRemove.forEach(removeKey);
    },
    flushExpired: flushExpired
  };
}(localStorage));

;;
var Loader;
Loader = (function() {
  var module = {exports: {}};
  var exports = module.exports;
  var Loader = exports;

  /*jshint loopfunc:true */
/*global exports, lumbarLoadPrefix */
var lumbarLoader = exports.loader = {
  loadPrefix: typeof lumbarLoadPrefix === 'undefined' ? '' : lumbarLoadPrefix,

  isLoaded: function(moduleName) {
    return lumbarLoadedModules[moduleName] === true;
  },
  isLoading: function(moduleName) {
    return !!lumbarLoadedModules[moduleName];
  },

  loadModule: function(moduleName, callback, options) {
    options = options || {};

    var loaded = lumbarLoadedModules[moduleName];
    if (loaded) {
      // We have already been loaded or there is something pending. Handle it
      if (loaded === true) {
        callback();
      } else {
        loaded.push(callback);
      }
      return;
    }

    loaded = lumbarLoadedModules[moduleName] = [callback];

    var loadCount = 0,
        expected = 1,
        allInit = false,
        moduleInfo = lumbarLoader.modules && lumbarLoader.modules[moduleName];

    function complete(error) {
      loadCount++;
      if (error || (allInit && loadCount >= expected)) {
        lumbarLoadedModules[moduleName] = !error;
        if (moduleInfo && moduleInfo.preload && !options.silent) {
          preloadModules(moduleInfo.preload);
        }
        for (var i = 0, len = loaded.length; i < len; i++) {
          loaded[i](error);
        }
        lumbarLoader.loadComplete && lumbarLoader.loadComplete(moduleName, error);
      }
    }

    function loadResources(error) {
      if (!error) {
        expected += lumbarLoader.loadCSS(moduleName, complete);
        expected += lumbarLoader.loadJS(moduleName, complete);
        // If everything was done sync then fire away
        allInit = true;
      }
      complete(error);
    }

    if (moduleInfo && moduleInfo.depends) {
      var dep = moduleInfo.depends,
          queue = self.queue();
      for (var i=0; i<dep.length; i++) {
        queue.defer(lumbarLoader.loadModule, dep[i]);
      }
      queue.awaitAll(loadResources);
    } else {
      loadResources();
    }
  },

  loadInlineCSS: function(content) {
    var style = document.createElement('style');
    style.textContent = content;
    appendResourceElement(style);
    return style;
  }
};

var lumbarLoadedModules = {},
    lumbarLoadedResources = {},
    fieldAttr = {
      js: 'src',
      css: 'href'
    };
function loadResources(moduleName, field, callback, create) {
  var module = moduleName === 'base' ? lumbarLoader.map.base : lumbarLoader.modules[moduleName], // Special case for the base case
      loaded = [],
      attr = fieldAttr[field];
  field = module[field] || [];

  if (Array.isArray ? !Array.isArray(field) : Object.prototype.toString.call(field) !== '[object Array]') {
    field = [field];
  }
  for (var i = 0, len = field.length; i < len; i++) {
    var object = field[i];
    var href = checkLoadResource(object, attr);
    if (href && !lumbarLoadedResources[href]) {
      var el = create(href, function(err) {
        if (err === 'connection') {
          lumbarLoadedResources[href] = false;
        }
        callback(err);
      });
      lumbarLoadedResources[href] = true;
      if (el && el.nodeType === 1) {
        appendResourceElement(el);
      }
      loaded.push(el);
    }
  }
  return loaded;
}

function appendResourceElement(element) {
  return (document.head || document.getElementsByTagName('head')[0] || document.body).appendChild(element);
}

function preloadModules(modules) {
  for (var i = 0, len = modules.length; i < len; i++) {
    lumbarLoader.loadModule(modules[i], function() {}, {silent: true});
  }
}

var devicePixelRatio = parseFloat(sessionStorage.getItem('dpr') || window.devicePixelRatio || 1);
exports.devicePixelRatio = devicePixelRatio;
function checkLoadResource(object, attr) {
  var href = lumbarLoader.loadPrefix + (object.href || object);
  if ((!object.maxRatio || devicePixelRatio < object.maxRatio) && (!object.minRatio || object.minRatio <= devicePixelRatio)) {
    if (document.querySelector('[' + attr + '="' + href + '"]')) {
      return;
    }

    return href;
  }
}

exports.moduleMap = function(map, loadPrefix) {
  lumbarLoader.map = map;
  lumbarLoader.modules = map.modules;
  lumbarLoader.loadPrefix = loadPrefix || lumbarLoader.loadPrefix;
};

;;
/*global _, Backbone, lumbarLoader */
(function() {
  lumbarLoader.initEvents = function() {
    // Needs to be defered until we know that backbone has been loaded
    _.extend(lumbarLoader, Backbone.Events);
  };
  if (window.Backbone) {
    lumbarLoader.initEvents();
  }

  var baseLoadModule = lumbarLoader.loadModule;
  lumbarLoader.loadModule = function(moduleName, callback, options) {
    options = options || {};

    var loaded = lumbarLoader.isLoaded(moduleName);
    if (!options.silent && !loaded) {
      lumbarLoader.trigger && lumbarLoader.trigger('load:start', moduleName, undefined, lumbarLoader);
    }
    baseLoadModule(moduleName, function(error) {
      if (!options.silent && !loaded) {
        lumbarLoader.trigger && lumbarLoader.trigger('load:end', lumbarLoader);
      }
      callback(error);
    }, options);
  };
}());

;;
/*global $script, loadResources, lumbarLoader */
lumbarLoader.loadJS = function(moduleName, callback) {
  var loaded = loadResources(moduleName, 'js', callback, function(href, callback) {
    $script(href, callback);
    return 1;
  });
  return loaded.length;
};
lumbarLoader.loadCSS = function(moduleName, callback) {
  var loaded = loadResources(moduleName, 'css', callback, function(href) {
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = href;
    return link;
  });

  if (callback) {
    var interval = setInterval(function() {
      var i = loaded.length;
      while (i--) {
        var sheet = loaded[i];
        if ((sheet.sheet && ('length' in sheet.sheet.cssRules)) || (sheet.styleSheet && sheet.styleSheet.cssText)) {
          loaded.splice(i, 1);
          callback();
        }
      }
      if (!loaded.length) {
        clearInterval(interval);
      }
    }, 100);
  }
  return loaded.length;
};

;;
/* lumbar module map */
exports.moduleMap({"base":{"css":[{"href":"base.css","maxRatio":1.5},{"href":"base@2x.css","minRatio":1.5}],"js":"base.js"},"modules":{"browse-search":{"depends":["locationCore"],"js":"browse-search.js"},"loader":{"js":"loader.js"},"locationCore":{"js":"locationCore.js"},"remap":{"js":"remap.js"},"test":{"css":[{"href":"test.css","maxRatio":1.5},{"href":"test@2x.css","minRatio":1.5}],"js":"test.js"}},"routes":{"search/:searchTerms":"browse-search"}});
/*global lumbarLoadPrefix:true, phoenixConfig */
exports.initErrors = [];

function loadBaseModule() {
  exports.loader.loadModule('base', function() {
    Phoenix.init(exports);
  });
}

if (window.phoenixConfig && phoenixConfig.lumbarLoadPrefix
    && phoenixConfig.lumbarLoadPrefix != lumbarLoadPrefix) {
  // Remap the loader to the replacement lumbarLoadPrefix.
  // Note that care needs to be taken when modifying source in the loader module as
  // these might have a mismatch.
  var originalPrefix = lumbarLoadPrefix;
  lumbarLoadPrefix = exports.loader.loadPrefix = phoenixConfig.lumbarLoadPrefix;

  exports.loader.loadModule('remap', function(err) {
    if (err || !window.ReMap) {
      // Something blew up. Revert to the version that we have inlined.
      lumbarLoadPrefix = exports.loader.loadPrefix = originalPrefix;

      // Provide visibility of this failure (assuming this wasn't a complete failure and we
      // can still stand up the old version)
      exports.initErrors.push({type: 'remap-failed', msg: phoenixConfig.lumbarLoadPrefix });
    }
    loadBaseModule();
  });
} else {
  loadBaseModule();
}

;;
exports.tests = function() {
};


  if (Loader !== module.exports) {
    console.warn("Loader internally differs from global");
  }
  return module.exports;
}).call(this);

//@ sourceMappingURL=loader.js.map
