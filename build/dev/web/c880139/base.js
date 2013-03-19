/* Zepto v1.0rc1 - polyfill zepto event detect fx ajax form touch - zeptojs.com/license */
;(function(undefined){
  if (String.prototype.trim === undefined) // fix for iOS 3.2
    String.prototype.trim = function(){ return this.replace(/^\s+/, '').replace(/\s+$/, '') }

  // For iOS 3.x
  // from https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/reduce
  if (Array.prototype.reduce === undefined)
    Array.prototype.reduce = function(fun){
      if(this === void 0 || this === null) throw new TypeError()
      var t = Object(this), len = t.length >>> 0, k = 0, accumulator
      if(typeof fun != 'function') throw new TypeError()
      if(len == 0 && arguments.length == 1) throw new TypeError()

      if(arguments.length >= 2)
       accumulator = arguments[1]
      else
        do{
          if(k in t){
            accumulator = t[k++]
            break
          }
          if(++k >= len) throw new TypeError()
        } while (true)

      while (k < len){
        if(k in t) accumulator = fun.call(undefined, accumulator, t[k], k, t)
        k++
      }
      return accumulator
    }

})()
var Zepto = (function() {
  var undefined, key, $, classList, emptyArray = [], slice = emptyArray.slice,
    document = window.document,
    elementDisplay = {}, classCache = {},
    getComputedStyle = document.defaultView.getComputedStyle,
    cssNumber = { 'column-count': 1, 'columns': 1, 'font-weight': 1, 'line-height': 1,'opacity': 1, 'z-index': 1, 'zoom': 1 },
    fragmentRE = /^\s*<(\w+|!)[^>]*>/,

    // Used by `$.zepto.init` to wrap elements, text/comment nodes, document,
    // and document fragment node types.
    elementTypes = [1, 3, 8, 9, 11],

    adjacencyOperators = [ 'after', 'prepend', 'before', 'append' ],
    table = document.createElement('table'),
    tableRow = document.createElement('tr'),
    containers = {
      'tr': document.createElement('tbody'),
      'tbody': table, 'thead': table, 'tfoot': table,
      'td': tableRow, 'th': tableRow,
      '*': document.createElement('div')
    },
    readyRE = /complete|loaded|interactive/,
    classSelectorRE = /^\.([\w-]+)$/,
    idSelectorRE = /^#([\w-]+)$/,
    tagSelectorRE = /^[\w-]+$/,
    toString = ({}).toString,
    zepto = {},
    camelize, uniq,
    tempParent = document.createElement('div')

  zepto.matches = function(element, selector) {
    if (!element || element.nodeType !== 1) return false
    var matchesSelector = element.webkitMatchesSelector || element.mozMatchesSelector ||
                          element.oMatchesSelector || element.matchesSelector
    if (matchesSelector) return matchesSelector.call(element, selector)
    // fall back to performing a selector:
    var match, parent = element.parentNode, temp = !parent
    if (temp) (parent = tempParent).appendChild(element)
    match = ~zepto.qsa(parent, selector).indexOf(element)
    temp && tempParent.removeChild(element)
    return match
  }

  function isFunction(value) { return toString.call(value) == "[object Function]" }
  function isObject(value) { return value instanceof Object }
  function isPlainObject(value) {
    var key, ctor
    if (toString.call(value) !== "[object Object]") return false
    ctor = (isFunction(value.constructor) && value.constructor.prototype)
    if (!ctor || !hasOwnProperty.call(ctor, 'isPrototypeOf')) return false
    for (key in value);
    return key === undefined || hasOwnProperty.call(value, key)
  }
  function isArray(value) { return value instanceof Array }
  function likeArray(obj) { return typeof obj.length == 'number' }

  function compact(array) { return array.filter(function(item){ return item !== undefined && item !== null }) }
  function flatten(array) { return array.length > 0 ? [].concat.apply([], array) : array }
  camelize = function(str){ return str.replace(/-+(.)?/g, function(match, chr){ return chr ? chr.toUpperCase() : '' }) }
  function dasherize(str) {
    return str.replace(/::/g, '/')
           .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
           .replace(/([a-z\d])([A-Z])/g, '$1_$2')
           .replace(/_/g, '-')
           .toLowerCase()
  }
  uniq = function(array){ return array.filter(function(item, idx){ return array.indexOf(item) == idx }) }

  function classRE(name) {
    return name in classCache ?
      classCache[name] : (classCache[name] = new RegExp('(^|\\s)' + name + '(\\s|$)'))
  }

  function maybeAddPx(name, value) {
    return (typeof value == "number" && !cssNumber[dasherize(name)]) ? value + "px" : value
  }

  function defaultDisplay(nodeName) {
    var element, display
    if (!elementDisplay[nodeName]) {
      element = document.createElement(nodeName)
      document.body.appendChild(element)
      display = getComputedStyle(element, '').getPropertyValue("display")
      element.parentNode.removeChild(element)
      display == "none" && (display = "block")
      elementDisplay[nodeName] = display
    }
    return elementDisplay[nodeName]
  }

  // `$.zepto.fragment` takes a html string and an optional tag name
  // to generate DOM nodes nodes from the given html string.
  // The generated DOM nodes are returned as an array.
  // This function can be overriden in plugins for example to make
  // it compatible with browsers that don't support the DOM fully.
  zepto.fragment = function(html, name) {
    if (name === undefined) name = fragmentRE.test(html) && RegExp.$1
    if (!(name in containers)) name = '*'
    var container = containers[name]
    container.innerHTML = '' + html
    return $.each(slice.call(container.childNodes), function(){
      container.removeChild(this)
    })
  }

  // `$.zepto.Z` swaps out the prototype of the given `dom` array
  // of nodes with `$.fn` and thus supplying all the Zepto functions
  // to the array. Note that `__proto__` is not supported on Internet
  // Explorer. This method can be overriden in plugins.
  zepto.Z = function(dom, selector) {
    dom = dom || []
    dom.__proto__ = arguments.callee.prototype
    dom.selector = selector || ''
    return dom
  }

  // `$.zepto.isZ` should return `true` if the given object is a Zepto
  // collection. This method can be overriden in plugins.
  zepto.isZ = function(object) {
    return object instanceof zepto.Z
  }

  // `$.zepto.init` is Zepto's counterpart to jQuery's `$.fn.init` and
  // takes a CSS selector and an optional context (and handles various
  // special cases).
  // This method can be overriden in plugins.
  zepto.init = function(selector, context) {
    // If nothing given, return an empty Zepto collection
    if (!selector) return zepto.Z()
    // If a function is given, call it when the DOM is ready
    else if (isFunction(selector)) return $(document).ready(selector)
    // If a Zepto collection is given, juts return it
    else if (zepto.isZ(selector)) return selector
    else {
      var dom
      // normalize array if an array of nodes is given
      if (isArray(selector)) dom = compact(selector)
      // if a JavaScript object is given, return a copy of it
      // this is a somewhat peculiar option, but supported by
      // jQuery so we'll do it, too
      else if (isPlainObject(selector))
        dom = [$.extend({}, selector)], selector = null
      // wrap stuff like `document` or `window`
      else if (elementTypes.indexOf(selector.nodeType) >= 0 || selector === window)
        dom = [selector], selector = null
      // If it's a html fragment, create nodes from it
      else if (fragmentRE.test(selector))
        dom = zepto.fragment(selector.trim(), RegExp.$1), selector = null
      // If there's a context, create a collection on that context first, and select
      // nodes from there
      else if (context !== undefined) return $(context).find(selector)
      // And last but no least, if it's a CSS selector, use it to select nodes.
      else dom = zepto.qsa(document, selector)
      // create a new Zepto collection from the nodes found
      return zepto.Z(dom, selector)
    }
  }

  // `$` will be the base `Zepto` object. When calling this
  // function just call `$.zepto.init, whichs makes the implementation
  // details of selecting nodes and creating Zepto collections
  // patchable in plugins.
  $ = function(selector, context){
    return zepto.init(selector, context)
  }

  // Copy all but undefined properties from one or more
  // objects to the `target` object.
  $.extend = function(target){
    slice.call(arguments, 1).forEach(function(source) {
      for (key in source)
        if (source[key] !== undefined)
          target[key] = source[key]
    })
    return target
  }

  // `$.zepto.qsa` is Zepto's CSS selector implementation which
  // uses `document.querySelectorAll` and optimizes for some special cases, like `#id`.
  // This method can be overriden in plugins.
  zepto.qsa = function(element, selector){
    var found
    return (element === document && idSelectorRE.test(selector)) ?
      ( (found = element.getElementById(RegExp.$1)) ? [found] : emptyArray ) :
      (element.nodeType !== 1 && element.nodeType !== 9) ? emptyArray :
      slice.call(
        classSelectorRE.test(selector) ? element.getElementsByClassName(RegExp.$1) :
        tagSelectorRE.test(selector) ? element.getElementsByTagName(selector) :
        element.querySelectorAll(selector)
      )
  }

  function filtered(nodes, selector) {
    return selector === undefined ? $(nodes) : $(nodes).filter(selector)
  }

  function funcArg(context, arg, idx, payload) {
   return isFunction(arg) ? arg.call(context, idx, payload) : arg
  }

  $.isFunction = isFunction
  $.isObject = isObject
  $.isArray = isArray
  $.isPlainObject = isPlainObject

  $.inArray = function(elem, array, i){
    return emptyArray.indexOf.call(array, elem, i)
  }

  $.trim = function(str) { return str.trim() }

  // plugin compatibility
  $.uuid = 0

  $.map = function(elements, callback){
    var value, values = [], i, key
    if (likeArray(elements))
      for (i = 0; i < elements.length; i++) {
        value = callback(elements[i], i)
        if (value != null) values.push(value)
      }
    else
      for (key in elements) {
        value = callback(elements[key], key)
        if (value != null) values.push(value)
      }
    return flatten(values)
  }

  $.each = function(elements, callback){
    var i, key
    if (likeArray(elements)) {
      for (i = 0; i < elements.length; i++)
        if (callback.call(elements[i], i, elements[i]) === false) return elements
    } else {
      for (key in elements)
        if (callback.call(elements[key], key, elements[key]) === false) return elements
    }

    return elements
  }

  // Define methods that will be available on all
  // Zepto collections
  $.fn = {
    // Because a collection acts like an array
    // copy over these useful array functions.
    forEach: emptyArray.forEach,
    reduce: emptyArray.reduce,
    push: emptyArray.push,
    indexOf: emptyArray.indexOf,
    concat: emptyArray.concat,

    // `map` and `slice` in the jQuery API work differently
    // from their array counterparts
    map: function(fn){
      return $.map(this, function(el, i){ return fn.call(el, i, el) })
    },
    slice: function(){
      return $(slice.apply(this, arguments))
    },

    ready: function(callback){
      if (readyRE.test(document.readyState)) callback($)
      else document.addEventListener('DOMContentLoaded', function(){ callback($) }, false)
      return this
    },
    get: function(idx){
      return idx === undefined ? slice.call(this) : this[idx]
    },
    toArray: function(){ return this.get() },
    size: function(){
      return this.length
    },
    remove: function(){
      return this.each(function(){
        if (this.parentNode != null)
          this.parentNode.removeChild(this)
      })
    },
    each: function(callback){
      this.forEach(function(el, idx){ callback.call(el, idx, el) })
      return this
    },
    filter: function(selector){
      return $([].filter.call(this, function(element){
        return zepto.matches(element, selector)
      }))
    },
    add: function(selector,context){
      return $(uniq(this.concat($(selector,context))))
    },
    is: function(selector){
      return this.length > 0 && zepto.matches(this[0], selector)
    },
    not: function(selector){
      var nodes=[]
      if (isFunction(selector) && selector.call !== undefined)
        this.each(function(idx){
          if (!selector.call(this,idx)) nodes.push(this)
        })
      else {
        var excludes = typeof selector == 'string' ? this.filter(selector) :
          (likeArray(selector) && isFunction(selector.item)) ? slice.call(selector) : $(selector)
        this.forEach(function(el){
          if (excludes.indexOf(el) < 0) nodes.push(el)
        })
      }
      return $(nodes)
    },
    eq: function(idx){
      return idx === -1 ? this.slice(idx) : this.slice(idx, + idx + 1)
    },
    first: function(){
      var el = this[0]
      return el && !isObject(el) ? el : $(el)
    },
    last: function(){
      var el = this[this.length - 1]
      return el && !isObject(el) ? el : $(el)
    },
    find: function(selector){
      var result
      if (this.length == 1) result = zepto.qsa(this[0], selector)
      else result = this.map(function(){ return zepto.qsa(this, selector) })
      return $(result)
    },
    closest: function(selector, context){
      var node = this[0]
      while (node && !zepto.matches(node, selector))
        node = node !== context && node !== document && node.parentNode
      return $(node)
    },
    parents: function(selector){
      var ancestors = [], nodes = this
      while (nodes.length > 0)
        nodes = $.map(nodes, function(node){
          if ((node = node.parentNode) && node !== document && ancestors.indexOf(node) < 0) {
            ancestors.push(node)
            return node
          }
        })
      return filtered(ancestors, selector)
    },
    parent: function(selector){
      return filtered(uniq(this.pluck('parentNode')), selector)
    },
    children: function(selector){
      return filtered(this.map(function(){ return slice.call(this.children) }), selector)
    },
    siblings: function(selector){
      return filtered(this.map(function(i, el){
        return slice.call(el.parentNode.children).filter(function(child){ return child!==el })
      }), selector)
    },
    empty: function(){
      return this.each(function(){ this.innerHTML = '' })
    },
    // `pluck` is borrowed from Prototype.js
    pluck: function(property){
      return this.map(function(){ return this[property] })
    },
    show: function(){
      return this.each(function(){
        this.style.display == "none" && (this.style.display = null)
        if (getComputedStyle(this, '').getPropertyValue("display") == "none")
          this.style.display = defaultDisplay(this.nodeName)
      })
    },
    replaceWith: function(newContent){
      return this.before(newContent).remove()
    },
    wrap: function(newContent){
      return this.each(function(){
        $(this).wrapAll($(newContent)[0].cloneNode(false))
      })
    },
    wrapAll: function(newContent){
      if (this[0]) {
        $(this[0]).before(newContent = $(newContent))
        newContent.append(this)
      }
      return this
    },
    unwrap: function(){
      this.parent().each(function(){
        $(this).replaceWith($(this).children())
      })
      return this
    },
    clone: function(){
      return $(this.map(function(){ return this.cloneNode(true) }))
    },
    hide: function(){
      return this.css("display", "none")
    },
    toggle: function(setting){
      return (setting === undefined ? this.css("display") == "none" : setting) ? this.show() : this.hide()
    },
    prev: function(){ return $(this.pluck('previousElementSibling')) },
    next: function(){ return $(this.pluck('nextElementSibling')) },
    html: function(html){
      return html === undefined ?
        (this.length > 0 ? this[0].innerHTML : null) :
        this.each(function(idx){
          var originHtml = this.innerHTML
          $(this).empty().append( funcArg(this, html, idx, originHtml) )
        })
    },
    text: function(text){
      return text === undefined ?
        (this.length > 0 ? this[0].textContent : null) :
        this.each(function(){ this.textContent = text })
    },
    attr: function(name, value){
      var result
      return (typeof name == 'string' && value === undefined) ?
        (this.length == 0 || this[0].nodeType !== 1 ? undefined :
          (name == 'value' && this[0].nodeName == 'INPUT') ? this.val() :
          (!(result = this[0].getAttribute(name)) && name in this[0]) ? this[0][name] : result
        ) :
        this.each(function(idx){
          if (this.nodeType !== 1) return
          if (isObject(name)) for (key in name) this.setAttribute(key, name[key])
          else this.setAttribute(name, funcArg(this, value, idx, this.getAttribute(name)))
        })
    },
    removeAttr: function(name){
      return this.each(function(){ if (this.nodeType === 1) this.removeAttribute(name) })
    },
    prop: function(name, value){
      return (value === undefined) ?
        (this[0] ? this[0][name] : undefined) :
        this.each(function(idx){
          this[name] = funcArg(this, value, idx, this[name])
        })
    },
    data: function(name, value){
      var data = this.attr('data-' + dasherize(name), value)
      return data !== null ? data : undefined
    },
    val: function(value){
      return (value === undefined) ?
        (this.length > 0 ? this[0].value : undefined) :
        this.each(function(idx){
          this.value = funcArg(this, value, idx, this.value)
        })
    },
    offset: function(){
      if (this.length==0) return null
      var obj = this[0].getBoundingClientRect()
      return {
        left: obj.left + window.pageXOffset,
        top: obj.top + window.pageYOffset,
        width: obj.width,
        height: obj.height
      }
    },
    css: function(property, value){
      if (value === undefined && typeof property == 'string')
        return (
          this.length == 0
            ? undefined
            : this[0].style[camelize(property)] || getComputedStyle(this[0], '').getPropertyValue(property))

      var css = ''
      for (key in property)
        if(typeof property[key] == 'string' && property[key] == '')
          this.each(function(){ this.style.removeProperty(dasherize(key)) })
        else
          css += dasherize(key) + ':' + maybeAddPx(key, property[key]) + ';'

      if (typeof property == 'string')
        if (value == '')
          this.each(function(){ this.style.removeProperty(dasherize(property)) })
        else
          css = dasherize(property) + ":" + maybeAddPx(property, value)

      return this.each(function(){ this.style.cssText += ';' + css })
    },
    index: function(element){
      return element ? this.indexOf($(element)[0]) : this.parent().children().indexOf(this[0])
    },
    hasClass: function(name){
      if (this.length < 1) return false
      else return classRE(name).test(this[0].className)
    },
    addClass: function(name){
      return this.each(function(idx){
        classList = []
        var cls = this.className, newName = funcArg(this, name, idx, cls)
        newName.split(/\s+/g).forEach(function(klass){
          if (!$(this).hasClass(klass)) classList.push(klass)
        }, this)
        classList.length && (this.className += (cls ? " " : "") + classList.join(" "))
      })
    },
    removeClass: function(name){
      return this.each(function(idx){
        if (name === undefined)
          return this.className = ''
        classList = this.className
        funcArg(this, name, idx, classList).split(/\s+/g).forEach(function(klass){
          classList = classList.replace(classRE(klass), " ")
        })
        this.className = classList.trim()
      })
    },
    toggleClass: function(name, when){
      return this.each(function(idx){
        var newName = funcArg(this, name, idx, this.className)
        ;(when === undefined ? !$(this).hasClass(newName) : when) ?
          $(this).addClass(newName) : $(this).removeClass(newName)
      })
    }
  }

  // Generate the `width` and `height` functions
  ;['width', 'height'].forEach(function(dimension){
    $.fn[dimension] = function(value){
      var offset, Dimension = dimension.replace(/./, function(m){ return m[0].toUpperCase() })
      if (value === undefined) return this[0] == window ? window['inner' + Dimension] :
        this[0] == document ? document.documentElement['offset' + Dimension] :
        (offset = this.offset()) && offset[dimension]
      else return this.each(function(idx){
        var el = $(this)
        el.css(dimension, funcArg(this, value, idx, el[dimension]()))
      })
    }
  })

  function insert(operator, target, node) {
    var parent = (operator % 2) ? target : target.parentNode
    parent ? parent.insertBefore(node,
      !operator ? target.nextSibling :      // after
      operator == 1 ? parent.firstChild :   // prepend
      operator == 2 ? target :              // before
      null) :                               // append
      $(node).remove()
  }

  function traverseNode(node, fun) {
    fun(node)
    for (var key in node.childNodes) traverseNode(node.childNodes[key], fun)
  }

  // Generate the `after`, `prepend`, `before`, `append`,
  // `insertAfter`, `insertBefore`, `appendTo`, and `prependTo` methods.
  adjacencyOperators.forEach(function(key, operator) {
    $.fn[key] = function(){
      // arguments can be nodes, arrays of nodes, Zepto objects and HTML strings
      var nodes = $.map(arguments, function(n){ return isObject(n) ? n : zepto.fragment(n) })
      if (nodes.length < 1) return this
      var size = this.length, copyByClone = size > 1, inReverse = operator < 2

      return this.each(function(index, target){
        for (var i = 0; i < nodes.length; i++) {
          var node = nodes[inReverse ? nodes.length-i-1 : i]
          traverseNode(node, function(node){
            if (node.nodeName != null && node.nodeName.toUpperCase() === 'SCRIPT' && (!node.type || node.type === 'text/javascript'))
              window['eval'].call(window, node.innerHTML)
          })
          if (copyByClone && index < size - 1) node = node.cloneNode(true)
          insert(operator, target, node)
        }
      })
    }

    $.fn[(operator % 2) ? key+'To' : 'insert'+(operator ? 'Before' : 'After')] = function(html){
      $(html)[key](this)
      return this
    }
  })

  zepto.Z.prototype = $.fn

  // Export internal API functions in the `$.zepto` namespace
  zepto.camelize = camelize
  zepto.uniq = uniq
  $.zepto = zepto

  return $
})()

// If `$` is not yet defined, point it to `Zepto`
window.Zepto = Zepto
'$' in window || (window.$ = Zepto)
;(function($){
  var $$ = $.zepto.qsa, handlers = {}, _zid = 1, specialEvents={}

  specialEvents.click = specialEvents.mousedown = specialEvents.mouseup = specialEvents.mousemove = 'MouseEvents'

  function zid(element) {
    return element._zid || (element._zid = _zid++)
  }
  function findHandlers(element, event, fn, selector) {
    event = parse(event)
    if (event.ns) var matcher = matcherFor(event.ns)
    return (handlers[zid(element)] || []).filter(function(handler) {
      return handler
        && (!event.e  || handler.e == event.e)
        && (!event.ns || matcher.test(handler.ns))
        && (!fn       || zid(handler.fn) === zid(fn))
        && (!selector || handler.sel == selector)
    })
  }
  function parse(event) {
    var parts = ('' + event).split('.')
    return {e: parts[0], ns: parts.slice(1).sort().join(' ')}
  }
  function matcherFor(ns) {
    return new RegExp('(?:^| )' + ns.replace(' ', ' .* ?') + '(?: |$)')
  }

  function eachEvent(events, fn, iterator){
    if ($.isObject(events)) $.each(events, iterator)
    else events.split(/\s/).forEach(function(type){ iterator(type, fn) })
  }

  // WARN fix namespaced focus & blur events delegation. Issues #552 & #597 patched from the upstream changes:
  // https://github.com/madrobby/zepto/commit/bbb5ca17d7c1874cff2a9a7c3ea94a8c8d79a791
  // https://github.com/madrobby/zepto/commit/74bd6f531c5ba154be48e48ff223929a0f57c2fa
  function eventCapture(handler, captureSetting) {
    return handler.del &&
      (handler.e == 'focus' || handler.e == 'blur') ||
      !!captureSetting
  }

  function add(element, events, fn, selector, getDelegate, capture){
    var id = zid(element), set = (handlers[id] || (handlers[id] = []))
    eachEvent(events, fn, function(event, fn){
      var delegate = getDelegate && getDelegate(fn, event),
        callback = delegate || fn
      var proxyfn = function (event) {
        var result = callback.apply(element, [event].concat(event.data))
        if (result === false) event.preventDefault()
        return result
      }
      var handler = $.extend(parse(event), {fn: fn, proxy: proxyfn, sel: selector, del: delegate, i: set.length})
      set.push(handler)
      element.addEventListener(handler.e, proxyfn, eventCapture(handler, capture))
    })
  }
  function remove(element, events, fn, selector, capture){
    var id = zid(element)
    eachEvent(events || '', fn, function(event, fn){
      findHandlers(element, event, fn, selector).forEach(function(handler){
        delete handlers[id][handler.i]
        element.removeEventListener(handler.e, handler.proxy, eventCapture(handler, capture))
      })
    })
  }

  $.event = { add: add, remove: remove }

  $.proxy = function(fn, context) {
    if ($.isFunction(fn)) {
      var proxyFn = function(){ return fn.apply(context, arguments) }
      proxyFn._zid = zid(fn)
      return proxyFn
    } else if (typeof context == 'string') {
      return $.proxy(fn[context], fn)
    } else {
      throw new TypeError("expected function")
    }
  }

  $.fn.bind = function(event, callback){
    return this.each(function(){
      add(this, event, callback)
    })
  }
  $.fn.unbind = function(event, callback){
    return this.each(function(){
      remove(this, event, callback)
    })
  }
  $.fn.one = function(event, callback){
    return this.each(function(i, element){
      add(this, event, callback, null, function(fn, type){
        return function(){
          var result = fn.apply(element, arguments)
          remove(element, type, fn)
          return result
        }
      })
    })
  }

  var returnTrue = function(){return true},
      returnFalse = function(){return false},
      eventMethods = {
        preventDefault: 'isDefaultPrevented',
        stopImmediatePropagation: 'isImmediatePropagationStopped',
        stopPropagation: 'isPropagationStopped'
      }
  function createProxy(event) {
    var proxy = $.extend({originalEvent: event}, event)
    $.each(eventMethods, function(name, predicate) {
      proxy[name] = function(){
        this[predicate] = returnTrue
        return event[name].apply(event, arguments)
      }
      proxy[predicate] = returnFalse
    })
    return proxy
  }

  // emulates the 'defaultPrevented' property for browsers that have none
  function fix(event) {
    if (!('defaultPrevented' in event)) {
      event.defaultPrevented = false
      var prevent = event.preventDefault
      event.preventDefault = function() {
        this.defaultPrevented = true
        prevent.call(this)
      }
    }
  }

  $.fn.delegate = function(selector, event, callback){
    return this.each(function(i, element){
      add(element, event, callback, selector, function(fn){
        return function(e){
          var evt, match = $(e.target).closest(selector, element).get(0)
          if (match) {
            evt = $.extend(createProxy(e), {currentTarget: match, liveFired: element})
            return fn.apply(match, [evt].concat([].slice.call(arguments, 1)))
          }
        }
      })
    })
  }
  $.fn.undelegate = function(selector, event, callback){
    return this.each(function(){
      remove(this, event, callback, selector)
    })
  }

  $.fn.live = function(event, callback){
    $(document.body).delegate(this.selector, event, callback)
    return this
  }
  $.fn.die = function(event, callback){
    $(document.body).undelegate(this.selector, event, callback)
    return this
  }

  $.fn.on = function(event, selector, callback){
    return selector == undefined || $.isFunction(selector) ?
      this.bind(event, selector) : this.delegate(selector, event, callback)
  }
  $.fn.off = function(event, selector, callback){
    return selector == undefined || $.isFunction(selector) ?
      this.unbind(event, selector) : this.undelegate(selector, event, callback)
  }

  $.fn.trigger = function(event, data){
    if (typeof event == 'string') event = $.Event(event)
    fix(event)
    event.data = data
    return this.each(function(){
      // items in the collection might not be DOM elements
      // (todo: possibly support events on plain old objects)
      if('dispatchEvent' in this) this.dispatchEvent(event)
    })
  }

  // triggers event handlers on current element just as if an event occurred,
  // doesn't trigger an actual event, doesn't bubble
  $.fn.triggerHandler = function(event, data){
    var e, result
    this.each(function(i, element){
      e = createProxy(typeof event == 'string' ? $.Event(event) : event)
      e.data = data
      e.target = element
      $.each(findHandlers(element, event.type || event), function(i, handler){
        result = handler.proxy(e)
        if (e.isImmediatePropagationStopped()) return false
      })
    })
    return result
  }

  // shortcut methods for `.bind(event, fn)` for each event type
  ;('focusin focusout load resize scroll unload click dblclick '+
  'mousedown mouseup mousemove mouseover mouseout '+
  'change select keydown keypress keyup error').split(' ').forEach(function(event) {
    $.fn[event] = function(callback){ return this.bind(event, callback) }
  })

  ;['focus', 'blur'].forEach(function(name) {
    $.fn[name] = function(callback) {
      if (callback) this.bind(name, callback)
      else if (this.length) try { this.get(0)[name]() } catch(e){}
      return this
    }
  })

  $.Event = function(type, props) {
    var event = document.createEvent(specialEvents[type] || 'Events'), bubbles = true
    if (props) for (var name in props) (name == 'bubbles') ? (bubbles = !!props[name]) : (event[name] = props[name])
    event.initEvent(type, bubbles, true, null, null, null, null, null, null, null, null, null, null, null, null)
    return event
  }

})(Zepto)
;(function($){
  function detect(ua){
    var os = this.os = {}, browser = this.browser = {},
      webkit = ua.match(/WebKit\/([\d.]+)/),
      android = ua.match(/(Android)\s+([\d.]+)/),
      ipad = ua.match(/(iPad).*OS\s([\d_]+)/),
      iphone = !ipad && ua.match(/(iPhone\sOS)\s([\d_]+)/),
      webos = ua.match(/(webOS|hpwOS)[\s\/]([\d.]+)/),
      touchpad = webos && ua.match(/TouchPad/),
      kindle = ua.match(/Kindle\/([\d.]+)/),
      silk = ua.match(/Silk\/([\d._]+)/),
      blackberry = ua.match(/(BlackBerry).*Version\/([\d.]+)/)

    // todo clean this up with a better OS/browser
    // separation. we need to discern between multiple
    // browsers on android, and decide if kindle fire in
    // silk mode is android or not

    if (browser.webkit = !!webkit) browser.version = webkit[1]

    if (android) os.android = true, os.version = android[2]
    if (iphone) os.ios = os.iphone = true, os.version = iphone[2].replace(/_/g, '.')
    if (ipad) os.ios = os.ipad = true, os.version = ipad[2].replace(/_/g, '.')
    if (webos) os.webos = true, os.version = webos[2]
    if (touchpad) os.touchpad = true
    if (blackberry) os.blackberry = true, os.version = blackberry[2]
    if (kindle) os.kindle = true, os.version = kindle[1]
    if (silk) browser.silk = true, browser.version = silk[1]
    if (!silk && os.android && ua.match(/Kindle Fire/)) browser.silk = true
  }

  detect.call($, navigator.userAgent)
  // make available to unit tests
  $.__detect = detect

})(Zepto)
;(function($, undefined){
  var prefix = '', eventPrefix, endEventName, endAnimationName,
    vendors = { Webkit: 'webkit', Moz: '', O: 'o', ms: 'MS' },
    document = window.document, testEl = document.createElement('div'),
    supportedTransforms = /^((translate|rotate|scale)(X|Y|Z|3d)?|matrix(3d)?|perspective|skew(X|Y)?)$/i,
    clearProperties = {}

  function downcase(str) { return str.toLowerCase() }
  function normalizeEvent(name) { return eventPrefix ? eventPrefix + name : downcase(name) }

  $.each(vendors, function(vendor, event){
    if (testEl.style[vendor + 'TransitionProperty'] !== undefined) {
      prefix = '-' + downcase(vendor) + '-'
      eventPrefix = event
      return false
    }
  })

  clearProperties[prefix + 'transition-property'] =
  clearProperties[prefix + 'transition-duration'] =
  clearProperties[prefix + 'transition-timing-function'] =
  clearProperties[prefix + 'animation-name'] =
  clearProperties[prefix + 'animation-duration'] = ''

  $.fx = {
    off: (eventPrefix === undefined && testEl.style.transitionProperty === undefined),
    cssPrefix: prefix,
    transitionEnd: normalizeEvent('TransitionEnd'),
    animationEnd: normalizeEvent('AnimationEnd')
  }

  $.fn.animate = function(properties, duration, ease, callback){
    if ($.isObject(duration))
      ease = duration.easing, callback = duration.complete, duration = duration.duration
    if (duration) duration = duration / 1000
    return this.anim(properties, duration, ease, callback)
  }

  $.fn.anim = function(properties, duration, ease, callback){
    var transforms, cssProperties = {}, key, that = this, wrappedCallback, endEvent = $.fx.transitionEnd
    if (duration === undefined) duration = 0.4
    if ($.fx.off) duration = 0

    if (typeof properties == 'string') {
      // keyframe animation
      cssProperties[prefix + 'animation-name'] = properties
      cssProperties[prefix + 'animation-duration'] = duration + 's'
      endEvent = $.fx.animationEnd
    } else {
      // CSS transitions
      for (key in properties)
        if (supportedTransforms.test(key)) {
          transforms || (transforms = [])
          transforms.push(key + '(' + properties[key] + ')')
        }
        else cssProperties[key] = properties[key]

      if (transforms) cssProperties[prefix + 'transform'] = transforms.join(' ')
      if (!$.fx.off && typeof properties === 'object') {
        cssProperties[prefix + 'transition-property'] = Object.keys(properties).join(', ')
        cssProperties[prefix + 'transition-duration'] = duration + 's'
        cssProperties[prefix + 'transition-timing-function'] = (ease || 'linear')
      }
    }

    wrappedCallback = function(event){
      if (typeof event !== 'undefined') {
        if (event.target !== event.currentTarget) return // makes sure the event didn't bubble from "below"
        $(event.target).unbind(endEvent, arguments.callee)
      }
      $(this).css(clearProperties)
      callback && callback.call(this)
    }
    if (duration > 0) this.bind(endEvent, wrappedCallback)

    setTimeout(function() {
      that.css(cssProperties)
      if (duration <= 0) setTimeout(function() {
        that.each(function(){ wrappedCallback.call(this) })
      }, 0)
    }, 0)

    return this
  }

  testEl = null
})(Zepto)
;(function($){
  var jsonpID = 0,
      isObject = $.isObject,
      document = window.document,
      key,
      name,
      rscript = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      scriptTypeRE = /^(?:text|application)\/javascript/i,
      xmlTypeRE = /^(?:text|application)\/xml/i,
      jsonType = 'application/json',
      htmlType = 'text/html',
      blankRE = /^\s*$/

  // trigger a custom event and return false if it was cancelled
  function triggerAndReturn(context, eventName, data) {
    var event = $.Event(eventName)
    $(context).trigger(event, data)
    return !event.defaultPrevented
  }

  // trigger an Ajax "global" event
  function triggerGlobal(settings, context, eventName, data) {
    if (settings.global) return triggerAndReturn(context || document, eventName, data)
  }

  // Number of active Ajax requests
  $.active = 0

  function ajaxStart(settings) {
    if (settings.global && $.active++ === 0) triggerGlobal(settings, null, 'ajaxStart')
  }
  function ajaxStop(settings) {
    if (settings.global && !(--$.active)) triggerGlobal(settings, null, 'ajaxStop')
  }

  // triggers an extra global event "ajaxBeforeSend" that's like "ajaxSend" but cancelable
  function ajaxBeforeSend(xhr, settings) {
    var context = settings.context
    if (settings.beforeSend.call(context, xhr, settings) === false ||
        triggerGlobal(settings, context, 'ajaxBeforeSend', [xhr, settings]) === false)
      return false

    triggerGlobal(settings, context, 'ajaxSend', [xhr, settings])
  }
  function ajaxSuccess(data, xhr, settings) {
    var context = settings.context, status = 'success'
    settings.success.call(context, data, status, xhr)
    triggerGlobal(settings, context, 'ajaxSuccess', [xhr, settings, data])
    ajaxComplete(status, xhr, settings)
  }
  // type: "timeout", "error", "abort", "parsererror"
  function ajaxError(error, type, xhr, settings) {
    var context = settings.context
    settings.error.call(context, xhr, type, error)
    triggerGlobal(settings, context, 'ajaxError', [xhr, settings, error])
    ajaxComplete(type, xhr, settings)
  }
  // status: "success", "notmodified", "error", "timeout", "abort", "parsererror"
  function ajaxComplete(status, xhr, settings) {
    var context = settings.context
    settings.complete.call(context, xhr, status)
    triggerGlobal(settings, context, 'ajaxComplete', [xhr, settings])
    ajaxStop(settings)
  }

  // Empty function, used as default callback
  function empty() {}

  $.ajaxJSONP = function(options){
    var callbackName = 'jsonp' + (++jsonpID),
      script = document.createElement('script'),
      abort = function(){
        $(script).remove()
        if (callbackName in window) window[callbackName] = empty
        ajaxComplete('abort', xhr, options)
      },
      xhr = { abort: abort }, abortTimeout

    if (options.error) script.onerror = function() {
      xhr.abort()
      options.error()
    }

    window[callbackName] = function(data){
      clearTimeout(abortTimeout)
      $(script).remove()
      delete window[callbackName]
      ajaxSuccess(data, xhr, options)
    }

    serializeData(options)
    script.src = options.url.replace(/=\?/, '=' + callbackName)
    $('head').append(script)

    if (options.timeout > 0) abortTimeout = setTimeout(function(){
        xhr.abort()
        ajaxComplete('timeout', xhr, options)
      }, options.timeout)

    return xhr
  }

  $.ajaxSettings = {
    // Default type of request
    type: 'GET',
    // Callback that is executed before request
    beforeSend: empty,
    // Callback that is executed if the request succeeds
    success: empty,
    // Callback that is executed the the server drops error
    error: empty,
    // Callback that is executed on request complete (both: error and success)
    complete: empty,
    // The context for the callbacks
    context: null,
    // Whether to trigger "global" Ajax events
    global: true,
    // Transport
    xhr: function () {
      return new window.XMLHttpRequest()
    },
    // MIME types mapping
    accepts: {
      script: 'text/javascript, application/javascript',
      json:   jsonType,
      xml:    'application/xml, text/xml',
      html:   htmlType,
      text:   'text/plain'
    },
    // Whether the request is to another domain
    crossDomain: false,
    // Default timeout
    timeout: 0
  }

  function mimeToDataType(mime) {
    return mime && ( mime == htmlType ? 'html' :
      mime == jsonType ? 'json' :
      scriptTypeRE.test(mime) ? 'script' :
      xmlTypeRE.test(mime) && 'xml' ) || 'text'
  }

  function appendQuery(url, query) {
    return (url + '&' + query).replace(/[&?]{1,2}/, '?')
  }

  // serialize payload and append it to the URL for GET requests
  function serializeData(options) {
    if (isObject(options.data)) options.data = $.param(options.data)
    if (options.data && (!options.type || options.type.toUpperCase() == 'GET'))
      options.url = appendQuery(options.url, options.data)
  }

  $.ajax = function(options){
    var settings = $.extend({}, options || {})
    for (key in $.ajaxSettings) if (settings[key] === undefined) settings[key] = $.ajaxSettings[key]

    ajaxStart(settings)

    if (!settings.crossDomain) settings.crossDomain = /^([\w-]+:)?\/\/([^\/]+)/.test(settings.url) &&
      RegExp.$2 != window.location.host

    var dataType = settings.dataType, hasPlaceholder = /=\?/.test(settings.url)
    if (dataType == 'jsonp' || hasPlaceholder) {
      if (!hasPlaceholder) settings.url = appendQuery(settings.url, 'callback=?')
      return $.ajaxJSONP(settings)
    }

    if (!settings.url) settings.url = window.location.toString()
    serializeData(settings)

    var mime = settings.accepts[dataType],
        baseHeaders = { },
        protocol = /^([\w-]+:)\/\//.test(settings.url) ? RegExp.$1 : window.location.protocol,
        xhr = $.ajaxSettings.xhr(), abortTimeout

    if (!settings.crossDomain) baseHeaders['X-Requested-With'] = 'XMLHttpRequest'
    if (mime) {
      baseHeaders['Accept'] = mime
      if (mime.indexOf(',') > -1) mime = mime.split(',', 2)[0]
      xhr.overrideMimeType && xhr.overrideMimeType(mime)
    }
    if (settings.contentType || (settings.data && settings.type.toUpperCase() != 'GET'))
      baseHeaders['Content-Type'] = (settings.contentType || 'application/x-www-form-urlencoded')
    settings.headers = $.extend(baseHeaders, settings.headers || {})

    xhr.onreadystatechange = function(){
      if (xhr.readyState == 4) {
        clearTimeout(abortTimeout)
        var result, error = false
        if ((xhr.status >= 200 && xhr.status < 300) || xhr.status == 304 || (xhr.status == 0 && protocol == 'file:')) {
          dataType = dataType || mimeToDataType(xhr.getResponseHeader('content-type'))
          result = xhr.responseText

          try {
            if (dataType == 'script')    (1,eval)(result)
            else if (dataType == 'xml')  result = xhr.responseXML
            else if (dataType == 'json') result = blankRE.test(result) ? null : JSON.parse(result)
          } catch (e) { error = e }

          if (error) ajaxError(error, 'parsererror', xhr, settings)
          else ajaxSuccess(result, xhr, settings)
        } else {
          ajaxError(null, 'error', xhr, settings)
        }
      }
    }

    var async = 'async' in settings ? settings.async : true
    xhr.open(settings.type, settings.url, async)

    for (name in settings.headers) xhr.setRequestHeader(name, settings.headers[name])

    if (ajaxBeforeSend(xhr, settings) === false) {
      xhr.abort()
      return false
    }

    if (settings.timeout > 0) abortTimeout = setTimeout(function(){
        xhr.onreadystatechange = empty
        xhr.abort()
        ajaxError(null, 'timeout', xhr, settings)
      }, settings.timeout)

    // avoid sending empty string (#319)
    xhr.send(settings.data ? settings.data : null)
    return xhr
  }

  $.get = function(url, success){ return $.ajax({ url: url, success: success }) }

  $.post = function(url, data, success, dataType){
    if ($.isFunction(data)) dataType = dataType || success, success = data, data = null
    return $.ajax({ type: 'POST', url: url, data: data, success: success, dataType: dataType })
  }

  $.getJSON = function(url, success){
    return $.ajax({ url: url, success: success, dataType: 'json' })
  }

  $.fn.load = function(url, success){
    if (!this.length) return this
    var self = this, parts = url.split(/\s/), selector
    if (parts.length > 1) url = parts[0], selector = parts[1]
    $.get(url, function(response){
      self.html(selector ?
        $(document.createElement('div')).html(response.replace(rscript, "")).find(selector).html()
        : response)
      success && success.call(self)
    })
    return this
  }

  var escape = encodeURIComponent

  function serialize(params, obj, traditional, scope){
    var array = $.isArray(obj)
    $.each(obj, function(key, value) {
      if (scope) key = traditional ? scope : scope + '[' + (array ? '' : key) + ']'
      // handle data in serializeArray() format
      if (!scope && array) params.add(value.name, value.value)
      // recurse into nested objects
      else if (traditional ? $.isArray(value) : isObject(value))
        serialize(params, value, traditional, key)
      else params.add(key, value)
    })
  }

  $.param = function(obj, traditional){
    var params = []
    params.add = function(k, v){ this.push(escape(k) + '=' + escape(v)) }
    serialize(params, obj, traditional)
    return params.join('&').replace('%20', '+')
  }
})(Zepto)
;(function ($) {
  $.fn.serializeArray = function () {
    var result = [], el
    $( Array.prototype.slice.call(this.get(0).elements) ).each(function () {
      el = $(this)
      var type = el.attr('type')
      if (this.nodeName.toLowerCase() != 'fieldset' &&
        !this.disabled && type != 'submit' && type != 'reset' && type != 'button' &&
        ((type != 'radio' && type != 'checkbox') || this.checked))
        result.push({
          name: el.attr('name'),
          value: el.val()
        })
    })
    return result
  }

  $.fn.serialize = function () {
    var result = []
    this.serializeArray().forEach(function (elm) {
      result.push( encodeURIComponent(elm.name) + '=' + encodeURIComponent(elm.value) )
    })
    return result.join('&')
  }

  $.fn.submit = function (callback) {
    if (callback) this.bind('submit', callback)
    else if (this.length) {
      var event = $.Event('submit')
      this.eq(0).trigger(event)
      if (!event.defaultPrevented) this.get(0).submit()
    }
    return this
  }

})(Zepto)
;(function($){
  var touch = {}, touchTimeout

  function parentIfText(node){
    return 'tagName' in node ? node : node.parentNode
  }

  function swipeDirection(x1, x2, y1, y2){
    var xDelta = Math.abs(x1 - x2), yDelta = Math.abs(y1 - y2)
    return xDelta >= yDelta ? (x1 - x2 > 0 ? 'Left' : 'Right') : (y1 - y2 > 0 ? 'Up' : 'Down')
  }

  var longTapDelay = 750, longTapTimeout

  function longTap(){
    longTapTimeout = null
    if (touch.last) {
      touch.el.trigger('longTap')
      touch = {}
    }
  }

  function cancelLongTap(){
    if (longTapTimeout) clearTimeout(longTapTimeout)
    longTapTimeout = null
  }

  $(document).ready(function(){
    var now, delta

    $(document.body).bind('touchstart', function(e){
      now = Date.now()
      delta = now - (touch.last || now)
      touch.el = $(parentIfText(e.touches[0].target))
      touchTimeout && clearTimeout(touchTimeout)
      touch.x1 = e.touches[0].pageX
      touch.y1 = e.touches[0].pageY
      if (delta > 0 && delta <= 250) touch.isDoubleTap = true
      touch.last = now
      longTapTimeout = setTimeout(longTap, longTapDelay)
    }).bind('touchmove', function(e){
      cancelLongTap()
      touch.x2 = e.touches[0].pageX
      touch.y2 = e.touches[0].pageY
    }).bind('touchend', function(e){
       cancelLongTap()

      // double tap (tapped twice within 250ms)
      if (touch.isDoubleTap) {
        touch.el.trigger('doubleTap')
        touch = {}

      // swipe
      } else if ((touch.x2 && Math.abs(touch.x1 - touch.x2) > 30) ||
                 (touch.y2 && Math.abs(touch.y1 - touch.y2) > 30)) {
        touch.el.trigger('swipe') &&
          touch.el.trigger('swipe' + (swipeDirection(touch.x1, touch.x2, touch.y1, touch.y2)))
        touch = {}

      // normal tap
      } else if ('last' in touch) {
        touch.el.trigger('tap')

        touchTimeout = setTimeout(function(){
          touchTimeout = null
          touch.el.trigger('singleTap')
          touch = {}
        }, 250)
      }
    }).bind('touchcancel', function(){
      if (touchTimeout) clearTimeout(touchTimeout)
      if (longTapTimeout) clearTimeout(longTapTimeout)
      longTapTimeout = touchTimeout = null
      touch = {}
    })
  })

  ;['swipe', 'swipeLeft', 'swipeRight', 'swipeUp', 'swipeDown', 'doubleTap', 'tap', 'singleTap', 'longTap'].forEach(function(m){
    $.fn[m] = function(callback){ return this.bind(m, callback) }
  })
})(Zepto)

;;
//     Underscore.js 1.4.2
//     http://underscorejs.org
//     (c) 2009-2012 Jeremy Ashkenas, DocumentCloud Inc.
//     Underscore may be freely distributed under the MIT license.

(function() {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `global` on the server.
  var root = this;

  // Save the previous value of the `_` variable.
  var previousUnderscore = root._;

  // Establish the object that gets returned to break out of a loop iteration.
  var breaker = {};

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // Create quick reference variables for speed access to core prototypes.
  var push             = ArrayProto.push,
      slice            = ArrayProto.slice,
      concat           = ArrayProto.concat,
      unshift          = ArrayProto.unshift,
      toString         = ObjProto.toString,
      hasOwnProperty   = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var
    nativeForEach      = ArrayProto.forEach,
    nativeMap          = ArrayProto.map,
    nativeReduce       = ArrayProto.reduce,
    nativeReduceRight  = ArrayProto.reduceRight,
    nativeFilter       = ArrayProto.filter,
    nativeEvery        = ArrayProto.every,
    nativeSome         = ArrayProto.some,
    nativeIndexOf      = ArrayProto.indexOf,
    nativeLastIndexOf  = ArrayProto.lastIndexOf,
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys,
    nativeBind         = FuncProto.bind;

  // Create a safe reference to the Underscore object for use below.
  var _ = function(obj) {
    if (obj instanceof _) return obj;
    if (!(this instanceof _)) return new _(obj);
    this._wrapped = obj;
  };

  // Export the Underscore object for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `_` as a global object via a string identifier,
  // for Closure Compiler "advanced" mode.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    root['_'] = _;
  }

  // Current version.
  _.VERSION = '1.4.2';

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles objects with the built-in `forEach`, arrays, and raw objects.
  // Delegates to **ECMAScript 5**'s native `forEach` if available.
  var each = _.each = _.forEach = function(obj, iterator, context) {
    if (obj == null) return;
    if (nativeForEach && obj.forEach === nativeForEach) {
      obj.forEach(iterator, context);
    } else if (obj.length === +obj.length) {
      for (var i = 0, l = obj.length; i < l; i++) {
        if (iterator.call(context, obj[i], i, obj) === breaker) return;
      }
    } else {
      for (var key in obj) {
        if (_.has(obj, key)) {
          if (iterator.call(context, obj[key], key, obj) === breaker) return;
        }
      }
    }
  };

  // Return the results of applying the iterator to each element.
  // Delegates to **ECMAScript 5**'s native `map` if available.
  _.map = _.collect = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeMap && obj.map === nativeMap) return obj.map(iterator, context);
    each(obj, function(value, index, list) {
      results[results.length] = iterator.call(context, value, index, list);
    });
    return results;
  };

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`. Delegates to **ECMAScript 5**'s native `reduce` if available.
  _.reduce = _.foldl = _.inject = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduce && obj.reduce === nativeReduce) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduce(iterator, memo) : obj.reduce(iterator);
    }
    each(obj, function(value, index, list) {
      if (!initial) {
        memo = value;
        initial = true;
      } else {
        memo = iterator.call(context, memo, value, index, list);
      }
    });
    if (!initial) throw new TypeError('Reduce of empty array with no initial value');
    return memo;
  };

  // The right-associative version of reduce, also known as `foldr`.
  // Delegates to **ECMAScript 5**'s native `reduceRight` if available.
  _.reduceRight = _.foldr = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduceRight && obj.reduceRight === nativeReduceRight) {
      if (context) iterator = _.bind(iterator, context);
      return arguments.length > 2 ? obj.reduceRight(iterator, memo) : obj.reduceRight(iterator);
    }
    var length = obj.length;
    if (length !== +length) {
      var keys = _.keys(obj);
      length = keys.length;
    }
    each(obj, function(value, index, list) {
      index = keys ? keys[--length] : --length;
      if (!initial) {
        memo = obj[index];
        initial = true;
      } else {
        memo = iterator.call(context, memo, obj[index], index, list);
      }
    });
    if (!initial) throw new TypeError('Reduce of empty array with no initial value');
    return memo;
  };

  // Return the first value which passes a truth test. Aliased as `detect`.
  _.find = _.detect = function(obj, iterator, context) {
    var result;
    any(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) {
        result = value;
        return true;
      }
    });
    return result;
  };

  // Return all the elements that pass a truth test.
  // Delegates to **ECMAScript 5**'s native `filter` if available.
  // Aliased as `select`.
  _.filter = _.select = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeFilter && obj.filter === nativeFilter) return obj.filter(iterator, context);
    each(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) results[results.length] = value;
    });
    return results;
  };

  // Return all the elements for which a truth test fails.
  _.reject = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    each(obj, function(value, index, list) {
      if (!iterator.call(context, value, index, list)) results[results.length] = value;
    });
    return results;
  };

  // Determine whether all of the elements match a truth test.
  // Delegates to **ECMAScript 5**'s native `every` if available.
  // Aliased as `all`.
  _.every = _.all = function(obj, iterator, context) {
    iterator || (iterator = _.identity);
    var result = true;
    if (obj == null) return result;
    if (nativeEvery && obj.every === nativeEvery) return obj.every(iterator, context);
    each(obj, function(value, index, list) {
      if (!(result = result && iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if at least one element in the object matches a truth test.
  // Delegates to **ECMAScript 5**'s native `some` if available.
  // Aliased as `any`.
  var any = _.some = _.any = function(obj, iterator, context) {
    iterator || (iterator = _.identity);
    var result = false;
    if (obj == null) return result;
    if (nativeSome && obj.some === nativeSome) return obj.some(iterator, context);
    each(obj, function(value, index, list) {
      if (result || (result = iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if the array or object contains a given value (using `===`).
  // Aliased as `include`.
  _.contains = _.include = function(obj, target) {
    var found = false;
    if (obj == null) return found;
    if (nativeIndexOf && obj.indexOf === nativeIndexOf) return obj.indexOf(target) != -1;
    found = any(obj, function(value) {
      return value === target;
    });
    return found;
  };

  // Invoke a method (with arguments) on every item in a collection.
  _.invoke = function(obj, method) {
    var args = slice.call(arguments, 2);
    return _.map(obj, function(value) {
      return (_.isFunction(method) ? method : value[method]).apply(value, args);
    });
  };

  // Convenience version of a common use case of `map`: fetching a property.
  _.pluck = function(obj, key) {
    return _.map(obj, function(value){ return value[key]; });
  };

  // Convenience version of a common use case of `filter`: selecting only objects
  // with specific `key:value` pairs.
  _.where = function(obj, attrs) {
    if (_.isEmpty(attrs)) return [];
    return _.filter(obj, function(value) {
      for (var key in attrs) {
        if (attrs[key] !== value[key]) return false;
      }
      return true;
    });
  };

  // Return the maximum element or (element-based computation).
  // Can't optimize arrays of integers longer than 65,535 elements.
  // See: https://bugs.webkit.org/show_bug.cgi?id=80797
  _.max = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.max.apply(Math, obj);
    }
    if (!iterator && _.isEmpty(obj)) return -Infinity;
    var result = {computed : -Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed >= result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Return the minimum element (or element-based computation).
  _.min = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.min.apply(Math, obj);
    }
    if (!iterator && _.isEmpty(obj)) return Infinity;
    var result = {computed : Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed < result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Shuffle an array.
  _.shuffle = function(obj) {
    var rand;
    var index = 0;
    var shuffled = [];
    each(obj, function(value) {
      rand = _.random(index++);
      shuffled[index - 1] = shuffled[rand];
      shuffled[rand] = value;
    });
    return shuffled;
  };

  // An internal function to generate lookup iterators.
  var lookupIterator = function(value) {
    return _.isFunction(value) ? value : function(obj){ return obj[value]; };
  };

  // Sort the object's values by a criterion produced by an iterator.
  _.sortBy = function(obj, value, context) {
    var iterator = lookupIterator(value);
    return _.pluck(_.map(obj, function(value, index, list) {
      return {
        value : value,
        index : index,
        criteria : iterator.call(context, value, index, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria;
      var b = right.criteria;
      if (a !== b) {
        if (a > b || a === void 0) return 1;
        if (a < b || b === void 0) return -1;
      }
      return left.index < right.index ? -1 : 1;
    }), 'value');
  };

  // An internal function used for aggregate "group by" operations.
  var group = function(obj, value, context, behavior) {
    var result = {};
    var iterator = lookupIterator(value);
    each(obj, function(value, index) {
      var key = iterator.call(context, value, index, obj);
      behavior(result, key, value);
    });
    return result;
  };

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  _.groupBy = function(obj, value, context) {
    return group(obj, value, context, function(result, key, value) {
      (_.has(result, key) ? result[key] : (result[key] = [])).push(value);
    });
  };

  // Counts instances of an object that group by a certain criterion. Pass
  // either a string attribute to count by, or a function that returns the
  // criterion.
  _.countBy = function(obj, value, context) {
    return group(obj, value, context, function(result, key, value) {
      if (!_.has(result, key)) result[key] = 0;
      result[key]++;
    });
  };

  // Use a comparator function to figure out the smallest index at which
  // an object should be inserted so as to maintain order. Uses binary search.
  _.sortedIndex = function(array, obj, iterator, context) {
    iterator = iterator == null ? _.identity : lookupIterator(iterator);
    var value = iterator.call(context, obj);
    var low = 0, high = array.length;
    while (low < high) {
      var mid = (low + high) >>> 1;
      iterator.call(context, array[mid]) < value ? low = mid + 1 : high = mid;
    }
    return low;
  };

  // Safely convert anything iterable into a real, live array.
  _.toArray = function(obj) {
    if (!obj) return [];
    if (obj.length === +obj.length) return slice.call(obj);
    return _.values(obj);
  };

  // Return the number of elements in an object.
  _.size = function(obj) {
    return (obj.length === +obj.length) ? obj.length : _.keys(obj).length;
  };

  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head` and `take`. The **guard** check
  // allows it to work with `_.map`.
  _.first = _.head = _.take = function(array, n, guard) {
    return (n != null) && !guard ? slice.call(array, 0, n) : array[0];
  };

  // Returns everything but the last entry of the array. Especially useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N. The **guard** check allows it to work with
  // `_.map`.
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, array.length - ((n == null) || guard ? 1 : n));
  };

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array. The **guard** check allows it to work with `_.map`.
  _.last = function(array, n, guard) {
    if ((n != null) && !guard) {
      return slice.call(array, Math.max(array.length - n, 0));
    } else {
      return array[array.length - 1];
    }
  };

  // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
  // Especially useful on the arguments object. Passing an **n** will return
  // the rest N values in the array. The **guard**
  // check allows it to work with `_.map`.
  _.rest = _.tail = _.drop = function(array, n, guard) {
    return slice.call(array, (n == null) || guard ? 1 : n);
  };

  // Trim out all falsy values from an array.
  _.compact = function(array) {
    return _.filter(array, function(value){ return !!value; });
  };

  // Internal implementation of a recursive `flatten` function.
  var flatten = function(input, shallow, output) {
    each(input, function(value) {
      if (_.isArray(value)) {
        shallow ? push.apply(output, value) : flatten(value, shallow, output);
      } else {
        output.push(value);
      }
    });
    return output;
  };

  // Return a completely flattened version of an array.
  _.flatten = function(array, shallow) {
    return flatten(array, shallow, []);
  };

  // Return a version of the array that does not contain the specified value(s).
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  _.uniq = _.unique = function(array, isSorted, iterator, context) {
    var initial = iterator ? _.map(array, iterator, context) : array;
    var results = [];
    var seen = [];
    each(initial, function(value, index) {
      if (isSorted ? (!index || seen[seen.length - 1] !== value) : !_.contains(seen, value)) {
        seen.push(value);
        results.push(array[index]);
      }
    });
    return results;
  };

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  _.union = function() {
    return _.uniq(concat.apply(ArrayProto, arguments));
  };

  // Produce an array that contains every item shared between all the
  // passed-in arrays.
  _.intersection = function(array) {
    var rest = slice.call(arguments, 1);
    return _.filter(_.uniq(array), function(item) {
      return _.every(rest, function(other) {
        return _.indexOf(other, item) >= 0;
      });
    });
  };

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  _.difference = function(array) {
    var rest = concat.apply(ArrayProto, slice.call(arguments, 1));
    return _.filter(array, function(value){ return !_.contains(rest, value); });
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  _.zip = function() {
    var args = slice.call(arguments);
    var length = _.max(_.pluck(args, 'length'));
    var results = new Array(length);
    for (var i = 0; i < length; i++) {
      results[i] = _.pluck(args, "" + i);
    }
    return results;
  };

  // Converts lists into objects. Pass either a single array of `[key, value]`
  // pairs, or two parallel arrays of the same length -- one of keys, and one of
  // the corresponding values.
  _.object = function(list, values) {
    var result = {};
    for (var i = 0, l = list.length; i < l; i++) {
      if (values) {
        result[list[i]] = values[i];
      } else {
        result[list[i][0]] = list[i][1];
      }
    }
    return result;
  };

  // If the browser doesn't supply us with indexOf (I'm looking at you, **MSIE**),
  // we need this function. Return the position of the first occurrence of an
  // item in an array, or -1 if the item is not included in the array.
  // Delegates to **ECMAScript 5**'s native `indexOf` if available.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = function(array, item, isSorted) {
    if (array == null) return -1;
    var i = 0, l = array.length;
    if (isSorted) {
      if (typeof isSorted == 'number') {
        i = (isSorted < 0 ? Math.max(0, l + isSorted) : isSorted);
      } else {
        i = _.sortedIndex(array, item);
        return array[i] === item ? i : -1;
      }
    }
    if (nativeIndexOf && array.indexOf === nativeIndexOf) return array.indexOf(item, isSorted);
    for (; i < l; i++) if (array[i] === item) return i;
    return -1;
  };

  // Delegates to **ECMAScript 5**'s native `lastIndexOf` if available.
  _.lastIndexOf = function(array, item, from) {
    if (array == null) return -1;
    var hasIndex = from != null;
    if (nativeLastIndexOf && array.lastIndexOf === nativeLastIndexOf) {
      return hasIndex ? array.lastIndexOf(item, from) : array.lastIndexOf(item);
    }
    var i = (hasIndex ? from : array.length);
    while (i--) if (array[i] === item) return i;
    return -1;
  };

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  _.range = function(start, stop, step) {
    if (arguments.length <= 1) {
      stop = start || 0;
      start = 0;
    }
    step = arguments[2] || 1;

    var len = Math.max(Math.ceil((stop - start) / step), 0);
    var idx = 0;
    var range = new Array(len);

    while(idx < len) {
      range[idx++] = start;
      start += step;
    }

    return range;
  };

  // Function (ahem) Functions
  // ------------------

  // Reusable constructor function for prototype setting.
  var ctor = function(){};

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Binding with arguments is also known as `curry`.
  // Delegates to **ECMAScript 5**'s native `Function.bind` if available.
  // We check for `func.bind` first, to fail fast when `func` is undefined.
  _.bind = function bind(func, context) {
    var bound, args;
    if (func.bind === nativeBind && nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    if (!_.isFunction(func)) throw new TypeError;
    args = slice.call(arguments, 2);
    return bound = function() {
      if (!(this instanceof bound)) return func.apply(context, args.concat(slice.call(arguments)));
      ctor.prototype = func.prototype;
      var self = new ctor;
      var result = func.apply(self, args.concat(slice.call(arguments)));
      if (Object(result) === result) return result;
      return self;
    };
  };

  // Bind all of an object's methods to that object. Useful for ensuring that
  // all callbacks defined on an object belong to it.
  _.bindAll = function(obj) {
    var funcs = slice.call(arguments, 1);
    if (funcs.length == 0) funcs = _.functions(obj);
    each(funcs, function(f) { obj[f] = _.bind(obj[f], obj); });
    return obj;
  };

  // Memoize an expensive function by storing its results.
  _.memoize = function(func, hasher) {
    var memo = {};
    hasher || (hasher = _.identity);
    return function() {
      var key = hasher.apply(this, arguments);
      return _.has(memo, key) ? memo[key] : (memo[key] = func.apply(this, arguments));
    };
  };

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  _.delay = function(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function(){ return func.apply(null, args); }, wait);
  };

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  _.defer = function(func) {
    return _.delay.apply(_, [func, 1].concat(slice.call(arguments, 1)));
  };

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time.
  _.throttle = function(func, wait) {
    var context, args, timeout, throttling, more, result;
    var whenDone = _.debounce(function(){ more = throttling = false; }, wait);
    return function() {
      context = this; args = arguments;
      var later = function() {
        timeout = null;
        if (more) {
          result = func.apply(context, args);
        }
        whenDone();
      };
      if (!timeout) timeout = setTimeout(later, wait);
      if (throttling) {
        more = true;
      } else {
        throttling = true;
        result = func.apply(context, args);
      }
      whenDone();
      return result;
    };
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  _.debounce = function(func, wait, immediate) {
    var timeout, result;
    return function() {
      var context = this, args = arguments;
      var later = function() {
        timeout = null;
        if (!immediate) result = func.apply(context, args);
      };
      var callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) result = func.apply(context, args);
      return result;
    };
  };

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  _.once = function(func) {
    var ran = false, memo;
    return function() {
      if (ran) return memo;
      ran = true;
      memo = func.apply(this, arguments);
      func = null;
      return memo;
    };
  };

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  _.wrap = function(func, wrapper) {
    return function() {
      var args = [func];
      push.apply(args, arguments);
      return wrapper.apply(this, args);
    };
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  _.compose = function() {
    var funcs = arguments;
    return function() {
      var args = arguments;
      for (var i = funcs.length - 1; i >= 0; i--) {
        args = [funcs[i].apply(this, args)];
      }
      return args[0];
    };
  };

  // Returns a function that will only be executed after being called N times.
  _.after = function(times, func) {
    if (times <= 0) return func();
    return function() {
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  };

  // Object Functions
  // ----------------

  // Retrieve the names of an object's properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`
  _.keys = nativeKeys || function(obj) {
    if (obj !== Object(obj)) throw new TypeError('Invalid object');
    var keys = [];
    for (var key in obj) if (_.has(obj, key)) keys[keys.length] = key;
    return keys;
  };

  // Retrieve the values of an object's properties.
  _.values = function(obj) {
    var values = [];
    for (var key in obj) if (_.has(obj, key)) values.push(obj[key]);
    return values;
  };

  // Convert an object into a list of `[key, value]` pairs.
  _.pairs = function(obj) {
    var pairs = [];
    for (var key in obj) if (_.has(obj, key)) pairs.push([key, obj[key]]);
    return pairs;
  };

  // Invert the keys and values of an object. The values must be serializable.
  _.invert = function(obj) {
    var result = {};
    for (var key in obj) if (_.has(obj, key)) result[obj[key]] = key;
    return result;
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      for (var prop in source) {
        obj[prop] = source[prop];
      }
    });
    return obj;
  };

  // Return a copy of the object only containing the whitelisted properties.
  _.pick = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    each(keys, function(key) {
      if (key in obj) copy[key] = obj[key];
    });
    return copy;
  };

   // Return a copy of the object without the blacklisted properties.
  _.omit = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    for (var key in obj) {
      if (!_.contains(keys, key)) copy[key] = obj[key];
    }
    return copy;
  };

  // Fill in a given object with default properties.
  _.defaults = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      for (var prop in source) {
        if (obj[prop] == null) obj[prop] = source[prop];
      }
    });
    return obj;
  };

  // Create a (shallow-cloned) duplicate of an object.
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // Internal recursive comparison function for `isEqual`.
  var eq = function(a, b, aStack, bStack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the Harmony `egal` proposal: http://wiki.ecmascript.org/doku.php?id=harmony:egal.
    if (a === b) return a !== 0 || 1 / a == 1 / b;
    // A strict comparison is necessary because `null == undefined`.
    if (a == null || b == null) return a === b;
    // Unwrap any wrapped objects.
    if (a instanceof _) a = a._wrapped;
    if (b instanceof _) b = b._wrapped;
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className != toString.call(b)) return false;
    switch (className) {
      // Strings, numbers, dates, and booleans are compared by value.
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return a == String(b);
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive. An `egal` comparison is performed for
        // other numeric values.
        return a != +a ? b != +b : (a == 0 ? 1 / a == 1 / b : a == +b);
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a == +b;
      // RegExps are compared by their source patterns and flags.
      case '[object RegExp]':
        return a.source == b.source &&
               a.global == b.global &&
               a.multiline == b.multiline &&
               a.ignoreCase == b.ignoreCase;
    }
    if (typeof a != 'object' || typeof b != 'object') return false;
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
    var length = aStack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (aStack[length] == a) return bStack[length] == b;
    }
    // Add the first object to the stack of traversed objects.
    aStack.push(a);
    bStack.push(b);
    var size = 0, result = true;
    // Recursively compare objects and arrays.
    if (className == '[object Array]') {
      // Compare array lengths to determine if a deep comparison is necessary.
      size = a.length;
      result = size == b.length;
      if (result) {
        // Deep compare the contents, ignoring non-numeric properties.
        while (size--) {
          if (!(result = eq(a[size], b[size], aStack, bStack))) break;
        }
      }
    } else {
      // Objects with different constructors are not equivalent, but `Object`s
      // from different frames are.
      var aCtor = a.constructor, bCtor = b.constructor;
      if (aCtor !== bCtor && !(_.isFunction(aCtor) && (aCtor instanceof aCtor) &&
                               _.isFunction(bCtor) && (bCtor instanceof bCtor))) {
        return false;
      }
      // Deep compare objects.
      for (var key in a) {
        if (_.has(a, key)) {
          // Count the expected number of properties.
          size++;
          // Deep compare each member.
          if (!(result = _.has(b, key) && eq(a[key], b[key], aStack, bStack))) break;
        }
      }
      // Ensure that both objects contain the same number of properties.
      if (result) {
        for (key in b) {
          if (_.has(b, key) && !(size--)) break;
        }
        result = !size;
      }
    }
    // Remove the first object from the stack of traversed objects.
    aStack.pop();
    bStack.pop();
    return result;
  };

  // Perform a deep comparison to check if two objects are equal.
  _.isEqual = function(a, b) {
    return eq(a, b, [], []);
  };

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  _.isEmpty = function(obj) {
    if (obj == null) return true;
    if (_.isArray(obj) || _.isString(obj)) return obj.length === 0;
    for (var key in obj) if (_.has(obj, key)) return false;
    return true;
  };

  // Is a given value a DOM element?
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType === 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) == '[object Array]';
  };

  // Is a given variable an object?
  _.isObject = function(obj) {
    return obj === Object(obj);
  };

  // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp.
  each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp'], function(name) {
    _['is' + name] = function(obj) {
      return toString.call(obj) == '[object ' + name + ']';
    };
  });

  // Define a fallback version of the method in browsers (ahem, IE), where
  // there isn't any inspectable "Arguments" type.
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return !!(obj && _.has(obj, 'callee'));
    };
  }

  // Optimize `isFunction` if appropriate.
  if (typeof (/./) !== 'function') {
    _.isFunction = function(obj) {
      return typeof obj === 'function';
    };
  }

  // Is a given object a finite number?
  _.isFinite = function(obj) {
    return _.isNumber(obj) && isFinite(obj);
  };

  // Is the given value `NaN`? (NaN is the only number which does not equal itself).
  _.isNaN = function(obj) {
    return _.isNumber(obj) && obj != +obj;
  };

  // Is a given value a boolean?
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) == '[object Boolean]';
  };

  // Is a given value equal to null?
  _.isNull = function(obj) {
    return obj === null;
  };

  // Is a given variable undefined?
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // Shortcut function for checking if an object has a given property directly
  // on itself (in other words, not on a prototype).
  _.has = function(obj, key) {
    return hasOwnProperty.call(obj, key);
  };

  // Utility Functions
  // -----------------

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // Keep the identity function around for default iterators.
  _.identity = function(value) {
    return value;
  };

  // Run a function **n** times.
  _.times = function(n, iterator, context) {
    for (var i = 0; i < n; i++) iterator.call(context, i);
  };

  // Return a random integer between min and max (inclusive).
  _.random = function(min, max) {
    if (max == null) {
      max = min;
      min = 0;
    }
    return min + (0 | Math.random() * (max - min + 1));
  };

  // List of HTML entities for escaping.
  var entityMap = {
    escape: {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    }
  };
  entityMap.unescape = _.invert(entityMap.escape);

  // Regexes containing the keys and values listed immediately above.
  var entityRegexes = {
    escape:   new RegExp('[' + _.keys(entityMap.escape).join('') + ']', 'g'),
    unescape: new RegExp('(' + _.keys(entityMap.unescape).join('|') + ')', 'g')
  };

  // Functions for escaping and unescaping strings to/from HTML interpolation.
  _.each(['escape', 'unescape'], function(method) {
    _[method] = function(string) {
      if (string == null) return '';
      return ('' + string).replace(entityRegexes[method], function(match) {
        return entityMap[method][match];
      });
    };
  });

  // If the value of the named property is a function then invoke it;
  // otherwise, return it.
  _.result = function(object, property) {
    if (object == null) return null;
    var value = object[property];
    return _.isFunction(value) ? value.call(object) : value;
  };

  // Add your own custom functions to the Underscore object.
  _.mixin = function(obj) {
    each(_.functions(obj), function(name){
      var func = _[name] = obj[name];
      _.prototype[name] = function() {
        var args = [this._wrapped];
        push.apply(args, arguments);
        return result.call(this, func.apply(_, args));
      };
    });
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = idCounter++;
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  var noMatch = /(.)^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  var escapes = {
    "'":      "'",
    '\\':     '\\',
    '\r':     'r',
    '\n':     'n',
    '\t':     't',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  var escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g;

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  _.template = function(text, data, settings) {
    settings = _.defaults({}, settings, _.templateSettings);

    // Combine delimiters into one regular expression via alternation.
    var matcher = new RegExp([
      (settings.escape || noMatch).source,
      (settings.interpolate || noMatch).source,
      (settings.evaluate || noMatch).source
    ].join('|') + '|$', 'g');

    // Compile the template source, escaping string literals appropriately.
    var index = 0;
    var source = "__p+='";
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
      source += text.slice(index, offset)
        .replace(escaper, function(match) { return '\\' + escapes[match]; });
      source +=
        escape ? "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'" :
        interpolate ? "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'" :
        evaluate ? "';\n" + evaluate + "\n__p+='" : '';
      index = offset + match.length;
    });
    source += "';\n";

    // If a variable is not specified, place data values in local scope.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __t,__p='',__j=Array.prototype.join," +
      "print=function(){__p+=__j.call(arguments,'');};\n" +
      source + "return __p;\n";

    try {
      var render = new Function(settings.variable || 'obj', '_', source);
    } catch (e) {
      e.source = source;
      throw e;
    }

    if (data) return render(data, _);
    var template = function(data) {
      return render.call(this, data, _);
    };

    // Provide the compiled function source as a convenience for precompilation.
    template.source = 'function(' + (settings.variable || 'obj') + '){\n' + source + '}';

    return template;
  };

  // Add a "chain" function, which will delegate to the wrapper.
  _.chain = function(obj) {
    return _(obj).chain();
  };

  // OOP
  // ---------------
  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.

  // Helper function to continue chaining intermediate results.
  var result = function(obj) {
    return this._chain ? _(obj).chain() : obj;
  };

  // Add all of the Underscore functions to the wrapper object.
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      var obj = this._wrapped;
      method.apply(obj, arguments);
      if ((name == 'shift' || name == 'splice') && obj.length === 0) delete obj[0];
      return result.call(this, obj);
    };
  });

  // Add all accessor Array functions to the wrapper.
  each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      return result.call(this, method.apply(this._wrapped, arguments));
    };
  });

  _.extend(_.prototype, {

    // Start chaining a wrapped Underscore object.
    chain: function() {
      this._chain = true;
      return this;
    },

    // Extracts the result from a wrapped and chained object.
    value: function() {
      return this._wrapped;
    }

  });

}).call(this);

;;
//     Backbone.js 0.9.9

//     (c) 2010-2012 Jeremy Ashkenas, DocumentCloud Inc.
//     Backbone may be freely distributed under the MIT license.
//     For all details and documentation:
//     http://backbonejs.org

(function(){

  // Initial Setup
  // -------------

  // Save a reference to the global object (`window` in the browser, `exports`
  // on the server).
  var root = this;

  // Save the previous value of the `Backbone` variable, so that it can be
  // restored later on, if `noConflict` is used.
  var previousBackbone = root.Backbone;

  // Create a local reference to array methods.
  var array = [];
  var push = array.push;
  var slice = array.slice;
  var splice = array.splice;

  // The top-level namespace. All public Backbone classes and modules will
  // be attached to this. Exported for both CommonJS and the browser.
  var Backbone;
  if (typeof exports !== 'undefined') {
    Backbone = exports;
  } else {
    Backbone = root.Backbone = {};
  }

  // Current version of the library. Keep in sync with `package.json`.
  Backbone.VERSION = '0.9.9';

  // Require Underscore, if we're on the server, and it's not already present.
  var _ = root._;
  if (!_ && (typeof require !== 'undefined')) _ = require('underscore');

  // For Backbone's purposes, jQuery, Zepto, or Ender owns the `$` variable.
  Backbone.$ = root.jQuery || root.Zepto || root.ender;

  // Runs Backbone.js in *noConflict* mode, returning the `Backbone` variable
  // to its previous owner. Returns a reference to this Backbone object.
  Backbone.noConflict = function() {
    root.Backbone = previousBackbone;
    return this;
  };

  // Turn on `emulateHTTP` to support legacy HTTP servers. Setting this option
  // will fake `"PUT"` and `"DELETE"` requests via the `_method` parameter and
  // set a `X-Http-Method-Override` header.
  Backbone.emulateHTTP = false;

  // Turn on `emulateJSON` to support legacy servers that can't deal with direct
  // `application/json` requests ... will encode the body as
  // `application/x-www-form-urlencoded` instead and will send the model in a
  // form param named `model`.
  Backbone.emulateJSON = false;

  // Backbone.Events
  // ---------------

  // Regular expression used to split event strings.
  var eventSplitter = /\s+/;

  // Implement fancy features of the Events API such as multiple event
  // names `"change blur"` and jQuery-style event maps `{change: action}`
  // in terms of the existing API.
  var eventsApi = function(obj, action, name, rest) {
    if (!name) return true;
    if (typeof name === 'object') {
      for (var key in name) {
        obj[action].apply(obj, [key, name[key]].concat(rest));
      }
    } else if (eventSplitter.test(name)) {
      var names = name.split(eventSplitter);
      for (var i = 0, l = names.length; i < l; i++) {
        obj[action].apply(obj, [names[i]].concat(rest));
      }
    } else {
      return true;
    }
  };

  // Optimized internal dispatch function for triggering events. Tries to
  // keep the usual cases speedy (most Backbone events have 3 arguments).
  var triggerEvents = function(obj, events, args) {
    var ev, i = -1, l = events.length;
    switch (args.length) {
    case 0: while (++i < l) (ev = events[i]).callback.call(ev.ctx);
    return;
    case 1: while (++i < l) (ev = events[i]).callback.call(ev.ctx, args[0]);
    return;
    case 2: while (++i < l) (ev = events[i]).callback.call(ev.ctx, args[0], args[1]);
    return;
    case 3: while (++i < l) (ev = events[i]).callback.call(ev.ctx, args[0], args[1], args[2]);
    return;
    default: while (++i < l) (ev = events[i]).callback.apply(ev.ctx, args);
    }
  };

  // A module that can be mixed in to *any object* in order to provide it with
  // custom events. You may bind with `on` or remove with `off` callback
  // functions to an event; `trigger`-ing an event fires all callbacks in
  // succession.
  //
  //     var object = {};
  //     _.extend(object, Backbone.Events);
  //     object.on('expand', function(){ alert('expanded'); });
  //     object.trigger('expand');
  //
  var Events = Backbone.Events = {

    // Bind one or more space separated events, or an events map,
    // to a `callback` function. Passing `"all"` will bind the callback to
    // all events fired.
    on: function(name, callback, context) {
      if (!(eventsApi(this, 'on', name, [callback, context]) && callback)) return this;
      this._events || (this._events = {});
      var list = this._events[name] || (this._events[name] = []);
      list.push({callback: callback, context: context, ctx: context || this});
      return this;
    },

    // Bind events to only be triggered a single time. After the first time
    // the callback is invoked, it will be removed.
    once: function(name, callback, context) {
      if (!(eventsApi(this, 'once', name, [callback, context]) && callback)) return this;
      var self = this;
      var once = _.once(function() {
        self.off(name, once);
        callback.apply(this, arguments);
      });
      once._callback = callback;
      this.on(name, once, context);
      return this;
    },

    // Remove one or many callbacks. If `context` is null, removes all
    // callbacks with that function. If `callback` is null, removes all
    // callbacks for the event. If `events` is null, removes all bound
    // callbacks for all events.
    off: function(name, callback, context) {
      var list, ev, events, names, i, l, j, k;
      if (!this._events || !eventsApi(this, 'off', name, [callback, context])) return this;
      if (!name && !callback && !context) {
        this._events = {};
        return this;
      }

      names = name ? [name] : _.keys(this._events);
      for (i = 0, l = names.length; i < l; i++) {
        name = names[i];
        if (list = this._events[name]) {
          events = [];
          if (callback || context) {
            for (j = 0, k = list.length; j < k; j++) {
              ev = list[j];
              if ((callback && callback !== (ev.callback._callback || ev.callback)) ||
                  (context && context !== ev.context)) {
                events.push(ev);
              }
            }
          }
          this._events[name] = events;
        }
      }

      return this;
    },

    // Trigger one or many events, firing all bound callbacks. Callbacks are
    // passed the same arguments as `trigger` is, apart from the event name
    // (unless you're listening on `"all"`, which will cause your callback to
    // receive the true name of the event as the first argument).
    trigger: function(name) {
      if (!this._events) return this;
      var args = slice.call(arguments, 1);
      if (!eventsApi(this, 'trigger', name, args)) return this;
      var events = this._events[name];
      var allEvents = this._events.all;
      if (events) triggerEvents(this, events, args);
      if (allEvents) triggerEvents(this, allEvents, arguments);
      return this;
    },

    // An inversion-of-control version of `on`. Tell *this* object to listen to
    // an event in another object ... keeping track of what it's listening to.
    listenTo: function(object, events, callback) {
      var listeners = this._listeners || (this._listeners = {});
      var id = object._listenerId || (object._listenerId = _.uniqueId('l'));
      listeners[id] = object;
      object.on(events, callback || this, this);
      return this;
    },

    // Tell this object to stop listening to either specific events ... or
    // to every object it's currently listening to.
    stopListening: function(object, events, callback) {
      var listeners = this._listeners;
      if (!listeners) return;
      if (object) {
        object.off(events, callback, this);
        if (!events && !callback) delete listeners[object._listenerId];
      } else {
        for (var id in listeners) {
          listeners[id].off(null, null, this);
        }
        this._listeners = {};
      }
      return this;
    }
  };

  // Aliases for backwards compatibility.
  Events.bind   = Events.on;
  Events.unbind = Events.off;

  // Allow the `Backbone` object to serve as a global event bus, for folks who
  // want global "pubsub" in a convenient place.
  _.extend(Backbone, Events);

  // Backbone.Model
  // --------------

  // Create a new model, with defined attributes. A client id (`cid`)
  // is automatically generated and assigned for you.
  var Model = Backbone.Model = function(attributes, options) {
    var defaults;
    var attrs = attributes || {};
    this.cid = _.uniqueId('c');
    this.changed = {};
    this.attributes = {};
    this._changes = [];
    if (options && options.collection) this.collection = options.collection;
    if (options && options.parse) attrs = this.parse(attrs);
    if (defaults = _.result(this, 'defaults')) _.defaults(attrs, defaults);
    this.set(attrs, {silent: true});
    this._currentAttributes = _.clone(this.attributes);
    this._previousAttributes = _.clone(this.attributes);
    this.initialize.apply(this, arguments);
  };

  // Attach all inheritable methods to the Model prototype.
  _.extend(Model.prototype, Events, {

    // A hash of attributes whose current and previous value differ.
    changed: null,

    // The default name for the JSON `id` attribute is `"id"`. MongoDB and
    // CouchDB users may want to set this to `"_id"`.
    idAttribute: 'id',

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // Return a copy of the model's `attributes` object.
    toJSON: function(options) {
      return _.clone(this.attributes);
    },

    // Proxy `Backbone.sync` by default.
    sync: function() {
      return Backbone.sync.apply(this, arguments);
    },

    // Get the value of an attribute.
    get: function(attr) {
      return this.attributes[attr];
    },

    // Get the HTML-escaped value of an attribute.
    escape: function(attr) {
      return _.escape(this.get(attr));
    },

    // Returns `true` if the attribute contains a value that is not null
    // or undefined.
    has: function(attr) {
      return this.get(attr) != null;
    },

    // Set a hash of model attributes on the object, firing `"change"` unless
    // you choose to silence it.
    set: function(key, val, options) {
      var attr, attrs;
      if (key == null) return this;

      // Handle both `"key", value` and `{key: value}` -style arguments.
      if (_.isObject(key)) {
        attrs = key;
        options = val;
      } else {
        (attrs = {})[key] = val;
      }

      // Extract attributes and options.
      var silent = options && options.silent;
      var unset = options && options.unset;

      // Run validation.
      if (!this._validate(attrs, options)) return false;

      // Check for changes of `id`.
      if (this.idAttribute in attrs) this.id = attrs[this.idAttribute];

      var now = this.attributes;

      // For each `set` attribute...
      for (attr in attrs) {
        val = attrs[attr];

        // Update or delete the current value, and track the change.
        unset ? delete now[attr] : now[attr] = val;
        this._changes.push(attr, val);
      }

      // Signal that the model's state has potentially changed, and we need
      // to recompute the actual changes.
      this._hasComputed = false;

      // Fire the `"change"` events.
      if (!silent) this.change(options);
      return this;
    },

    // Remove an attribute from the model, firing `"change"` unless you choose
    // to silence it. `unset` is a noop if the attribute doesn't exist.
    unset: function(attr, options) {
      return this.set(attr, void 0, _.extend({}, options, {unset: true}));
    },

    // Clear all attributes on the model, firing `"change"` unless you choose
    // to silence it.
    clear: function(options) {
      var attrs = {};
      for (var key in this.attributes) attrs[key] = void 0;
      return this.set(attrs, _.extend({}, options, {unset: true}));
    },

    // Fetch the model from the server. If the server's representation of the
    // model differs from its current attributes, they will be overriden,
    // triggering a `"change"` event.
    fetch: function(options) {
      options = options ? _.clone(options) : {};
      if (options.parse === void 0) options.parse = true;
      var model = this;
      var success = options.success;
      options.success = function(resp, status, xhr) {
        if (!model.set(model.parse(resp), options)) return false;
        if (success) success(model, resp, options);
      };
      return this.sync('read', this, options);
    },

    // Set a hash of model attributes, and sync the model to the server.
    // If the server returns an attributes hash that differs, the model's
    // state will be `set` again.
    save: function(key, val, options) {
      var attrs, current, done;

      // Handle both `"key", value` and `{key: value}` -style arguments.
      if (key == null || _.isObject(key)) {
        attrs = key;
        options = val;
      } else if (key != null) {
        (attrs = {})[key] = val;
      }
      options = options ? _.clone(options) : {};

      // If we're "wait"-ing to set changed attributes, validate early.
      if (options.wait) {
        if (attrs && !this._validate(attrs, options)) return false;
        current = _.clone(this.attributes);
      }

      // Regular saves `set` attributes before persisting to the server.
      var silentOptions = _.extend({}, options, {silent: true});
      if (attrs && !this.set(attrs, options.wait ? silentOptions : options)) {
        return false;
      }

      // Do not persist invalid models.
      if (!attrs && !this._validate(null, options)) return false;

      // After a successful server-side save, the client is (optionally)
      // updated with the server-side state.
      var model = this;
      var success = options.success;
      options.success = function(resp, status, xhr) {
        done = true;
        var serverAttrs = model.parse(resp);
        if (options.wait) serverAttrs = _.extend(attrs || {}, serverAttrs);
        if (!model.set(serverAttrs, options)) return false;
        if (success) success(model, resp, options);
      };

      // Finish configuring and sending the Ajax request.
      var method = this.isNew() ? 'create' : (options.patch ? 'patch' : 'update');
      if (method == 'patch') options.attrs = attrs;
      var xhr = this.sync(method, this, options);

      // When using `wait`, reset attributes to original values unless
      // `success` has been called already.
      if (!done && options.wait) {
        this.clear(silentOptions);
        this.set(current, silentOptions);
      }

      return xhr;
    },

    // Destroy this model on the server if it was already persisted.
    // Optimistically removes the model from its collection, if it has one.
    // If `wait: true` is passed, waits for the server to respond before removal.
    destroy: function(options) {
      options = options ? _.clone(options) : {};
      var model = this;
      var success = options.success;

      var destroy = function() {
        model.trigger('destroy', model, model.collection, options);
      };

      options.success = function(resp) {
        if (options.wait || model.isNew()) destroy();
        if (success) success(model, resp, options);
      };

      if (this.isNew()) {
        options.success();
        return false;
      }

      var xhr = this.sync('delete', this, options);
      if (!options.wait) destroy();
      return xhr;
    },

    // Default URL for the model's representation on the server -- if you're
    // using Backbone's restful methods, override this to change the endpoint
    // that will be called.
    url: function() {
      var base = _.result(this, 'urlRoot') || _.result(this.collection, 'url') || urlError();
      if (this.isNew()) return base;
      return base + (base.charAt(base.length - 1) === '/' ? '' : '/') + encodeURIComponent(this.id);
    },

    // **parse** converts a response into the hash of attributes to be `set` on
    // the model. The default implementation is just to pass the response along.
    parse: function(resp) {
      return resp;
    },

    // Create a new model with identical attributes to this one.
    clone: function() {
      return new this.constructor(this.attributes);
    },

    // A model is new if it has never been saved to the server, and lacks an id.
    isNew: function() {
      return this.id == null;
    },

    // Call this method to manually fire a `"change"` event for this model and
    // a `"change:attribute"` event for each changed attribute.
    // Calling this will cause all objects observing the model to update.
    change: function(options) {
      var changing = this._changing;
      this._changing = true;

      // Generate the changes to be triggered on the model.
      var triggers = this._computeChanges(true);

      this._pending = !!triggers.length;

      for (var i = triggers.length - 2; i >= 0; i -= 2) {
        this.trigger('change:' + triggers[i], this, triggers[i + 1], options);
      }

      if (changing) return this;

      // Trigger a `change` while there have been changes.
      while (this._pending) {
        this._pending = false;
        this.trigger('change', this, options);
        this._previousAttributes = _.clone(this.attributes);
      }

      this._changing = false;
      return this;
    },

    // Determine if the model has changed since the last `"change"` event.
    // If you specify an attribute name, determine if that attribute has changed.
    hasChanged: function(attr) {
      if (!this._hasComputed) this._computeChanges();
      if (attr == null) return !_.isEmpty(this.changed);
      return _.has(this.changed, attr);
    },

    // Return an object containing all the attributes that have changed, or
    // false if there are no changed attributes. Useful for determining what
    // parts of a view need to be updated and/or what attributes need to be
    // persisted to the server. Unset attributes will be set to undefined.
    // You can also pass an attributes object to diff against the model,
    // determining if there *would be* a change.
    changedAttributes: function(diff) {
      if (!diff) return this.hasChanged() ? _.clone(this.changed) : false;
      var val, changed = false, old = this._previousAttributes;
      for (var attr in diff) {
        if (_.isEqual(old[attr], (val = diff[attr]))) continue;
        (changed || (changed = {}))[attr] = val;
      }
      return changed;
    },

    // Looking at the built up list of `set` attribute changes, compute how
    // many of the attributes have actually changed. If `loud`, return a
    // boiled-down list of only the real changes.
    _computeChanges: function(loud) {
      this.changed = {};
      var already = {};
      var triggers = [];
      // WARN: monkey patch for 0.9.9, will go away when upgrading
      // to future version of backbone
      var current = this._currentAttributes || {};
      var changes = this._changes;

      // Loop through the current queue of potential model changes.
      for (var i = changes.length - 2; i >= 0; i -= 2) {
        var key = changes[i], val = changes[i + 1];
        if (already[key]) continue;
        already[key] = true;

        // Check if the attribute has been modified since the last change,
        // and update `this.changed` accordingly. If we're inside of a `change`
        // call, also add a trigger to the list.
        if (current[key] !== val) {
          this.changed[key] = val;
          if (!loud) continue;
          triggers.push(key, val);
          current[key] = val;
        }
      }
      if (loud) this._changes = [];

      // Signals `this.changed` is current to prevent duplicate calls from `this.hasChanged`.
      this._hasComputed = true;
      return triggers;
    },

    // Get the previous value of an attribute, recorded at the time the last
    // `"change"` event was fired.
    previous: function(attr) {
      if (attr == null || !this._previousAttributes) return null;
      return this._previousAttributes[attr];
    },

    // Get all of the attributes of the model at the time of the previous
    // `"change"` event.
    previousAttributes: function() {
      return _.clone(this._previousAttributes);
    },

    // Run validation against the next complete set of model attributes,
    // returning `true` if all is well. If a specific `error` callback has
    // been passed, call that instead of firing the general `"error"` event.
    _validate: function(attrs, options) {
      if (!this.validate) return true;
      attrs = _.extend({}, this.attributes, attrs);
      var error = this.validate(attrs, options);
      if (!error) return true;
      if (options && options.error) options.error(this, error, options);
      this.trigger('error', this, error, options);
      return false;
    }

  });

  // Backbone.Collection
  // -------------------

  // Provides a standard collection class for our sets of models, ordered
  // or unordered. If a `comparator` is specified, the Collection will maintain
  // its models in sort order, as they're added and removed.
  var Collection = Backbone.Collection = function(models, options) {
    options || (options = {});
    if (options.model) this.model = options.model;
    if (options.comparator !== void 0) this.comparator = options.comparator;
    this._reset();
    this.initialize.apply(this, arguments);
    if (models) this.reset(models, _.extend({silent: true}, options));
  };

  // Define the Collection's inheritable methods.
  _.extend(Collection.prototype, Events, {

    // The default model for a collection is just a **Backbone.Model**.
    // This should be overridden in most cases.
    model: Model,

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // The JSON representation of a Collection is an array of the
    // models' attributes.
    toJSON: function(options) {
      return this.map(function(model){ return model.toJSON(options); });
    },

    // Proxy `Backbone.sync` by default.
    sync: function() {
      return Backbone.sync.apply(this, arguments);
    },

    // Add a model, or list of models to the set. Pass **silent** to avoid
    // firing the `add` event for every new model.
    add: function(models, options) {
      var i, args, length, model, existing, needsSort;
      var at = options && options.at;
      var sort = ((options && options.sort) == null ? true : options.sort);
      models = _.isArray(models) ? models.slice() : [models];

      // Turn bare objects into model references, and prevent invalid models
      // from being added.
      for (i = models.length - 1; i >= 0; i--) {
        if(!(model = this._prepareModel(models[i], options))) {
          this.trigger("error", this, models[i], options);
          models.splice(i, 1);
          continue;
        }
        models[i] = model;

        existing = model.id != null && this._byId[model.id];
        // If a duplicate is found, prevent it from being added and
        // optionally merge it into the existing model.
        if (existing || this._byCid[model.cid]) {
          if (options && options.merge && existing) {
            existing.set(model.attributes, options);
            needsSort = sort;
          }
          models.splice(i, 1);
          continue;
        }

        // Listen to added models' events, and index models for lookup by
        // `id` and by `cid`.
        model.on('all', this._onModelEvent, this);
        this._byCid[model.cid] = model;
        if (model.id != null) this._byId[model.id] = model;
      }

      // See if sorting is needed, update `length` and splice in new models.
      if (models.length) needsSort = sort;
      this.length += models.length;
      args = [at != null ? at : this.models.length, 0];
      push.apply(args, models);
      splice.apply(this.models, args);

      // Sort the collection if appropriate.
      if (needsSort && this.comparator && at == null) this.sort({silent: true});

      if (options && options.silent) return this;

      // Trigger `add` events.
      while (model = models.shift()) {
        model.trigger('add', model, this, options);
      }

      return this;
    },

    // Remove a model, or a list of models from the set. Pass silent to avoid
    // firing the `remove` event for every model removed.
    remove: function(models, options) {
      var i, l, index, model;
      options || (options = {});
      models = _.isArray(models) ? models.slice() : [models];
      for (i = 0, l = models.length; i < l; i++) {
        model = this.get(models[i]);
        if (!model) continue;
        delete this._byId[model.id];
        delete this._byCid[model.cid];
        index = this.indexOf(model);
        this.models.splice(index, 1);
        this.length--;
        if (!options.silent) {
          options.index = index;
          model.trigger('remove', model, this, options);
        }
        this._removeReference(model);
      }
      return this;
    },

    // Add a model to the end of the collection.
    push: function(model, options) {
      model = this._prepareModel(model, options);
      this.add(model, _.extend({at: this.length}, options));
      return model;
    },

    // Remove a model from the end of the collection.
    pop: function(options) {
      var model = this.at(this.length - 1);
      this.remove(model, options);
      return model;
    },

    // Add a model to the beginning of the collection.
    unshift: function(model, options) {
      model = this._prepareModel(model, options);
      this.add(model, _.extend({at: 0}, options));
      return model;
    },

    // Remove a model from the beginning of the collection.
    shift: function(options) {
      var model = this.at(0);
      this.remove(model, options);
      return model;
    },

    // Slice out a sub-array of models from the collection.
    slice: function(begin, end) {
      return this.models.slice(begin, end);
    },

    // Get a model from the set by id.
    get: function(obj) {
      if (obj == null) return void 0;
      return this._byId[obj.id != null ? obj.id : obj] || this._byCid[obj.cid || obj];
    },

    // Get the model at the given index.
    at: function(index) {
      return this.models[index];
    },

    // Return models with matching attributes. Useful for simple cases of `filter`.
    where: function(attrs) {
      if (_.isEmpty(attrs)) return [];
      return this.filter(function(model) {
        for (var key in attrs) {
          if (attrs[key] !== model.get(key)) return false;
        }
        return true;
      });
    },

    // Force the collection to re-sort itself. You don't need to call this under
    // normal circumstances, as the set will maintain sort order as each item
    // is added.
    sort: function(options) {
      if (!this.comparator) {
        throw new Error('Cannot sort a set without a comparator');
      }

      if (_.isString(this.comparator) || this.comparator.length === 1) {
        this.models = this.sortBy(this.comparator, this);
      } else {
        this.models.sort(_.bind(this.comparator, this));
      }

      if (!options || !options.silent) this.trigger('sort', this, options);
      return this;
    },

    // Pluck an attribute from each model in the collection.
    pluck: function(attr) {
      return _.invoke(this.models, 'get', attr);
    },

    // Smartly update a collection with a change set of models, adding,
    // removing, and merging as necessary.
    update: function(models, options) {
      var model, i, l, existing;
      var add = [], remove = [], modelMap = {};
      var idAttr = this.model.prototype.idAttribute;
      options = _.extend({add: true, merge: true, remove: true}, options);
      if (options.parse) models = this.parse(models);

      // Allow a single model (or no argument) to be passed.
      if (!_.isArray(models)) models = models ? [models] : [];

      // Proxy to `add` for this case, no need to iterate...
      if (options.add && !options.remove) return this.add(models, options);

      // Determine which models to add and merge, and which to remove.
      for (i = 0, l = models.length; i < l; i++) {
        model = models[i];
        existing = this.get(model.id || model.cid || model[idAttr]);
        if (options.remove && existing) modelMap[existing.cid] = true;
        if ((options.add && !existing) || (options.merge && existing)) {
          add.push(model);
        }
      }
      if (options.remove) {
        for (i = 0, l = this.models.length; i < l; i++) {
          model = this.models[i];
          if (!modelMap[model.cid]) remove.push(model);
        }
      }

      // Remove models (if applicable) before we add and merge the rest.
      if (remove.length) this.remove(remove, options);
      if (add.length) this.add(add, options);
      return this;
    },

    // When you have more items than you want to add or remove individually,
    // you can reset the entire set with a new list of models, without firing
    // any `add` or `remove` events. Fires `reset` when finished.
    reset: function(models, options) {
      options || (options = {});
      if (options.parse) models = this.parse(models);
      for (var i = 0, l = this.models.length; i < l; i++) {
        this._removeReference(this.models[i]);
      }
      options.previousModels = this.models;
      this._reset();
      if (models) this.add(models, _.extend({silent: true}, options));
      if (!options.silent) this.trigger('reset', this, options);
      return this;
    },

    // Fetch the default set of models for this collection, resetting the
    // collection when they arrive. If `add: true` is passed, appends the
    // models to the collection instead of resetting.
    fetch: function(options) {
      options = options ? _.clone(options) : {};
      if (options.parse === void 0) options.parse = true;
      var collection = this;
      var success = options.success;
      options.success = function(resp, status, xhr) {
        var method = options.update ? 'update' : 'reset';
        collection[method](resp, options);
        if (success) success(collection, resp, options);
      };
      return this.sync('read', this, options);
    },

    // Create a new instance of a model in this collection. Add the model to the
    // collection immediately, unless `wait: true` is passed, in which case we
    // wait for the server to agree.
    create: function(model, options) {
      var collection = this;
      options = options ? _.clone(options) : {};
      model = this._prepareModel(model, options);
      if (!model) return false;
      if (!options.wait) collection.add(model, options);
      var success = options.success;
      options.success = function(model, resp, options) {
        if (options.wait) collection.add(model, options);
        if (success) success(model, resp, options);
      };
      model.save(null, options);
      return model;
    },

    // **parse** converts a response into a list of models to be added to the
    // collection. The default implementation is just to pass it through.
    parse: function(resp) {
      return resp;
    },

    // Create a new collection with an identical list of models as this one.
    clone: function() {
      return new this.constructor(this.models);
    },

    // Proxy to _'s chain. Can't be proxied the same way the rest of the
    // underscore methods are proxied because it relies on the underscore
    // constructor.
    chain: function() {
      return _(this.models).chain();
    },

    // Reset all internal state. Called when the collection is reset.
    _reset: function() {
      this.length = 0;
      this.models = [];
      this._byId  = {};
      this._byCid = {};
    },

    // Prepare a model or hash of attributes to be added to this collection.
    _prepareModel: function(attrs, options) {
      if (attrs instanceof Model) {
        if (!attrs.collection) attrs.collection = this;
        return attrs;
      }
      options || (options = {});
      options.collection = this;
      var model = new this.model(attrs, options);
      if (!model._validate(attrs, options)) return false;
      return model;
    },

    // Internal method to remove a model's ties to a collection.
    _removeReference: function(model) {
      if (this === model.collection) delete model.collection;
      model.off('all', this._onModelEvent, this);
    },

    // Internal method called every time a model in the set fires an event.
    // Sets need to update their indexes when models change ids. All other
    // events simply proxy through. "add" and "remove" events that originate
    // in other collections are ignored.
    _onModelEvent: function(event, model, collection, options) {
      if ((event === 'add' || event === 'remove') && collection !== this) return;
      if (event === 'destroy') this.remove(model, options);
      if (model && event === 'change:' + model.idAttribute) {
        delete this._byId[model.previous(model.idAttribute)];
        if (model.id != null) this._byId[model.id] = model;
      }
      this.trigger.apply(this, arguments);
    }

  });

  // Underscore methods that we want to implement on the Collection.
  var methods = ['forEach', 'each', 'map', 'collect', 'reduce', 'foldl',
    'inject', 'reduceRight', 'foldr', 'find', 'detect', 'filter', 'select',
    'reject', 'every', 'all', 'some', 'any', 'include', 'contains', 'invoke',
    'max', 'min', 'sortedIndex', 'toArray', 'size', 'first', 'head', 'take',
    'initial', 'rest', 'tail', 'last', 'without', 'indexOf', 'shuffle',
    'lastIndexOf', 'isEmpty'];

  // Mix in each Underscore method as a proxy to `Collection#models`.
  _.each(methods, function(method) {
    Collection.prototype[method] = function() {
      var args = slice.call(arguments);
      args.unshift(this.models);
      return _[method].apply(_, args);
    };
  });

  // Underscore methods that take a property name as an argument.
  var attributeMethods = ['groupBy', 'countBy', 'sortBy'];

  // Use attributes instead of properties.
  _.each(attributeMethods, function(method) {
    Collection.prototype[method] = function(value, context) {
      var iterator = _.isFunction(value) ? value : function(model) {
        return model.get(value);
      };
      return _[method](this.models, iterator, context);
    };
  });

  // Backbone.Router
  // ---------------

  // Routers map faux-URLs to actions, and fire events when routes are
  // matched. Creating a new one sets its `routes` hash, if not set statically.
  var Router = Backbone.Router = function(options) {
    options || (options = {});
    if (options.routes) this.routes = options.routes;
    this._bindRoutes();
    this.initialize.apply(this, arguments);
  };

  // Cached regular expressions for matching named param parts and splatted
  // parts of route strings.
  var optionalParam = /\((.*?)\)/g;
  var namedParam    = /:\w+/g;
  var splatParam    = /\*\w+/g;
  var escapeRegExp  = /[\-{}\[\]+?.,\\\^$|#\s]/g;

  // Set up all inheritable **Backbone.Router** properties and methods.
  _.extend(Router.prototype, Events, {

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // Manually bind a single named route to a callback. For example:
    //
    //     this.route('search/:query/p:num', 'search', function(query, num) {
    //       ...
    //     });
    //
    route: function(route, name, callback) {
      if (!_.isRegExp(route)) route = this._routeToRegExp(route);
      if (!callback) callback = this[name];
      Backbone.history.route(route, _.bind(function(fragment) {
        var args = this._extractParameters(route, fragment);
        callback && callback.apply(this, args);
        this.trigger.apply(this, ['route:' + name].concat(args));
        Backbone.history.trigger('route', this, name, args);
      }, this));
      return this;
    },

    // Simple proxy to `Backbone.history` to save a fragment into the history.
    navigate: function(fragment, options) {
      Backbone.history.navigate(fragment, options);
      return this;
    },

    // Bind all defined routes to `Backbone.history`. We have to reverse the
    // order of the routes here to support behavior where the most general
    // routes can be defined at the bottom of the route map.
    _bindRoutes: function() {
      if (!this.routes) return;
      var route, routes = _.keys(this.routes);
      while ((route = routes.pop()) != null) {
        this.route(route, this.routes[route]);
      }
    },

    // Convert a route string into a regular expression, suitable for matching
    // against the current location hash.
    _routeToRegExp: function(route) {
      route = route.replace(escapeRegExp, '\\$&')
                   .replace(optionalParam, '(?:$1)?')
                   .replace(namedParam, '([^\/]+)')
                   .replace(splatParam, '(.*?)');
      return new RegExp('^' + route + '$');
    },

    // Given a route, and a URL fragment that it matches, return the array of
    // extracted parameters.
    _extractParameters: function(route, fragment) {
      return route.exec(fragment).slice(1);
    }

  });

  // Backbone.History
  // ----------------

  // Handles cross-browser history management, based on URL fragments. If the
  // browser does not support `onhashchange`, falls back to polling.
  var History = Backbone.History = function() {
    this.handlers = [];
    _.bindAll(this, 'checkUrl');

    // Ensure that `History` can be used outside of the browser.
    if (typeof window !== 'undefined') {
      this.location = window.location;
      this.history = window.history;
    }
  };

  // Cached regex for stripping a leading hash/slash and trailing space.
  var routeStripper = /^[#\/]|\s+$/g;

  // Cached regex for stripping leading and trailing slashes.
  var rootStripper = /^\/+|\/+$/g;

  // Cached regex for detecting MSIE.
  var isExplorer = /msie [\w.]+/;

  // Cached regex for removing a trailing slash.
  var trailingSlash = /\/$/;

  // Has the history handling already been started?
  History.started = false;

  // Set up all inheritable **Backbone.History** properties and methods.
  _.extend(History.prototype, Events, {

    // The default interval to poll for hash changes, if necessary, is
    // twenty times a second.
    interval: 50,

    // Gets the true hash value. Cannot use location.hash directly due to bug
    // in Firefox where location.hash will always be decoded.
    getHash: function(window) {
      var match = (window || this).location.href.match(/#(.*)$/);
      return match ? match[1] : '';
    },

    // Get the cross-browser normalized URL fragment, either from the URL,
    // the hash, or the override.
    getFragment: function(fragment, forcePushState) {
      if (fragment == null) {
        if (this._hasPushState || !this._wantsHashChange || forcePushState) {
          fragment = this.location.pathname;
          var root = this.root.replace(trailingSlash, '');
          if (!fragment.indexOf(root)) fragment = fragment.substr(root.length);
        } else {
          fragment = this.getHash();
        }
      }
      return fragment.replace(routeStripper, '');
    },

    // Start the hash change handling, returning `true` if the current URL matches
    // an existing route, and `false` otherwise.
    start: function(options) {
      if (History.started) throw new Error("Backbone.history has already been started");
      History.started = true;

      // Figure out the initial configuration. Do we need an iframe?
      // Is pushState desired ... is it available?
      this.options          = _.extend({}, {root: '/'}, this.options, options);
      this.root             = this.options.root;
      this._wantsHashChange = this.options.hashChange !== false;
      this._wantsPushState  = !!this.options.pushState;
      this._hasPushState    = !!(this.options.pushState && this.history && this.history.pushState);
      var fragment          = this.getFragment();
      var docMode           = document.documentMode;
      var oldIE             = (isExplorer.exec(navigator.userAgent.toLowerCase()) && (!docMode || docMode <= 7));

      // Normalize root to always include a leading and trailing slash.
      this.root = ('/' + this.root + '/').replace(rootStripper, '/');

      if (oldIE && this._wantsHashChange) {
        this.iframe = Backbone.$('<iframe src="javascript:0" tabindex="-1" />').hide().appendTo('body')[0].contentWindow;
        this.navigate(fragment);
      }

      // Depending on whether we're using pushState or hashes, and whether
      // 'onhashchange' is supported, determine how we check the URL state.
      if (this._hasPushState) {
        Backbone.$(window).bind('popstate', this.checkUrl);
      } else if (this._wantsHashChange && ('onhashchange' in window) && !oldIE) {
        Backbone.$(window).bind('hashchange', this.checkUrl);
      } else if (this._wantsHashChange) {
        this._checkUrlInterval = setInterval(this.checkUrl, this.interval);
      }

      // Determine if we need to change the base url, for a pushState link
      // opened by a non-pushState browser.
      this.fragment = fragment;
      var loc = this.location;
      var atRoot = loc.pathname.replace(/[^\/]$/, '$&/') === this.root;

      // If we've started off with a route from a `pushState`-enabled browser,
      // but we're currently in a browser that doesn't support it...
      if (this._wantsHashChange && this._wantsPushState && !this._hasPushState && !atRoot) {
        this.fragment = this.getFragment(null, true);
        this.location.replace(this.root + this.location.search + '#' + this.fragment);
        // Return immediately as browser will do redirect to new url
        return true;

      // Or if we've started out with a hash-based route, but we're currently
      // in a browser where it could be `pushState`-based instead...
      } else if (this._wantsPushState && this._hasPushState && atRoot && loc.hash) {
        this.fragment = this.getHash().replace(routeStripper, '');
        this.history.replaceState({}, document.title, this.root + this.fragment + loc.search);
      }

      if (!this.options.silent) return this.loadUrl();
    },

    // Disable Backbone.history, perhaps temporarily. Not useful in a real app,
    // but possibly useful for unit testing Routers.
    stop: function() {
      Backbone.$(window).unbind('popstate', this.checkUrl).unbind('hashchange', this.checkUrl);
      clearInterval(this._checkUrlInterval);
      History.started = false;
    },

    // Add a route to be tested when the fragment changes. Routes added later
    // may override previous routes.
    route: function(route, callback) {
      this.handlers.unshift({route: route, callback: callback});
    },

    // Checks the current URL to see if it has changed, and if it has,
    // calls `loadUrl`, normalizing across the hidden iframe.
    checkUrl: function(e) {
      var current = this.getFragment();
      if (current === this.fragment && this.iframe) {
        current = this.getFragment(this.getHash(this.iframe));
      }
      if (current === this.fragment) return false;
      if (this.iframe) this.navigate(current);
      this.loadUrl() || this.loadUrl(this.getHash());
    },

    // Attempt to load the current URL fragment. If a route succeeds with a
    // match, returns `true`. If no defined routes matches the fragment,
    // returns `false`.
    loadUrl: function(fragmentOverride) {
      var fragment = this.fragment = this.getFragment(fragmentOverride);
      var matched = _.any(this.handlers, function(handler) {
        if (handler.route.test(fragment)) {
          handler.callback(fragment);
          return true;
        }
      });
      return matched;
    },

    // Save a fragment into the hash history, or replace the URL state if the
    // 'replace' option is passed. You are responsible for properly URL-encoding
    // the fragment in advance.
    //
    // The options object can contain `trigger: true` if you wish to have the
    // route callback be fired (not usually desirable), or `replace: true`, if
    // you wish to modify the current URL without adding an entry to the history.
    navigate: function(fragment, options) {
      if (!History.started) return false;
      if (!options || options === true) options = {trigger: options};
      fragment = this.getFragment(fragment || '');
      if (this.fragment === fragment) return;
      this.fragment = fragment;
      var url = this.root + fragment;

      // If pushState is available, we use it to set the fragment as a real URL.
      if (this._hasPushState) {
        this.history[options.replace ? 'replaceState' : 'pushState']({}, document.title, url);

      // If hash changes haven't been explicitly disabled, update the hash
      // fragment to store history.
      } else if (this._wantsHashChange) {
        this._updateHash(this.location, fragment, options.replace);
        if (this.iframe && (fragment !== this.getFragment(this.getHash(this.iframe)))) {
          // Opening and closing the iframe tricks IE7 and earlier to push a
          // history entry on hash-tag change.  When replace is true, we don't
          // want this.
          if(!options.replace) this.iframe.document.open().close();
          this._updateHash(this.iframe.location, fragment, options.replace);
        }

      // If you've told us that you explicitly don't want fallback hashchange-
      // based history, then `navigate` becomes a page refresh.
      } else {
        return this.location.assign(url);
      }
      if (options.trigger) this.loadUrl(fragment);
    },

    // Update the hash location, either replacing the current entry, or adding
    // a new one to the browser history.
    _updateHash: function(location, fragment, replace) {
      if (replace) {
        var href = location.href.replace(/(javascript:|#).*$/, '');
        location.replace(href + '#' + fragment);
      } else {
        // Some browsers require that `hash` contains a leading #.
        location.hash = '#' + fragment;
      }
    }

  });

  // Create the default Backbone.history.
  Backbone.history = new History;

  // Backbone.View
  // -------------

  // Creating a Backbone.View creates its initial element outside of the DOM,
  // if an existing element is not provided...
  var View = Backbone.View = function(options) {
    this.cid = _.uniqueId('view');
    this._configure(options || {});
    this._ensureElement();
    this.initialize.apply(this, arguments);
    this.delegateEvents();
  };

  // Cached regex to split keys for `delegate`.
  var delegateEventSplitter = /^(\S+)\s*(.*)$/;

  // List of view options to be merged as properties.
  var viewOptions = ['model', 'collection', 'el', 'id', 'attributes', 'className', 'tagName', 'events'];

  // Set up all inheritable **Backbone.View** properties and methods.
  _.extend(View.prototype, Events, {

    // The default `tagName` of a View's element is `"div"`.
    tagName: 'div',

    // jQuery delegate for element lookup, scoped to DOM elements within the
    // current view. This should be prefered to global lookups where possible.
    $: function(selector) {
      return this.$el.find(selector);
    },

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // **render** is the core function that your view should override, in order
    // to populate its element (`this.el`), with the appropriate HTML. The
    // convention is for **render** to always return `this`.
    render: function() {
      return this;
    },

    // Remove this view by taking the element out of the DOM, and removing any
    // applicable Backbone.Events listeners.
    remove: function() {
      this.$el.remove();
      this.stopListening();
      return this;
    },

    // For small amounts of DOM Elements, where a full-blown template isn't
    // needed, use **make** to manufacture elements, one at a time.
    //
    //     var el = this.make('li', {'class': 'row'}, this.model.escape('title'));
    //
    make: function(tagName, attributes, content) {
      var el = document.createElement(tagName);
      if (attributes) Backbone.$(el).attr(attributes);
      if (content != null) Backbone.$(el).html(content);
      return el;
    },

    // Change the view's element (`this.el` property), including event
    // re-delegation.
    setElement: function(element, delegate) {
      if (this.$el) this.undelegateEvents();
      this.$el = element instanceof Backbone.$ ? element : Backbone.$(element);
      this.el = this.$el[0];
      if (delegate !== false) this.delegateEvents();
      return this;
    },

    // Set callbacks, where `this.events` is a hash of
    //
    // *{"event selector": "callback"}*
    //
    //     {
    //       'mousedown .title':  'edit',
    //       'click .button':     'save'
    //       'click .open':       function(e) { ... }
    //     }
    //
    // pairs. Callbacks will be bound to the view, with `this` set properly.
    // Uses event delegation for efficiency.
    // Omitting the selector binds the event to `this.el`.
    // This only works for delegate-able events: not `focus`, `blur`, and
    // not `change`, `submit`, and `reset` in Internet Explorer.
    delegateEvents: function(events) {
      if (!(events || (events = _.result(this, 'events')))) return;
      this.undelegateEvents();
      for (var key in events) {
        var method = events[key];
        if (!_.isFunction(method)) method = this[events[key]];
        if (!method) throw new Error('Method "' + events[key] + '" does not exist');
        var match = key.match(delegateEventSplitter);
        var eventName = match[1], selector = match[2];
        method = _.bind(method, this);
        eventName += '.delegateEvents' + this.cid;
        if (selector === '') {
          this.$el.bind(eventName, method);
        } else {
          this.$el.delegate(selector, eventName, method);
        }
      }
    },

    // Clears all callbacks previously bound to the view with `delegateEvents`.
    // You usually don't need to use this, but may wish to if you have multiple
    // Backbone views attached to the same DOM element.
    undelegateEvents: function() {
      this.$el.unbind('.delegateEvents' + this.cid);
    },

    // Performs the initial configuration of a View with a set of options.
    // Keys with special meaning *(model, collection, id, className)*, are
    // attached directly to the view.
    _configure: function(options) {
      if (this.options) options = _.extend({}, _.result(this, 'options'), options);
      _.extend(this, _.pick(options, viewOptions));
      this.options = options;
    },

    // Ensure that the View has a DOM element to render into.
    // If `this.el` is a string, pass it through `$()`, take the first
    // matching element, and re-assign it to `el`. Otherwise, create
    // an element from the `id`, `className` and `tagName` properties.
    _ensureElement: function() {
      if (!this.el) {
        var attrs = _.extend({}, _.result(this, 'attributes'));
        if (this.id) attrs.id = _.result(this, 'id');
        if (this.className) attrs['class'] = _.result(this, 'className');
        this.setElement(this.make(_.result(this, 'tagName'), attrs), false);
      } else {
        this.setElement(_.result(this, 'el'), false);
      }
    }

  });

  // Backbone.sync
  // -------------

  // Map from CRUD to HTTP for our default `Backbone.sync` implementation.
  var methodMap = {
    'create': 'POST',
    'update': 'PUT',
    'patch':  'PATCH',
    'delete': 'DELETE',
    'read':   'GET'
  };

  // Override this function to change the manner in which Backbone persists
  // models to the server. You will be passed the type of request, and the
  // model in question. By default, makes a RESTful Ajax request
  // to the model's `url()`. Some possible customizations could be:
  //
  // * Use `setTimeout` to batch rapid-fire updates into a single request.
  // * Send up the models as XML instead of JSON.
  // * Persist models via WebSockets instead of Ajax.
  //
  // Turn on `Backbone.emulateHTTP` in order to send `PUT` and `DELETE` requests
  // as `POST`, with a `_method` parameter containing the true HTTP method,
  // as well as all requests with the body as `application/x-www-form-urlencoded`
  // instead of `application/json` with the model in a param named `model`.
  // Useful when interfacing with server-side languages like **PHP** that make
  // it difficult to read the body of `PUT` requests.
  Backbone.sync = function(method, model, options) {
    var type = methodMap[method];

    // Default options, unless specified.
    _.defaults(options || (options = {}), {
      emulateHTTP: Backbone.emulateHTTP,
      emulateJSON: Backbone.emulateJSON
    });

    // Default JSON-request options.
    var params = {type: type, dataType: 'json'};

    // Ensure that we have a URL.
    if (!options.url) {
      params.url = _.result(model, 'url') || urlError();
    }

    // Ensure that we have the appropriate request data.
    if (options.data == null && model && (method === 'create' || method === 'update' || method === 'patch')) {
      params.contentType = 'application/json';
      params.data = JSON.stringify(options.attrs || model.toJSON(options));
    }

    // For older servers, emulate JSON by encoding the request into an HTML-form.
    if (options.emulateJSON) {
      params.contentType = 'application/x-www-form-urlencoded';
      params.data = params.data ? {model: params.data} : {};
    }

    // For older servers, emulate HTTP by mimicking the HTTP method with `_method`
    // And an `X-HTTP-Method-Override` header.
    if (options.emulateHTTP && (type === 'PUT' || type === 'DELETE' || type === 'PATCH')) {
      params.type = 'POST';
      if (options.emulateJSON) params.data._method = type;
      var beforeSend = options.beforeSend;
      options.beforeSend = function(xhr) {
        xhr.setRequestHeader('X-HTTP-Method-Override', type);
        if (beforeSend) return beforeSend.apply(this, arguments);
      };
    }

    // Don't process data on a non-GET request.
    if (params.type !== 'GET' && !options.emulateJSON) {
      params.processData = false;
    }

    var success = options.success;
    options.success = function(resp, status, xhr) {
      if (success) success(resp, status, xhr);
      model.trigger('sync', model, resp, options);
    };

    var error = options.error;
    options.error = function(xhr, status, thrown) {
      if (error) error(model, xhr, options);
      model.trigger('error', model, xhr, options);
    };

    // Make the request, allowing the user to override any Ajax options.
    var xhr = Backbone.ajax(_.extend(params, options));
    model.trigger('request', model, xhr, options);
    return xhr;
  };

  // Set the default implementation of `Backbone.ajax` to proxy through to `$`.
  Backbone.ajax = function() {
    return Backbone.$.ajax.apply(Backbone.$, arguments);
  };

  // Helpers
  // -------

  // Helper function to correctly set up the prototype chain, for subclasses.
  // Similar to `goog.inherits`, but uses a hash of prototype properties and
  // class properties to be extended.
  var extend = function(protoProps, staticProps) {
    var parent = this;
    var child;

    // The constructor function for the new subclass is either defined by you
    // (the "constructor" property in your `extend` definition), or defaulted
    // by us to simply call the parent's constructor.
    if (protoProps && _.has(protoProps, 'constructor')) {
      child = protoProps.constructor;
    } else {
      child = function(){ parent.apply(this, arguments); };
    }

    // Add static properties to the constructor function, if supplied.
    _.extend(child, parent, staticProps);

    // Set the prototype chain to inherit from `parent`, without calling
    // `parent`'s constructor function.
    var Surrogate = function(){ this.constructor = child; };
    Surrogate.prototype = parent.prototype;
    child.prototype = new Surrogate;

    // Add prototype properties (instance properties) to the subclass,
    // if supplied.
    if (protoProps) _.extend(child.prototype, protoProps);

    // Set a convenience property in case the parent's prototype is needed
    // later.
    child.__super__ = parent.prototype;

    return child;
  };

  // Set up inheritance for the model, collection, router, view and history.
  Model.extend = Collection.extend = Router.extend = View.extend = History.extend = extend;

  // Throw an error when a URL is needed, and none is supplied.
  var urlError = function() {
    throw new Error('A "url" property or function must be specified');
  };

}).call(this);
;;
// lib/handlebars/base.js

/*jshint eqnull:true*/
this.Handlebars = {};

(function(Handlebars) {

Handlebars.VERSION = "1.0.rc.1";

Handlebars.helpers  = {};
Handlebars.partials = {};

Handlebars.registerHelper = function(name, fn, inverse) {
  if(inverse) { fn.not = inverse; }
  this.helpers[name] = fn;
};

Handlebars.registerPartial = function(name, str) {
  this.partials[name] = str;
};

Handlebars.registerHelper('helperMissing', function(arg) {
  if(arguments.length === 2) {
    return undefined;
  } else {
    throw new Error("Could not find property '" + arg + "'");
  }
});

var toString = Object.prototype.toString, functionType = "[object Function]";

Handlebars.registerHelper('blockHelperMissing', function(context, options) {
  var inverse = options.inverse || function() {}, fn = options.fn;


  var ret = "";
  var type = toString.call(context);

  if(type === functionType) { context = context.call(this); }

  if(context === true) {
    return fn(this);
  } else if(context === false || context == null) {
    return inverse(this);
  } else if(type === "[object Array]") {
    if(context.length > 0) {
      return Handlebars.helpers.each(context, options);
    } else {
      return inverse(this);
    }
  } else {
    return fn(context);
  }
});

Handlebars.K = function() {};

Handlebars.createFrame = Object.create || function(object) {
  Handlebars.K.prototype = object;
  var obj = new Handlebars.K();
  Handlebars.K.prototype = null;
  return obj;
};

Handlebars.registerHelper('each', function(context, options) {
  var fn = options.fn, inverse = options.inverse;
  var ret = "", data;

  if (options.data) {
    data = Handlebars.createFrame(options.data);
  }

  if(context && context.length > 0) {
    for(var i=0, j=context.length; i<j; i++) {
      if (data) { data.index = i; }
      ret = ret + fn(context[i], { data: data });
    }
  } else {
    ret = inverse(this);
  }
  return ret;
});

Handlebars.registerHelper('if', function(context, options) {
  var type = toString.call(context);
  if(type === functionType) { context = context.call(this); }

  if(!context || Handlebars.Utils.isEmpty(context)) {
    return options.inverse(this);
  } else {
    return options.fn(this);
  }
});

Handlebars.registerHelper('unless', function(context, options) {
  var fn = options.fn, inverse = options.inverse;
  options.fn = inverse;
  options.inverse = fn;

  return Handlebars.helpers['if'].call(this, context, options);
});

Handlebars.registerHelper('with', function(context, options) {
  return options.fn(context);
});

Handlebars.registerHelper('log', function(context) {
  Handlebars.log(context);
});

}(this.Handlebars));
;
// lib/handlebars/utils.js
Handlebars.Exception = function(message) {
  var tmp = Error.prototype.constructor.apply(this, arguments);

  for (var p in tmp) {
    if (tmp.hasOwnProperty(p)) { this[p] = tmp[p]; }
  }

  this.message = tmp.message;
};
Handlebars.Exception.prototype = new Error();

// Build out our basic SafeString type
Handlebars.SafeString = function(string) {
  this.string = string;
};
Handlebars.SafeString.prototype.toString = function() {
  return this.string.toString();
};

(function() {
  var escape = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
    "`": "&#x60;"
  };

  var badChars = /[&<>"'`]/g;
  var possible = /[&<>"'`]/;

  var escapeChar = function(chr) {
    return escape[chr] || "&amp;";
  };

  Handlebars.Utils = {
    escapeExpression: function(string) {
      // don't escape SafeStrings, since they're already safe
      if (string instanceof Handlebars.SafeString) {
        return string.toString();
      } else if (string == null || string === false) {
        return "";
      }

      if(!possible.test(string)) { return string; }
      return string.replace(badChars, escapeChar);
    },

    isEmpty: function(value) {
      if (typeof value === "undefined") {
        return true;
      } else if (value === null) {
        return true;
      } else if (value === false) {
        return true;
      } else if(Object.prototype.toString.call(value) === "[object Array]" && value.length === 0) {
        return true;
      } else {
        return false;
      }
    }
  };
})();;
// lib/handlebars/runtime.js
Handlebars.VM = {
  template: function(templateSpec) {
    // Just add water
    var container = {
      escapeExpression: Handlebars.Utils.escapeExpression,
      invokePartial: Handlebars.VM.invokePartial,
      programs: [],
      program: function(i, fn, data) {
        var programWrapper = this.programs[i];
        if(data) {
          programWrapper = Handlebars.VM.program(fn, data);
          programWrapper.program = i;
        } else if (!programWrapper) {
          programWrapper = this.programs[i] = Handlebars.VM.program(fn);
          programWrapper.program = i;
        }
        return programWrapper;
      },
      programWithDepth: Handlebars.VM.programWithDepth,
      noop: Handlebars.VM.noop
    };

    return function(context, options) {
      options = options || {};
      return templateSpec.call(container, Handlebars, context, options.helpers, options.partials, options.data);
    };
  },

  programWithDepth: function(fn, data, $depth) {
    var args = Array.prototype.slice.call(arguments, 2);

    return function(context, options) {
      options = options || {};

      return fn.apply(this, [context, options.data || data].concat(args));
    };
  },
  program: function(fn, data) {
    return function(context, options) {
      options = options || {};

      return fn(context, options.data || data);
    };
  },
  noop: function() { return ""; },
  invokePartial: function(partial, name, context, helpers, partials, data) {
    var options = { helpers: helpers, partials: partials, data: data };

    if(partial === undefined) {
      throw new Handlebars.Exception("The partial " + name + " could not be found");
    } else if(partial instanceof Function) {
      return partial(context, options);
    } else if (!Handlebars.compile) {
      throw new Handlebars.Exception("The partial " + name + " could not be compiled when running in runtime-only mode");
    } else {
      partials[name] = Handlebars.compile(partial, {data: data !== undefined});
      return partials[name](context, options);
    }
  }
};

Handlebars.template = Handlebars.VM.template;
;

;;
(function() {

var queryStringParam = /^\?(.*)/;
var namedParam    = /:([\w\d]+)/g;
var splatParam    = /\*([\w\d]+)/g;
var escapeRegExp  = /[-[\]{}()+?.,\\^$|#\s]/g;
var queryStrip = /(\?.*)$/;
var fragmentStrip = /^([^\?]*)/;
Backbone.Router.arrayValueSplit = '|';

var _getFragment = Backbone.History.prototype.getFragment;

_.extend(Backbone.History.prototype, {
  getFragment : function(fragment, forcePushState, excludeQueryString) {
    fragment = _getFragment.apply(this, arguments);
    if (excludeQueryString) {
      fragment = fragment.replace(queryStrip, '');
    }
    return fragment;
  },

  // this will not perform custom query param serialization specific to the router
  // but will return a map of key/value pairs (the value is a string or array)
  getQueryParameters : function(fragment, forcePushState) {
    fragment = _getFragment.apply(this, arguments);
    // if no query string exists, this will still be the original fragment
    var queryString = fragment.replace(fragmentStrip, '');
    var match = queryString.match(queryStringParam);
    if (match) {
      queryString = match[1];
      var rtn = {};
      iterateQueryString(queryString, function(name, value) {
        if (!rtn[name]) {
          rtn[name] = value;
        } else if (_.isString(rtn[name])) {
          rtn[name] = [rtn[name], value];
        } else {
          rtn[name].push(value);
        }
      });
      return rtn;
    } else {
      // no values
      return {};
    }
  }
});

_.extend(Backbone.Router.prototype, {
  initialize: function(options) {
    this.encodedSplatParts = options && options.encodedSplatParts;
  },
  
  getFragment : function(fragment, forcePushState, excludeQueryString) {
    fragment = _getFragment.apply(this, arguments);
    if (excludeQueryString) {
      fragment = fragment.replace(queryStrip, '');
    }
    return fragment;
  },
  
  _routeToRegExp : function(route) {
    var splatMatch = (splatParam.exec(route) || {index: -1});
    var namedMatch = (namedParam.exec(route) || {index: -1});

    route = route.replace(escapeRegExp, "\\$&")
                 .replace(namedParam, "([^\/?]*)")
                 .replace(splatParam, "([^\?]*)");
    route += '([\?]{1}.*)?';

    var rtn = new RegExp('^' + route + '$');

    // use the rtn value to hold some parameter data
    if (splatMatch.index >= 0) {
      // there is a splat
      if (namedMatch >= 0) {
        // negative value will indicate there is a splat match before any named matches
        rtn.splatMatch = splatMatch.index - namedMatch.index;
      } else {
        rtn.splatMatch = -1;
      }
    }

    return rtn;
  },

  /**
   * Given a route, and a URL fragment that it matches, return the array of
   * extracted parameters.
   */
  _extractParameters : function(route, fragment) {
    var params = route.exec(fragment).slice(1);

    // do we have an additional query string?
    var match = params.length && params[params.length-1] && params[params.length-1].match(queryStringParam);
    if (match) {
      var queryString = match[1];
      var data = {};
      if (queryString) {
        var self = this;
        iterateQueryString(queryString, function(name, value) {
          self._setParamValue(name, value, data);
        });
      }
      params[params.length-1] = data;
    }

    // decode params
    var length = params.length;
    if (route.splatMatch && this.encodedSplatParts) {
      if (route.splatMatch < 0) {
        // splat param is first
        return params;
      } else {
        length = length - 1;
      }
    }

    for (var i=0; i<length; i++) {
      if (_.isString(params[i])) {
        params[i] = decodeURIComponent(params[i]);
      }
    }

    return params;
  },

  /**
   * Set the parameter value on the data hash
   */
  _setParamValue : function(key, value, data) {
    // use '.' to define hash separators
    var parts = key.split('.');
    var _data = data;
    for (var i=0; i<parts.length; i++) {
      var part = parts[i];
      if (i === parts.length-1) {
        // set the value
        _data[part] = this._decodeParamValue(value, _data[part]);
      } else {
        _data = _data[part] = _data[part] || {};
      }
    }
  },

  /**
   * Decode an individual parameter value (or list of values)
   * @param value the complete value
   * @param currentValue the currently known value (or list of values)
   */
  _decodeParamValue : function(value, currentValue) {
    // '|' will indicate an array.  Array with 1 value is a=|b - multiple values can be a=b|c
    var splitChar = Backbone.Router.arrayValueSplit;
    if (value.indexOf(splitChar) >= 0) {
      var values = value.split(splitChar);
      // clean it up
      for (var i=values.length-1; i>=0; i--) {
        if (!values[i]) {
          values.splice(i, 1);
        } else {
          values[i] = decodeURIComponent(values[i]);
        }
      }
      return values;
    }
    if (!currentValue) {
      return decodeURIComponent(value);
    } else if (_.isArray(currentValue)) {
      currentValue.push(value);
      return currentValue;
    } else {
      return [currentValue, value];
    }
  },

  /**
   * Return the route fragment with queryParameters serialized to query parameter string
   */
  toFragment: function(route, queryParameters) {
    if (queryParameters) {
      if (!_.isString(queryParameters)) {
        queryParameters = this._toQueryString(queryParameters);
      }
      route += '?' + queryParameters;
    }
    return route;
  },

  /**
   * Serialize the val hash to query parameters and return it.  Use the namePrefix to prefix all param names (for recursion)
   */
  _toQueryString: function(val, namePrefix) {
    var splitChar = Backbone.Router.arrayValueSplit;
    function encodeSplit(val) { return val.replace(splitChar, encodeURIComponent(splitChar)); }
  
    if (!val) return '';
    namePrefix = namePrefix || '';
    var rtn = '';
    for (var name in val) {
      var _val = val[name];
      if (_.isString(_val) || _.isNumber(_val) || _.isBoolean(_val) || _.isDate(_val)) {
        // primitave type
        _val = this._toQueryParam(_val);
        if (_.isBoolean(_val) || _val) {
          rtn += (rtn ? '&' : '') + this._toQueryParamName(name, namePrefix) + '=' + encodeSplit(encodeURIComponent(_val));
        }
      } else if (_.isArray(_val)) {
        // arrrays use Backbone.Router.arrayValueSplit separator
        var str = '';
        for (var i in _val) {
          var param = this._toQueryParam(_val[i]);
          if (_.isBoolean(param) || param) {
            str += splitChar + encodeSplit(param);
          }
        }
        if (str) {
          rtn += (rtn ? '&' : '') + this._toQueryParamName(name, namePrefix) + '=' + str;
        }
      } else {
        // dig into hash
        var result = this._toQueryString(_val, this._toQueryParamName(name, namePrefix, true));
        if (result) {
          rtn += (rtn ? '&' : '') + result;
        }
      }
    }
    return rtn;
  },

  /**
   * return the actual parameter name
   * @param name the parameter name
   * @param namePrefix the prefix to the name
   * @param createPrefix true if we're creating a name prefix, false if we're creating the name
   */
  _toQueryParamName: function(name, prefix, isPrefix) {
    return (prefix + name + (isPrefix ? '.' : ''));
  },

  /**
   * Return the string representation of the param used for the query string
   */
  _toQueryParam: function (param) {
    if (_.isNull(param) || _.isUndefined(param)) {
      return null;
    }
    if (_.isDate(param)) {
      return param.getDate().getTime();
    }
    return param;
  }
});

function iterateQueryString(queryString, callback) {
  var keyValues = queryString.split('&');
  _.each(keyValues, function(keyValue) {
    var arr = keyValue.split('=');
    if (arr.length > 1 && arr[1]) {
      callback(arr[0], arr[1]);
    }
  });
}


// Turn the given `obj` into a query string
var stringify = Backbone.Router.stringify = function(obj, prefix, verbose) {
  if (_.isArray(obj)) {
    return stringifyArray(obj, prefix, verbose);
  } else if (_.isObject(obj)) {
    return stringifyObject(obj, prefix);
  } else if (_.isString(obj)) {
    return stringifyString(obj, prefix);
  } else {
    return prefix + '=' + encodeURIComponent(String(obj));
  }
};
// Stringify the given `str`.
function stringifyString(str, prefix) {
  if (!prefix) { throw new TypeError('object required'); }
  return prefix + '=' + encodeURIComponent(str);
}

// '|' will indicate an array.  Array with 1 value is a=|b - multiple values can be a=b|c
function stringifyArray(arr, prefix) {
  var ret = [];
  if (!prefix) { throw new TypeError('array required'); }
  _.each(arr, function(item, i) {
    ret.push(encodeURIComponent(String(item)));
  });

  if (ret.length === 1) {
    return prefix + '=' + ARRAY_VALUE_SPLIT + _.first(ret);
  }

  return prefix + '=' + ret.join(ARRAY_VALUE_SPLIT);
}

// Stringify the given `obj`.
function stringifyObject(obj, prefix) {
  var ret = [];
  _.each(obj, function(value, key) {
    if (!_.isUndefined(value)) {
      ret.push(stringify(value, prefix
        ? prefix + '[' + encodeURIComponent(key) + ']'
        : encodeURIComponent(key)));
    }
  });
  return ret.join('&');
}


})();

;;
(function() {
  // cached super methods
  var _route = Backbone.History.prototype.route;
  var _getFragment = Backbone.History.prototype.getFragment;
  var _start = Backbone.History.prototype.start;
  var _checkUrl = Backbone.History.prototype.checkUrl;
  var _navigate = Backbone.History.prototype.navigate;
  var _extractParameters = Backbone.Router.prototype._extractParameters;

  // If we are in hash mode figure out if we are on a browser that is hit by 63777 and 85881
  //     https://bugs.webkit.org/show_bug.cgi?id=63777
  //     https://bugs.webkit.org/show_bug.cgi?id=85881
  var _useReplaceState = /WebKit\/([\d.]+)/.exec(navigator.userAgent) && window.history.replaceState;

  // pattern to recognize state index in hash
  var hashStrip = /^(?:#|%23)*\d*(?:#|%23)*/;
  // Cached regex for index extraction from the hash
  var indexMatch = /^(?:#|%23)*(\d+)(?:#|%23)/;

  _.extend(Backbone.Router.prototype, {
    // the direction index will be exposed on the parameters as 'direction'
    _extractParameters: function() {
      var params = _extractParameters.apply(this, arguments);
      params = params || [];
      var history = Backbone.history;
      if (history._trackDirection) {
        var oldIndex = history._directionIndex;
        history._directionIndex = history.loadIndex();
        params.direction = history._directionIndex - oldIndex;
      }
      return params;
    }
  });

  _.extend(Backbone.History.prototype, {
    // Get the location of the current route within the backbone history.
    // This should be considered a hint
    // Returns -1 if history is unknown or disabled
    getIndex : function() {
      return this._directionIndex;
    },

    getFragment : function(/* fragment, forcePushState */) {
      var rtn = _getFragment.apply(this, arguments);
      return rtn && rtn.replace(hashStrip, '');
    },

    start: function(/* options */) {
      var rtn = _start.apply(this, arguments);
      // Direction tracking setup
      this._trackDirection  = !!this.options.trackDirection;
      if (this._trackDirection) {
        var loadedIndex = this.loadIndex();
        this._directionIndex  = loadedIndex || window.history.length;
        this._state = {index: this._directionIndex};

        // If we are tracking direction ensure that we have a direction field to play with
        if (!loadedIndex) {
          var loc = window.location;
          if (!this._hasPushState) {
            loc.replace(loc.pathname + (loc.search || '') + '#' + this._directionIndex + '#' + this.fragment);
          } else {
            window.history.replaceState({index: this._directionIndex}, document.title, loc);
          }
        }
      }
      return rtn;
    },

    checkUrl : function(e) {
      var fromIframe = this.getFragment() == this.fragment && this.iframe;
      var loadedIndex = this.loadIndex(fromIframe && this.iframe.location.hash);
      var navigateOptions = {
        trigger: false,
        replace: !loadedIndex,
        forceIndex: loadedIndex || this._directionIndex + 1
      };
      _checkUrl.call(this, e, navigateOptions);
    },

    // The options object can contain `trigger: true` if you wish to have the
    // route callback be fired (not usually desirable), or `replace: true`, if
    // you wish to modify the current URL without adding an entry to the history.
    navigate: function(fragment, options) {
      if (this._ignoreChange) {
        this._pendingNavigate = _.bind(this.navigate, this, fragment, options);
        return;
      }

      if (!options || options === true) {
        options = {trigger: options};
      }
      var newIndex;
      if (this._trackDirection) {
        newIndex = options.forceIndex || (this._directionIndex + (options.replace ? 0 : 1));
      }
      if (this._hasPushState) {
        options.state = {index: newIndex};
      } else {
        if (this._trackDirection) {
          fragment = newIndex + '#' + fragment;
        }
      }
      _navigate.call(this, fragment, options);
    },

    _updateHash: function(location, frag, replace) {
      var base = location.toString().replace(/(javascript:|#).*$/, '') + '#';
      if (replace) {
        if (_useReplaceState) {
          window.history.replaceState({}, document.title, base + frag);
        } else {
          location.replace(base + frag);
        }
      } else {
        location.hash = frag;
      }
    },

    // Pulls the direction index out of the state or hash
    loadIndex : function(fragmentOverride) {
      if (!this._trackDirection) {
        return;
      }
      if (!fragmentOverride && this._hasPushState) {
        return (this._state && this._state.index) || 0;
      } else {
        var match = indexMatch.exec(fragmentOverride || window.location.hash);
        return (match && parseInt(match[1], 10)) || 0;
      }
    },

    route: function (route, callback) {
      return _route.call(this, route, _.bind(function() {
        if (this._ignoreChange) {
          this._ignoreChange = false;
          this._directionIndex = Backbone.history.loadIndex();
          this._pendingNavigate && setTimeout(Backbone.history._pendingNavigate, 0);
        } else {
          callback && callback.apply(this, arguments);
        }
      }, this));
    },

    back : function(triggerRoute) {
      this.go(-1, triggerRoute);
    },

    foward : function(triggerRoute) {
      this.go(1, triggerRoute);
    },

    go : function(count, triggerRoute) {
      this._ignoreChange = !triggerRoute;
      window.history.go(count);
    }
  });

}());

;;
(function() {
  var _delegateEvents = Backbone.View.prototype.delegateEvents;
  _.extend(Backbone.View.prototype, {
    delegateEvents : function(events) {
      if (!(events || (events = this.events))) return;
      if (_.isFunction(events)) events = events.call(this);
      _delegateEvents.apply(this, arguments);
    }
  });  
})();

;;
var SessionCache = (function() {
  var sessionCacheData = {};

  // When session storage is not available or disabled, such as in the case
  // of iOS private browsing mode, create a "best possible" session storage
  // standin that stores data in javascript space.
  //
  // See http://m.cg/post/13095478393/detect-private-browsing-mode-in-mobile-safari-on-ios5
  try {
    sessionStorage.setItem('available-test', '1');
    sessionStorage.removeItem('available-test');

    // Return an object for stubability
    return {
      getItem: function(name) {
        return sessionStorage.getItem(name);;
      },
      setItem: function(name, value) {
        sessionStorage.setItem(name, value);
      },
      removeItem: function(name) {
        sessionStorage.removeItem(name);
      }
    };
  } catch (err) {
    return {
      getItem: function(name) {
        return sessionCacheData[name];
      },
      setItem: function(name, value) {
        sessionCacheData[name] = value;
      },
      removeItem: function(name) {
        delete sessionCacheData[name];
      }
    };
  }
})();

;;
/*
 * Date Format 1.2.3
 * (c) 2007-2009 Steven Levithan <stevenlevithan.com>
 * MIT license
 *
 * Includes enhancements by Scott Trenda <scott.trenda.net>
 * and Kris Kowal <cixar.com/~kris.kowal/>
 *
 * Accepts a date, a mask, or a date and a mask.
 * Returns a formatted version of the given date.
 * The date defaults to the current date/time.
 * The mask defaults to dateFormat.masks.default.
 */

var dateFormat = function () {
  var token = /d{1,4}|m{1,4}|yy(?:yy)?|([HhMsTt])\1?|[LloSZ]|"[^"]*"|'[^']*'/g,
    timezone = /\b(?:[PMCEA][SDP]T|(?:Pacific|Mountain|Central|Eastern|Atlantic) (?:Standard|Daylight|Prevailing) Time|(?:GMT|UTC)(?:[-+]\d{4})?)\b/g,
    timezoneClip = /[^-+\dA-Z]/g,
    pad = function (val, len) {
      val = String(val);
      len = len || 2;
      while (val.length < len) val = "0" + val;
      return val;
    };

  // Regexes and supporting functions are cached through closure
  return function (date, mask, utc) {
    var dF = dateFormat;

    // You can't provide utc if you skip other args (use the "UTC:" mask prefix)
    if (arguments.length == 1 && Object.prototype.toString.call(date) == "[object String]" && !/\d/.test(date)) {
      mask = date;
      date = undefined;
    }

    // Passing date through Date applies Date.parse, if necessary
    date = date ? new Date(date) : new Date;
    if (isNaN(date)) throw SyntaxError("invalid date");

    mask = String(dF.masks[mask] || mask || dF.masks["default"]);

    // Allow setting the utc argument via the mask
    if (mask.slice(0, 4) == "UTC:") {
      mask = mask.slice(4);
      utc = true;
    }

    var _ = utc ? "getUTC" : "get",
      d = date[_ + "Date"](),
      D = date[_ + "Day"](),
      m = date[_ + "Month"](),
      y = date[_ + "FullYear"](),
      H = date[_ + "Hours"](),
      M = date[_ + "Minutes"](),
      s = date[_ + "Seconds"](),
      L = date[_ + "Milliseconds"](),
      o = utc ? 0 : date.getTimezoneOffset(),
      flags = {
        d:    d,
        dd:   pad(d),
        ddd:  dF.i18n.dayNames[D],
        dddd: dF.i18n.dayNames[D + 7],
        m:    m + 1,
        mm:   pad(m + 1),
        mmm:  dF.i18n.monthNames[m],
        mmmm: dF.i18n.monthNames[m + 12],
        yy:   String(y).slice(2),
        yyyy: y,
        h:    H % 12 || 12,
        hh:   pad(H % 12 || 12),
        H:    H,
        HH:   pad(H),
        M:    M,
        MM:   pad(M),
        s:    s,
        ss:   pad(s),
        l:    pad(L, 3),
        L:    pad(L > 99 ? Math.round(L / 10) : L),
        t:    H < 12 ? "a"  : "p",
        tt:   H < 12 ? "am" : "pm",
        T:    H < 12 ? "A"  : "P",
        TT:   H < 12 ? "AM" : "PM",
        Z:    utc ? "UTC" : (String(date).match(timezone) || [""]).pop().replace(timezoneClip, ""),
        o:    (o > 0 ? "-" : "+") + pad(Math.floor(Math.abs(o) / 60) * 100 + Math.abs(o) % 60, 4),
        S:    ["th", "st", "nd", "rd"][d % 10 > 3 ? 0 : (d % 100 - d % 10 != 10) * d % 10]
      };

    return mask.replace(token, function ($0) {
      return $0 in flags ? flags[$0] : $0.slice(1, $0.length - 1);
    });
  };
}();

// Some common format strings
dateFormat.masks = {
  "default":      "ddd mmm dd yyyy HH:MM:ss",
  shortDate:      "m/d/yy",
  mediumDate:     "mmm d, yyyy",
  longDate:       "mmmm d, yyyy",
  fullDate:       "dddd, mmmm d, yyyy",
  shortTime:      "h:MM TT",
  mediumTime:     "h:MM:ss TT",
  longTime:       "h:MM:ss TT Z",
  isoDate:        "yyyy-mm-dd",
  isoTime:        "HH:MM:ss",
  isoDateTime:    "yyyy-mm-dd'T'HH:MM:ss",
  isoUtcDateTime: "UTC:yyyy-mm-dd'T'HH:MM:ss'Z'"
};

// Internationalization strings
dateFormat.i18n = {
  dayNames: [
    "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat",
    "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
  ],
  monthNames: [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"
  ]
};

;;
/**
 * @preserve FastClick: polyfill to remove click delays on browsers with touch UIs.
 *
 * @version 0.5.5
 * @codingstandard ftlabs-jsv2
 * @copyright The Financial Times Limited [All Rights Reserved]
 * @license MIT License (see LICENSE.txt)
 */

/*jslint browser:true, node:true*/
/*global define, Event, Node*/


/**
 * Instantiate fast-clicking listeners on the specificed layer.
 *
 * @constructor
 * @param {Element} layer The layer to listen on
 */
function FastClick(layer) {
  'use strict';
  var oldOnClick, self = this;


  /**
   * Whether a click is currently being tracked.
   *
   * @type boolean
   */
  this.trackingClick = false;


  /**
   * Timestamp for when when click tracking started.
   *
   * @type number
   */
  this.trackingClickStart = 0;


  /**
   * The element being tracked for a click.
   *
   * @type EventTarget
   */
  this.targetElement = null;


  /**
   * X-coordinate of touch start event.
   *
   * @type number
   */
  this.touchStartX = 0;


  /**
   * Y-coordinate of touch start event.
   *
   * @type number
   */
  this.touchStartY = 0;


  /**
   * ID of the last touch, retrieved from Touch.identifier.
   *
   * @type number
   */
  this.lastTouchIdentifier = 0;


  /**
   * The FastClick layer.
   *
   * @type Element
   */
  this.layer = layer;

  if (!layer || !layer.nodeType) {
    throw new TypeError('Layer must be a document node');
  }

  /** @type function() */
  this.onClick = function() { FastClick.prototype.onClick.apply(self, arguments); };

  /** @type function() */
  this.onTouchStart = function() { FastClick.prototype.onTouchStart.apply(self, arguments); };

  /** @type function() */
  this.onTouchMove = function() { FastClick.prototype.onTouchMove.apply(self, arguments); };

  /** @type function() */
  this.onTouchEnd = function() { FastClick.prototype.onTouchEnd.apply(self, arguments); };

  /** @type function() */
  this.onTouchCancel = function() { FastClick.prototype.onTouchCancel.apply(self, arguments); };

  // Devices that don't support touch don't need FastClick
  if (typeof window.ontouchstart === 'undefined') {
    return;
  }

  // Set up event handlers as required
  layer.addEventListener('click', this.onClick, true);
  layer.addEventListener('touchstart', this.onTouchStart, false);
  layer.addEventListener('touchmove', this.onTouchMove, false);
  layer.addEventListener('touchend', this.onTouchEnd, false);
  layer.addEventListener('touchcancel', this.onTouchCancel, false);

  // Hack is required for browsers that don't support Event#stopImmediatePropagation (e.g. Android 2)
  // which is how FastClick normally stops click events bubbling to callbacks registered on the FastClick
  // layer when they are cancelled.
  if (!Event.prototype.stopImmediatePropagation) {
    layer.removeEventListener = function(type, callback, capture) {
      var rmv = Node.prototype.removeEventListener;
      if (type === 'click') {
        rmv.call(layer, type, callback.hijacked || callback, capture);
      } else {
        rmv.call(layer, type, callback, capture);
      }
    };

    layer.addEventListener = function(type, callback, capture) {
      var adv = Node.prototype.addEventListener;
      if (type === 'click') {
        adv.call(layer, type, callback.hijacked || (callback.hijacked = function(event) {
          if (!event.propagationStopped) {
            callback(event);
          }
        }), capture);
      } else {
        adv.call(layer, type, callback, capture);
      }
    };
  }

  // If a handler is already declared in the element's onclick attribute, it will be fired before
  // FastClick's onClick handler. Fix this by pulling out the user-defined handler function and
  // adding it as listener.
  if (typeof layer.onclick === 'function') {

    // Android browser on at least 3.2 requires a new reference to the function in layer.onclick
    // - the old one won't work if passed to addEventListener directly.
    oldOnClick = layer.onclick;
    layer.addEventListener('click', function(event) {
      oldOnClick(event);
    }, false);
    layer.onclick = null;
  }
}


/**
 * Android requires an exception for labels.
 *
 * @type boolean
 */
FastClick.prototype.deviceIsAndroid = navigator.userAgent.indexOf('Android') > 0;


/**
 * iOS requires an exception for alert confirm dialogs.
 *
 * @type boolean
 */
FastClick.prototype.deviceIsIOS = /iP(ad|hone|od)/.test(navigator.userAgent);


/**
 * iOS 4 requires an exception for select elements.
 *
 * @type boolean
 */
FastClick.prototype.deviceIsIOS4 = FastClick.prototype.deviceIsIOS && (/OS 4_\d(_\d)?/).test(navigator.userAgent);


/**
 * iOS 6.0(+?) requires the target element to be manually derived
 *
 * @type boolean
 */
FastClick.prototype.deviceIsIOSWithBadTarget = FastClick.prototype.deviceIsIOS && (/OS ([6-9]|\d{2})_\d/).test(navigator.userAgent);


/**
 * Determine whether a given element requires a native click.
 *
 * @param {EventTarget|Element} target Target DOM element
 * @returns {boolean} Returns true if the element needs a native click
 */
FastClick.prototype.needsClick = function(target) {
  'use strict';
  switch (target.nodeName.toLowerCase()) {
  // WARN : Pending pull request: https://github.com/ftlabs/fastclick/pull/69
  case 'button':
  case 'input':

    // File inputs need real clicks on iOS 6 due to a browser bug (issue #68)
    if (this.deviceIsIOS && target.type === 'file') {
      return true;
    }

    // Don't send a synthetic click to disabled inputs (issue #62)
    return target.disabled;
  case 'label':
  case 'video':
    return true;
  default:
    return (/\bneedsclick\b/).test(target.className);
  }
};


/**
 * Determine whether a given element requires a call to focus to simulate click into element.
 *
 * @param {EventTarget|Element} target Target DOM element
 * @returns {boolean} Returns true if the element requires a call to focus to simulate native click.
 */
FastClick.prototype.needsFocus = function(target) {
  'use strict';
  switch (target.nodeName.toLowerCase()) {
  case 'textarea':
  case 'select':
    return true;
  case 'input':
    switch (target.type) {
    case 'button':
    case 'checkbox':
    case 'file':
    case 'image':
    case 'radio':
    case 'submit':
      return false;
    }

    // No point in attempting to focus disabled inputs
    return !target.disabled;
  default:
    return (/\bneedsfocus\b/).test(target.className);
  }
};


/**
 * Send a click event to the specified element.
 *
 * @param {EventTarget|Element} targetElement
 * @param {Event} event
 */
FastClick.prototype.sendClick = function(targetElement, event) {
  'use strict';
  var clickEvent, touch;

  // On some Android devices activeElement needs to be blurred otherwise the synthetic click will have no effect (#24)
  if (document.activeElement && document.activeElement !== targetElement) {
    document.activeElement.blur();
  }

  touch = event.changedTouches[0];

  // Synthesise a click event, with an extra attribute so it can be tracked
  clickEvent = document.createEvent('MouseEvents');
  clickEvent.initMouseEvent('click', true, true, window, 1, touch.screenX, touch.screenY, touch.clientX, touch.clientY, false, false, false, false, 0, null);
  clickEvent.forwardedTouchEvent = true;
  targetElement.dispatchEvent(clickEvent);
};


/**
 * @param {EventTarget|Element} targetElement
 */
FastClick.prototype.focus = function(targetElement) {
  'use strict';
  var length;

  if (this.deviceIsIOS && targetElement.setSelectionRange) {
    length = targetElement.value.length;
    targetElement.setSelectionRange(length, length);
  } else {
    targetElement.focus();
  }
};


/**
 * Check whether the given target element is a child of a scrollable layer and if so, set a flag on it.
 *
 * @param {EventTarget|Element} targetElement
 */
FastClick.prototype.updateScrollParent = function(targetElement) {
  'use strict';
  var scrollParent, parentElement;

  scrollParent = targetElement.fastClickScrollParent;

  // Attempt to discover whether the target element is contained within a scrollable layer. Re-check if the
  // target element was moved to another parent.
  if (!scrollParent || !scrollParent.contains(targetElement)) {
    parentElement = targetElement;
    do {
      if (parentElement.scrollHeight > parentElement.offsetHeight) {
        scrollParent = parentElement;
        targetElement.fastClickScrollParent = parentElement;
        break;
      }

      parentElement = parentElement.parentElement;
    } while (parentElement);
  }

  // Always update the scroll top tracker if possible.
  if (scrollParent) {
    scrollParent.fastClickLastScrollTop = scrollParent.scrollTop;
  }
};


/**
 * @param {EventTarget} targetElement
 * @returns {Element|EventTarget}
 */
FastClick.prototype.getTargetElementFromEventTarget = function(eventTarget) {
  'use strict';

  // On some older browsers (notably Safari on iOS 4.1 - see issue #56) the event target may be a text node.
  if (eventTarget.nodeType === Node.TEXT_NODE) {
    return eventTarget.parentNode;
  }

  return eventTarget;
};


/**
 * On touch start, record the position and scroll offset.
 *
 * @param {Event} event
 * @returns {boolean}
 */
FastClick.prototype.onTouchStart = function(event) {
  'use strict';
  var targetElement, touch, selection;

  targetElement = this.getTargetElementFromEventTarget(event.target);
  touch = event.targetTouches[0];

  if (this.deviceIsIOS) {

    // Only trusted events will deselect text on iOS (issue #49)
    selection = window.getSelection();
    if (selection.rangeCount && !selection.isCollapsed) {
      return true;
    }

    if (!this.deviceIsIOS4) {

      // Weird things happen on iOS when an alert or confirm dialog is opened from a click event callback (issue #23):
      // when the user next taps anywhere else on the page, new touchstart and touchend events are dispatched
      // with the same identifier as the touch event that previously triggered the click that triggered the alert.
      // Sadly, there is an issue on iOS 4 that causes some normal touch events to have the same identifier as an
      // immediately preceeding touch event (issue #52), so this fix is unavailable on that platform.
      if (touch.identifier === this.lastTouchIdentifier) {
        event.preventDefault();
        return false;
      }
    
      this.lastTouchIdentifier = touch.identifier;

      // If the target element is a child of a scrollable layer (using -webkit-overflow-scrolling: touch) and:
      // 1) the user does a fling scroll on the scrollable layer
      // 2) the user stops the fling scroll with another tap
      // then the event.target of the last 'touchend' event will be the element that was under the user's finger
      // when the fling scroll was started, causing FastClick to send a click event to that layer - unless a check
      // is made to ensure that a parent layer was not scrolled before sending a synthetic click (issue #42).
      this.updateScrollParent(targetElement);
    }
  }

  this.trackingClick = true;
  this.trackingClickStart = event.timeStamp;
  this.targetElement = targetElement;

  this.touchStartX = touch.pageX;
  this.touchStartY = touch.pageY;

  // Prevent phantom clicks on fast double-tap (issue #36)
  if ((event.timeStamp - this.lastClickTime) < 200) {
    event.preventDefault();
  }

  return true;
};


/**
 * Based on a touchmove event object, check whether the touch has moved past a boundary since it started.
 *
 * @param {Event} event
 * @returns {boolean}
 */
FastClick.prototype.touchHasMoved = function(event) {
  'use strict';
  var touch = event.targetTouches[0];

  if (Math.abs(touch.pageX - this.touchStartX) > 10 || Math.abs(touch.pageY - this.touchStartY) > 10) {
    return true;
  }

  return false;
};


/**
 * Update the last position.
 *
 * @param {Event} event
 * @returns {boolean}
 */
FastClick.prototype.onTouchMove = function(event) {
  'use strict';
  if (!this.trackingClick) {
    return true;
  }

  // If the touch has moved, cancel the click tracking
  if (this.targetElement !== this.getTargetElementFromEventTarget(event.target) || this.touchHasMoved(event)) {
    this.trackingClick = false;
    this.targetElement = null;
  }

  return true;
};


/**
 * Attempt to find the labelled control for the given label element.
 *
 * @param {EventTarget|HTMLLabelElement} labelElement
 * @returns {Element|null}
 */
FastClick.prototype.findControl = function(labelElement) {
  'use strict';

  // Fast path for newer browsers supporting the HTML5 control attribute
  if (labelElement.control !== undefined) {
    return labelElement.control;
  }

  // All browsers under test that support touch events also support the HTML5 htmlFor attribute
  if (labelElement.htmlFor) {
    return document.getElementById(labelElement.htmlFor);
  }

  // If no for attribute exists, attempt to retrieve the first labellable descendant element
  // the list of which is defined here: http://www.w3.org/TR/html5/forms.html#category-label
  return labelElement.querySelector('button, input:not([type=hidden]), keygen, meter, output, progress, select, textarea');
};


/**
 * On touch end, determine whether to send a click event at once.
 *
 * @param {Event} event
 * @returns {boolean}
 */
FastClick.prototype.onTouchEnd = function(event) {
  'use strict';
  var forElement, trackingClickStart, targetTagName, scrollParent, touch, targetElement = this.targetElement;

  if (!this.trackingClick) {
    return true;
  }

  // Prevent phantom clicks on fast double-tap (issue #36)
  if ((event.timeStamp - this.lastClickTime) < 200) {
    this.cancelNextClick = true;
    return true;
  }

  this.lastClickTime = event.timeStamp;

  trackingClickStart = this.trackingClickStart;
  this.trackingClick = false;
  this.trackingClickStart = 0;

  // On some iOS devices, the targetElement supplied with the event is invalid if the layer
  // is performing a transition or scroll, and has to be re-detected manually. Note that
  // for this to function correctly, it must be called *after* the event target is checked!
  // See issue #57; also filed as rdar://13048589 .
  if (this.deviceIsIOSWithBadTarget) {
    touch = event.changedTouches[0];
    targetElement = document.elementFromPoint(touch.pageX - window.pageXOffset, touch.pageY - window.pageYOffset);
  }

  targetTagName = targetElement.tagName.toLowerCase();
  if (targetTagName === 'label') {
    forElement = this.findControl(targetElement);
    if (forElement) {
      this.focus(targetElement);
      if (this.deviceIsAndroid) {
        return false;
      }

      targetElement = forElement;
    }
  } else if (this.needsFocus(targetElement)) {

    // Case 1: If the touch started a while ago (best guess is 100ms based on tests for issue #36) then focus will be triggered anyway. Return early and unset the target element reference so that the subsequent click will be allowed through.
    // Case 2: Without this exception for input elements tapped when the document is contained in an iframe, then any inputted text won't be visible even though the value attribute is updated as the user types (issue #37).
    if ((event.timeStamp - trackingClickStart) > 100 || (this.deviceIsIOS && window.top !== window && targetTagName === 'input')) {
      this.targetElement = null;
      return false;
    }

    this.focus(targetElement);

    // Select elements need the event to go through on iOS 4, otherwise the selector menu won't open.
    if (!this.deviceIsIOS4 || targetTagName !== 'select') {
      this.targetElement = null;
      event.preventDefault();
    }

    return false;
  }

  if (this.deviceIsIOS && !this.deviceIsIOS4) {

    // Don't send a synthetic click event if the target element is contained within a parent layer that was scrolled
    // and this tap is being used to stop the scrolling (usually initiated by a fling - issue #42).
    scrollParent = targetElement.fastClickScrollParent;
    if (scrollParent && scrollParent.fastClickLastScrollTop !== scrollParent.scrollTop) {
      return true;
    }
  }

  // Prevent the actual click from going though - unless the target node is marked as requiring
  // real clicks or if it is in the whitelist in which case only non-programmatic clicks are permitted.
  if (!this.needsClick(targetElement)) {
    event.preventDefault();
    this.sendClick(targetElement, event);
  }

  return false;
};


/**
 * On touch cancel, stop tracking the click.
 *
 * @returns {void}
 */
FastClick.prototype.onTouchCancel = function() {
  'use strict';
  this.trackingClick = false;
  this.targetElement = null;
};


/**
 * On actual clicks, determine whether this is a touch-generated click, a click action occurring
 * naturally after a delay after a touch (which needs to be cancelled to avoid duplication), or
 * an actual click which should be permitted.
 *
 * @param {Event} event
 * @returns {boolean}
 */
FastClick.prototype.onClick = function(event) {
  'use strict';
  var oldTargetElement;

  // If a target element was never set (because a touch event was never fired) allow the click
  if (!this.targetElement) {
    return true;
  }

  if (event.forwardedTouchEvent) {
    return true;
  }

  oldTargetElement = this.targetElement;
  this.targetElement = null;

  // It's possible for another FastClick-like library delivered with third-party code to fire a click event before FastClick does (issue #44). In that case, set the click-tracking flag back to false and return early. This will cause onTouchEnd to return early.
  if (this.trackingClick) {
    this.trackingClick = false;
    return true;
  }

  // Programmatically generated events targeting a specific element should be permitted
  if (!event.cancelable) {
    return true;
  }

  // Very odd behaviour on iOS (issue #18): if a submit element is present inside a form and the user hits enter in the iOS simulator or clicks the Go button on the pop-up OS keyboard the a kind of 'fake' click event will be triggered with the submit-type input element as the target.
  if (event.target.type === 'submit' && event.detail === 0) {
    return true;
  }

  // Derive and check the target element to see whether the click needs to be permitted;
  // unless explicitly enabled, prevent non-touch click events from triggering actions,
  // to prevent ghost/doubleclicks.
  if (!this.needsClick(oldTargetElement) || this.cancelNextClick) {
    this.cancelNextClick = false;

    // Prevent any user-added listeners declared on FastClick element from being fired.
    if (event.stopImmediatePropagation) {
      event.stopImmediatePropagation();
    } else {

      // Part of the hack for browsers that don't support Event#stopImmediatePropagation (e.g. Android 2)
      event.propagationStopped = true;
    }

    // Cancel the event
    event.stopPropagation();
    event.preventDefault();

    return false;
  }

  // If clicks are permitted, return true for the action to go through.
  return true;
};


/**
 * Remove all FastClick's event listeners.
 *
 * @returns {void}
 */
FastClick.prototype.destroy = function() {
  'use strict';
  var layer = this.layer;

  layer.removeEventListener('click', this.onClick, true);
  layer.removeEventListener('touchstart', this.onTouchStart, false);
  layer.removeEventListener('touchmove', this.onTouchMove, false);
  layer.removeEventListener('touchend', this.onTouchEnd, false);
  layer.removeEventListener('touchcancel', this.onTouchCancel, false);
};


if (typeof define !== 'undefined' && define.amd) {

  // AMD. Register as an anonymous module.
  define(function() {
    'use strict';
    return FastClick;
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = function(layer) {
    'use strict';
    return new FastClick(layer);
  };

  module.exports.FastClick = FastClick;
}

;;
var Phoenix;
Phoenix = (function(Handlebars) {
  var module = {exports: {}};
  var exports = module.exports;
  var Phoenix = exports, Phoenix = exports;

  /*global cloneInheritVars, createInheritVars, createRegistryWrapper, getValue, inheritVars */

//support zepto.forEach on jQuery
if (!$.fn.forEach) {
  $.fn.forEach = function(iterator, context) {
    $.fn.each.call(this, function(index) {
      iterator.call(context || this, this, index);
    });
  };
}

var viewNameAttributeName = 'data-view-name',
    viewCidAttributeName = 'data-view-cid',
    viewHelperAttributeName = 'data-view-helper';

//view instances
var viewsIndexedByCid = {};

var Thorax = this.Thorax = {
  VERSION: '2.0.0rc4',
  templatePathPrefix: '',
  templates: {},
  //view classes
  Views: {},
  //certain error prone pieces of code (on Android only it seems)
  //are wrapped in a try catch block, then trigger this handler in
  //the catch, with the name of the function or event that was
  //trying to be executed. Override this with a custom handler
  //to debug / log / etc
  onException: function(name, err) {
    throw err;
  }
};

Thorax.View = Backbone.View.extend({
  constructor: function() {
    var response = Backbone.View.apply(this, arguments);
    _.each(inheritVars, function(obj) {
      if (obj.ctor) {
        obj.ctor.call(this, response);
      }
    }, this);
    return response;
  },
  _configure: function(options) {
    var self = this;

    this._objectOptionsByCid = {};
    this._boundDataObjectsByCid = {};

    // Setup object event tracking
    _.each(inheritVars, function(obj) {
      self[obj.name] = [];
    });

    viewsIndexedByCid[this.cid] = this;
    this.children = {};
    this._renderCount = 0;

    //this.options is removed in Thorax.View, we merge passed
    //properties directly with the view and template context
    _.extend(this, options || {});

    // Setup helpers
    bindHelpers.call(this);

    _.each(inheritVars, function(obj) {
      if (obj.configure) {
        obj.configure.call(this);
      }
    }, this);
  },

  setElement : function() {
    var response = Backbone.View.prototype.setElement.apply(this, arguments);
    this.name && this.$el.attr(viewNameAttributeName, this.name);
    this.$el.attr(viewCidAttributeName, this.cid);
    return response;
  },

  _addChild: function(view) {
    this.children[view.cid] = view;
    if (!view.parent) {
      view.parent = this;
    }
    this.trigger('child', view);
    return view;
  },

  _removeChild: function(view) {
    delete this.children[view.cid];
    view.parent = null;
    return view;
  },

  destroy: function(options) {
    options = _.defaults(options || {}, {
      children: true
    });
    _.each(this._boundDataObjectsByCid, this.unbindDataObject, this);
    this.trigger('destroyed');
    delete viewsIndexedByCid[this.cid];
    _.each(this.children, function(child) {
      this._removeChild(child);
      if (options.children) {
        child.destroy();
      }
    }, this);
    if (this.parent) {
      this.parent._removeChild(this);
    }
    this.remove(); // Will call stopListening()
  },

  render: function(output) {
    this._previousHelpers = _.filter(this.children, function(child) { return child._helperOptions; });

    var children = {};
    _.each(this.children, function(child, key) {
      if (!child._helperOptions) {
        children[key] = child;
      }
    });
    this.children = children;

    if (_.isUndefined(output) || (!_.isElement(output) && !Thorax.Util.is$(output) && !(output && output.el) && !_.isString(output) && !_.isFunction(output))) {
      // try one more time to assign the template, if we don't
      // yet have one we must raise
      assignTemplate.call(this, 'template', {
        required: true
      });
      output = this.renderTemplate(this.template);
    } else if (_.isFunction(output)) {
      output = this.renderTemplate(output);
    }

    // Destroy any helpers that may be lingering
    _.each(this._previousHelpers, function(child) {
      child.destroy();
      child.parent = undefined;
    });
    this._previousHelpers = undefined;

    //accept a view, string, Handlebars.SafeString or DOM element
    this.html((output && output.el) || (output && output.string) || output);
    ++this._renderCount;
    this.trigger('rendered');
    return output;
  },

  context: function() {
    return _.extend({}, (this.model && this.model.attributes) || {});
  },

  _getContext: function() {
    return _.extend({}, this, getValue(this, 'context') || {});
  },

  // Private variables in handlebars / options.data in template helpers
  _getData: function(data) {
    return {
      view: this,
      cid: _.uniqueId('t'),
      yield: function() {
        // fn is seeded by template helper passing context to data
        return data.fn && data.fn(data);
      }
    };
  },

  _getHelpers: function() {
    if (this.helpers) {
      return _.extend({}, Handlebars.helpers, this.helpers);
    } else {
      return Handlebars.helpers;
    }

  },

  renderTemplate: function(file, context, ignoreErrors) {
    var template;
    context = context || this._getContext();
    if (_.isFunction(file)) {
      template = file;
    } else {
      template = Thorax.Util.getTemplate(file, ignoreErrors);
    }
    if (!template) {
      return '';
    } else {
      return template(context, {
        helpers: this._getHelpers(),
        data: this._getData(context)
      });
    }
  },

  ensureRendered: function() {
    !this._renderCount && this.render();
  },

  appendTo: function(el) {
    this.ensureRendered();
    $(el).append(this.el);
    this.trigger('ready', {target: this});
  },

  html: function(html) {
    if (_.isUndefined(html)) {
      return this.el.innerHTML;
    } else {
      // Event for IE element fixes
      this.trigger('before:append');
      var element = this._replaceHTML(html);
      notifyElementsHash.call(this);
      this.trigger('append');
      return element;
    }
  },

  _replaceHTML: function(html) {
    this.el.innerHTML = "";
    return this.$el.append(html);
  },

  _anchorClick: function(event) {
    var target = $(event.currentTarget),
        href = target.attr('href');
    // Route anything that starts with # or / (excluding //domain urls)
    if (href && (href[0] === '#' || (href[0] === '/' && href[1] !== '/'))) {
      Backbone.history.navigate(href, {
        trigger: true
      });
      return false;
    }
    return true;
  }
});

Thorax.View.extend = function() {
  createInheritVars(this);

  var child = Backbone.View.extend.apply(this, arguments);
  child.__parent__ = this;

  resetInheritVars(child);

  return child;
};

createRegistryWrapper(Thorax.View, Thorax.Views);

function bindHelpers() {
  if (this.helpers) {
    _.each(this.helpers, function(helper, name) {
      var view = this;
      this.helpers[name] = function() {
        var args = _.toArray(arguments),
            options = _.last(args);
        options.context = this;
        return helper.apply(view, args);
      };
    }, this);
  }
}

function notifyElementsHash() {
  if (this.elements) {
    _.each(this.elements, function(callback, selector) {
      callback = _.isFunction(callback) ? callback : this[callback];
      callback.call(this, this.$(selector));
    }, this);
  }
}

//$(selector).view() helper
$.fn.view = function(options) {
  options = _.defaults(options || {}, {
    helper: true
  });
  var selector = '[' + viewCidAttributeName + ']';
  if (!options.helper) {
    selector += ':not([' + viewHelperAttributeName + '])';
  }
  var el = $(this).closest(selector);
  return (el && viewsIndexedByCid[el.attr(viewCidAttributeName)]) || false;
};

;;
/*global createRegistryWrapper:true, cloneEvents: true */
function createRegistryWrapper(klass, hash) {
  var $super = klass.extend;
  klass.extend = function() {
    var child = $super.apply(this, arguments);
    if (child.prototype.name) {
      hash[child.prototype.name] = child;
    }
    return child;
  };
}

function registryGet(object, type, name, ignoreErrors) {
  var target = object[type],
      value;
  if (name.indexOf('.') >= 0) {
    var bits = name.split(/\./);
    name = bits.pop();
    _.each(bits, function(key) {
      target = target[key];
    });
  }
  target && (value = target[name]);
  if (!value && !ignoreErrors) {
    throw new Error(type + ': ' + name + ' does not exist.');
  } else {
    return value;
  }
}

function assignTemplate(attributeName, options) {
  var template;
  // if attribute is the name of template to fetch
  if (_.isString(this[attributeName])) {
    template = Thorax.Util.getTemplate(this[attributeName], true);
  // else try and fetch the template based on the name
  } else if (this.name && !_.isFunction(this[attributeName])) {
    template = Thorax.Util.getTemplate(this.name + (options.extension || ''), true);
  }
  // CollectionView and LayoutView have a defaultTemplate that may be used if none
  // was found, regular views must have a template if render() is called
  if (!template && attributeName === 'template' && this._defaultTemplate) {
    template = this._defaultTemplate;
  }
  // if we found something, assign it
  if (template && !_.isFunction(this[attributeName])) {
    this[attributeName] = template;
  }
  // if nothing was found and it's required, throw
  if (options.required && !_.isFunction(this[attributeName])) {
    throw new Error('View ' + (this.name || this.cid) + ' requires: ' + attributeName);
  }
}

// getValue is used instead of _.result because we
// need an extra scope parameter, and will minify
// better than _.result
function getValue(object, prop, scope) {
  if (!(object && object[prop])) {
    return null;
  }
  return _.isFunction(object[prop])
    ? object[prop].call(scope || object)
    : object[prop];
}

var inheritVars = {};
function createInheritVars(self) {
  // Ensure that we have our static event objects
  _.each(inheritVars, function(obj) {
    if (!self[obj.name]) {
      self[obj.name] = [];
    }
  });
}
function resetInheritVars(self) {
  // Ensure that we have our static event objects
  _.each(inheritVars, function(obj) {
    self[obj.name] = [];
  });
}
function walkInheritTree(source, fieldName, isStatic, callback) {
  var tree = [];
  if (_.has(source, fieldName)) {
    tree.push(source);
  }
  var iterate = source;
  if (isStatic) {
    while (iterate = iterate.__parent__) {
      if (_.has(iterate, fieldName)) {
        tree.push(iterate);
      }
    }
  } else {
    iterate = iterate.constructor;
    while (iterate) {
      if (iterate.prototype && _.has(iterate.prototype, fieldName)) {
        tree.push(iterate.prototype);
      }
      iterate = iterate.__super__ && iterate.__super__.constructor;
    }
  }

  var i = tree.length;
  while (i--) {
    _.each(getValue(tree[i], fieldName, source), callback);
  }
}

function objectEvents(target, eventName, callback, context) {
  if (_.isObject(callback)) {
    var spec = inheritVars[eventName];
    if (spec && spec.event) {
      addEvents(target['_' + eventName + 'Events'], callback, context);
      return true;
    }
  }
}
function addEvents(target, source, context) {
  _.each(source, function(callback, eventName) {
    if (_.isArray(callback)) {
      _.each(callback, function(cb) {
        target.push([eventName, cb, context]);
      });
    } else {
      target.push([eventName, callback, context]);
    }
  });
}

function getOptionsData(options) {
  if (!options || !options.data) {
    throw new Error('Handlebars template compiled without data, use: Handlebars.compile(template, {data: true})');
  }
  return options.data;
}

// These whitelisted attributes will be the only ones passed
// from the options hash to Thorax.Util.tag
var htmlAttributesToCopy = ['id', 'className', 'tagName'];

// In helpers "tagName" or "tag" may be specified, as well
// as "class" or "className". Normalize to "tagName" and
// "className" to match the property names used by Backbone
// jQuery, etc. Special case for "className" in
// Thorax.Util.tag: will be rewritten as "class" in
// generated HTML.
function normalizeHTMLAttributeOptions(options) {
  if (options.tag) {
    options.tagName = options.tag;
    delete options.tag;
  }
  if (options['class']) {
    options.className = options['class'];
    delete options['class'];
  }
}

Thorax.Util = {
  getViewInstance: function(name, attributes) {
    attributes = attributes || {};
    if (_.isString(name)) {
      var Klass = registryGet(Thorax, 'Views', name, false);
      return Klass.cid ? _.extend(Klass, attributes || {}) : new Klass(attributes);
    } else if (_.isFunction(name)) {
      return new name(attributes);
    } else {
      return name;
    }
  },

  getTemplate: function(file, ignoreErrors) {
    //append the template path prefix if it is missing
    var pathPrefix = Thorax.templatePathPrefix,
        template;
    if (pathPrefix && file.substr(0, pathPrefix.length) !== pathPrefix) {
      file = pathPrefix + file;
    }

    // Without extension
    file = file.replace(/\.handlebars$/, '');
    template = Thorax.templates[file];
    if (!template) {
      // With extension
      file = file + '.handlebars';
      template = Thorax.templates[file];
    }

    if (!template && !ignoreErrors) {
      throw new Error('templates: ' + file + ' does not exist.');
    }
    return template;
  },

  //'selector' is not present in $('<p></p>')
  //TODO: investigage a better detection method
  is$: function(obj) {
    return _.isObject(obj) && ('length' in obj);
  },
  expandToken: function(input, scope) {
    if (input && input.indexOf && input.indexOf('{{') >= 0) {
      var re = /(?:\{?[^{]+)|(?:\{\{([^}]+)\}\})/g,
          match,
          ret = [];
      function deref(token, scope) {
        if (token.match(/^("|')/) && token.match(/("|')$/)) {
          return token.replace(/(^("|')|('|")$)/g, '');
        }
        var segments = token.split('.'),
            len = segments.length;
        for (var i = 0; scope && i < len; i++) {
          if (segments[i] !== 'this') {
            scope = scope[segments[i]];
          }
        }
        return scope;
      }
      while (match = re.exec(input)) {
        if (match[1]) {
          var params = match[1].split(/\s+/);
          if (params.length > 1) {
            var helper = params.shift();
            params = _.map(params, function(param) { return deref(param, scope); });
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
  },
  tag: function(attributes, content, scope) {
    var htmlAttributes = _.omit(attributes, 'tagName'),
        tag = attributes.tagName || 'div';
    return '<' + tag + ' ' + _.map(htmlAttributes, function(value, key) {
      if (_.isUndefined(value) || key === 'expand-tokens') {
        return '';
      }
      var formattedValue = value;
      if (scope) {
        formattedValue = Thorax.Util.expandToken(value, scope);
      }
      return (key === 'className' ? 'class' : key) + '="' + Handlebars.Utils.escapeExpression(formattedValue) + '"';
    }).join(' ') + '>' + (_.isUndefined(content) ? '' : content) + '</' + tag + '>';
  }
};

;;
/*global createInheritVars, inheritVars */
Thorax.Mixins = {};

inheritVars.mixins = {
  name: 'mixins',
  configure: function() {
    _.each(this.constructor.mixins, this.mixin, this);
    _.each(this.mixins, this.mixin, this);
  }
};

_.extend(Thorax.View, {
  mixin: function(mixin) {
    createInheritVars(this);
    this.mixins.push(mixin);
  },
  registerMixin: function(name, callback, methods) {
    Thorax.Mixins[name] = [callback, methods];
  }
});

Thorax.View.prototype.mixin = function(name) {
  if (!this._appliedMixins) {
    this._appliedMixins = [];
  }
  if (this._appliedMixins.indexOf(name) === -1) {
    this._appliedMixins.push(name);
    if (_.isFunction(name)) {
      name.call(this);
    } else {
      var mixin = Thorax.Mixins[name];
      _.extend(this, mixin[1]);
      //mixin callback may be an array of [callback, arguments]
      if (_.isArray(mixin[0])) {
        mixin[0][0].apply(this, mixin[0][1]);
      } else {
        mixin[0].apply(this, _.toArray(arguments).slice(1));
      }
    }
  }
};

;;
/*global createInheritVars, inheritVars, objectEvents, walkInheritTree */
// Save a copy of the _on method to call as a $super method
var _on = Thorax.View.prototype.on;

inheritVars.event = {
  name: '_events',

  configure: function() {
    var self = this;
    walkInheritTree(this.constructor, '_events', true, function(event) {
      self.on.apply(self, event);
    });
    walkInheritTree(this, 'events', false, function(handler, eventName) {
      self.on(eventName, handler, self);
    });
  }
};

_.extend(Thorax.View, {
  on: function(eventName, callback) {
    createInheritVars(this);

    if (objectEvents(this, eventName, callback)) {
      return this;
    }

    //accept on({"rendered": handler})
    if (_.isObject(eventName)) {
      _.each(eventName, function(value, key) {
        this.on(key, value);
      }, this);
    } else {
      //accept on({"rendered": [handler, handler]})
      if (_.isArray(callback)) {
        _.each(callback, function(cb) {
          this._events.push([eventName, cb]);
        }, this);
      //accept on("rendered", handler)
      } else {
        this._events.push([eventName, callback]);
      }
    }
    return this;
  }
});

_.extend(Thorax.View.prototype, {
  on: function(eventName, callback, context) {
    if (objectEvents(this, eventName, callback, context)) {
      return this;
    }

    if (_.isObject(eventName) && arguments.length < 3) {
      //accept on({"rendered": callback})
      _.each(eventName, function(value, key) {
        this.on(key, value, callback || this);    // callback is context in this form of the call
      }, this);
    } else {
      //accept on("rendered", callback, context)
      //accept on("click a", callback, context)
      _.each((_.isArray(callback) ? callback : [callback]), function(callback) {
        var params = eventParamsFromEventItem.call(this, eventName, callback, context || this);
        if (params.type === 'DOM') {
          //will call _addEvent during delegateEvents()
          if (!this._eventsToDelegate) {
            this._eventsToDelegate = [];
          }
          this._eventsToDelegate.push(params);
        } else {
          this._addEvent(params);
        }
      }, this);
    }
    return this;
  },
  delegateEvents: function(events) {
    this.undelegateEvents();
    if (events) {
      if (_.isFunction(events)) {
        events = events.call(this);
      }
      this._eventsToDelegate = [];
      this.on(events);
    }
    this._eventsToDelegate && _.each(this._eventsToDelegate, this._addEvent, this);
  },
  //params may contain:
  //- name
  //- originalName
  //- selector
  //- type "view" || "DOM"
  //- handler
  _addEvent: function(params) {
    if (params.type === 'view') {
      _.each(params.name.split(/\s+/), function(name) {
        _on.call(this, name, bindEventHandler.call(this, 'view-event:', params));
      }, this);
    } else {
      var boundHandler = bindEventHandler.call(this, 'dom-event:', params);
      if (!params.nested) {
        boundHandler = containHandlerToCurentView(boundHandler, this.cid);
      }
      if (params.selector) {
        var name = params.name + '.delegateEvents' + this.cid;
        this.$el.on(name, params.selector, boundHandler);
      } else {
        this.$el.on(params.name, boundHandler);
      }
    }
  }
});

// When view is ready trigger ready event on all
// children that are present, then register an
// event that will trigger ready on new children
// when they are added
Thorax.View.on('ready', function(options) {
  if (!this._isReady) {
    this._isReady = true;
    function triggerReadyOnChild(child) {
      child.trigger('ready', options);
    }
    _.each(this.children, triggerReadyOnChild);
    this.on('child', triggerReadyOnChild);
  }
});

var eventSplitter = /^(nested\s+)?(\S+)(?:\s+(.+))?/;

var domEvents = [],
    domEventRegexp;
function pushDomEvents(events) {
  domEvents.push.apply(domEvents, events);
  domEventRegexp = new RegExp('^(nested\\s+)?(' + domEvents.join('|') + ')(?:\\s|$)');
}
pushDomEvents([
  'mousedown', 'mouseup', 'mousemove', 'mouseover', 'mouseout',
  'touchstart', 'touchend', 'touchmove',
  'click', 'dblclick',
  'keyup', 'keydown', 'keypress',
  'submit', 'change',
  'focus', 'blur'
]);

function containHandlerToCurentView(handler, cid) {
  return function(event) {
    var view = $(event.target).view({helper: false});
    if (view && view.cid === cid) {
      event.originalContext = this;
      handler(event);
    }
  };
}

function bindEventHandler(eventName, params) {
  eventName += params.originalName;

  var callback = params.handler,
      method = _.isFunction(callback) ? callback : this[callback];
  if (!method) {
    throw new Error('Event "' + callback + '" does not exist ' + (this.name || this.cid) + ':' + eventName);
  }
  return _.bind(function() {
    try {
      method.apply(this, arguments);
    } catch (e) {
      Thorax.onException('thorax-exception: ' + (this.name || this.cid) + ':' + eventName, e);
    }
  }, params.context || this);
}

function eventParamsFromEventItem(name, handler, context) {
  var params = {
    originalName: name,
    handler: _.isString(handler) ? this[handler] : handler
  };
  if (name.match(domEventRegexp)) {
    var match = eventSplitter.exec(name);
    params.nested = !!match[1];
    params.name = match[2];
    params.type = 'DOM';
    params.selector = match[3];
  } else {
    params.name = name;
    params.type = 'view';
  }
  params.context = context;
  return params;
}

;;
/*global getOptionsData, htmlAttributesToCopy, normalizeHTMLAttributeOptions, viewHelperAttributeName */
var viewPlaceholderAttributeName = 'data-view-tmp',
    viewTemplateOverrides = {};

// Will be shared by HelperView and CollectionHelperView
var helperViewPrototype = {
  _ensureElement: function() {
    Thorax.View.prototype._ensureElement.apply(this, arguments);
    this.$el.attr(viewHelperAttributeName, this._helperName);
  },
  _getContext: function() {
    return this.parent._getContext.apply(this.parent, arguments);
  }
};

Thorax.HelperView = Thorax.View.extend(helperViewPrototype);

// Ensure nested inline helpers will always have this.parent
// set to the view containing the template
function getParent(parent) {
  // The `view` helper is a special case as it embeds
  // a view instead of creating a new one
  while (parent._helperName && parent._helperName !== 'view') {
    parent = parent.parent;
  }
  return parent;
}

Handlebars.registerViewHelper = function(name, ViewClass, callback) {
  if (arguments.length === 2) {
    if (ViewClass.factory) {
      callback = ViewClass.callback;
    } else {
      callback = ViewClass;
      ViewClass = Thorax.HelperView;
    }
  }
  Handlebars.registerHelper(name, function() {
    var args = _.toArray(arguments),
        options = args.pop(),
        declaringView = getOptionsData(options).view;

    var viewOptions = {
      template: options.fn || Handlebars.VM.noop,
      inverse: options.inverse,
      options: options.hash,
      declaringView: declaringView,
      parent: getParent(declaringView),
      _helperName: name,
      _helperOptions: {
        options: cloneHelperOptions(options),
        args: _.clone(args)
      }
    };

    normalizeHTMLAttributeOptions(options.hash);
    _.extend(viewOptions, _.pick(options.hash, htmlAttributesToCopy));

    // Check to see if we have an existing instance that we can reuse
    var instance = _.find(declaringView._previousHelpers, function(child) {
      return compareHelperOptions(viewOptions, child);
    });

    // Create the instance if we don't already have one
    if (!instance) {
      if (ViewClass.factory) {
        instance = ViewClass.factory(args, viewOptions);
        if (!instance) {
          return '';
        }

        instance._helperName = viewOptions._helperName;
        instance._helperOptions = viewOptions._helperOptions;
      } else {
        instance = new ViewClass(viewOptions);
      }

      args.push(instance);
      declaringView._addChild(instance);
      declaringView.trigger.apply(declaringView, ['helper', name].concat(args));
      declaringView.trigger.apply(declaringView, ['helper:' + name].concat(args));

      callback && callback.apply(this, args);
    } else {
      declaringView._previousHelpers = _.without(declaringView._previousHelpers, instance);
      declaringView.children[instance.cid] = instance;
    }

    var htmlAttributes = _.pick(options.hash, htmlAttributesToCopy);
    htmlAttributes[viewPlaceholderAttributeName] = instance.cid;

    var expandTokens = options.hash['expand-tokens'];
    return new Handlebars.SafeString(Thorax.Util.tag(htmlAttributes, '', expandTokens ? this : null));
  });
  var helper = Handlebars.helpers[name];
  return helper;
};

Thorax.View.on('append', function(scope, callback) {
  (scope || this.$el).find('[' + viewPlaceholderAttributeName + ']').forEach(function(el) {
    var placeholderId = el.getAttribute(viewPlaceholderAttributeName),
        view = this.children[placeholderId];
    if (view) {
      //see if the view helper declared an override for the view
      //if not, ensure the view has been rendered at least once
      if (viewTemplateOverrides[placeholderId]) {
        view.render(viewTemplateOverrides[placeholderId]);
        delete viewTemplateOverrides[placeholderId];
      } else {
        view.ensureRendered();
      }
      $(el).replaceWith(view.el);
      callback && callback(view.el);
    }
  }, this);
});


/**
 * Clones the helper options, dropping items that are known to change
 * between rendering cycles as appropriate.
 */
function cloneHelperOptions(options) {
  var ret = _.pick(options, 'fn', 'inverse', 'hash', 'data');
  ret.data = _.omit(options.data, 'cid', 'view', 'yield');
  return ret;
}

/**
 * Checks for basic equality between two sets of parameters for a helper view.
 *
 * Checked fields include:
 *  - _helperName
 *  - All args
 *  - Hash
 *  - Data
 *  - Function and Invert (id based if possible)
 *
 * This method allows us to determine if the inputs to a given view are the same. If they
 * are then we make the assumption that the rendering will be the same (or the child view will
 * otherwise rerendering it by monitoring it's parameters as necessary) and reuse the view on
 * rerender of the parent view.
 */
function compareHelperOptions(a, b) {
  function compareValues(a, b) {
    return _.every(a, function(value, key) {
      return b[key] === value;
    });
  }

  if (a._helperName !== b._helperName) {
    return false;
  }

  a = a._helperOptions;
  b = b._helperOptions;

  // Implements a first level depth comparison
  return a.args.length === b.args.length
      && compareValues(a.args, b.args)
      && _.isEqual(_.keys(a.options), _.keys(b.options))
      && _.every(a.options, function(value, key) {
          if (key === 'data' || key === 'hash') {
            return compareValues(a.options[key], b.options[key]);
          } else if (key === 'fn' || key === 'inverse') {
            if (b.options[key] === value) {
              return true;
            }

            var other = b.options[key] || {};
            return value && _.has(value, 'program') && !value.depth && other.program === value.program;
          }
          return b.options[key] === value;
        });
}

;;
/*global getValue, inheritVars, walkInheritTree */

function dataObject(type, spec) {
  spec = inheritVars[type] = _.defaults({
    name: '_' + type + 'Events',
    event: true
  }, spec);

  // Add a callback in the view constructor
  spec.ctor = function() {
    if (this[type]) {
      // Need to null this.model/collection so setModel/Collection will
      // not treat it as the old model/collection and immediately return
      var object = this[type];
      this[type] = null;
      this[spec.set](object);
    }
  };

  function setObject(dataObject, options) {
    var old = this[type],
        $el = getValue(this, spec.$el);

    if (dataObject === old) {
      return this;
    }
    if (old) {
      this.unbindDataObject(old);
    }

    if (dataObject) {
      this[type] = dataObject;

      if (spec.loading) {
        spec.loading.call(this);
      }

      this.bindDataObject(type, dataObject, _.extend({}, this.options, options));
      $el && $el.attr(spec.cidAttrName, dataObject.cid);
      dataObject.trigger('set', dataObject, old);
    } else {
      this[type] = false;
      if (spec.change) {
        spec.change.call(this, false);
      }
      $el && $el.removeAttr(spec.cidAttrName);
    }
    this.trigger('change:data-object', type, dataObject, old);
    return this;
  }

  Thorax.View.prototype[spec.set] = setObject;
}

_.extend(Thorax.View.prototype, {
  bindDataObject: function(type, dataObject, options) {
    if (this._boundDataObjectsByCid[dataObject.cid]) {
      return false;
    }
    this._boundDataObjectsByCid[dataObject.cid] = dataObject;

    var options = this._modifyDataObjectOptions(dataObject, _.extend({}, inheritVars[type].defaultOptions, options));
    this._objectOptionsByCid[dataObject.cid] = options;

    bindEvents.call(this, type, dataObject, this.constructor);
    bindEvents.call(this, type, dataObject, this);

    var spec = inheritVars[type];
    spec.bindCallback && spec.bindCallback.call(this, dataObject, options);

    if (dataObject.shouldFetch && dataObject.shouldFetch(options)) {
      loadObject(dataObject, options);
    } else if (inheritVars[type].change) {
      // want to trigger built in rendering without triggering event on model
      inheritVars[type].change.call(this, dataObject, options);
    }

    return true;
  },

  unbindDataObject: function (dataObject) {
    if (!this._boundDataObjectsByCid[dataObject.cid]) {
      return false;
    }
    delete this._boundDataObjectsByCid[dataObject.cid];
    this.stopListening(dataObject);
    delete this._objectOptionsByCid[dataObject.cid];
    return true;
  },

  _modifyDataObjectOptions: function(dataObject, options) {
    return options;
  }
});

function bindEvents(type, target, source) {
  var context = this;
  walkInheritTree(source, '_' + type + 'Events', true, function(event) {
    // getEventCallback will resolve if it is a string or a method
    // and return a method
    context.listenTo(target, event[0], _.bind(getEventCallback(event[1], context), event[2] || context));
  });
}

function loadObject(dataObject, options) {
  if (dataObject.load) {
    dataObject.load(function() {
      options && options.success && options.success(dataObject);
    }, options);
  } else {
    dataObject.fetch(options);
  }
}

function getEventCallback(callback, context) {
  if (_.isFunction(callback)) {
    return callback;
  } else {
    return context[callback];
  }
}

;;
/*global createRegistryWrapper, dataObject, getValue */
var modelCidAttributeName = 'data-model-cid';

Thorax.Model = Backbone.Model.extend({
  isEmpty: function() {
    return !this.isPopulated();
  },
  isPopulated: function() {
    // We are populated if we have attributes set
    var attributes = _.clone(this.attributes),
        defaults = getValue(this, 'defaults') || {};
    for (var default_key in defaults) {
      if (attributes[default_key] != defaults[default_key]) {
        return true;
      }
      delete attributes[default_key];
    }
    var keys = _.keys(attributes);
    return keys.length > 1 || (keys.length === 1 && keys[0] !== this.idAttribute);
  },
  shouldFetch: function(options) {
    // url() will throw if model has no `urlRoot` and no `collection`
    // or has `collection` and `collection` has no `url`
    var url;
    try {
      url = getValue(this, 'url');
    } catch(e) {
      url = false;
    }
    return options.fetch && !!url && !this.isPopulated();
  }
});

Thorax.Models = {};
createRegistryWrapper(Thorax.Model, Thorax.Models);

dataObject('model', {
  set: 'setModel',
  defaultOptions: {
    render: true,
    fetch: true,
    success: false,
    errors: true
  },
  change: onModelChange,
  $el: '$el',
  cidAttrName: modelCidAttributeName
});

function onModelChange(model) {
  var modelOptions = model && this._objectOptionsByCid[model.cid];
  // !modelOptions will be true when setModel(false) is called
  if (!modelOptions || (modelOptions && modelOptions.render)) {
    this.render();
  }
}

Thorax.View.on({
  model: {
    error: function(model, errors) {
      if (this._objectOptionsByCid[model.cid].errors) {
        this.trigger('error', errors, model);
      }
    },
    change: function(model) {
      onModelChange.call(this, model);
    }
  }
});

$.fn.model = function(view) {
  var $this = $(this),
      modelElement = $this.closest('[' + modelCidAttributeName + ']'),
      modelCid = modelElement && modelElement.attr(modelCidAttributeName);
  if (modelCid) {
    var view = view || $this.view();
    if (view && view.model && view.model.cid === modelCid) {
      return view.model || false;
    }
    var collection = $this.collection(view);
    if (collection) {
      return collection.get(modelCid);
    }
  }
  return false;
};

;;
/*global createRegistryWrapper, dataObject, getEventCallback, getValue, modelCidAttributeName, viewCidAttributeName */
var _fetch = Backbone.Collection.prototype.fetch,
    _reset = Backbone.Collection.prototype.reset,
    _replaceHTML = Thorax.View.prototype._replaceHTML,
    collectionCidAttributeName = 'data-collection-cid',
    collectionEmptyAttributeName = 'data-collection-empty',
    collectionElementAttributeName = 'data-collection-element',
    ELEMENT_NODE_TYPE = 1;

Thorax.Collection = Backbone.Collection.extend({
  model: Thorax.Model || Backbone.Model,
  initialize: function() {
    this.cid = _.uniqueId('collection');
    return Backbone.Collection.prototype.initialize.apply(this, arguments);
  },
  isEmpty: function() {
    if (this.length > 0) {
      return false;
    } else {
      return this.length === 0 && this.isPopulated();
    }
  },
  isPopulated: function() {
    return this._fetched || this.length > 0 || (!this.length && !getValue(this, 'url'));
  },
  shouldFetch: function(options) {
    return options.fetch && !!getValue(this, 'url') && !this.isPopulated();
  },
  fetch: function(options) {
    options = options || {};
    var success = options.success;
    options.success = function(collection, response) {
      collection._fetched = true;
      success && success(collection, response);
    };
    return _fetch.apply(this, arguments);
  },
  reset: function(models, options) {
    this._fetched = !!models;
    return _reset.call(this, models, options);
  }
});

Thorax.Collections = {};
createRegistryWrapper(Thorax.Collection, Thorax.Collections);

dataObject('collection', {
  set: 'setCollection',
  bindCallback: onSetCollection,
  defaultOptions: {
    render: true,
    fetch: true,
    success: false,
    errors: true
  },
  change: onCollectionReset,
  $el: 'getCollectionElement',
  cidAttrName: collectionCidAttributeName
});

Thorax.CollectionView = Thorax.View.extend({
  _defaultTemplate: Handlebars.VM.noop,
  _collectionSelector: '[' + collectionElementAttributeName + ']',

  // preserve collection element if it was not created with {{collection}} helper
  _replaceHTML: function(html) {
    if (this.collection && this._objectOptionsByCid[this.collection.cid] && this._renderCount) {
      var element;
      var oldCollectionElement = this.getCollectionElement();
      element = _replaceHTML.call(this, html);
      if (!oldCollectionElement.attr('data-view-cid')) {
        this.getCollectionElement().replaceWith(oldCollectionElement);
      }
    } else {
      return _replaceHTML.call(this, html);
    }
  },

  //appendItem(model [,index])
  //appendItem(html_string, index)
  //appendItem(view, index)
  appendItem: function(model, index, options) {
    //empty item
    if (!model) {
      return;
    }
    var itemView,
        $el = this.getCollectionElement();
    options = _.defaults(options || {}, {
      filter: true
    });
    //if index argument is a view
    index && index.el && (index = $el.children().indexOf(index.el) + 1);
    //if argument is a view, or html string
    if (model.el || _.isString(model)) {
      itemView = model;
      model = false;
    } else {
      index = index || this.collection.indexOf(model) || 0;
      itemView = this.renderItem(model, index);
    }
    if (itemView) {
      itemView.cid && this._addChild(itemView);
      //if the renderer's output wasn't contained in a tag, wrap it in a div
      //plain text, or a mixture of top level text nodes and element nodes
      //will get wrapped
      if (_.isString(itemView) && !itemView.match(/^\s*</m)) {
        itemView = '<div>' + itemView + '</div>';
      }
      var itemElement = itemView.el ? [itemView.el] : _.filter($($.trim(itemView)), function(node) {
        //filter out top level whitespace nodes
        return node.nodeType === ELEMENT_NODE_TYPE;
      });
      model && $(itemElement).attr(modelCidAttributeName, model.cid);
      var previousModel = index > 0 ? this.collection.at(index - 1) : false;
      if (!previousModel) {
        $el.prepend(itemElement);
      } else {
        //use last() as appendItem can accept multiple nodes from a template
        var last = $el.children('[' + modelCidAttributeName + '="' + previousModel.cid + '"]').last();
        last.after(itemElement);
      }

      this.trigger('append', null, function(el) {
        el.setAttribute(modelCidAttributeName, model.cid);
      });

      !options.silent && this.trigger('rendered:item', this, this.collection, model, itemElement, index);
      options.filter && applyItemVisiblityFilter.call(this, model);
    }
    return itemView;
  },
  // updateItem only useful if there is no item view, otherwise
  // itemView.render() provides the same functionality
  updateItem: function(model) {
    this.removeItem(model);
    this.appendItem(model);
  },
  removeItem: function(model) {
    var $el = this.getCollectionElement(),
        viewEl = $el.find('[' + modelCidAttributeName + '="' + model.cid + '"]');
    if (!viewEl.length) {
      return false;
    }
    viewEl.remove();
    var viewCid = viewEl.attr(viewCidAttributeName),
        child = this.children[viewCid];
    if (child) {
      this._removeChild(child);
      child.destroy();
    }
    return true;
  },
  renderCollection: function() {
    if (this.collection) {
      if (this.collection.isEmpty()) {
        handleChangeFromNotEmptyToEmpty.call(this);
      } else {
        handleChangeFromEmptyToNotEmpty.call(this);
        this.collection.forEach(function(item, i) {
          this.appendItem(item, i);
        }, this);
      }
      this.trigger('rendered:collection', this, this.collection);
      applyVisibilityFilter.call(this);
    } else {
      handleChangeFromNotEmptyToEmpty.call(this);
    }
  },
  emptyClass: 'empty',
  renderEmpty: function() {
    if (!this.emptyTemplate && !this.emptyView) {
      assignTemplate.call(this, 'emptyTemplate', {
        extension: '-empty',
        required: false
      });
    }
    if (this.emptyView) {
      var viewOptions = {};
      if (this.emptyTemplate) {
        viewOptions.template = this.emptyTemplate;
      }
      var view = Thorax.Util.getViewInstance(this.emptyView, viewOptions);
      view.ensureRendered();
      return view;
    } else {
      return this.emptyTemplate && this.renderTemplate(this.emptyTemplate);
    }
  },
  renderItem: function(model, i) {
    if (!this.itemTemplate && !this.itemView) {
      assignTemplate.call(this, 'itemTemplate', {
        extension: '-item',
        // only require an itemTemplate if an itemView
        // is not present
        required: !this.itemView
      });
    }
    if (this.itemView) {
      var viewOptions = {
        model: model
      };
      if (this.itemTemplate) {
        viewOptions.template = this.itemTemplate;
      }
      var view = Thorax.Util.getViewInstance(this.itemView, viewOptions);
      view.ensureRendered();
      return view;
    } else {
      return this.renderTemplate(this.itemTemplate, this.itemContext(model, i));
    }
  },
  itemContext: function(model /*, i */) {
    return model.attributes;
  },
  appendEmpty: function() {
    var $el = this.getCollectionElement();
    $el.empty();
    var emptyContent = this.renderEmpty();
    emptyContent && this.appendItem(emptyContent, 0, {
      silent: true,
      filter: false
    });
    this.trigger('rendered:empty', this, this.collection);
  },
  getCollectionElement: function() {
    var element = this.$(this._collectionSelector);
    return element.length === 0 ? this.$el : element;
  }
});

Thorax.CollectionView.on({
  collection: {
    reset: onCollectionReset,
    sort: onCollectionReset,
    filter: function() {
      applyVisibilityFilter.call(this);
    },
    change: function(model) {
      // If we rendered with item views, model changes will be observed
      // by the generated item view but if we rendered with templates
      // then model changes need to be bound as nothing is watching
      !this.itemView && this.updateItem(model);
      applyItemVisiblityFilter.call(this, model);
    },
    add: function(model) {
      var $el = this.getCollectionElement();
      this.collection.length === 1 && $el.length && handleChangeFromEmptyToNotEmpty.call(this);
      if ($el.length) {
        var index = this.collection.indexOf(model);
        this.appendItem(model, index);
      }
    },
    remove: function(model) {
      var $el = this.getCollectionElement();
      this.removeItem(model);
      this.collection.length === 0 && $el.length && handleChangeFromNotEmptyToEmpty.call(this);
    }
  }
});

Thorax.View.on({
  collection: {
    error: function(collection, message) {
      if (this._objectOptionsByCid[collection.cid].errors) {
        this.trigger('error', message, collection);
      }
    }
  }
});

function onCollectionReset(collection) {
  var options = collection && this._objectOptionsByCid[collection.cid];
  // we would want to still render in the case that the
  // collection has transitioned to being falsy
  if (!collection || (options && options.render)) {
    this.renderCollection && this.renderCollection();
  }
}

// Even if the view is not a CollectionView
// ensureRendered() to provide similar behavior
// to a model
function onSetCollection() {
  this.ensureRendered();
}

function applyVisibilityFilter() {
  if (this.itemFilter) {
    this.collection.forEach(function(model) {
      applyItemVisiblityFilter.call(this, model);
    }, this);
  }
}

function applyItemVisiblityFilter(model) {
  var $el = this.getCollectionElement();
  this.itemFilter && $el.find('[' + modelCidAttributeName + '="' + model.cid + '"]')[itemShouldBeVisible.call(this, model) ? 'show' : 'hide']();
}

function itemShouldBeVisible(model) {
  return this.itemFilter(model, this.collection.indexOf(model));
}

function handleChangeFromEmptyToNotEmpty() {
  var $el = this.getCollectionElement();
  this.emptyClass && $el.removeClass(this.emptyClass);
  $el.removeAttr(collectionEmptyAttributeName);
  $el.empty();
}

function handleChangeFromNotEmptyToEmpty() {
  var $el = this.getCollectionElement();
  this.emptyClass && $el.addClass(this.emptyClass);
  $el.attr(collectionEmptyAttributeName, true);
  this.appendEmpty();
}

//$(selector).collection() helper
$.fn.collection = function(view) {
  if (view && view.collection) {
    return view.collection;
  }
  var $this = $(this),
      collectionElement = $this.closest('[' + collectionCidAttributeName + ']'),
      collectionCid = collectionElement && collectionElement.attr(collectionCidAttributeName);
  if (collectionCid) {
    view = $this.view();
    if (view) {
      return view.collection;
    }
  }
  return false;
};

;;
/*global inheritVars */

inheritVars.model.defaultOptions.populate = true;

var oldModelChange = inheritVars.model.change;
inheritVars.model.change = function() {
  oldModelChange.apply(this, arguments);
  // TODO : What can we do to remove this duplication?
  var modelOptions = this.model && this._objectOptionsByCid[this.model.cid];
  if (modelOptions && modelOptions.populate) {
    this.populate(this.model.attributes, modelOptions.populate === true ? {} : modelOptions.populate);
  }
};
inheritVars.model.defaultOptions.populate = true;

_.extend(Thorax.View.prototype, {
  //serializes a form present in the view, returning the serialized data
  //as an object
  //pass {set:false} to not update this.model if present
  //can pass options, callback or event in any order
  serialize: function() {
    var callback, options, event;
    //ignore undefined arguments in case event was null
    for (var i = 0; i < arguments.length; ++i) {
      if (_.isFunction(arguments[i])) {
        callback = arguments[i];
      } else if (_.isObject(arguments[i])) {
        if ('stopPropagation' in arguments[i] && 'preventDefault' in arguments[i]) {
          event = arguments[i];
        } else {
          options = arguments[i];
        }
      }
    }

    if (event && !this._preventDuplicateSubmission(event)) {
      return;
    }

    options = _.extend({
      set: true,
      validate: true,
      children: true,
      silent: true
    }, options || {});

    var attributes = options.attributes || {};

    //callback has context of element
    var view = this;
    var errors = [];
    eachNamedInput.call(this, options, function() {
      var value = view._getInputValue(this, options, errors);
      if (!_.isUndefined(value)) {
        objectAndKeyFromAttributesAndName.call(this, attributes, this.name, {mode: 'serialize'}, function(object, key) {
          if (!object[key]) {
            object[key] = value;
          } else if (_.isArray(object[key])) {
            object[key].push(value);
          } else {
            object[key] = [object[key], value];
          }
        });
      }
    });

    this.trigger('serialize', attributes, options);

    if (options.validate) {
      var validateInputErrors = this.validateInput(attributes);
      if (validateInputErrors && validateInputErrors.length) {
        errors = errors.concat(validateInputErrors);
      }
      this.trigger('validate', attributes, errors, options);
      if (errors.length) {
        this.trigger('error', errors);
        return;
      }
    }

    if (options.set && this.model) {
      if (!this.model.set(attributes, {silent: options.silent})) {
        return false;
      }
    }

    callback && callback.call(this, attributes, _.bind(resetSubmitState, this));
    return attributes;
  },

  _preventDuplicateSubmission: function(event, callback) {
    event.preventDefault();

    var form = $(event.target);
    if ((event.target.tagName || '').toLowerCase() !== 'form') {
      // Handle non-submit events by gating on the form
      form = $(event.target).closest('form');
    }

    if (!form.attr('data-submit-wait')) {
      form.attr('data-submit-wait', 'true');
      if (callback) {
        callback.call(this, event);
      }
      return true;
    } else {
      return false;
    }
  },

  //populate a form from the passed attributes or this.model if present
  populate: function(attributes, options) {
    options = _.extend({
      children: true
    }, options || {});

    var value,
        attributes = attributes || this._getContext();

    //callback has context of element
    eachNamedInput.call(this, options, function() {
      objectAndKeyFromAttributesAndName.call(this, attributes, this.name, {mode: 'populate'}, function(object, key) {
        value = object && object[key];

        if (!_.isUndefined(value)) {
          //will only execute if we have a name that matches the structure in attributes
          if (this.type === 'checkbox' && _.isBoolean(value)) {
            this.checked = value;
          } else if (this.type === 'checkbox' || this.type === 'radio') {
            this.checked = value == this.value;
          } else {
            this.value = value;
          }
        }
      });
    });

    this.trigger('populate', attributes);
  },

  //perform form validation, implemented by child class
  validateInput: function(/* attributes, options, errors */) {},

  _getInputValue: function(input /* , options, errors */) {
    if (input.type === 'checkbox' || input.type === 'radio') {
      if (input.checked) {
        return input.value;
      }
    } else if (input.multiple === true) {
      var values = [];
      $('option', input).each(function() {
        if (this.selected) {
          values.push(this.value);
        }
      });
      return values;
    } else {
      return input.value;
    }
  }
});

Thorax.View.on({
  error: function() {
    resetSubmitState.call(this);

    // If we errored with a model we want to reset the content but leave the UI
    // intact. If the user updates the data and serializes any overwritten data
    // will be restored.
    if (this.model && this.model.previousAttributes) {
      this.model.set(this.model.previousAttributes(), {
        silent: true
      });
    }
  },
  deactivated: function() {
    resetSubmitState.call(this);
  }
});

function eachNamedInput(options, iterator, context) {
  var i = 0,
      self = this;

  this.$('select,input,textarea', options.root || this.el).each(function() {
    if (!options.children) {
      if (self !== $(this).view({helper: false})) {
        return;
      }
    }
    if (this.type !== 'button' && this.type !== 'cancel' && this.type !== 'submit' && this.name && this.name !== '') {
      iterator.call(context || this, i, this);
      ++i;
    }
  });
}

//calls a callback with the correct object fragment and key from a compound name
function objectAndKeyFromAttributesAndName(attributes, name, options, callback) {
  var key,
      object = attributes,
      keys = name.split('['),
      mode = options.mode;

  for (var i = 0; i < keys.length - 1; ++i) {
    key = keys[i].replace(']', '');
    if (!object[key]) {
      if (mode === 'serialize') {
        object[key] = {};
      } else {
        return callback.call(this, false, key);
      }
    }
    object = object[key];
  }
  key = keys[keys.length - 1].replace(']', '');
  callback.call(this, object, key);
}

function resetSubmitState() {
  this.$('form').removeAttr('data-submit-wait');
}

;;
var layoutCidAttributeName = 'data-layout-cid';

Thorax.LayoutView = Thorax.View.extend({
  _defaultTemplate: Handlebars.VM.noop,
  render: function() {
    var response = Thorax.View.prototype.render.apply(this, arguments);
    if (this.template === Handlebars.VM.noop) {
      // if there is no template setView will append to this.$el
      ensureLayoutCid.call(this);
    } else {
      // if a template was specified is must declare a layout-element
      ensureLayoutViewsTargetElement.call(this);
    }
    return response;
  },
  setView: function(view, options) {
    options = _.extend({
      scroll: true,
      destroy: true
    }, options || {});
    if (_.isString(view)) {
      view = new (Thorax.Util.registryGet(Thorax, 'Views', view, false))();
    }
    this.ensureRendered();
    var oldView = this._view;
    if (view === oldView) {
      return false;
    }
    if (options.destroy && view) {
      view._shouldDestroyOnNextSetView = true;
    }

    this.trigger('change:view:start', view, oldView, options);

    if (oldView) {
      this._removeChild(oldView);
      oldView.$el.remove();
      triggerLifecycleEvent.call(oldView, 'deactivated', options);
      if (oldView._shouldDestroyOnNextSetView) {
        oldView.destroy();
      }
    }

    if (view) {
      triggerLifecycleEvent.call(this, 'activated', options);
      view.trigger('activated', options);
      this._addChild(view);
      this._view = view;
      this._view.appendTo(getLayoutViewsTargetElement.call(this));
    } else {
      this._view = undefined;
    }

    this.trigger('change:view:end', view, oldView, options);
    return view;
  },

  getView: function() {
    return this._view;
  }
});

Handlebars.registerHelper('layout-element', function(options) {
  var view = getOptionsData(options).view;
  // duck type check for LayoutView
  if (!view.getView) {
    throw new Error('layout-element must be used within a LayoutView');
  }
  options.hash[layoutCidAttributeName] = view.cid;
  normalizeHTMLAttributeOptions(options.hash);
  return new Handlebars.SafeString(Thorax.Util.tag.call(this, options.hash, '', this));
});

function triggerLifecycleEvent(eventName, options) {
  options = options || {};
  options.target = this;
  this.trigger(eventName, options);
  _.each(this.children, function(child) {
    child.trigger(eventName, options);
  });
}

function ensureLayoutCid() {
  ++this._renderCount;
  //set the layoutCidAttributeName on this.$el if there was no template
  this.$el.attr(layoutCidAttributeName, this.cid);
}

function ensureLayoutViewsTargetElement() {
  if (!this.$('[' + layoutCidAttributeName + '="' + this.cid + '"]')[0]) {
    throw new Error('No layout element found in ' + (this.name || this.cid));
  }
}

function getLayoutViewsTargetElement() {
  return this.$('[' + layoutCidAttributeName + '="' + this.cid + '"]')[0] || this.el[0] || this.el;
}

;;
/*global createRegistryWrapper */

//Router
function initializeRouter() {
  Backbone.history || (Backbone.history = new Backbone.History());
  Backbone.history.on('route', onRoute, this);
  //router does not have a built in destroy event
  //but ViewController does
  this.on('destroyed', function() {
    Backbone.history.off('route', onRoute, this);
  });
}

Thorax.Router = Backbone.Router.extend({
  constructor: function() {
    var response = Thorax.Router.__super__.constructor.apply(this, arguments);
    initializeRouter.call(this);
    return response;
  },
  route: function(route, name, callback) {
    if (!callback) {
      callback = this[name];
    }
    //add a route:before event that is fired before the callback is called
    return Backbone.Router.prototype.route.call(this, route, name, function() {
      this.trigger.apply(this, ['route:before', route, name].concat(Array.prototype.slice.call(arguments)));
      return callback.apply(this, arguments);
    });
  }
});

Thorax.Routers = {};
createRegistryWrapper(Thorax.Router, Thorax.Routers);

function onRoute(router /* , name */) {
  if (this === router) {
    this.trigger.apply(this, ['route'].concat(Array.prototype.slice.call(arguments, 1)));
  }
}

;;
Thorax.CollectionHelperView = Thorax.CollectionView.extend({
  // Forward render events to the parent
  events: {
    'rendered:item': forwardRenderEvent('rendered:item'),
    'rendered:collection': forwardRenderEvent('rendered:collection'),
    'rendered:empty': forwardRenderEvent('rendered:empty')
  },

  constructor: function(options) {
    _.each(collectionOptionNames, function(viewAttributeName, helperOptionName) {
      if (options.options[helperOptionName]) {
        var value = options.options[helperOptionName];
        if (viewAttributeName === 'itemTemplate' || viewAttributeName === 'emptyTemplate') {
          value = Thorax.Util.getTemplate(value);
        }
        options[viewAttributeName] = value;
      }
    });
    // Handlebars.VM.noop is passed in the handlebars options object as
    // a default for fn and inverse, if a block was present. Need to
    // check to ensure we don't pick the empty / null block up.
    if (!options.itemTemplate && options.template && options.template !== Handlebars.VM.noop) {
      options.itemTemplate = options.template;
      options.template = Handlebars.VM.noop;
    }
    if (!options.emptyTemplate && options.inverse && options.inverse !== Handlebars.VM.noop) {
      options.emptyTemplate = options.inverse;
      options.inverse = Handlebars.VM.noop;
    }
    var response = Thorax.HelperView.call(this, options);
    if (this.parent.name) {
      if (!this.emptyTemplate) {
        this.emptyTemplate = Thorax.Util.getTemplate(this.parent.name + '-empty', true);
      }
      if (!this.itemTemplate) {
        // item template must be present if an itemView is not
        this.itemTemplate = Thorax.Util.getTemplate(this.parent.name + '-item', !!this.itemView);
      }
    }

    return response;
  },
  setAsPrimaryCollectionHelper: function() {
    _.each(forwardableProperties, function(propertyName) {
      forwardMissingProperty.call(this, propertyName);
    }, this);
    if (this.parent.itemFilter && !this.itemFilter) {
      this.itemFilter = function() {
        return this.parent.itemFilter.apply(this.parent, arguments);
      };
    }
    if (this.parent.itemContext) {
      this.itemContext = function() {
        return this.parent.itemContext.apply(this.parent, arguments);
      };
    }
  }
});

_.extend(Thorax.CollectionHelperView.prototype, helperViewPrototype);

var collectionOptionNames = {
  'item-template': 'itemTemplate',
  'empty-template': 'emptyTemplate',
  'item-view': 'itemView',
  'empty-view': 'emptyView',
  'empty-class': 'emptyClass'
};

function forwardRenderEvent(eventName) {
  return function() {
    var args = _.toArray(arguments);
    args.unshift(eventName);
    this.parent.trigger.apply(this.parent, args);
  }
}

var forwardableProperties = [
  'itemTemplate',
  'itemView',
  'emptyTemplate',
  'emptyView'
];

function forwardMissingProperty(propertyName) {
  var parent = getParent(this);
  if (!this[propertyName]) {
    var prop = parent[propertyName];
    if (prop){
      this[propertyName] = prop;
    }
  }
}

Handlebars.registerViewHelper('collection', Thorax.CollectionHelperView, function(collection, view) {
  if (arguments.length === 1) {
    view = collection;
    collection = view.parent.collection;
    collection && view.setAsPrimaryCollectionHelper();
    view.$el.attr(collectionElementAttributeName, 'true');
    // propagate future changes to the parent's collection object
    // to the helper view
    view.listenTo(view.parent, 'change:data-object', function(type, dataObject) {
      if (type === 'collection') {
        view.setAsPrimaryCollectionHelper();
        view.setCollection(dataObject);
      }
    });
  }
  collection && view.setCollection(collection);
});

Handlebars.registerHelper('collection-element', function(options) {
  if (!getOptionsData(options).view.renderCollection) {
    throw new Error("collection-element helper must be declared inside of a CollectionView");
  }
  var hash = options.hash;
  normalizeHTMLAttributeOptions(hash);
  hash.tagName = hash.tagName || 'div';
  hash[collectionElementAttributeName] = true;
  return new Handlebars.SafeString(Thorax.Util.tag.call(this, hash, '', this));
});

;;
Handlebars.registerHelper('empty', function(dataObject, options) {
  if (arguments.length === 1) {
    options = dataObject;
  }
  var view = getOptionsData(options).view;
  if (arguments.length === 1) {
    dataObject = view.model;
  }
  // listeners for the empty helper rather than listeners
  // that are themselves empty
  if (!view._emptyListeners) {
    view._emptyListeners = {};
  }
  // duck type check for collection
  if (dataObject && !view._emptyListeners[dataObject.cid] && dataObject.models && ('length' in dataObject)) {
    view._emptyListeners[dataObject.cid] = true;
    view.listenTo(dataObject, 'remove', function() {
      if (dataObject.length === 0) {
        view.render();
      }
    });
    view.listenTo(dataObject, 'add', function() {
      if (dataObject.length === 1) {
        view.render();
      }
    });
    view.listenTo(dataObject, 'reset', function() {
      view.render();
    });
  }
  return !dataObject || dataObject.isEmpty() ? options.fn(this) : options.inverse(this);
});

;;
Handlebars.registerHelper('template', function(name, options) {
  var context = _.extend({fn: options && options.fn}, this, options ? options.hash : {});
  var output = getOptionsData(options).view.renderTemplate(name, context);
  return new Handlebars.SafeString(output);
});

Handlebars.registerHelper('yield', function(options) {
  return getOptionsData(options).yield && options.data.yield();
});

;;
Handlebars.registerHelper('url', function(url) {
  var fragment;
  if (arguments.length > 2) {
    fragment = _.map(_.head(arguments, arguments.length - 1), encodeURIComponent).join('/');
  } else {
    var options = arguments[1],
        hash = (options && options.hash) || options;
    if (hash && hash['expand-tokens']) {
      fragment = Thorax.Util.expandToken(url, this);
    } else {
      fragment = url;
    }
  }
  return (Backbone.history._hasPushState ? Backbone.history.options.root : '#') + fragment;
});

;;
/*global viewTemplateOverrides */
Handlebars.registerViewHelper('view', {
  factory: function(args, options) {
    var View = args.length >= 1 ? args[0] : Thorax.View;
    return Thorax.Util.getViewInstance(View, options.options);
  },
  callback: function() {
    var instance = arguments[arguments.length-1],
        options = instance._helperOptions.options,
        placeholderId = instance.cid;

    if (options.fn) {
      viewTemplateOverrides[placeholderId] = options.fn;
    }
  }
});

;;
/*global collectionOptionNames, inheritVars */

var loadStart = 'load:start',
    loadEnd = 'load:end',
    rootObject;

Thorax.setRootObject = function(obj) {
  rootObject = obj;
};

Thorax.loadHandler = function(start, end, context) {
  var loadCounter = _.uniqueId();
  return function(message, background, object) {
    var self = context || this;
    self._loadInfo = self._loadInfo || [];
    var loadInfo = self._loadInfo[loadCounter];

    function startLoadTimeout() {

      // If the timeout has been set already but has not triggered yet do nothing
      // Otherwise set a new timeout (either initial or for going from background to
      // non-background loading)
      if (loadInfo.timeout && !loadInfo.run) {
        return;
      }

      var loadingTimeout = self._loadingTimeoutDuration !== undefined ?
        self._loadingTimeoutDuration : Thorax.View.prototype._loadingTimeoutDuration;
      loadInfo.timeout = setTimeout(function() {
          try {
            loadInfo.run = true;
            start.call(self, loadInfo.message, loadInfo.background, loadInfo);
          } catch (e) {
            Thorax.onException('loadStart', e);
          }
        }, loadingTimeout * 1000);
    }

    if (!loadInfo) {
      loadInfo = self._loadInfo[loadCounter] = _.extend({
        events: [],
        timeout: 0,
        message: message,
        background: !!background
      }, Backbone.Events);
      startLoadTimeout();
    } else {
      clearTimeout(loadInfo.endTimeout);

      loadInfo.message = message;
      if (!background && loadInfo.background) {
        loadInfo.background = false;
        startLoadTimeout();
      }
    }

    // Prevent binds to the same object multiple times as this can cause very bad things
    // to happen for the load;load;end;end execution flow.
    if (loadInfo.events.indexOf(object) >= 0) {
      loadInfo.events.push(object);
      return;
    }

    loadInfo.events.push(object);

    object.on(loadEnd, function endCallback() {
      var loadingEndTimeout = self._loadingTimeoutEndDuration;
      if (loadingEndTimeout === void 0) {
        // If we are running on a non-view object pull the default timeout
        loadingEndTimeout = Thorax.View.prototype._loadingTimeoutEndDuration;
      }

      var events = loadInfo.events,
          index = events.indexOf(object);
      if (index >= 0) {
        events.splice(index, 1);

        if (events.indexOf(object) < 0) {
          // Last callback for this particlar object, remove the bind
          object.off(loadEnd, endCallback);
        }
      }

      if (!events.length) {
        clearTimeout(loadInfo.endTimeout);
        loadInfo.endTimeout = setTimeout(function() {
          try {
            if (!events.length) {
              var run = loadInfo.run;

              if (run) {
                // Emit the end behavior, but only if there is a paired start
                end.call(self, loadInfo.background, loadInfo);
                loadInfo.trigger(loadEnd, loadInfo);
              }

              // If stopping make sure we don't run a start
              clearTimeout(loadInfo.timeout);
              loadInfo = self._loadInfo[loadCounter] = undefined;
            }
          } catch (e) {
            Thorax.onException('loadEnd', e);
          }
        }, loadingEndTimeout * 1000);
      }
    });
  };
};

/**
 * Helper method for propagating load:start events to other objects.
 *
 * Forwards load:start events that occur on `source` to `dest`.
 */
Thorax.forwardLoadEvents = function(source, dest, once) {
  function load(message, backgound, object) {
    if (once) {
      source.off(loadStart, load);
    }
    dest.trigger(loadStart, message, backgound, object);
  }
  source.on(loadStart, load);
  return {
    off: function() {
      source.off(loadStart, load);
    }
  };
};

//
// Data load event generation
//

/**
 * Mixing for generating load:start and load:end events.
 */
Thorax.mixinLoadable = function(target, useParent) {
  _.extend(target, {
    //loading config
    _loadingClassName: 'loading',
    _loadingTimeoutDuration: 0.33,
    _loadingTimeoutEndDuration: 0.10,

    // Propagates loading view parameters to the AJAX layer
    onLoadStart: function(message, background, object) {
      var that = useParent ? this.parent : this;

      // Protect against race conditions
      if (!that || !that.el) {
        return;
      }

      if (!that.nonBlockingLoad && !background && rootObject && rootObject !== this) {
        rootObject.trigger(loadStart, message, background, object);
      }
      that._isLoading = true;
      $(that.el).addClass(that._loadingClassName);
      // used by loading helpers
      that.trigger('change:load-state', 'start');
    },
    onLoadEnd: function(/* background, object */) {
      var that = useParent ? this.parent : this;

      // Protect against race conditions
      if (!that || !that.el) {
        return;
      }
      
      that._isLoading = false;
      $(that.el).removeClass(that._loadingClassName);
      // used by loading helper
      that.trigger('change:load-state', 'end');
    }
  });
};

Thorax.mixinLoadableEvents = function(target, useParent) {
  _.extend(target, {
    loadStart: function(message, background) {
      var that = useParent ? this.parent : this;
      that.trigger(loadStart, message, background, that);
    },
    loadEnd: function() {
      var that = useParent ? this.parent : this;
      that.trigger(loadEnd, that);
    }
  });
};

Thorax.mixinLoadable(Thorax.View.prototype);
Thorax.mixinLoadableEvents(Thorax.View.prototype);


if (Thorax.HelperView) {
  Thorax.mixinLoadable(Thorax.HelperView.prototype, true);
  Thorax.mixinLoadableEvents(Thorax.HelperView.prototype, true);
}

if (Thorax.CollectionHelperView) {
  Thorax.mixinLoadable(Thorax.CollectionHelperView.prototype, true);
  Thorax.mixinLoadableEvents(Thorax.CollectionHelperView.prototype, true);
}

Thorax.sync = function(method, dataObj, options) {
  var self = this,
      complete = options.complete;

  options.complete = function() {
    self._request = undefined;
    self._aborted = false;

    complete && complete.apply(this, arguments);
  };
  this._request = Backbone.sync.apply(this, arguments);

  return this._request;
};

function bindToRoute(callback, failback) {
  var fragment = Backbone.history.getFragment(),
      routeChanged = false;

  function routeHandler() {
    if (fragment === Backbone.history.getFragment()) {
      return;
    }
    routeChanged = true;
    res.cancel();
    failback && failback();
  }

  Backbone.history.on('route', routeHandler);

  function finalizer() {
    Backbone.history.off('route', routeHandler);
    if (!routeChanged) {
      callback.apply(this, arguments);
    }
  }

  var res = _.bind(finalizer, this);
  res.cancel = function() {
    Backbone.history.off('route', routeHandler);
  };

  return res;
}

function loadData(callback, failback, options) {
  if (this.isPopulated()) {
    return callback(this);
  }

  if (arguments.length === 2 && !_.isFunction(failback) && _.isObject(failback)) {
    options = failback;
    failback = false;
  }

  var self = this,
      routeChanged = false,
      successCallback = bindToRoute(_.bind(callback, self), function() {
        routeChanged = true;
        if (self._request) {
          self._aborted = true;
          self._request.abort();
        }
        failback && failback.call(self, false);
      });

  this.fetch(_.defaults({
    success: successCallback,
    error: failback && function() {
      if (!routeChanged) {
        failback.apply(self, [true].concat(_.toArray(arguments)));
      }
    },
    complete: function() {
      successCallback.cancel();
    }
  }, options));
}

function fetchQueue(options, $super) {
  if (options.resetQueue) {
    // WARN: Should ensure that loaders are protected from out of band data
    //    when using this option
    this.fetchQueue = undefined;
  }

  if (!this.fetchQueue) {
    // Kick off the request
    this.fetchQueue = [options];
    options = _.defaults({
      success: flushQueue(this, this.fetchQueue, 'success'),
      error: flushQueue(this, this.fetchQueue, 'error'),
      complete: flushQueue(this, this.fetchQueue, 'complete')
    }, options);
    $super.call(this, options);
  } else {
    // Currently fetching. Queue and process once complete
    this.fetchQueue.push(options);
  }
}

function flushQueue(self, fetchQueue, handler) {
  return function() {
    var args = arguments;

    // Flush the queue. Executes any callback handlers that
    // may have been passed in the fetch options.
    _.each(fetchQueue, function(options) {
      if (options[handler]) {
        options[handler].apply(this, args);
      }
    }, this);

    // Reset the queue if we are still the active request
    if (self.fetchQueue === fetchQueue) {
      self.fetchQueue = undefined;
    }
  };
}

var klasses = [];
Thorax.Model && klasses.push(Thorax.Model);
Thorax.Collection && klasses.push(Thorax.Collection);

_.each(klasses, function(DataClass) {
  var $fetch = DataClass.prototype.fetch;
  Thorax.mixinLoadableEvents(DataClass.prototype, false);
  _.extend(DataClass.prototype, {
    sync: Thorax.sync,

    fetch: function(options) {
      options = options || {};

      var self = this,
          complete = options.complete;

      options.complete = function() {
        complete && complete.apply(this, arguments);
        self.loadEnd();
      };
      self.loadStart(undefined, options.background);
      return fetchQueue.call(this, options || {}, $fetch);
    },

    load: function(callback, failback, options) {
      if (arguments.length === 2 && !_.isFunction(failback)) {
        options = failback;
        failback = false;
      }

      options = options || {};
      if (!options.background && !this.isPopulated() && rootObject) {
        // Make sure that the global scope sees the proper load events here
        // if we are loading in standalone mode
        Thorax.forwardLoadEvents(this, rootObject, true);
      }

      loadData.call(this, callback, failback, options);
    }
  });
});

Thorax.Util.bindToRoute = bindToRoute;

if (Thorax.Router) {
  Thorax.Router.bindToRoute = Thorax.Router.prototype.bindToRoute = bindToRoute;
}

// Propagates loading view parameters to the AJAX layer
Thorax.View.prototype._modifyDataObjectOptions = function(dataObject, options) {
  options.ignoreErrors = this.ignoreFetchError;
  options.background = this.nonBlockingLoad;
  return options;
};

// Thorax.CollectionHelperView inherits from CollectionView
// not HelperView so need to set it manually
Thorax.HelperView.prototype._modifyDataObjectOptions = Thorax.CollectionHelperView.prototype._modifyDataObjectOptions = function(dataObject, options) {
  options.ignoreErrors = this.parent.ignoreFetchError;
  options.background = this.parent.nonBlockingLoad;
  return options;
};

inheritVars.collection.loading = function() {
  var loadingView = this.loadingView,
      loadingTemplate = this.loadingTemplate,
      loadingPlacement = this.loadingPlacement;
  //add "loading-view" and "loading-template" options to collection helper
  if (loadingView || loadingTemplate) {
    var callback = Thorax.loadHandler(_.bind(function() {
      var item;
      if (this.collection.length === 0) {
        this.$el.empty();
      }
      if (loadingView) {
        var instance = Thorax.Util.getViewInstance(loadingView);
        this._addChild(instance);
        if (loadingTemplate) {
          instance.render(loadingTemplate);
        } else {
          instance.render();
        }
        item = instance;
      } else {
        item = this.renderTemplate(loadingTemplate);
      }
      var index = loadingPlacement
        ? loadingPlacement.call(this)
        : this.collection.length
      ;
      this.appendItem(item, index);
      this.$el.children().eq(index).attr('data-loading-element', this.collection.cid);
    }, this), _.bind(function() {
      this.$el.find('[data-loading-element="' + this.collection.cid + '"]').remove();
    }, this),
    this.collection);

    this.listenTo(this.collection, 'load:start', callback);
  }
};

if (collectionOptionNames) {
  collectionOptionNames['loading-template'] = 'loadingTemplate';
  collectionOptionNames['loading-view'] = 'loadingView';
  collectionOptionNames['loading-placement'] = 'loadingPlacement';
}

Thorax.View.on({
  'load:start': Thorax.loadHandler(
      function(message, background, object) {
        this.onLoadStart(message, background, object);
      },
      function(background, object) {
        this.onLoadEnd(object);
      }),

  collection: {
    'load:start': function(message, background, object) {
      this.trigger(loadStart, message, background, object);
    }
  },
  model: {
    'load:start': function(message, background, object) {
      this.trigger(loadStart, message, background, object);
    }
  }
});

;;
Handlebars.registerHelper('loading', function(options) {
  var view = getOptionsData(options).view;
  view.off('change:load-state', onLoadStateChange, view);
  view.on('change:load-state', onLoadStateChange, view);
  return view._isLoading ? options.fn(this) : options.inverse(this);
});

function onLoadStateChange() {
  this.render();
}
;;
/*global pushDomEvents */
var isiOS = navigator.userAgent.match(/(iPhone|iPod|iPad)/i),
    isAndroid = navigator.userAgent.toLowerCase().indexOf("android") > -1 ? 1 : 0,
    minimumScrollYOffset = isAndroid ? 1 : 0;

Thorax.Util.scrollTo = function(x, y) {
  y = y || minimumScrollYOffset;
  function _scrollTo() {
    window.scrollTo(x, y);
  }
  if (isiOS) {
    // a defer is required for ios
    _.defer(_scrollTo);
  } else {
    _scrollTo();
  }
  return [x, y];
};

Thorax.LayoutView.on('change:view:end', function(newView, oldView, options) {
  options.scroll && Thorax.Util.scrollTo(0, 0);
});

Thorax.Util.scrollToTop = function() {
  // android will use height of 1 because of minimumScrollYOffset in scrollTo()
  return this.scrollTo(0, 0);
};

pushDomEvents([
  'singleTap', 'doubleTap', 'longTap',
  'swipe',
  'swipeUp', 'swipeDown',
  'swipeLeft', 'swipeRight'
]);

//built in dom events
Thorax.View.on({
  'submit form': function(/* event */) {
    // Hide any virtual keyboards that may be lingering around
    var focused = $(':focus')[0];
    focused && focused.blur();
  }
});

;;
/*global isAndroid */

$.fn.tapHoldAndEnd = function(selector, callbackStart, callbackEnd) {
  function triggerEvent(obj, eventType, callback, event) {
    var originalType = event.type,
        result;

    event.type = eventType;
    if (callback) {
      result = callback.call(obj, event);
    }
    event.type = originalType;
    return result;
  }

  var timers = [];
  return this.each(function() {
    var thisObject = this,
        tapHoldStart = false,
        $this = $(thisObject);

    $this.on('touchstart', selector, function(event) {
      tapHoldStart = false;
      var origEvent = event,
          timer;

      function clearTapTimer(event) {
        clearTimeout(timer);

        if (tapHoldStart) {
          var retval = false;
          if (event) {
            // We aren't sending any end events for touchcancel cases,
            // prevent an exception
            retval = triggerEvent(thisObject, 'tapHoldEnd', callbackEnd, event);
          }
          if (retval === false) {
            _.each(timers, clearTimeout);
            timers = [];
          }
        }
      }

      $(document).one('touchcancel', function() {
        clearTapTimer();

        $this.off('touchmove', selector, clearTapTimer);
        $this.off('touchend', selector, clearTapTimer);
      });

      $this.on('touchend', selector, clearTapTimer);
      $this.on('touchmove', selector, clearTapTimer);

      timer = setTimeout(function() {
        tapHoldStart = true;
        var retval = triggerEvent(thisObject, 'tapHoldStart', callbackStart, origEvent);
        if (retval === false) {
          _.each(timers, clearTimeout);
          timers = [];
        }
      }, 150);
      timers.push(timer);
    });
  });
};

//only enable on android
var useNativeHighlight = !isAndroid;
Thorax.configureTapHighlight = function(useNative) {
  useNativeHighlight = useNative;
};

var NATIVE_TAPPABLE = {
  'A': true,
  'INPUT': true,
  'BUTTON': true,
  'SELECT': true,
  'TEXTAREA': true
};

function fixupTapHighlight(scope) {
  _.each(this._domEvents || [], function(bind) {
    var components = bind.split(' '),
        selector = components.slice(1).join(' ') || undefined;  // Needed to make zepto happy

    if (components[0] === 'click') {
      // !selector case is for root click handlers on the view, i.e. 'click'
      $(selector || this.el, selector && (scope || this.el)).forEach(function(el) {
        var $el = $(el).data('tappable', true);

        if (useNativeHighlight && !NATIVE_TAPPABLE[el.tagName]) {
          // Add an explicit NOP bind to allow tap-highlight support
          $el.on('click', function() {});
        }
      });
    }
  }, this);
}

_.extend(Thorax.View.prototype, {
  _tapHighlightClassName: 'active',
  _tapHighlightStart: function(event) {
    var target = event.currentTarget,
        tagName = target && target.tagName.toLowerCase();

    // User input controls may be visually part of a larger group. For these cases
    // we want to give priority to any parent that may provide a focus operation.
    if (tagName === 'input' || tagName === 'select' || tagName === 'textarea') {
      target = $(target).closest('[data-tappable=true]')[0] || target;
    }

    if (target) {
      $(target).addClass(this._tapHighlightClassName);
      return false;
    }
  },
  _tapHighlightEnd: function(/* event */) {
    $('.' + this._tapHighlightClassName).removeClass(this._tapHighlightClassName);
  }
});

//TODO: examine if these are still needed
var fixupTapHighlightCallback = function() {
  fixupTapHighlight.call(this);
};

Thorax.View.on({
  'rendered': fixupTapHighlightCallback,
  'rendered:collection': fixupTapHighlightCallback,
  'rendered:item': fixupTapHighlightCallback,
  'rendered:empty': fixupTapHighlightCallback
});

var _setElement = Thorax.View.prototype.setElement,
    tapHighlightSelector = '[data-tappable=true], a, input, button, select, textarea';

Thorax.View.prototype.setElement = function() {
  var response = _setElement.apply(this, arguments);
  if (!this.noTapHighlight) {
    if (!useNativeHighlight) {
      var self = this;
      function exec(name) {
        return function() {
          try {
            self[name].apply(self, arguments);
          } catch(e) {
            Thorax.onException(name, e);
          }
        };
      }
      this.$el.tapHoldAndEnd(tapHighlightSelector, exec('_tapHighlightStart'), exec('_tapHighlightEnd'));
    }
  }
  return response;
};

var _addEvent = Thorax.View.prototype._addEvent;
Thorax.View.prototype._addEvent = function(params) {
  this._domEvents = this._domEvents || [];
  if (params.type === "DOM") {
    this._domEvents.push(params.originalName);
  }
  return _addEvent.call(this, params);
};

;;
/*global Backbone, module */
module.exports.initBackboneLoader = function(loaderModule, failure) {
  var lumbarLoader = (loaderModule || module.exports).loader;

  // Setup backbone route loading
  var handlers = {
    routes: {}
  };

  var pendingModules = {};
  for (var moduleName in lumbarLoader.map.modules) {
    handlers['loader_' + moduleName] = (function(moduleName) {
      return function() {
        if (lumbarLoader.isLoaded(moduleName)) {
          // The module didn't implement the proper route
          failure && failure('missing-route', moduleName);
          return;
        } else if (pendingModules[moduleName]) {
          // Do not exec the backbone callback multiple times
          return;
        }

        pendingModules[moduleName] = true;
        lumbarLoader.loadModule(moduleName, function(err) {
          pendingModules[moduleName] = false;

          if (err) {
            failure && failure(err, moduleName);
            return;
          }

          // Reload with the new route
          Backbone.history.loadUrl();
        });
      };
    }(moduleName));
  }

  // For each route create a handler that will load the associated module on request
  for (var route in lumbarLoader.map.routes) {
    handlers.routes[route] = 'loader_' + lumbarLoader.map.routes[route];
  }

  return new (Backbone.Router.extend(handlers))();
};

// Automatically initialize the loader if everything is setup already
if (module.exports.loader && module.exports.loader.map && window.Backbone) {
  module.exports.initBackboneLoader();
}

;;
module.exports.config = {
  "configTimeout": 60 * 60 * 1000, // 60 minutes
  "apiEndpoint": "/api/",

  "weightPrecision": 1,
  "weightIncrement": 0.1,
  "weightUnits": "kg",
  "currencySymbol": "£",
  "maxCrossSellItems": 5,
  "customerServiceNumber": "0800 952 6060",
  "homeRichRelevanceShelf": {
    "categoryName": "Apples & Pears",
    "departmentId": "1214921923758",
    "aisleId": "1214921924623",
    "categoryId": "1214921927404"
  }
}
;
module.exports.stylusConfig = {"$contentPadding":"10px","$borderRadius":"10px","$buttonBorderRadius":"5px"};
/*global Connection, authentication */
var Util = Phoenix.Util = {
  latLng: function(value) {
    // Reduce precision to 3 places, approximately 111m resolution at the equator.
    // This produces cleaner urls and improves the odds of a warm cache hit for requests
    return Math.floor(parseFloat(value) * 1000) / 1000;
  },

  ensureArray: function(item) {
    if (!item) {
      return item;
    }
    if (_.isArray(item)) {
      return item;
    } else {
      return [item];
    }
  },

  valueOf: function(obj, _this) {
    _this = _this || window;
    return _.isFunction(obj) ? obj.call(_this) : obj;
  },

  // Unlike $.param, this function doesn't replace spaces with pluses
  serializeParams: function(params) {
    return _.map(params, function(value, key) {
      return encodeURIComponent(key) + '=' + encodeURIComponent(value);
    }).join('&');
  },

  appendParams: function(url, params) {
    url = url || '';

    params = _.isString(params) ? params : this.serializeParams(Util.removeUndefined(params));
    if (!params) {
      return url;
    }

    var base = url + (url.indexOf('?') === -1 ? '?' : '&');
    return base + params;
  },

  stripParams: function(url) {
    var index = url.indexOf('?');
    return url.slice(0, index === -1 ? undefined : index);
  },

  // Returns a copy of the object containing only keys/values that passed truth test (iterator)
  // TODO : Consider extending underscore with this method
  pickBy: function(obj, iterator) {
    var res = {};
    _.each(obj, function(value, key) {
      if (iterator(value, key)) {
        res[key] = value;
      }
    });
    return res;
  },

  removeUndefined: function(obj) {
    return this.pickBy(obj, function(v) {
      return v !== undefined;
    });
  },

  cachedSingletonMixin: function(DataClass, type, expires) {
    var instance;
    var lastAccessTime = new Date().getTime();
    DataClass.get = function(noCreate) {
      if (noCreate) {
        return instance;
      }
      var curTime = new Date().getTime();
      if ((curTime - lastAccessTime) > (expires || authentication.SESSION_DURATION)) {
        DataClass.release();
      }
      if (!instance) {
        instance = new DataClass();
      }
      lastAccessTime = curTime;
      return instance;
    };
    DataClass.release = function() {
      lastAccessTime = 0;

      // Clearing here rather than clearing the instance object so any long lived
      // binds will survive and not leak.
      if (instance) {
        instance.reset && instance.reset();
        instance.clear && instance.clear();
      }
    };

    // Clear all data if any fatal error occurs, `resetData` event triggered
    exports.on('fatal-error', DataClass.release);
    exports.on('order:complete', DataClass.release);
    exports.on('resetData', function(options) {
      if (!options.type || options.type === 'all' || options.type === type) {
        DataClass.release();
      }
    });

    authentication.on('loggedout', DataClass.release);
    authentication.on(Connection.SESSION_EXPIRED, DataClass.release);
    authentication.on('session-activity', function() {
      if (authentication.isAuthed() === false) {
        DataClass.release();
      }
    });
  }
};

;;
function cookieDomain() {
  return '.' + window.location.host.replace(/:.*/, '').split('.').slice(-2).join('.');
}
function setCookie(name, value, maxAge) {
  var expires = '';
  if (maxAge) {
    var date = new Date();
    date.setTime(date.getTime()+maxAge);
    expires = '; expires='+date.toGMTString();
  }
  document.cookie = name + '=' + (value || '') + expires +'; domain=' + cookieDomain() + '; path=/';
}
function clearCookies() {
  var date = new Date();
  date.setTime(date.getTime()-(24*60*60*1000));
  var expires = "; expires="+date.toGMTString()+'; domain=' + cookieDomain() + '; path=/';

  _.each(document.cookie.split(/\s*;\s*/), function(cookie) {
    cookie = cookie.split('=')[0];

    document.cookie = cookie + '=' + expires;
  });
}

;;
Thorax.Router.create = function(module, props) {
  return module.exports.router = new (Thorax.Router.extend(_.defaults(props, module)))();
};

;;
/*global FastClick, appVersion, module */

Thorax.View.prototype._tapHighlightClassName = 'tap-highlight';

Phoenix = module.exports = exports = new Thorax.LayoutView(_.extend({name: 'application', el: document.body}, exports));
Backbone.history = new Backbone.History();

Phoenix.Collections = {};
Phoenix.Models = {};
Phoenix.Views = {};

Thorax.setRootObject(Phoenix);

// Dev testing only to try to prevent some of the anti-patterns that occur in developer environments
exports.isDesktop = !('orientation' in window);

exports.init = function(loaderModule) {
  if (window.phoenixTest) {
    return exports.trigger('init-complete');
  }

  Phoenix.render();

  // Apply android specific root class as Android sucks.
  if ($.os.android) {
    $('body').addClass('android');
  }

  new FastClick(document.body);

  exports.trigger('init', loaderModule);

  function complete() {
    exports.trackEvent('launch', {
      model: navigator.userAgent
    });

    Backbone.history.start();
    exports.trigger('init-complete');
  }
  if (typeof appVersion !== 'undefined' && !appVersion.isPopulated()) {
    // A couple of notes here:
    // The common path for most cases will be the else block of the if conditional
    // as this value should be seeded by the m/phoenix service for production cases.
    // For developers we want this to fail relatively early so we don't have to wait.
    // This could also impact mock-server instances but presumabily the impact will
    // be minimal.
    appVersion.fetch({
      timeout: 3000,
      success: complete,
      error: complete     // If we fail to load we still want to try to show the app.
    });
  } else {
    complete();
  }
};

;;
Thorax.templates['application'] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [2,'>= 1.0.0-rc.3'];
helpers = helpers || Handlebars.helpers; data = data || {};
  var buffer = "", escapeExpression=this.escapeExpression;


  buffer += "<div class=\"header\"></div>\n<div class=\"main-content\">\n  <div class=\"search-overlay\" style=\"display: none\"></div>\n  "
    + escapeExpression(helpers['layout-element'].call(depth0, {hash:{},data:data}))
    + "\n  <footer></footer>\n</div>\n";
  return buffer;
  });/*global Connection */
exports.bind('init', function(loaderModule) {
  exports.initBackboneLoader && exports.initBackboneLoader(loaderModule, function(type, module) {
    exports.trackError('loader', type + ':' + module);
    exports.trigger('fatal-error', type === 'connection' ? Connection.SERVER_ERROR : Connection.UNKNOWN_ERROR);
  });

  // Module loading indicators
  loaderModule.loader.initEvents();
  Thorax.forwardLoadEvents(loaderModule.loader, Phoenix);

  // Device info
  exports.devicePixelRatio = loaderModule.devicePixelRatio;
  exports.isDense = loaderModule.devicePixelRatio > 1;
});

;;
/*
 * Application-wide event handlers
 */

// Needs to be the .flex element, not body so absolutely positioned elements
// fill the height correctly.
var flexEl = $('body')[0];
function setMinimumHeight(orientation) {
  try {
    if (window.screen && !exports.isDesktop) {
      // Clear out the style so we can get real values on rotation.
      var originalHeight = flexEl.style.minHeight;
      flexEl.style.minHeight = '';

      var height,
          isPortrait = orientation === 0 || orientation === 180;
      if ($.os.android) {
        // when using the orientationchange event, the window's outerHeight value
        // would be stale.
        height = window.outerHeight / (exports.devicePixelRatio || 1);
      } else if ($.os.iphone) {
        if (isPortrait) {
          height = screen.height;
        } else {
          height = screen.width;
        }

        // Pull out any status bar height
        // On some devices this is taken out of the avilable
        // width and on others the height, regardless of orientation. Fun times.
        //
        // This seems to work on all tested devices including IOS6, the current bleeding edge...
        height -= (screen.width - screen.availWidth) || (screen.height - screen.availHeight);

        // we can determine whether the user is in mobile safari or
        // in desktop bookmark with navigator.standalone property
        if (!navigator.standalone) {
          // portrait toolbar is 44px
          // landscape toolbar is 32px
          height -= isPortrait ? 44 : 32;

          // sanity check for current devices:
          //  landscape - now window.innerHeight should be 268
          //  portrait - now window.innerHeight should be 416
        }
      } else {
        // hope that this comes out in the wash
        if (isPortrait) {
          height = screen.availHeight || screen.height;
        } else {
          height = screen.availWidth || screen.width;
        }
      }

      height = height + 'px';
      flexEl.style.minHeight = height;

      // If we had our size change due to an orrientation change, scroll to the top
      if (originalHeight !== height) {
        Thorax.Util.scrollToTop();
      }
    }
  } catch (err) {
    exports.trackCatch('minHeight', err);
  }
}

// Mobile safari do not handle orientation media queries correctly (but webviews do...)
// Hack around that with a body class for landscape mode
function setLandscape() {
  $(document.body).toggleClass('landscape', Math.abs(window.orientation) === 90);
}
setLandscape();

function orientationHandler() {
  setLandscape();

  // TODO : Revisit this as it doesn't work quite right in the map view
  setMinimumHeight(window.orientation);
}

exports.bind('init', function() {
  setMinimumHeight(window.orientation);
});

if ($.os.iphone) {
  window.addEventListener('orientationchange', orientationHandler, true);
} else {
  // Instead of using orientationchange we are going to use resize as it is more
  // reliable. for example, on android, first orientationchange fires then the
  // screen size changes, then reisze fires, so the window.outerHeight and other
  // screen size values would be stale during the orientationchange.  Once
  // switching to resize, we run into another problem where the resize gets
  // called twice due to us setting the .flex element's minHeight in the first
  // call. Therefore, we want to run our handler on the first resize event and
  // dismiss all the remaining resize events within the next 200 milliseconds.
  window.addEventListener('resize', _.debounce(orientationHandler, 200, true));
}

;;
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

;;
/*global Loader, alert, console */
exports.trackError = function(type, msg) {
  exports.trackEvent('error', {type: type, msg: msg});
  console.error(type + ':' + msg);
  if (!exports.isProd && type === 'javascript') {
    alert('Background error: ' + msg);
  }
};
Thorax.onException = exports.trackCatch = function(location, err) {
  exports.trackError('javascript', 'trackCatch:' + location + ': ' + err + (err.stack || ''));
};

// if applicable, bind to window.onerror
var _onError = window.onerror;
window.onerror = function(errorMsg, url, lineNumber) {
  _onError && _onError(errorMsg, url, lineNumber);
  exports.trackError('javascript', url + ': ' + lineNumber + ' - ' + errorMsg);
};

var lastPage;
Backbone.history.bind('route', function() {
  var name = Backbone.history.getFragment();
  // Do not send duplicate events (route will be triggered twice for the first module load)
  if (name !== lastPage) {
    exports.trackEvent('pageView', { name: name });
    lastPage = name;
  }
});

Backbone.history.bind('route-error', function(route, err) {
  exports.trackCatch('route-error:' + Backbone.history.getFragment(), err);
});

_.each(Loader.initErrors, function(error) {
  exports.trackError(error.type, error.msg);
});

var touchSanity = exports.touchSanity = function(event) {
  if (!event.touches) {
    exports.trackError('javascript', 'Touch event missing touches: ' + navigator.userAgent);
    throw new Error('Touch event missing touches');
  }
};

;;
/*global Util */

/**
 * Connection event flow
 *
 * Connection Lifecycle:
 *    - 'start' event occurs on the Connection object
 *    - One of:
 *      - Success flow is entered if cached data is provided by a handler
 *          An error by the callback at this phase will cause a cache-error event on the Connection
 *          object.
 *      - Error flow is entered if handler marks the request as in error prior to connecting
 *      - XHR request is made if the start handlers do not abort via error or cache response
 *
 * Success:
 *    - On success 'data' event is triggered on the Connection object.
 *        At this point event handlers may change the status field of the event data object
 *        to a value other than 'success' to trigger the error handling logic.
 *    - The sync or ajax success handler is triggered
 *
 * Error:
 *    - On error from the ajax layer or from success handler the 'error' event will be triggered
 *        on the Connection object. If a handler would like to prevent the final error handling
 *        stage from occurring then the error callback method on the event may be overriden.
 *
 *    - If not disabled then the global or instance specific `errorHandler` instance is called
 *    - Executes error callback defined in options object, if any.
 *
 * Complete:
 *  Executed after success or error flows regardless of the exact path.
 *    - Triggers 'end' event on Connection
 *    - Execute complete callback defined in options object, if any.
 *
 *
 * Error Handling:
 *  Generic error handling is done primarily through generic events. These are:
 *    exports: fatal-error(status, errorInfo)
 *    dataObject: error(dataObject, status, errorInfo)
 */
var Connection = exports.Connection = _.extend({
  /**
   * Known status/error cases.
   *
   * Note that this list is augmented by the errors generated by the zepto ajax layer.
   */
  SUCCESS: 'success',

  // Zepto Stack Errors
  HTTP_ERROR: 'error',
  PARSER_ERROR: 'parsererror',
  TIMEOUT_ERROR: 'timeout',

  CONNECTION_ERROR: 'connection',
  MAINTENANCE_ERROR: 'maintenace-error',
  SERVER_ERROR: 'server-error',
  UNKNOWN_ERROR: 'unknown-error',

  SESSION_EXPIRED: 'session-expired',
  NOT_FOUND_ERROR: 'not-found-error',

  /**
   * Generic wrapper for ajax calls. Manages generic error handling as well as provides
   * helpful defaults.
   *
   * May be called with context of model or collection
   */
  ajax: function(options) {
    options = _.clone(options);
    if (!applyConnectionOptions(options, this)) {
      return;
    }

    $.ajax(options);
  },

  /**
   * Updated backbone sync method. Provides generalized caching and error handling
   */
  sync: function(method, dataObject, options) {
    options = _.clone(options);
    if (dataObject.syncOptions) {
      dataObject.syncOptions(method, options);
    }
    options.url = options.url || Util.valueOf(dataObject.url, dataObject);
    options.syncMethod = method;

    if (!applyConnectionOptions(options, dataObject)) {
      return;
    }

    return Thorax.sync.call(this, method, dataObject, options);
  },

  errorHandler: function(event) {
    var dataObject = event.dataObject;

    if (!dataObject._aborted && Connection.isFatal(event)) {
      exports.trigger('fatal-error', event.status, event.errorInfo);
    }
    dataObject.trigger('error', dataObject, event.status, event.errorInfo);
  },
  isFatal: function(event) {
    return !event.options.ignoreErrors;
  },

  /**
   * Allows for explicit cache invalidation of a particular set of urls, based on prefix.
   *
   * Connection plugins that implement caching should monitor for the invalidate event and
   * invalidate any stored caches when seen.
   */
  invalidate: function(prefix, options) {
    // Match the event pattern used by the other events to maximize code reuse.
    var event = {
      options: _.defaults({url: prefix || ''}, options)
    };
    Connection.trigger('invalidate', event);
  },

  /*
   * Prevents out of band data requests from overwriting legitimate data.
   *
   * This should be used in conjunction with the resetQueue option on fetch
   * to ensure that the most recent data is displayed after configuration
   * changes occur on the data object.
   *
   * Ex:
   *     sync: Phoenix.Connection.boundSync(['sortField'], Phoenix.PagedCollection.prototype.sync),
   */
  boundSync: function(fields, $super) {
    return function(method, dataObj, options) {
      function bindToFields(callback) {
        return function() {
          var different = _.any(fields, function(field) {
            return original[field] !== dataObj[field];
          });
          if (!different) {
            callback.apply(this, arguments);
          }
        };
      }

      // Collect the current watch values
      var original = {};
      _.each(fields, function(field) {
        original[field] = dataObj[field];
      });

      options.success = bindToFields(options.success);
      options.error = bindToFields(options.error);
      return $super.apply(this, arguments);
    };
  },


  loadImage: function(src, alt, success, failure) {
    if (!src) {
      success && success();
      return;
    }

    var img;
    if (_.isElement(src)) {
      img = src;
      src = img.src;

      if (img.complete) {
        success && success();
        return;
      }
    } else {
      img = new Image();
      img.alt = alt;
    }
    img.onload = function() {
      try {
        // Kill the loading indicator to prevent dupes and improve GC
        img.onerror = img.onload = undefined;

        success && success(img);
      } catch (err) {
        Phoenix.trackCatch('loadImage ' + src, err);
      }
    };
    img.onerror = function() {
      img.onerror = img.onload = undefined;

      Phoenix.trackError('image-error', src);
      failure && failure();
    };
    img.src = src;
    return img;
  }
}, Backbone.Events);

//***************
// Setup helpers
//***************

function applyConnectionOptions(options, dataObject) {
  options.dataType = options.dataType || 'json';
  if (dataObject.secureUrl) {
    options.secure = true;
  }

  var event = {
    options: options,
    originalUrl: options.url,
    dataObject: dataObject,

    success: options.success,
    error: options.error,
    complete: options.complete
  };

  // Apply one layer of indirection so callbacks may modify this
  function callback(field) {
    return function() {
      var callback = event[field];
      if (callback) {
        callback.apply(this, arguments);
      }
    };
  }
  var success = callback('success'),
      error = callback('error'),
      complete = callback('complete');

  Connection.trigger('start', event);

  // AJAX Event handling
  options.success = wrapAjaxCallback('data', event, function() {
    if (!event.errorInfo && event.status === Connection.SUCCESS) {
      success.call(this, event.responseData, event.status, event.xhr);
    } else {
      options.error.call(this, event.xhr, event.status, event.errorInfo);
    }
  });
  options.error = wrapAjaxCallback('error', event, function() {
    if (!options.ignoreErrors) {
      (dataObject.errorHandler || Connection.errorHandler).call(dataObject, event);
    }
    error.call(this, event.xhr, event.status, event.errorInfo);
  });
  options.complete = wrapAjaxCallback('end', event, complete);

  // If we have cached data then push it out
  if (event.responseData) {
    // WARN : Not passing the xhr object. This will break for any objects that need that
    try {
      success(event.responseData, Connection.SUCCESS);
      complete();

      // Explicitly return nothing in this case to prevent further processing
      return;
    } catch (err) {
      Connection.trigger('cache-error', event);
      exports.trackCatch('cachedData ' + options.url, err);
    }
  } else if (event.status && event.status !== Connection.SUCCESS) {
    // Shortcircuit the error handling
    options.error.call(this, event.xhr, event.status, event.errorInfo);
    options.complete.call(this, event.xhr, event.status, event);
    return;
  }

  applyAPIVersion(options, options.secure);

  return options;
}
function wrapAjaxCallback(eventName, event, callback) {
  return function(data, status, xhr) {
    try {
      if (data && data.onreadystatechange) {
        // Support error and complete callback signatures
        event.errorInfo = event.errorInfo || xhr;
        event.xhr = event.xhr || data;
      } else {
        // Success signature
        event.responseData = data;
        event.xhr = xhr;
      }
      event.status = event.status || status;

      Connection.trigger(eventName, event);

      // Match the error and complete signature so we can pass directly. Success will
      // do custom handling
      callback.call(this, event.xhr, event.status, event.errorInfo);
    } catch (err) {
      event.errorInfo = err;
      Phoenix.trackCatch('ajax.' + event + ' ' + event.options.url, err);
    }
  };
}


function applyAPIVersion(options, secure) {
  // These API options only apply to wicket services.
  if (options.url.indexOf('/m/j?') === -1) {
    return;
  }

  // We are assuming that everything will be in the current services format which requires at least 1 parameter.
  if (secure && !options.v1) {
    options.url += '&version=2';
    options.implicitVerify = true;
  }

  // Append the JSON error parameter that the wicket services require, but try to avoid
  // messing up path only urls.
  if (options.url.indexOf('?') !== -1) {
    options.url += '&e=1';

    if (!secure && (typeof appVersion !== 'undefined')) {
      // Inject arbitrary cache killer value if we have one.
      options.url += '&40cc=' + (appVersion.cacheToken() || '');
    }
  }
}


// Work around Backbone's ever changing API....
// Note that this does not implement the majority of the backbone features as we only use this for
// GET operations.
//
// See https://github.com/documentcloud/backbone/issues/2031 for further info.
Backbone.sync = function(method, model, options) {
  options = options || {};

  // Default JSON-request options.
  var params = {type: 'GET', dataType: 'json'};

  // Ensure that we have a URL.
  if (!options.url) {
    params.url = _.result(model, 'url');
    if (!params.url) {
      throw new Error('A "url" property or function must be specified');
    }
  }

  // Make the request, allowing the user to override any Ajax options.
  var xhr = $.ajax(_.extend(params, options));
  model.trigger('request', model, xhr, options);
  return xhr;
};

Connection.on('end', function(event) {
  if (!event.errorInfo && event.options.invalidate) {
    // If the call needs to blow some things away do it
    var prefix = event.dataObject.invalidateUrl;
    if (_.isFunction(prefix)) {
      prefix = prefix.call(event.dataObject, event);
    }

    if (prefix) {
      // Making best guest at what the options mapping should be and reusing the ones
      // that are currently in use
      Connection.invalidate(prefix, event.options);
    }
  }
});

;;
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

;;
/*global Connection */
Connection.on('data', function(event) {
  if (!event.responseData && event.options.dataType === 'json') {
    // We want valid json if that is what we selected
    event.status = Connection.PARSER_ERROR;
  }
});

Connection.on('error', function(event) {
  var dataObject = event.dataObject,
      options = event.options,
      errorInfo = event.errorInfo,
      xhr = event.xhr,

      responseText;

  // Simplify the output for the data connection lost case
  if (xhr && !xhr.status) {
    event.connectionError = true;
    event.status = Connection.CONNECTION_ERROR;
    event.errorInfo = errorInfo = undefined;

    // For connection errors reusue the responseText section to output the network state as the browser
    // knows it.
    responseText = 'online: ' + navigator.onLine + ' connection:' + (navigator.connection || {}).type;
  } else {
    responseText = event.status === Connection.PARSER_ERROR ? (xhr && xhr.responseText) : undefined;
  }

  if (!dataObject._aborted) {
    if (event.status !== Connection.SESSION_EXPIRED) {
      exports.trackError(event.status, JSON.stringify({
        ignored: options.ignoreErrors,
        type: options.url,
        text: errorInfo,
        status: xhr && xhr.status,
        responseText: responseText
      }));
    } else {
      exports.trackError('auth-expired', options.url);
    }
  }

  // Log but otherwise silently ignore errors for calls that opt in
  if (options.ignoreErrors) {
    dataObject.trigger('error:silent', dataObject, Connection.SERVER_ERROR);
  }
});

;;
/*global Connection */
Connection.on('start', function(event) {
  var dataObject = event.dataObject;
  if (dataObject && dataObject.loadStart) {
    dataObject.loadStart(undefined, event.options.background);
  }
});
Connection.on('end', function(event) {
  var dataObject = event.dataObject;
  if (dataObject && dataObject.loadEnd) {
    dataObject.loadEnd();
  }
});

;;
/*global Connection, LocalCache */
Connection.on('start', function(event) {
  event.shouldCache = Connection.shouldCache(event);

  var cachedResponse = event.shouldCache && LocalCache.get(event.cacheUrl);
  if (cachedResponse) {
    try {
      event.responseData = JSON.parse(cachedResponse);
    } catch (err) {
      /* NOP */
    }
  }
});
Connection.on('data', function(event) {
  // Save off cache data so callback modifications don't corrupt the cache
  if (event.shouldCache) {
    event.cacheData = JSON.stringify(event.responseData);
  }
});
Connection.on('end', function(event) {
  var ttl = event.dataObject && event.dataObject.ttl;

  if (event.cacheData && ttl && !event.errorInfo) {
    LocalCache.store(event.cacheUrl, event.cacheData, ttl);
  }
});
Connection.on('cache-error', function(event) {
  LocalCache.remove(event.cacheUrl);
});

Connection.on('invalidate', function(event) {
  LocalCache.invalidate(event.options.url, event.options.hard);
});

Connection.shouldCache = function(event) {
  var dataObject = event.dataObject,
      options = event.options;

  event.cacheUrl = event.originalUrl;

  // WARN: This does not take into account state changes that could be introduced by non-safe methods
  //    called on a particular URL. If the services tier is changed to a more RESTful architecture
  //    this implementation should be revisited to either invalidate or update the cache elements
  //    based on the responses to other methods.
  return !options.add
        && options.url
        && (!options.type || (options.type && options.type.toLowerCase() === 'get'))
        && dataObject.ttl;
};

;;
/*global Connection */
Connection.on('start', function(event) {
  event.route = Backbone.History.started && Backbone.history.getFragment();
});
Connection.on('data', function(event) {
  // Mark any out of band responses as aborted.
  // This will not block most of the response handling
  // but will filter out some error cases that no longer
  // make sense in the user's current context
  if (event.route && event.route !== Backbone.history.getFragment()) {
    event.dataObject._aborted = true;
  }
});

;;
/*global Connection */

//***************
// Error tracking
//
// Helps us differentiate between true connection errors and
// errors that are introduced due to aborted connections due to page naviation.
//
//***************
var isUnloading = false,
    unloadTrackerCount = 0;
function unloadTracker() {
  isUnloading = true;
}
// We want to keep the page in the page cache if possible.
// Using the rules defined in https://developer.mozilla.org/en-US/docs/Using_Firefox_1.5_caching
// as a rough outline for the presumed behavior of webkit.
Connection.on('start', function() {
  ++unloadTrackerCount;
  if (unloadTrackerCount === 1) {
    window.addEventListener('beforeunload', unloadTracker, false);
  }
});

Connection.on('error', function(event) {
  // Simplify the output for the data connection lost case
  if (event.connectionError) {
    // If we are actively unloading and see a connection error, ignore.
    if (isUnloading) {
      event.error = function() {};
    }
  }
});

Connection.on('end', function() {
  --unloadTrackerCount;
  if (!unloadTrackerCount) {
    window.removeEventListener('beforeunload', unloadTracker, false);
  }
});

;;
/*global Connection */
var Model = exports.Model = Thorax.Model.extend({
  sync: Connection.sync,
  ajax: Connection.ajax,

  initialize: function(attributes, options) {
    Thorax.Model.prototype.initialize.call(this, attributes, options);

    this.bind('change', _.bind(function() {
      this.needsUpdate = true;
    }, this));
  },

  shortCircuitUpdate: function() {
    return (!this.needsUpdate && (!this.changed || _.isEmpty(this.changed)));
  }
});

;;
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

;;
/*global Connection */
var Collection = Phoenix.Collection = Thorax.Collection.extend({
  sync: Connection.sync,
  ajax: Connection.ajax
});

;;
var PagedCollection = exports.PagedCollection = exports.Collection.extend({
  collectionField: 'item',
  countField: 'totalCount',
  pageSize: 20,
  page: 0,

  offset: function() {
    return this.pageSize * this.page;
  },

  nextPage: function(callback, error, options) {
    if (!this.hasMore()) {
      return;
    }

    ++this.page;

    this.fetch(_.defaults({
      ignoreErrors: !error,
      add: true,
      update: true,
      remove: false,
      success: callback,
      error: error
    }, options));
  },

  hasMore: function() {
    return this.totalCount > this.offset() + this.pageSize;
  },

  parse: function(response) {
    this.totalCount = parseFloat(response[this.countField]);
    return response[this.collectionField];
  },
  
  isOnFirst: function() {
    return !this.page;
  }
});

/*
 * Helper method that allows collections pulling from paged server sources
 * to expose a since request API to consumers.
 *
 * Delegates to the owner's url and parse methods.
 * Optionally accepts fetchOptions hash with countField, pageSize and collectionField attributes.
 *
 * Usage:
 *   Collection.extend({
 *     // Flag that we are loadable
 *     url: function() {
 *       return 'cart/view?basketid=' + this.id;
 *     },
 *     secureUrl: true,
 *     fetch: PagedCollection.mergeFetch()
 */
exports.PagedCollection.mergeFetch = function(fetchOptions) {
  fetchOptions = fetchOptions || {};
  return function(options) {
    // Custom fetch implementation to make the paged API not
    // paged on the client... such is life.
    var self = this;

    options = options || {};

    var worker = new (PagedCollection.extend({
      countField: fetchOptions.countField || self.countField || PagedCollection.prototype.countField,
      collectionField: fetchOptions.collectionField || self.collectionField || PagedCollection.prototype.collectionField,
      pageSize: fetchOptions.pageSize || self.pageSize || 50,
      model: self.model,

      ttl: self.ttl,
      url: function() {
        return _.result(self, 'url') + this.offsetParams(true);
      },
      secureUrl: self.secureUrl,

      parse: function(data) {
        data = self.parse(data);

        return PagedCollection.prototype.parse.call(this, data);
      }
    }))();
    worker.on('error', _.bind(this.trigger, this, 'error'));

    function cleanup(callback) {
      return function() {
        self.loadEnd();
        worker.off();
        callback && callback.apply(this, arguments);
        options.complete && options.complete.call(this);
      };
    }
    var error = cleanup(options.error);

    function success() {
      if (worker.hasMore()) {
        worker.nextPage(success, error, {resetQueue: true});
      } else {
        // Pull the models out of the worker collection
        var resetOptions = {};
        worker.reset([], resetOptions);

        // And put them in our collection
        // We need to remove then add so this collection can take full ownership of the
        // models from the worker.
        self.reset(resetOptions.previousModels);

        cleanup(options.success).apply(this, arguments);
      }
    }

    self.loadStart();

    if (options.seed) {
      worker.page = 1;
      worker.reset(options.seed, {parse: true});
      success();
    } else {
      worker.fetch({
        success: success,
        error: error
      });
    }
  };
};

;;
var relativePattern = /^(?:https?:\/|\/)([^\/].*)/,
    absolutePattern = /^https?:\/\/.*/,
    itemLinkPattern = /^https?:\/\/www\.walmart\.com\/(ip\/\d+)$/;


var cleanHTML = exports.cleanHTML = function cleanHTML(html) {
  if (!html) {
    return;
  }

  // The merchandisers sometimes send iso-latin-1 data in the utf8 stream
  // Do our best to protect ourselves from these cases (hopefully rare)
  html = html.replace(/\uFFFD/g, ' ');

  // Try to protect ourselves from crap data....
  var womb = document.createElement('div');
  womb.innerHTML = html;

  $(womb).find('script').remove();

  //remove any empty p tags
  $(womb).find('p:empty').remove();

  $(womb).find("a").each(function(){
    var a = $(this);
    var href = a.attr('href');
    if (href) {

      // add target to any external links
      if (href.match(absolutePattern)) {
        a.attr('target', Phoenix.openTarget);
      } else {
        // change any relative links to be absolute www links
        var match = href.match(relativePattern);
        if (match) {
          href = 'http://' + Phoenix.config.wwwHost + '/' + match[1];
          a.attr('href', href);
          a.attr('target', '_blank');
        }
      }

      // if it's a product id, just make it a relative link
      match = href.match(itemLinkPattern);
      if (match) {
        href = Phoenix.View.link(match[1]);
        a.attr('href', href);
      }
    }
  });

  return womb.innerHTML;
}

;;
/*global LocalCache */
var appVersion = exports.appVersion = new (exports.Model.extend({
  background: true,

  cacheToken: function() {
    return this.get('clearClientCache');
  },
  isPopulated: function() {
    if (!this.loadTime) {
      return false;
    }

    var refreshRate = exports.config.configRefreshRate;

    if (refreshRate) {
      refreshRate = Math.max(parseInt(refreshRate, 10), 5 * 60 * 1000);
      return this.loadTime + refreshRate > Date.now();
    } else {
      return true;
    }
  },
  parse: function(data) {
    this.loadTime = Date.now();

    // The AB service does not handle booleans as such so cast boolean string values.
    _.each(data, function(value, key) {
      if (value === 'true') {
        data[key] = true;
      } else if (value === 'false') {
        data[key] = false;
      }
    });

    exports.config = _.extend({}, this.baseConfig, data);
    return exports.config;
  }
}))();

appVersion.bind('change:clearClientCache', function() {
  var TOKEN = 'client-cache-token';
  var token = appVersion.cacheToken(),
      cached = LocalCache.get(TOKEN);
  if (token !== cached) {
    LocalCache.reset();

    if (!LocalCache.store(TOKEN, token)) {
      // Something blew up with the quota. Do not reload as this could cause very bad things
      LocalCache.remove(TOKEN);
    }

    if (cached) {
      // We had data. Now it changed. Signal a reload.
      exports.trigger('cache-reset');
    }
  }
});

// If we do see a change in the cache value then we want to force a reload,
// special casing the checkout routes as these generally aren't cached and
// we do not want to interfere with any inputs the user may have had there
exports.bind('cache-reset', function() {
  if (!Backbone.history || !Backbone.history.started) {
    return;
  }

  if (!/^(?:checkout|photo)/.test(Backbone.history.getFragment())) {
    Backbone.history.loadUrl();
  }
});

$(document).ready(function() {
  appVersion.baseConfig = _.clone(exports.config);

  // Pull an any a/b config that was inlined
  if (window.phoenixConfig) {
    appVersion.set(appVersion.parse(window.phoenixConfig));
  }

  // Disable auto loading in test mode
  if (window.phoenixTest) {
    return;
  }

  // Refetch the app version if we aren't populated anymore, per the refresh config.
  Backbone.history.bind('route', function() {
    if (!appVersion.isPopulated()) {
      appVersion.fetch({background: true, ignoreErrors: true});
    }
  });
});

;;
/*global Connection, authentication */
Connection.on('start', function(event) {
  event.sessionId = authentication.sessionId;

  if (event.options.authed && authentication.isAuthed() === false) {
    // Short circuit the connection attempt if we know we are not authenticated
    event.status = Connection.SESSION_EXPIRED;
  }
});

Connection.on('data', function(event) {
  if (event.options.authed && event.status === Connection.SUCCESS) {
    authentication.sessionActivity(true);
  }
});

Connection.on('end', function(event) {
  if (event.status === Connection.SESSION_EXPIRED && authentication.isAuthed() !== false) {
    // Notify the auth object of the change if we think that we are authed or do not know
    // Truthy value of ignoreErrors will prevent from emitting `session-expired` event
    authentication.sessionExpired(event.sessionId, event.options.ignoreErrors);
  }
});

;;
/*global LocalCache */
var Authentication = Phoenix.Model.extend({
  SESSION_DURATION: (1000 * 60 * 30),
  sessionId: 1,


  initialize: function() {
    this.lastUserName = LocalCache.get('lastUserName');
    this.sessionActivity();
  },
  setLastUserName: function(userName) {
    this.lastUserName = userName;
    LocalCache.store('lastUserName', userName);
  },

  /*
   * Returns true if authed, false if not authed, undefined if unknown
   */
  isAuthed: function() {
    var loggedIn = this.get('loggedIn');
    if (loggedIn !== undefined) {
      var curTime = Date.now();
      if ((curTime - this.lastAccessTime) < this.SESSION_DURATION) {
        return loggedIn;
      }
    }
  },

  sessionExpired: function(sessionId, abandon) {
    // Prevent multiple auth errors from concurrent requests
    if (sessionId !== this.sessionId) {
      return;
    }
    this.sessionId++;

    if (!abandon) {
      this.trigger('session-expired');
    }

    this.sessionActivity(false);
  },
  sessionActivity: function(loggedIn) {
    if (loggedIn !== undefined) {
      this.set('loggedIn', loggedIn);
      this.trigger('session-activity');
    }

    this.lastAccessTime = Date.now();
  }
});

// Singleton authentication object
var authentication = exports.authentication = new Authentication();

;;
var View = exports.View = Thorax.View.extend({
  // Remove loading timeout delay here as this can introduce up to two second delay for cases
  // that we will likely want to display the indicator anyway
  _loadingTimeoutDuration: 0
});

;;
/*global View */

// Big fat nasty hack to show placeholder text on input[type="number"] element under Android.
// http://stackoverflow.com/questions/11576226/placeholder-text-for-an-input-type-number-does-not-show-in-webkit-ics
// http://code.google.com/p/android/issues/detail?id=24626
//
// This has been reported on 4.0 and 4.1 up to this point.
if ($.os.android && parseFloat($.os.version) >= 4.0) {
  View.on({
    'activated': function() {
      var view = this;
      function applyNumberHack(type) {
        return function(event) {
          var target = $(event.target).closest('[data-android-number]', view.el).get(0);
          if (target) {
            target.type = type;
          }
        };
      }

      this.numberFocus = applyNumberHack('number');
      this.numberBlur = applyNumberHack('text');

      // Zepto doesn't do capturing in the way that we need it to so we have to roll our own.
      // When using bubbling for this the keyboard had interminent issues so capturing is
      // necessary to make this function smoothly.
      this.el.addEventListener('focus', this.numberFocus, true);
      this.el.addEventListener('blur', this.numberBlur, true);
    },
    'destroyed': function() {
      this.el.removeEventListener('focus', this.numberFocus, true);
      this.el.removeEventListener('blur', this.numberBlur, true);
    },

    'rendered, rendered:collection, rendered:item, rendered:empty': function() {
      // Mark all number inputs as text and flag so the hack will touch them
      this.$('input[type="number"]')
          .attr('type', 'text')
          .data('android-number', true);
    }
  });
}

;;
/*global Util, Validate, View */
View.on({
  validate: function(attributes, errors) {
    // Allow procedural validation on models
    if (this.model && this.model.validateInput) {
      errors.push.apply(
        errors,
        this.model.validateInput(attributes) || []);
    }

    // Parameter-based validation on the validation fields
    var validation = Util.valueOf(this.validation, this);
    if (validation) {
      errors.push.apply(
        errors,
        Validate.validate(attributes, validation));
    }

    if (this.model) {
      validation = Util.valueOf(this.model.validation, this);
      if (validation) {
        errors.push.apply(
          errors,
          Validate.validate(attributes, validation));
      }
    }
  }
});


;;
/*global Connection, View */
var ErrorView = View.extend({
  name: 'error',
  className: 'error-page',
  crumbs: {hide: true}
});

var errorMessageStrings = {};
errorMessageStrings[Connection.MAINTENANCE_ERROR]
    = 'The site is down for maintenance.  Please try again later.';

errorMessageStrings[Connection.HTTP_ERROR] =
errorMessageStrings[Connection.TIMEOUT_ERROR] =
errorMessageStrings[Connection.CONNECTION_ERROR] =
errorMessageStrings[Connection.PARSER_ERROR]
    = 'An error occurred communicating with the server. Please try again.';

errorMessageStrings[Connection.UNKNOWN_ERROR] =
errorMessageStrings[Connection.SERVER_ERROR]
    = 'We\'re sorry, but we\'re having system issues. Please try again.';

ErrorView.createAndDisplay = function(options) {
  options = _.defaults({message: errorMessageStrings[Connection.UNKNOWN_ERROR]}, options);
  var view = new ErrorView(options);
  view.render();
  Phoenix.setView(view);
};

//last resort error handler
exports.bind('fatal-error', function(msg) {
  if (errorMessageStrings[msg]) {
    ErrorView.createAndDisplay({message: errorMessageStrings[msg]});
  }
});

;;
Thorax.templates['error'] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [2,'>= 1.0.0-rc.3'];
helpers = helpers || Handlebars.helpers; data = data || {};
  var buffer = "", stack1, functionType="function", escapeExpression=this.escapeExpression;


  buffer += "<h2>"
    + escapeExpression(((stack1 = depth0.message),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</h2>\n";
  return buffer;
  });function _i18n(dict, token, pNum) {
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

;;
/*global Connection */
var pageNotFoundRouter = new (Backbone.Router.extend({
  routes: {
    '*path': 'render404'
  },
  render404: function(path) {
    Phoenix.setView(new Thorax.View({
      name: 'error-not-found',
      className: 'error-page',
      path: path
    }));
  }
}))();

exports.bind('fatal-error', function(msg) {
  if (msg === Connection.NOT_FOUND_ERROR) {
    pageNotFoundRouter.render404();
  }
});

;;
Thorax.templates['error-not-found'] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [2,'>= 1.0.0-rc.3'];
helpers = helpers || Handlebars.helpers; data = data || {};
  var buffer = "", escapeExpression=this.escapeExpression;


  buffer += "<h2>"
    + escapeExpression(helpers.i18n.call(depth0, "Sorry, we couldn't find this page. It may no longer exist.", {hash:{},data:data}))
    + "</h2>\n<p>"
    + escapeExpression(helpers.i18n.call(depth0, "Please check the address and try again.", {hash:{},data:data}))
    + "</p>\n";
  return buffer;
  });/*global Model */
/**
 * Implements lookup methods for item previews.
 */

// Attempts to load a given model from the current view, if available
View.prototype.lookupModel = function(id, clazz) {
  function checkView(view) {
    var object = _.find(view._boundDataObjectsByCid, function(object) {
      var collectionClass;
      if (object.id !== id && object.models) {
        collectionClass = object.previewClass === clazz;
        object = object.get(id);
        if (!object) {
          return;
        }
      }

      if (object.id === id && (!clazz || collectionClass || (object.previewClass === clazz))) {
        return true;
      }
    });


    var model = (object && object.get(id)) || object;
    if (model) {
      return model;
    }
  }

  var result = checkView(this);
  if (result) {
    return result;
  }

  // Scan all children to see if they have any instances
  _.find(this.children, function(view) {
    /*jshint boss:true */
    return result = view.lookupModel ? view.lookupModel(id, clazz) : checkView(view);
  });
  return result;
};

// Attempts to loda a given model from the current view, if available
Model.fromCurrent = function(id, clazz) {
  var view = exports.getView();
  return view && view.lookupModel && view.lookupModel(id, clazz);
};

;;
exports.Dialog = (function() {
  var DialogView = exports.View.extend({
    name: 'dialog',
    events: {
      'click': 'onBodyClick'
    },

    initialize: function() {
      this.render();
      this.body = this.$el.find('.body');
      this._bodyClick = _.bind(this.onBodyClick, this);
      Phoenix.on('change:view:start', this.close, this);
    },
    open: function(view, options) {
      this.modalView = view;
      view.render();
      this.body.html('').append(view.el);
      $('body').addClass('full-screen-view').append(this.el);
      view.$el.on('click', this._bodyClick);
      this.options = options;
    },
    close: function(event) {
      event && event.stopPropagation && event.stopPropagation();
      if (this.modalView) {
        $('body').removeClass('full-screen-view');
        this.body.html('');
        $(this.el).remove();
        this.modalView.$el.off('click', this._onBodyClick);
        delete this.modalView;
      }
    },
    onBodyClick: function() {
      if (this.options && this.options.closeOnBodyClick) {
        this.close();
      }
    }
  });

  var dialog;

  function getDialog() {
    return dialog || (dialog = new DialogView());
  }

  return {
    open: function(view, options) {
      getDialog().open(view, options);
    },

    close: function(event) {
      getDialog().close(event);
    }
  };
})();

;;
Thorax.templates['dialog'] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [2,'>= 1.0.0-rc.3'];
helpers = helpers || Handlebars.helpers; data = data || {};
  


  return "<div class=\"body\">\n</div>\n";
  });var Alert = exports.AlertView = Phoenix.View.extend({
  name: 'alert',

  events: {
    'click button': function(event) {
      event.preventDefault();

      var clickHandler = this.buttons[$(event.currentTarget).data('index')].click || this.close;
      clickHandler.call(this);
    }
  },

  close: function() {
    Phoenix.Dialog.close();
  }
});

Phoenix.alert = function(options) {
  var view = new Alert(options);
  Phoenix.Dialog.open(view);
  return view;
};

;;
Thorax.templates['alert'] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [2,'>= 1.0.0-rc.3'];
helpers = helpers || Handlebars.helpers; data = data || {};
  var buffer = "", stack1, escapeExpression=this.escapeExpression, functionType="function", self=this;

function program1(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n    ";
  stack1 = helpers.i18n.call(depth0, depth0.message, {hash:{},data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n  ";
  return buffer;
  }

function program3(depth0,data) {
  
  var buffer = "";
  buffer += "\n    "
    + escapeExpression(helpers.view.call(depth0, depth0.view, {hash:{},data:data}))
    + "\n  ";
  return buffer;
  }

function program5(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n  <button class=\""
    + escapeExpression(((stack1 = depth0.className),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + " button\" data-index=\""
    + escapeExpression(((stack1 = data.index),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\">"
    + escapeExpression(helpers.i18n.call(depth0, depth0.title, {hash:{},data:data}))
    + "</button>\n  ";
  return buffer;
  }

  buffer += "<header>"
    + escapeExpression(helpers.i18n.call(depth0, depth0.title, {hash:{},data:data}))
    + "</header>\n<div class=\"message\">\n  ";
  stack1 = helpers['if'].call(depth0, depth0.message, {hash:{},inverse:self.program(3, program3, data),fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n</div>\n<div class=\"buttons button-container\">\n  ";
  stack1 = helpers.each.call(depth0, depth0.buttons, {hash:{},inverse:self.noop,fn:self.program(5, program5, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n</div>\n";
  return buffer;
  });var LoadingIndicator = Thorax.View.extend({
  name: 'loading-indicator',
  initialize: function() {
    this._boundPosition = _.bind(this._position, this);
  },
  start: function(nonModal) {
    $('body').append(this.el);
    this._position();
    $(this.el).toggleClass('non-modal', nonModal || false);
    $(window).bind('scroll', this._boundPosition);
    $(window).bind('resize', this._boundPosition);
  },
  stop: function() {
    $(this.el).remove();
    $(window).unbind('scroll', this._boundPosition);
    $(window).unbind('resize', this._boundPosition);
  },
  _position: function() {
    var frame = this.$('.loading-frame'),
        height = window.innerHeight,
        width = window.innerWidth,
        offset = frame.offset(),
        scrollY = window.scrollY;

    // CSS hasn't yet loaded defer exection until it does
    if (!offset.height && this.el.parentNode) {
      setTimeout(_.bind(this._position, this), 100);

      return;
    }

    frame.css({
      top: (Math.floor((height - offset.height) / 2) + scrollY) + 'px',
      left: Math.floor((width - offset.width) / 2) + 'px'
    });
    $(this.el).css('min-height', height + 'px');
  }
});

exports.bind('init', function() {
  var instance;
  LoadingIndicator.get = function() {
    if (!instance) {
      instance = new LoadingIndicator();
      instance.render();
    }
    return instance;
  };

  // Top level blocking loading indicators
  exports.bind('load:start', Thorax.loadHandler(function(message, background) {
      if (exports.inlineLoading) {
        return;
      }
      $('body').addClass('loading');
      LoadingIndicator.get().start(background && background.nonModal);
    },
    function() {
      if (exports.inlineLoading) {
        exports.inlineLoading = false;
        return;
      }
      $('body').removeClass('loading');
      LoadingIndicator.get().stop();
    }));
});

;;
Thorax.templates['inline-loading-indicator'] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [2,'>= 1.0.0-rc.3'];
helpers = helpers || Handlebars.helpers; data = data || {};
  var buffer = "", escapeExpression=this.escapeExpression;


  buffer += "<div class=\"inline-spinner\">\n  "
    + "\n<div class=\"spinner\" aria-role=\"progressbar\">\n  <div class=\"spinner-outer spinner-line-0\"></div>\n  <div class=\"spinner-outer spinner-line-1\"></div>\n  <div class=\"spinner-outer spinner-line-2\"></div>\n  <div class=\"spinner-outer spinner-line-3\"></div>\n  <div class=\"spinner-outer spinner-line-4\"></div>\n  <div class=\"spinner-outer spinner-line-5\"></div>\n  <div class=\"spinner-outer spinner-line-6\"></div>\n  <div class=\"spinner-outer spinner-line-7\"></div>\n  <div class=\"spinner-outer spinner-line-8\"></div>\n  <div class=\"spinner-outer spinner-line-9\"></div>\n  <div class=\"spinner-outer spinner-line-10\"></div>\n</div>\n</div>\n<span class=\"spinner-label\">"
    + escapeExpression(helpers.i18n.call(depth0, depth0.label, {hash:{},data:data}))
    + "</span>\n";
  return buffer;
  });Thorax.templates['loading-indicator'] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [2,'>= 1.0.0-rc.3'];
helpers = helpers || Handlebars.helpers; data = data || {};
  var buffer = "", escapeExpression=this.escapeExpression;


  buffer += "<div class=\"loading-frame\">\n  "
    + escapeExpression(helpers.template.call(depth0, "inline-loading-indicator", {hash:{},data:data}))
    + "\n  <div class=\"loading-text\">"
    + escapeExpression(helpers.i18n.call(depth0, "Loading...", {hash:{},data:data}))
    + "</div>\n</div>\n";
  return buffer;
  });var InlineLoading = exports.Views.InlineLoading = View.extend({
  name: 'inline-loading',
  className: 'inline-view-loading',
  label: 'Loading...',

  initialize: function(options) {
    View.prototype.initialize.apply(this, arguments);
    if (options.height) {
      this.$el.css('height', options.height);
    }
  }
});

;;
Thorax.templates['inline-loading'] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [2,'>= 1.0.0-rc.3'];
helpers = helpers || Handlebars.helpers; data = data || {};
  var buffer = "", escapeExpression=this.escapeExpression;


  buffer += escapeExpression(helpers.template.call(depth0, "inline-loading-indicator", {hash:{
    'label': (depth0.label)
  },data:data}))
    + "\n";
  return buffer;
  });var INFINITE_SCROLL_LISTENER_INTERVAL = 250,
    //height in pixels before indicator is visible where pagination will be triggered
    INFINITE_SCROLL_THRESHOLD_PADDING = 3500; //roughly the height 30 items on one shelf + header

var Paginator = Thorax.HelperView.extend({
  name: 'paginator',
  nonBlockingLoad: true,

  events: {
    collection: {
      'load:start': 'handler'
    },
    ready: '_startInfiniteScroll',
    destroyed: '_cleanupInfiniteScroll'
  },

  initialize: function() {
    Thorax.HelperView.prototype.initialize.apply(this, arguments);

    this.handler = Thorax.loadHandler(
        function() {
          this.$el.show();
        },
        function() {
          if (!this._collection.hasMore || !this._collection.hasMore()) {
            this.$el.hide();
          }
        },
        this);
  },

  _startInfiniteScroll: function() {
    if (!this._infiniteScrollHandler) {
      this._infiniteScrollHandler = _.debounce(_.bind(function() {
        if (this.isVisible() && $(this.el).offset().top < (window.scrollY + window.innerHeight + INFINITE_SCROLL_THRESHOLD_PADDING)) {
          this.paginate();
        }
      }, this), INFINITE_SCROLL_LISTENER_INTERVAL);
      $(document).bind('scroll', this._infiniteScrollHandler);
    }
  },

  _cleanupInfiniteScroll: function() {
    if (this._infiniteScrollHandler) {
      $(document).unbind('scroll', this._infiniteScrollHandler);
    }
  },

  isVisible: function() {
    return this.el && !!this.el.offsetHeight;
  },
  paginate: function() {
    if (!this.loading && this._collection.hasMore()) {
      this._collection.nextPage();
    }
  }
});

Handlebars.registerViewHelper('paginator', Paginator, function(collection, view) {
  if (view.template === Handlebars.VM.noop) {
    view.template = undefined;
  }

  // If they are running a paginator they will want to be non blocking.
  if (!view.options.blocking) {
    view.parent.nonBlockingLoad = true;
  }

  if (collection) {
    view._collection = collection;
    view.bindDataObject('collection', collection);
  }
  if (!collection || !collection.hasMore || !collection.hasMore()) {
    view.$el.hide();
  }
});

;;
Thorax.templates['paginator'] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [2,'>= 1.0.0-rc.3'];
helpers = helpers || Handlebars.helpers; data = data || {};
  var buffer = "", escapeExpression=this.escapeExpression;


  buffer += escapeExpression(helpers.template.call(depth0, "inline-loading-indicator", {hash:{
    'label': ("Loading")
  },data:data}))
    + "\n";
  return buffer;
  });/*global Connection, View, errorMessageStrings, i18n */

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

;;
/*global View, applyErrors, focusErrorField */
View.on('activated', function() {
  // We want to execut on the top-most parent only
  this.errorHandler = this.errorHandler || View.defaultErrorHandler;
});

View.defaultErrorHandler = function(msgs) {
  if (_.isArray(msgs)) {
    // Give priority to the first buttons instance so we
    // do not end up with a possibly confusing array of many
    // buttons if the server returns multiple errors.
    var title = msgs[0] && msgs[0].title,
        buttons = msgs[0] && msgs[0].buttons;
    msgs = applyErrors(this, msgs);

    Phoenix.alert({
      title: title && infoMessageText(title),
      message: msgs.messages.join('<br>'),
      buttons: buttons || [{
        title: 'Ok',
        click: function() {
          focusErrorField();
          this.close();
        }
      }]
    });
    return false;
  }
};

;;
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

;;
Handlebars.registerHelper('date', function(date, format) {
  return dateFormat(date, format);
});

;;
function directionsLink(address) {
  // Android will default to current location, iOS < 6 needs 'Current Location' explicitly
  // iOS 6 does not support passing the current location flag but the user can select
  // this easily if we do not include it.
  var start = '';
  if ($.os.ios && parseFloat($.os.version) < 6) {
    start = 'saddr=Current+Location&';
  }
  return 'http://maps.apple.com/maps?' + start + 'daddr=' + encodeURIComponent([
    address.street1 + (address.street2 ? ' ' + address.street2 : ''),
    address.city,
    address.state,
    address.zip
  ].join(','));
}

Handlebars.registerHelper('directions-link', directionsLink);

;;
/*global SafeString, View, i18n */
Handlebars.registerHelper('star-rating', function(rating) {
  rating = parseFloat(rating);
  if (isNaN(rating) || rating < 0) {
    return;
  }
  var rounded = Math.round(rating * 10),
      tenths = rounded % 10;
  rounded = rounded / 10;

  var stars = [1, 2, 3, 4, 5].map(function(index) {
    return '<span class="star' + (index <= rounded ? ' rated' : (index === Math.floor(rounded + 1) && tenths) ? ' partial partial' + tenths : '') + '"></span>';
  }).join('');
  return new SafeString('<div class="stars">'
      + stars
      + '<span class="rating">' + i18n.call({rating: rounded}, '{{rating}} star rating', {'expand-tokens': true}) + '</span>'
    + '</div>');
});

;;
/*global escapeExpression, i18n */

Handlebars.registerHelper('form', function(options) {
  var className = (options.hash && escapeExpression(options.hash['class'])) || '';
  return '<form action="#" class="' + className + '">'
            + options.fn(this)
            + '<input class="hidden-submit" type="submit" value="' + i18n('Submit') + '">'
          + '</form>';
});

Handlebars.registerHelper('form-section', function(options) {
  var className = (options.hash && escapeExpression(options.hash['class'])) || '';
  return '<div class="form-section ' + className + '">'
            + options.fn(this)
          + '</div>';
});

;;
/*global SafeString, escapeExpression, expandToken, formField,  */
Handlebars.registerHelper('input', function(options) {
  var hash = options.hash;

  if (hash.type === 'number') {
    // chrome and iOS like to format "number" fields with commas
    // pattern will still bring up the numeric keyboard
    hash.type = $.os.ios ? 'text' : 'number';
    hash.pattern = '[0-9]*';
  } else if (hash.type === 'password') {
    hash.autocorrect = hash.autocomplete = hash.autocapitalize = 'off';
  }
  hash.type = hash.type || 'text';
  if (!hash.checked) {
    delete hash.checked;
  }

  return wrapField({
    options: options,
    filter: function(key, value) {
      return (key == 'type' && value == 'textarea');
    },
    content: function(label, attributes) {
      if (hash.type === 'textarea') {
        return label + '\n<textarea ' + attributes.join(' ') + '>' + fnBody(options, this) + '</textarea>';
      } else if (hash.type === 'checkbox' || hash.type === 'radio') {
        return '\n<input ' + attributes.join(' ') + '>' + label;
      } else {
        return label + '\n<input ' + attributes.join(' ') + '>';
      }
    }
  }, this);
});

Handlebars.registerHelper('textarea', function(options) {
  options.hash.type = 'textarea';
  return Handlebars.helpers.input.call(this, options);
});

Handlebars.registerHelper('select', function(options) {
  return wrapField({
    options: options,
    filter: function(key) {
      return (key == 'placeholder' || key == 'options' || key == 'value' || key == 'valueProp' || key == 'displayProp');
    },
    content: function(label, attributes) {
      var rtn = label + '\n<select ' + attributes.join(' '),
          hash = options.hash,
          value = options.hash.value;

      // use placeholder to indicate the blank entry
      if (hash.placeholder) {
        rtn += ' data-placeholder="true">';
        if (hash['expand-tokens']) {
          hash.placeholder = expandToken(i18n(hash.placeholder), this);
        }
        rtn += ('<option value="">' + hash.placeholder + '</option>');
      } else {
        rtn += '>';
      }

      // append all options from a list
      if (hash.options) {
        _.each(hash.options, function(item) {
          rtn += '<option value="';
          var itemValue = getHashValue(hash.valueProp || 'id', item, true);
          rtn += itemValue;
          rtn += '"';
          if (value === item || value === itemValue) {
            rtn += ' selected';
          }
          rtn += '>';
          rtn += getHashValue(hash.displayProp || 'name', item);
          rtn += '</option>'
        });
      }

      // allow additional options to be provided in the body
      if (options.fn) {
        rtn += fnBody(options, this);
      }
      rtn += '</select>';
      return rtn;
    }
  }, this);
});

function getHashValue(key, obj, doEscape) {
  var rtn;
  if (key === '*') {
    rtn = JSON.stringify(obj);
  } else {
    return obj[key];
  }
  if (rtn && doEscape) {
    rtn = escape(rtn);
  }
  return rtn;
}

// remove the placeholder value once the user makes another selection
$(document).delegate('select[data-placeholder]', 'change', function(event) {
  var select = event.currentTarget;
  if (select.options.length && select.options[0].value === '' && $(select).val()) {
    select.removeChild(select.options[0]);
  }
});

;;
Handlebars.registerHelper('tel', function(displayNumber, options) {
  var rtn = '<a href="tel:' + displayNumber.replace(/[^\d]/g, '') + '">';
  if (options && options.fn) {
    rtn += options.fn.call(this);
  } else {
    rtn += displayNumber;
  }
  rtn += '</a>';
  return new Handlebars.SafeString(rtn);
});

;;
Handlebars.registerHelper('link-wrapper', function(options) {
  if (!options.hash) {
    return options.fn(this);
  }
  var altTagName = options.hash.altTagName,
      className = options.hash.className || '';

  if (className) {
    className = ' class="' + className + '"';
  }

  if (options.hash.isLink) {
    return '<a href="' + Handlebars.helpers.url(options.hash.url) + '"'
        + className + '>'
        + options.fn(this)
        + '</a>';
  } else if (altTagName) {
    return '<' + altTagName
        + className + '>'
        + options.fn(this)
        + '</' + altTagName + '>';
  } else {
    return options.fn(this);
  }
});

;;
/*global getOptionsData, htmlAttributesToCopy */

// Displays loading view until main view triggers 'loaded' event, after which
// displays main view. Main view (instance or name) is passed as an argument.
// Loading view (instance or name) is passed in 'loading-view' parameter. If not
// specified, defaults to 'inline-loading'

Handlebars.registerHelper('load-view', function(view, options) {
  var declaringView = getOptionsData(options).view;
  if (arguments.length === 1) {
    options = view;
    view = Thorax.View;
  }

  var mainView = Thorax.Util.getViewInstance(view, _.omit(options.hash, 'loading-view', 'expand-tokens'));
  if (!mainView) {
    return '';
  }
  declaringView._addChild(mainView);

  var loadingView = Thorax.Util.getViewInstance(options.hash['loading-view'] || 'inline-loading');

  declaringView.on('append', function(scope, callback) {
    var el = (scope || this.$el).find('[load-view-placeholder-id=' + mainView.cid + ']');
    mainView.ensureRendered();
    loadingView.ensureRendered();
    if (!mainView._isLoading) {
      $(el).replaceWith(mainView.el);
      callback && callback(mainView.el);
    } else {
      $(el).replaceWith(loadingView.el);
      mainView.on('loaded', function() {
        //see if the view helper declared an override for the view
        //if not, ensure the view has been rendered at least once
        if (options.fn) {
          mainView.render(options.fn);
        }
        loadingView.$el.replaceWith(mainView.el);
        callback && callback(mainView.el);
      });
    }
  });

  var htmlAttributes = _.extend({
    'load-view-placeholder-id': mainView.cid
  }, _.pick(options.hash, htmlAttributesToCopy));
  return new Handlebars.SafeString(Thorax.Util.tag(htmlAttributes, undefined, options.hash['expand-tokens'] ? this : null));
});

;;
/*global View, SafeString */

Handlebars.registerHelper('price', function(price) {
  var symbol = Phoenix.config.currencySymbol,
      prices;
  if (price || price === 0) {
    if (price.toFixed) {
      prices = [symbol + price.toFixed(2)];
    } else {
      // handle gift card prices of '$5.00 - $200.00'
      prices = price.split('-').map(function(price) {
        var trimmed = price.trim();
        if (price.indexOf(symbol) < 0 && !_.isNaN(parseFloat(trimmed))) {
          return symbol + trimmed;
        } else {
          return price;
        }
      });
    }
    prices = _.map(prices, function(price) {
      var price = price.toString();
      if (prices.length > 1) {
        price = price.trim();
      }
      return price.replace(/\.(\d+)/, '.<span class="decimal">$1</span>');
    });

    if (prices.length > 1) {
      return new SafeString(prices.join(' - '));
    }
    return new SafeString(prices[0]);
  }
  return '';
});

;;
/*global Connection, Util */
Connection.bind('start', function(event) {
  var options = event.options;

  options.url = Util.appendParams(options.url, {
    apikey: exports.config.apikey,
    requestorigin: 'mweb'
  });
});

;;
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

;;
/*global Connection, Util */
Connection.on('start', function(event) {
  var options = event.options;

  options.data = Connection.serialize(options.data);

  if (options.extended) {
    options.url = Util.appendParams(options.url, 'responsegroup=Extended');
  }
});

Connection.serialize = function(value) {
  if (_.isArray(value)) {
    // Per Arun:
    // There is no need to escape the values here as the server only looks for arrays on specific
    // fields that will not have , values in them (mostly quanitities and internal id values)
    value = _.map(value, Connection.serialize).join(',');
  } else if (_.isObject(value)) {
    value = _.clone(value);
    _.each(value, function(child, key) {
      value[key] = Connection.serialize(child);
    });
  }

  return value;
};

;;
/*global Connection, LocalCache */
exports.SessionTTL = LocalCache.TTL.hours(0.25);    // 15 minutes

Connection.shouldCache = function(event) {
  var dataObject = event.dataObject,
      options = event.options;

  event.cacheUrl = event.originalUrl + (options.data ? JSON.stringify(options.data) : '');

  // WARN: This does not take into account state changes that could be introduced by non-safe methods
  //    called on a particular URL. If the services tier is changed to a more RESTful architecture
  //    this implementation should be revisited to either invalidate or update the cache elements
  //    based on the responses to other methods.
  return !options.add
        && options.url
        && options.syncMethod === 'read'
        && dataObject.ttl;
};

;;
_.extend(exports.PagedCollection.prototype, {
  countField: 'totalResult',
  offset: function() {
    return this.pageSize * this.page;
  },

  offsetParams: function(paramNumber) {
    return '&p' + paramNumber + '=' + this.offset() + '&p' + (paramNumber + 1) + '=' + this.pageSize;
  }

});

;;
_.extend(Phoenix, {
  platformName: 'asda-mweb',
  useNativeScroll: function() {
    return $.os.ios && parseInt($.os.version, 10) >= 5;
  },
  wwwUrl: function(url) {
    url = url || '/';
    url += (url.indexOf('?') !== -1 ? '&' : '?') + 'adid=1500000000000012981640';
    url += '&veh=mweb';
    return 'http://' + Phoenix.config.wwwHost + '/msharbor' + url;
  }
});

;;
var DataMsgs = {
  'noApplyDiscountCode': 'Sorry, your discount can not be applied right now.',
  'noVerifyDiscountCodeTryAgain': 'We could not verify your discount card. Please try again.',
  'noVerifyDiscountCodeCustSvc': 'We could not verify your discount card. Please contact Customer Service.',

  'outOfStock': 'This item is currently out of stock.',
  'itemUnavailable': 'This item is currently unavailable.',
  'itemUnavailableS4L': 'An item(s) was unavailable.  It has been moved to Save For Later.'
}

var Data = exports.Data = {
  SESSION_EXPIRED: 'session_expired',
  SERVER_ERROR: 'server_error',
  UNKNOWN_ERROR: 'unknown_error',
  MAINTENANCE_ERROR: 'maintenance_error',
  _locale: {country: 'US', language: 'en'},
  _localeLookups: [],

  setLocale: function(language, country) {
    this._locale = {
      country: country && country.toLowerCase(),
      language: language && language.toLowerCase()
    };

    // generate the locale lookup values
    var _localeLookups = [];
    if (this._locale) {
      if (this._locale.language) {
        if (this._locale.country) {
          _localeLookups.push(this._locale.language + '-' + this._locale.country);
        }
        _localeLookups.push(this._locale.language);
      }
    }
    this._localeLookups = _localeLookups;
  },
  getLocale: function() {
    return this._locale;
  },
  getLocaleLookups: function() {
    return this._localeLookups;
  },

  i18n: {
    "language.en": "English",
    "language.es": "Espa&ntilde;ol",
    
    "app-download-android": "Shop smart with Walmart's free app for Android.",
    "app-download-iphone": "Create smart shopping lists with Walmart's free app for iPhone.",
    "app-download-ipad": "Create smart shopping lists with Walmart's free app for iPad.",
    
    // a hash of i18n values belong here... see docs for examples.

    // variants
    'variant.Size.S': "Small",
    'variant.Size.M': "Medium",
    'variant.Size.L': "Large",

    // Plural handling
    '{{shippingTypeName}} ({{count}} items)[0]': '{{shippingTypeName}} ({{count}} item)',
    'Saved items ({{length}} items)[1]': 'Saved items ({{length}} item)',
    'Track Items[1]': 'Track Item',
    '{{photos.length}} Photos[1]': '{{photos.length}} Photo',

    'userAlreadyExists': 'An account with that user name already exists.',

    // Cart status messages
    'cartService.quantityAdjustedItems': 'There is a problem with an item in your cart. See below for details.',
    'cartService.ineligibleItemsMoved': 'Some item(s) in your Cart cannot be purchased using Mobile Checkout.  View them in your Saved items below.',
    'cartService.unavailableItemsMoved': 'Some item(s) in your Cart are no longer eligible for purchase. View them in your Saved items below.',
    'cartService.cartItem.notAvailableForSelectedRetailer': DataMsgs.itemUnavailable,
    'cartService.cartItem.notAvailable': DataMsgs.itemUnavailable,
    'cartService.cartItem.bundleBaseItemNotavailable': DataMsgs.itemUnavailable,
    'cartService.cartItem.bundlecomponentItemsNotavailable': DataMsgs.itemUnavailable,
    'cartService.cartItem.bundleItemsOutOfStock': DataMsgs.outOfStock,
    'cartService.cartItem.preOrdersSoldOut': DataMsgs.outOfStock,
    'cartService.cartItem.ItemOutOfStock': DataMsgs.outOfStock,
    'cartService.cartItem.onlineDeliveryError': 'This item is not eligible for Ship to home.',
    'cartService.cartItem.updateQuantityMessage': 'The number of items you\'ve requested exceeds what we currently have in stock.',
    'cartService.cartItem.requestedItemUnavailable': DataMsgs.itemUnavailable,
    'cartService.cartItem.priceNotAvailable': DataMsgs.itemUnavailable,
    'cartService.cartItem.serviceInEligibleItem': 'This item cannot be purchased using Mobile Checkout, but can be purchased on <a href="http://www.walmart.com/index.gsp">www.walmart.com</a>',

    // shipping status messages
    'shippingService.shippingItem.getShippingOpionsFailed': 'An item(s) was unavailable. It has been moved to Save For Later',
    'storeService.INVALID_STORE': 'We are not able to ship to the selected store. Please select another store.',

    // Payment/order translations
    'paymentMethodService.paymentMethodResult.duplicate': 'The card you entered is already saved in your account.',
    'orderService.placeOrder.auth.DCARDREFUSED': 'We were unable to process the order with your credit card.  Please use a different credit card.',
    'orderService.placeOrder.auth.CID': 'We were unable to process your order. Please verify your credit card information and try again.',
    'orderService.placeOrder.auth.DAVSNO': 'We were unable to process your order. Please verify the billing name and address on your credit card and try again.',
    'orderService.placeOrder.auth.DINVALIDCARD': 'There was a problem with your credit card.  You may select or enter another card.',
    'orderService.placeOrder.auth.DCARDEXPIRED': 'Your credit card has expired.  Please select or enter another card.',
    'orderService.itemUnavailable': DataMsgs.itemUnavailableS4L,
    'orderService.s2sItemUnavailable': DataMsgs.itemUnavailableS4L,
    'orderService.placeOrder.auth.SC_SECURITY': 'We\'re sorry, the card you entered has been reported as lost or stolen. Please call Customer Service at 1-800-966-6546 for more information.',
    'orderService.placeOrder.auth.SC_INVALID_CARD': 'We\'re sorry, the card number you entered was not valid. Please check your number and try again.',
    'orderService.placeOrder.auth.SC_ERROR': 'We\'re sorry, we currently are unable to process payments using a Walmart Gift Card. Please use a different payment method.',
    'orderService.placeOrder.auth.SC_BALANCE_INQ_EXCEEDED': 'We\'re sorry, but you have exceeded the maximum allowable balance inquiries. Please contact Customer Service at 1-800-966-6546 for more information.',
    'orderService.placeOrder.auth.SC_HELD': 'We\'re sorry. Please contact Customer Service at 1-800-966-6546 for more information regarding activation of your Gift Card.',
    'orderService.placeOrder.auth.SC_NSF': 'No sufficient funds. Please use a different payment method.',
    'orderService.scUnavailable': 'Shopping card service unavailable. Please use a different payment method.',
    'orderService.register.SC_INVALID_ACCOUNT': 'We\'re sorry, the card number you entered was not valid. Please check your number and try again.',
    'orderService.register.SC_MAX_LIMIT': 'We\'re sorry, the maximum number of cards on the account has been reached.',
    'orderService.register.SC_ALREADY_REG': 'We\'re sorry, this card has already been added to your account.',
    
    'invalidEmail': 'Invalid Email Address',
    'invalidPasswordInReg': 'Invalid Password',
    'associate.associateStatusResponse.bvUnavailable': DataMsgs.noVerifyDiscountCodeTryAgain,
    'associate.associateStatusResponse.notAuthorized': DataMsgs.noVerifyDiscountCodeTryAgain,
    'associate.associateStatusResponse.Exception': DataMsgs.noVerifyDiscountCodeTryAgain,
    'associate.associateStatusResponse.genericError': DataMsgs.noVerifyDiscountCodeTryAgain,
    'associate.associateStatusResponse.adBlocked': DataMsgs.noVerifyDiscountCodeCustSvc,
    'associate.associateStatusResponse.adAccessMax': DataMsgs.noVerifyDiscountCodeCustSvc,
    'associate.associateStatusResponse.noAdService': DataMsgs.noVerifyDiscountCodeTryAgain,

    // Credit card type translations
    'WAL_MART_CREDIT_CARD': 'Walmart Credit Card',
    'DISCOVER': 'Discover',
    'VISA': 'VISA',
    'MASTERCARD': 'MasterCard',
    'AMEX': 'American Express'
  },

  states: {
    'AL': 'Alabama',
    'AK': 'Alaska',
    'AZ': 'Arizona',
    'AR': 'Arkansas',
    'CA': 'California',
    'CO': 'Colorado',
    'CT': 'Connecticut',
    'DE': 'Delaware',
    'DC': 'District Of Columbia',
    'FL': 'Florida',
    'GA': 'Georgia',
    'HI': 'Hawaii',
    'ID': 'Idaho',
    'IL': 'Illinois',
    'IN': 'Indiana',
    'IA': 'Iowa',
    'KS': 'Kansas',
    'KY': 'Kentucky',
    'LA': 'Louisiana',
    'ME': 'Maine',
    'MD': 'Maryland',
    'MA': 'Massachusetts',
    'MI': 'Michigan',
    'MN': 'Minnesota',
    'MS': 'Mississippi',
    'MO': 'Missouri',
    'MT': 'Montana',
    'NE': 'Nebraska',
    'NV': 'Nevada',
    'NH': 'New Hampshire',
    'NJ': 'New Jersey',
    'NM': 'New Mexico',
    'NY': 'New York',
    'NC': 'North Carolina',
    'ND': 'North Dakota',
    'OH': 'Ohio',
    'OK': 'Oklahoma',
    'OR': 'Oregon',
    'PA': 'Pennsylvania',
    'RI': 'Rhode Island',
    'SC': 'South Carolina',
    'SD': 'South Dakota',
    'TN': 'Tennessee',
    'TX': 'Texas',
    'UT': 'Utah',
    'VT': 'Vermont',
    'VA': 'Virginia',
    'WA': 'Washington',
    'WV': 'West Virginia',
    'WI': 'Wisconsin',
    'WY': 'Wyoming',
    'AA': 'Armed Forces Americas',
    'AP': 'Armed Forces Pacific',
    'AE': 'Armed Forces other',
    'AS': 'American Samoa',
    'GU': 'Guam',
    'MP': 'Northern Mariana Islands',
    'PR': 'Puerto Rico',
    'VI': 'Virgin Islands'
  },

  resolveState: function(state) {
    if (!state || state.length === 2) return state;
    var _check = state.toUpperCase();
    for (var name in this.states) {
      if (this.states[name].toUpperCase() === _check) {
        return name;
      }
    }
    return state;
  },

  float: function(value, decimalPlaces) {
    return parseFloat(value).toFixed(decimalPlaces);
  },
  boolean: function(value) {
    // Anything that is falsy or the string literal "false" is false
    return !(!value || value === "false");
  },
  latLng: function(value) {
    // Reduce precision to 3 places, approximately 111m resolution at the equator.
    // This produces cleaner urls and improves the odds of a warm cache hit for requests
    return Math.floor(parseFloat(value)*1000)/1000;
  },

  hasStatusMessage: function(obj, messageKey) {
    var msgs = (obj.attributes && obj.attributes.statusMessages) || obj.statusMessages;
    return _.any(msgs, function(msg) { return msg.key === messageKey; });
  },

  processStatusMessage: function(msgs, dataObject) {
    exports.trackError('status-msg', JSON.stringify(_.pluck(msgs, 'key')));

    for (var i=0; i<msgs.length; i++) {
      var route = Data.messageRoutes[msgs[i].key];
      if (route && route !== Backbone.history.getFragment()) {
        // before navigating bind so new view will show the error message 
        exports.layout.bind('change:view:end', showMessage);
        
        // navigate
        Backbone.history.navigate(route, true);

        // show message after new view is rendered
        function showMessage(view) {
          exports.layout.unbind('change:view:end', showMessage);
          view.trigger('error', msgs.map(function(message) {
            return {
              key: message.key,
              name: Data.fieldErrors[message.key],
              message: i18n(message.key, -1, message.description)
            }
          }));
        }
        return;
      }
    }

    dataObject.trigger('error', dataObject, msgs.map(function(message) {
      return {
        key: message.key,
        name: Data.fieldErrors[message.key],
        message: i18n(message.key, -1, message.description)
      }
    }));
  },

  translateAttributeNames: function(data){
    var translations = { 'iD': 'id' };

    (function iterate(object) {
      _.each(object, function(value, key) {
        if (typeof value === 'object') {
          iterate(value);
        } else if (translations[key]) {
          object[translations[key]] = value;
          delete object[key];
        }
      });
    })(data);

    return data;
  },

  // indicator to represent message categories.  valid states are 'success'
  messageCategories: {
    'associate.associateStatusResponse.isdOK': 'success'
  },

  cachedSingletonMixin: function(dataClass, type, expires) {
    var instance;
    var lastAccessTime = new Date().getTime();
    dataClass.get = function(noCreate) {
      if (noCreate) {
        return instance;
      }
      var curTime = new Date().getTime();
      if ((curTime - lastAccessTime) > (expires || authentication.SESSION_DURATION)) {
        dataClass.release();
      }
      if (!instance) {
        instance = new dataClass();
      }
      lastAccessTime = curTime;
      return instance;
    };
    dataClass.release = function() {
      lastAccessTime = 0;

      // Clearing here rather than clearing the instance object so any long lived
      // binds will survive and not leak.
      if (instance) {
        instance.reset && instance.reset();
        instance.clear && instance.clear();
      }
    };

    // Clear all data if an order has been made, an error occurs, or the user changes
    exports.bind('order:complete', dataClass.release);
    exports.bind('fatal-error', dataClass.release);
    authentication.bind('loggedout', dataClass.release);

    Bridge.bind('resetData', function(options) {
      if (!options.type || options.type === 'all' || options.type === type) {
        dataClass.release();
      }
    });
  },

  // all messages that require routing to another page
  // '{message key}': 'route' or hash: { route: 'route' or routeFunction(msg), replace: true/false }
  messageRoutes: {
    'orderService.placeOrder.auth.DCARDREFUSED': 'checkout/payment/card-error',
    'orderService.placeOrder.auth.DAVSNO': 'checkout/payment/card-error',
    'orderService.placeOrder.auth.DINVALIDCARD': 'checkout/payment/card-error',
    'orderService.placeOrder.auth.DCARDEXPIRED': 'checkout/payment/card-error',
    'orderService.placeOrder.auth.CID': 'checkout/payment/cin-error',
    'orderService.itemUnavailable': 'cart',
    'orderService.s2sItemUnavailable': 'cart',
    'orderService.placeOrder.auth.SC_SECURITY': 'checkout/order/place',
    'orderService.placeOrder.auth.SC_INVALID_CARD': 'checkout/order/place',
    'orderService.placeOrder.auth.SC_ERROR': 'checkout/payment/choose?reset=t&show=gc',
    'orderService.placeOrder.auth.SC_BALANCE_INQ_EXCEEDED': 'checkout/order/place',
    'orderService.placeOrder.auth.SC_HELD': 'checkout/order/place',
    'orderService.placeOrder.auth.SC_NSF': 'checkout/payment/choose?reset=t&show=gc',
    'orderService.scUnavailable': 'checkout/payment/choose?reset=t&show=gc',
    'orderService.register.SC_INVALID_ACCOUNT': 'checkout/payment/choose?reset=t&show=gc',
    'orderService.register.SC_MAX_LIMIT': 'checkout/order/place',
    'orderService.register.SC_ALREADY_REG': 'checkout/payment/choose?reset=t&show=gc',
    'storeService.INVALID_STORE': 'checkout/site-to-store/error'
  },

  //errors for specific form fields
  fieldErrors: {
    // account errors
    'userAlreadyExists': 'email',
    'invalidEmail': 'email',
    'invalidPasswordInReg': 'password',

    //address errors
    'addressBookService.addressRecordResult.noFirstName': 'firstName',
    'paymentMethodService.paymentMethodResult.noFirstName': 'firstName',
    'addressBookService.addressRecordResult.invalidFirst': 'firstName',
    'paymentMethodService.paymentMethodResult.invalidFirst': 'firstName',
    'addressBookService.addressRecordResult.noLastName': 'lastName',
    'paymentMethodService.paymentMethodResult.noLastName': 'lastName',
    'addressBookService.addressRecordResult.invalidLast': 'lastName',
    'paymentMethodService.paymentMethodResult.invalidLast': 'lastName',
    'addressBookService.addressRecordResult.noStreetAddress': 'address[street1]',
    'paymentMethodService.paymentMethodResult.noStreetAddress': 'address[street1]',
    'addressBookService.addressRecordResult.invalidStreet1': 'address[street1]',
    'paymentMethodService.paymentMethodResult.invalidStreet1': 'address[street1]',
    'addressBookService.addressRecordResult.invalidStreet2': 'address[street2]',
    'paymentMethodService.paymentMethodResult.invalidStreet2': 'address[street2]',
    'addressBookService.addressRecordResult.noCity': 'address[city]',
    'paymentMethodService.paymentMethodResult.noCity': 'address[city]',
    'addressBookService.addressRecordResult.invalidCity': 'address[city]',
    'paymentMethodService.paymentMethodResult.invalidCity': ['address[city]', 'address[state]', 'address[zip]'],
    'addressBookService.addressRecordResult.noState': 'address[state]',
    'paymentMethodService.paymentMethodResult.noState': 'address[state]',
    'addressBookService.addressRecordResult.invalidState': 'address[state]',
    'paymentMethodService.paymentMethodResult.invalidState': 'address[state]',
    'addressBookService.addressRecordResult.noZip': 'address[zip]',
    'paymentMethodService.paymentMethodResult.noZip': 'address[zip]',
    'addressBookService.addressRecordResult.invalidZip': 'address[zip]',
    'paymentMethodService.paymentMethodResult.invalidZip': 'address[zip]',
    'addressBookService.addressRecordResult.noPhone': 'phoneNumber',
    'paymentMethodService.paymentMethodResult.noPhone': 'phoneNumber',
    'addressBookService.addressRecordResult.badPhone': 'phoneNumber',
    'paymentMethodService.paymentMethodResult.badPhone': 'phoneNumber',
    'cc_edit.errors.form.badPhone': 'phoneNumber',

    //credit card errors
    'billingPageAddCreditCard.errors.form.selectCard': 'type',
    'cc_edit.errors.form.invalidCard': 'cardNumber',
    'cc_edit.errors.form.invalidWMCard': 'cardNumber',
    'paymentMethodService.paymentMethodResult.invalidCard': 'cardNumber',
    'paymentMethodService.paymentMethodResult.invalidFullName': 'nameOnCard',
    'paymentMethodService.paymentMethodResult.invalidWMCard': 'cardNumber',
    'paymentMethodService.paymentMethodResult.invalidCid': 'CID',
    'billingPageAddCreditCard.errors.form.invalidCid': 'CID',
    'orderService.placeOrder.auth.CID': 'CID',
    'paymentMethodService.paymentMethodResult.badExpirDate': 'expiryMonth',
    'cc_edit.errors.form.badExpirDate': 'expiryMonth',
    'cc_edit.errors.form.noName': 'nameOnCard'
  },

  isNativeClient: !!( $.os.ipad || $.os.iphone || $.os.android ),

  isNativeEmbedded: function() {
    var uagent = navigator.userAgent.toLowerCase();
    return uagent.match(/(walmart|wm )/);
  },

  isIphone: !!$.os.iphone,
  isIpad: !!$.os.ipad,
  isIos: !!$.os.ipad || !!$.os.iphone,
  isAndroid: !!$.os.android,

  ensureArray: function(item) {
    if (!item) {
      return item;
    }
    if (_.isArray(item)) {
      return item;
    } else {
      return [item];
    }
  }
};

;;
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

;;
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
;;
/*global Data */
/*jshint bitwise:false, eqeqeq:false */
/**
*
*  Base64 encode / decode
*  http://www.webtoolkit.info/
*
**/

var Base64 = {

  // private property
  _keyStr : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",

  // public method for encoding
  encode : function (input) {
    var output = "";
    var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
    var i = 0;

    input = Base64._utf8_encode(input);

    while (i < input.length) {

      chr1 = input.charCodeAt(i++);
      chr2 = input.charCodeAt(i++);
      chr3 = input.charCodeAt(i++);

      enc1 = chr1 >> 2;
      enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
      enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
      enc4 = chr3 & 63;

      if (isNaN(chr2)) {
        enc3 = enc4 = 64;
      } else if (isNaN(chr3)) {
        enc4 = 64;
      }

      output = output +
      Base64._keyStr.charAt(enc1) + Base64._keyStr.charAt(enc2) +
      Base64._keyStr.charAt(enc3) + Base64._keyStr.charAt(enc4);

    }

    return output;
  },

  // public method for decoding
  decode : function (input) {
    var output = "";
    var chr1, chr2, chr3;
    var enc1, enc2, enc3, enc4;
    var i = 0;

    input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");

    while (i < input.length) {

      enc1 = Base64._keyStr.indexOf(input.charAt(i++));
      enc2 = Base64._keyStr.indexOf(input.charAt(i++));
      enc3 = Base64._keyStr.indexOf(input.charAt(i++));
      enc4 = Base64._keyStr.indexOf(input.charAt(i++));

      chr1 = (enc1 << 2) | (enc2 >> 4);
      chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
      chr3 = ((enc3 & 3) << 6) | enc4;

      output = output + String.fromCharCode(chr1);

      if (enc3 != 64) {
        output = output + String.fromCharCode(chr2);
      }
      if (enc4 != 64) {
        output = output + String.fromCharCode(chr3);
      }

    }

    output = Base64._utf8_decode(output);

    return output;

  },

  // private method for UTF-8 encoding
  _utf8_encode : function (string) {
    string = string.replace(/\r\n/g,"\n");
    var utftext = "";

    for (var n = 0; n < string.length; n++) {

      var c = string.charCodeAt(n);

      if (c < 128) {
        utftext += String.fromCharCode(c);
      }
      else if((c > 127) && (c < 2048)) {
        utftext += String.fromCharCode((c >> 6) | 192);
        utftext += String.fromCharCode((c & 63) | 128);
      }
      else {
        utftext += String.fromCharCode((c >> 12) | 224);
        utftext += String.fromCharCode(((c >> 6) & 63) | 128);
        utftext += String.fromCharCode((c & 63) | 128);
      }

    }

    return utftext;
  },

  // private method for UTF-8 decoding
  _utf8_decode : function (utftext) {
    var string = "";
    var i = 0;
    var c, c1, c2, c3;
    c = c1 = c2 = 0;

    while ( i < utftext.length ) {

      c = utftext.charCodeAt(i);

      if (c < 128) {
        string += String.fromCharCode(c);
        i++;
      }
      else if((c > 191) && (c < 224)) {
        c2 = utftext.charCodeAt(i+1);
        string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
        i += 2;
      }
      else {
        c2 = utftext.charCodeAt(i+1);
        c3 = utftext.charCodeAt(i+2);
        string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
        i += 3;
      }

    }

    return string;
  }
};

var URL_PATH_PATTERN = /^(https?\:\/\/)?[^\/]*(\/.*)$/;
Data.getEncodedUrlPath = function(encodedUrl, defaultPath) {
  var url;
  try {
    url = Base64.decode(encodedUrl);
  } catch (e) {
    // bad encoded url - at least do something
    return defaultPath;
  }
  var match = url.match(URL_PATH_PATTERN);
  return (match && match[match.length-1]) || defaultPath;
};

Data.encode64 = Base64.encode;
Data.decode64 = Base64.decode;

;;
/*global Bridge, View, expandToken, i18n */

// Minimizer define
var escapeExpression = Handlebars.Utils.escapeExpression,
    SafeString = Handlebars.SafeString,
    // the galaxy note sometimes crashes when the user clicks on a number type field
    _supportsInputNumber = navigator.userAgent.indexOf('SAMSUNG-SGH-I717') < 0;

function formField(options, content) {
  var className = escapeExpression(options.hash.fieldClass) || '';
  return new SafeString('<div class="form-field ' + className + '">' + content + '</div>');
}

function inputNumber(options, form, scope) {
  if (!exports.isDesktop() && _supportsInputNumber) {
    var isiOS = Bridge.nativeHost ? (Bridge.nativeHost === 'iphone' || Bridge.nativeHost === 'ipad') : Phoenix.Data.isIphone || Phoenix.Data.isIpad;
    // chrome and iOS like to format "number" fields with commas
    // pattern will still bring up the numeric keyboard
    if (!options.hash.type) {
      options.hash.type = isiOS ? 'text' : 'number';
    }
    options.hash.pattern = "[0-9]*";
  }
  return inputText(options, form, scope);
}

function inputText(options, form, scope) {
  options.hash.type = options.hash.type || 'text';
  options.hash.id = options.hash.id ? Thorax.Util.expandToken(options.hash.id, scope) : _.uniqueId('txt');

  var label = '',
      labelClass = options.hash.labelClass === undefined? 'text-label' : options.hash.labelClass;
  if (form && options.hash.label) {
    label = i18n(options.hash.label);
    options.hash.placeholder = options.hash.placeholder || label;

    label = '<label class="' + labelClass + '" for="' + escapeExpression(options.hash.id) + '">' + label + '</label>';
  }

  var attributes = [];
  for (var key in options.hash) {
    var value = options.hash[key];
    if (key === 'placeholder') {
      value = i18n.call(scope, value);
    }
    if (key === 'disabled') {
      if (value) {
        attributes.push(key);
      }
    } else if (key !== 'label') {
      attributes.push(key + '="' + escapeExpression(value) + '"');
    }
  }

  var html = options.hash.type === 'textarea' ?
    label + '\n<textarea ' + attributes.join(' ') + '></textarea>' :
    label + '\n<input ' + attributes.join(' ') + '>';

  if (form) {
    return formField(options, html);
  } else {
    return new SafeString(html);
  }
}

var helpers = {
  nameAndAddress: function(nameAndAddress) {
    return new SafeString(nameAndAddress.name + '<br>' + this.address(nameAndAddress.address));
  },
  address: function(address) {
    if (!address) {
      return;
    }

    var components = [address.street1];
    if (address.street2 && address.street2) {
      components.push(address.street2);
    }
    components.push(address.city + ', ' + address.state + ' ' + address.zip);
    components = _.map(components, escapeExpression);
    return new SafeString('<div>' + components.join('</div><div>') + '</div>');
  },
  'directions-link': function(address) {
    // Android will default to current location, iOS < 6 needs 'Current Location' explicitly
    // iOS 6 does not support passing the current location flag but the user can select
    // this easily if we do not include it.
    var start = '';
    if ($.os.ios && parseFloat($.os.version) < 6) {
      start = 'saddr=Current+Location&';
    }
    return 'http://maps.apple.com/maps?' + start + 'daddr=' + encodeURIComponent([
      address.street1 + (address.street2 ? ' ' + address.street2 : ''),
      address.city,
      address.state,
      address.zip
    ].join(','));
  },
  'search-location': function(search) {
    if (search.city && search.state) {
      return search.city + ', ' + search.state;
    } else if (search.zipcode) {
      return search.zipcode;
    } else {
      return i18n('your current location');
    }
  },
  // show a loading indicator while an image is loading.
  // param can either be image src or named params (src, alt, loadingText).
  // content can a nested block or nothing for a simple image
  'loaded-image': function(options, block) {
    var src = _.isString(options) && options;
    var alt = "";
    var loadingText = "Loading...";
    if (options && options.hash) {
      // if parameters were named
      src = (options.hash.src && options.hash.src) || src;
      alt = options.hash.alt || alt;
      loadingText = options.hash.loadingText || loadingText;
      block = options;
    }

    // functions to return content to display
    var id;
    function getLoading() {
      id = _.uniqueId('img_');
      if (options.hash && options.hash.hidden) {
        return '<div id="' + id + '"></div>';
      }
      return '<div id="' + id + '" class="loading-image">' + Thorax.Util.getTemplate('inline-loading-indicator')({label: loadingText}) + '</div>';
    }
    var content = options && options.fn && options.fn(this) || '<img src="' + src + '" alt="' + alt + '">';
    // write the image/inner block or a loading indicator to be replaced when image is loaded
    if (!src || !content) {
      // if the value is empty, assume the template will be re-rendered later
      return new SafeString(getLoading());
    } else {
      var img = new Image();
      img.onload = function() {
        // reset the element
        $('#' + id).replaceWith(content);
      };
      img.onerror = function() {
        $('#' + id).remove();
        exports.trackError('image-error', src);
      };
      img.src = src;
      if (img.complete) {
        // it's already loaded
        return new SafeString(content);
      } else {
        // onload will reset
        return new SafeString(getLoading());
      }
    }
  },
  date: function(date) {
    if (_.isString(date)) {
      // Manually parse iso8061 date strings as not all implementations support this
      var iso8061 = /(\d{4})(?:-(\d{2})(?:-(\d{2})))/.exec(date);
      if (iso8061) {
        var year = iso8061[1],
            month = iso8061[2],
            day = iso8061[3];

        // Manually format The short dates numerically for now. We may want to revisit
        // this when examinging proper i18n
        if (!month) {
          return year;
        }
        if (!day) {
          return i18n.call({month: month, year: year}, '{{month}}/{{year}}', {'expand-tokens': true});
        }

        date = new Date(year, parseInt(month, 10)-1, day);
      }
    }
    if (date && !_.isDate(date)) {
     date = new Date(date);
    }
    return date && date.toLocaleDateString();
  },

  hasCCExpirationDate: function(options) {
    if (!exports.checkout.isStoreCard(this.type)) {
      return options.fn(this);
    }
  },
  isMweb: function(options) {
    if (!Bridge.nativeHost) {
      return options.fn(this);
    } else {
      return options.inverse(this);
    }
  },
  isAndroid: function(options) {
    if (Bridge.nativeHost === 'android') {
      return options.fn(this);
    } else {
      return options.inverse(this);
    }
  },
  isiPhone: function(options) {
    if (Bridge.nativeHost === 'iphone') {
        return options.fn(this);
    } else {
      return options.inverse(this);
    }
  },
  isiPad: function(options) {
    if (Bridge.nativeHost === 'ipad') {
        return options.fn(this);
    } else {
      return options.inverse(this);
    }
  },

  ifHasBundle: function(options) {
    if (this.bundleConfig && this.bundleConfig.components && this.bundleConfig.components.length) {
      return options.fn(this);
    } else {
      return options.inverse(this);
    }
  },

  bundleNameLink: function() {
    var link = "<a href='" + Phoenix.View.url("ip/" + this.itemId) + "'>" + this.name + "</a>";
    return new SafeString(i18n.call({name: link}, "Your {{name}} includes", {'expand-tokens': true}));
  },
  'star-rating': function(rating) {
    rating = parseFloat(rating);
    if (isNaN(rating) || rating < 0) {
      return;
    }
    var rounded = Math.round(rating * 10),
        tenths = rounded % 10;
    rounded = rounded/10;

    var stars = [1,2,3,4,5].map(function(index) {
      return '<span class="star' + (index <= rounded ? ' rated' : (index === Math.floor(rounded+1) && tenths) ? ' partial partial' + tenths : '') + '"></span>';
    }).join('');
    return new SafeString('<div class="stars">'
        + stars
        + '<span class="rating">' + i18n.call({rating: rounded}, '{{rating}} star rating', {'expand-tokens': true}) + '</span>'
      + '</div>');
  },

  'input-tagged-text': function(options) {
    var className = options.hash['class'] || '',
        tagClass = options.hash['tag-class'] || '',
        tagText = options.hash['tag-text'] || '';
    delete options.hash['class'];
    delete options.hash['tag-class'];
    delete options.hash['tag-text'];

    var html =
      '<div class="tagged-text ' + className + '">'
      + inputText(options, false, this)
      + '<button type="button" class="' + tagClass + '">' + i18n.call(this, tagText) + '</button>'
      + '</div>';

    return new SafeString(html);
  },

  'view-form': function(options) {
    var className = (options.hash && escapeExpression(options.hash['class'])) || '';
    return '<form action="#" class="' + className + '">'
              + options.fn(this)
              + '<input class="hidden-submit" type="submit" value="' + i18n('Submit') + '">'
            + '</form>';
  },
  'form-section': function(options) {
    var className = (options.hash && escapeExpression(options.hash['class'])) || '';
    return '<div class="form-section ' + className + '">'
              + '<div class="form-layout">'
                + options.fn(this)
              + '</div>'
            + '</div>';
  },
  'form-checkbox': function(options) {
    var label = escapeExpression(options.hash.label),
        name = escapeExpression(options.hash.name),
        value = escapeExpression(options.hash.value),
        id = escapeExpression(options.hash.id) || _.uniqueId('txt'),

    input = '<input type="checkbox" id="' + id + '"' + (name ? ' name="' + name + '"' : '') + (value ? ' value="' + value + '"' : '');
    // Used to signal that the checked boolean value should be serialized as opposed to the string field value.
    if (options.hash.onOff) {
      input += ' data-onOff="true"';
    }
    input += '>',
    label = '<label class="checkbox-label" for="' + id + '">' + i18n(label) + '</label>';

    var nativeHost = Bridge.nativeHost;
    return formField(options, nativeHost === 'iphone' || nativeHost === 'ipad' ? label + '\n' + input : input + label);
  },

  'form-textarea': function(options) {
    options.hash.type = 'textarea';
    return inputText(options, true, this);
  },
  'form-text': function(options) {
    return inputText(options, true, this);
  },
  'form-email': function(options) {
    options.hash.type = 'email';
    return inputText(options, true, this);
  },
  'form-password': function(options) {
    options.hash.type = 'password';
    options.hash.autocorrect = "off";
    options.hash.autocomplete = "off";
    options.hash.autocapitalize = "off";
    return inputText(options, true, this);
  },
  'form-number': function(options) {
    return inputNumber(options, true, this);
  },
  'form-telephone': function(options) {
    options.hash.type = 'tel';
    return inputText(options, true, this);
  },

  'input-text': function(options) {
    return inputText(options, false, this);
  },
  'input-number': function(options) {
    return inputNumber(options, false, this);
  },

  'radio-item': function(options) {
    var label = escapeExpression(options.hash.label),
        name = escapeExpression(options.hash.name),
        value = escapeExpression(options.hash.value),
        selected = options.hash.selected,
        disabled = options.hash.disabled,
        editUrl = escapeExpression(options.hash.editUrl) || '',
        id = escapeExpression(options.hash.id) || _.uniqueId('txt'),
        itemClass = options.hash.itemClass ? ' ' + escapeExpression(options.hash.itemClass) : '',
        labelClass = options.hash.labelClass ? ' ' + escapeExpression(options.hash.labelClass) : '';
    if (disabled) {
      labelClass = 'disabled' + labelClass;
    }

    if (editUrl) {
      editUrl = '<div class="edit"><a href="' + editUrl + '" class="button">' + i18n('Edit') + '</a></div>';
    }
    if (!label) {
      label = options.fn(_.extend({radioId: id}, this));
    }

    if (label && !options.hash.customLabel) {
      label = '<label' + (labelClass ? ' class="' + labelClass + '"' : '') + ' for="' + id + '">' + i18n(label) + '</label>';
    } else if (label) {
      label = '<span class="radio-item-descriptor' + (disabled ? ' disabled' : '') + '">' + label + '</span>';
    }

    return new SafeString(
      '<div class="radio-item item' + itemClass + '">'
        + '<div>'
          + '<input type="radio" id="' + id + '"'
              + (name ? ' name="' + name + '"' : '')
              + (selected ? ' checked' : '')
              + (disabled ? ' disabled' : '')
              + (value ? ' value="' + value + '"' : '')
            + '>'
        + '</div>'
        + label
        + editUrl
      + '</div>');
  },
  'variant-list': function(items) {
    var rtn = "";
    if (items && items.length) {
      rtn += '<div class="variant-list">';
      _.each(items, function(item) {
        rtn += '<span class="variant">';
        rtn += item.name;
        rtn += ': ';
        // look for i18n values 'variant.{type}.{value}
        var key = "variant." + item.type + "." + item.value;
        var value = i18n(key);
        if (value === key) {
          // no match - use the item variant data as the value
          rtn += item.value;
        } else {
          rtn += value;
        }
        rtn += "</span>";
      });
      rtn += "</div>";
    }
    return new SafeString(rtn);
  },

  'bundle-component-display': function(bundleConfigComponents) {
    //hide item name if they are all the same and have variants
    var output = '';
    bundleConfigComponents.forEach(function(component){
      component.componentChildren.forEach(function(child) {
        var rowOutput = child.itemName + (child.variants ? '<br>' : '');
        if (child.variants && child.variants.length) {
          rowOutput += '<span class="variant-list">';
          child.variants.forEach(function(variant) {
            rowOutput += '<span class="variant">' + variant.name + ': ' + variant.value + '</span>';
          });
          rowOutput += '</span>';
        }
        if (rowOutput !== '') {
          output += '<li class="bundle-item">' + rowOutput + '</li>';
        }
      });
    });
    return new SafeString(output);
  },

  'encodeURIComponent': function(value) {
    return new SafeString(encodeURIComponent(value));
  },

  'flag-list': function(flags) {
    if (!flags || _.keys(flags).length === 0) {
      return '';
    }
    var output = '<div class="flags">';
    _.each(flags, function(flag) {
      output += '<div class="flag ' + flag.type + '">' + flag.name + '</div>';
    });
    return new SafeString(output + '</div>');
  },

  'dasherize': exports.Util.dasherize,

  'location-collection': function(options) {
    var collection = options.data.view.collection;
    options = options.hash;
    var loadingText = options['loading-text'];

    var ret = '<div class="' + (options['class'] || 'collection') + '">';
    if (loadingText) {
      if (!collection.isPopulated() || options['show-loading-indicator']) {
        ret += '<div class="collection-loading">'
            + Thorax.Util.getTemplate('inline-loading-indicator')({})
            + '<div>' + i18n(loadingText) + '</div>'
            + '</div>';
      }
    }
    return new SafeString(ret + '</div>');
  },

  openTarget: function(block) {
    return Phoenix.openTarget;
  }
};

for(var helper_name in helpers) {
  View[helper_name] = helpers[helper_name];
  Handlebars.registerHelper(helper_name, helpers[helper_name]);
}

View.url = Handlebars.helpers.url;

Handlebars.registerHelper('options-list', function(currentValue, options) {
  var ret = '',
      isArray = _.isArray(options);

  _.each(options, function(display, data) {    // display is the value in the source hash. data is the key
    var value;
    if (_.isArray(display)) {
      value = display[0];
      display = display[1];
    } else {
      value = isArray ? display : data;
    }

    ret += '<option value="' + escapeExpression(value) + '"';
    if (data === currentValue) {
      ret += ' selected';
    }
    ret += '>' + escapeExpression(i18n(display)) + '</option>';
  });

  return new SafeString(ret);
});

;;
/*global Connection, Authentication, authentication */
_.extend(Authentication.prototype, {
  url: 'user/view',
  secureUrl: true,
  syncOptions: function(method, options) {
    options.type = 'POST';
    options.data = {email: this.lastUserName};
  },

  parse: function(response) {
    parseUser(this)(response);
  },

  SESSION_DURATION: (1000 * 60 * 15),

  login: function(email, password, success) {
    this.ajax({
      url: 'user/login',
      type: 'POST',
      secure: true,
      data: {
        email: email,
        password: password
      },
      success: parseUser(this, email, success)
    });
  },
  logout: function(success) {
    var self = this;
    self.ajax({
      url: 'user/logout',
      type: 'POST',
      secure: true,
      success: function() {
        self.clear({silent: true});
        self.sessionActivity(false);

        if (success) {
          success();
        }
      }
    });
  },

  isPopulated: function() {
    // we can't fetch if we don't know the stored email address
    return (Phoenix.Model.prototype.isPopulated.call(this) || !this.lastUserName);
  },

  verify: function(success, options) {
    var self = this;

    // Short circuit if we already know the state locally
    if (this.isAuthed() !== undefined) {
      return success(this);
    }

    // If we don't have a stored email address we can not call the API
    // to determine if they user is authenticated or not. For most circumstances
    // we should have this value so for now we are assuming that the user is not
    // authenticated if we do not have a stored user name.
    if (!this.lastUserName) {
      self.sessionActivity(false);
      return success(this);
    }
    self.load(success, success, options);
  }
});

authentication.bind(Connection.SESSION_EXPIRED, function() {
  // Prevent stacked signin, i.e. signin/signin/foo. This shouldn't happen due to sessionId tracking
  // but playing it safe here
  var fragment = Backbone.history.getFragment();
  if (!/^signin\//.test(fragment)) {
    Backbone.history.navigate('signin/' + fragment, {trigger: true, replace: true});
  }

  // Blow away http caches for anything that can contain user-specific requests. For ASDA
  // services this is everything....
  // This operation will leave caches like the resource cache intact.
  Connection.invalidate('', {});
  Connection.invalidate('', {secure: true});
});

function parseUser(self, email, success) {
  return function(data) {
    delete data.statusCode;
    delete data.statusMessage;
    delete data.errors;

    self.clear({silent: true});
    self.set(data);

    self.sessionActivity(true);
    if (email) {
      self.setLastUserName(email);
    }

    if (success) {
      success(self);
    }
  };
}

;;
appVersion.url = window.location.origin + '/config';

;;
/*global LocalCache, Stores */
var Store = exports.Models.Store = exports.Model.extend({
  previewClass: 'store',
  ttl: LocalCache.TTL.HOUR,
  url: function() {
    return '/m/j?service=StoreLocator&method=locate&p1=' + (this.attributes.id || this.attributes.storeNumber);
  },
  parse: function(response) {
    // Empty response from the services layer
    if (_.isArray(response) && response.length === 0) {
      this._isEmpty = true;
      return;
    }

    function fixupHours(hours) {
      if (hours && hours.length === 1 && hours[0].day === 'Call store') {
        return { callStore: true };
      } else {
        return hours;
      }
    }

    response.localAdAvailable = Phoenix.Data.boolean(response.localAdAvailable);
    response.storeOpeningSoon = Phoenix.Data.boolean(response.storeOpeningSoon);

    response.hoursOfOperation = fixupHours(response.hoursOfOperation);
    response.storeServiceSlugs = [];
    _.each(response.storeServices, function(service) {
      service.slug = exports.Util.dasherize(service.name);
      response.storeServiceSlugs.push(service.slug);
      service.hoursOfOperation = fixupHours(service.hoursOfOperation);
    });

    return response;
  },

  // callback with {pickupTime: *timestamp ISO 8061 format*, timeZone: *string*}
  getPhotoPickupTime: function(callback) {
    this.ajax({
      v1: true,
      secure: true,
      url: '/m/j?service=Photo&method=getStorePickupTime',
      data: {
        p1: JSON.stringify([this.id])
      },
      success: function(pickupTimes) {
        callback(pickupTimes[0]);
      }
    });
  },

  getDistanceFrom: function(lat, lng, unit) {
    return Phoenix.Util.getDistanceBetween(lat, lng, this.attributes.latitude, this.attributes.longitude);
  },

  setAsSelectedShip2StoreAddress: function(callback) {
    var update = _.bind(function() {
      this.ajax({
        type: 'POST',
        url: '/m/j?service=Checkout&method=setSelectedShip2StoreAddress',
        secure: true,
        data: {
          p1: this.id
        },
        success: _.bind(function(data) {
          this.set(data,{
            silent: true
          });
          if (callback) {
            callback(data);
          }
        },this)
      });
    }, this);
    if (!this.isPopulated()) {
      this.fetch({success: update});
    } else {
      update();
    }
  },

  setAsPharmacyStore: function(callback) {
    this.ajax({
      type: 'GET',
      url: '/m/setStore?store_id=' + this.id,
      secure: true,
      success: _.bind(function(data) {
        this.set(data,{
          silent: true
        });
        if (callback) {
          callback(data);
        }
      },this)
    });
  }
});

Store.fromNative = function(data) {
  if (data.iD) { data.id = data.iD; }    // i love the evil iD  // It loves you too.
  if (!data.id) { data = { id: data }; } // handle id in vs. entire object in
  return new Phoenix.Models.Store(data);
};

var _lastStore;
Store.get = function(storeId, callback, error) {
  if (_lastStore && _lastStore.attributes.id === storeId) {
    callback(_lastStore);
  } else {
    (new Phoenix.Models.Store({
      id: storeId
    })).load(function(store) {
        if (store._isEmpty) {
          return error();
        }

        _lastStore = store;
        callback(store);
      },
      error);
  }
};

Store.suggestStore = function(callback, filter) {
  function checkStore(store) {
    if (store && (!filter || filter(store))) {
      return store;
    }
  }

  //try selected store
  var store = checkStore(Phoenix.getStore());
  if (store) {
    callback(store);
  //then closest store
  } else {
    Stores.closest(function(store) {
        store = checkStore(store);
        if (store) {
          _lastStore = store;
        }
        callback(store);
      },
      function() {
        callback();
      });
  }
};

;;
/*global LocalCache */

// should be initialized with:
// a) lat + lng attributes
// b) itemIds: possibly an array of item ids
var Stores = exports.Collections.Stores = exports.PagedCollection.extend({
  model: exports.Models.Store,
  ttl: LocalCache.TTL.DAY,
  v1: true,
  initialize: function(models, attributes) {
    attributes = _.extend(this, _.defaults(attributes || {}, {
      lat: 0,
      lng: 0,
      radius: 50
    }));
    exports.Collection.prototype.initialize.call(this, models);
  },
  url: function() {
    if (this.itemIds) {
      return '/m/j?service=StoreLocator&method=locateShippableByLatLong&p1=' +
        this.lat + '&p2=' + this.lng + '&p3=' + JSON.stringify(this.itemIds) +
        '&p4=' + this.radius + this.offsetParams(5);
    } else {
      return '/m/j?service=StoreLocator&method=locate&p1=' +
        this.lat + '&p2=' + this.lng + '&p3=' + this.radius + this.offsetParams(4);
    }
  },
  attributes: function() {
    return {
      lat: this.lat,
      lng: this.lng,
      radius: this.radius
    };
  },
  hasMore: function() {
    return !this.noMorePages;
  },
  parse: function(data) {
    var rtn = exports.Collection.prototype.parse.call(this, data);
    // the data has not totalCount attribute
    if (rtn.length < this.pageSize) {
      this.noMorePages = true;
    }
    // Support this while we still have the one off paging logic in the checkout store locator
    // After that is killed off we can drop this var in favor of CachedPagedCollection
    this.totalCount = this.length + rtn.length;
    return rtn;
  },
  getPhotoPickupTimes: function(ids, callback) {
    if (!callback) {
      callback = ids;
      ids = _.pluck(this.models, 'id');
    }
    this.ajax({
      secure: true,
      v1: true,
      url: '/m/j?service=Photo&method=getStorePickupTime',
      data: {
        p1: JSON.stringify(ids)
      },
      success: callback
    });
  }
});

//get closest store, callback will only be called if a store is found
(function() {
  function _getClosestStore(coords, callback, options) {
    var stores = new Phoenix.Collections.Stores(null, coords);
    stores.fetch(_.defaults({
        success: function(stores) {
          callback(stores.at(0));
        }
      },
      options));
  }

  // keep a cached value of the closest store when not querying location services
  var CACHED_CLOSEST_STORE = '_cachedClosestStore';
  var cachedClosestStoreData = JSON.parse(LocalCache.get(CACHED_CLOSEST_STORE) || '{}');
  if (cachedClosestStoreData.store) {
    // the model attributes were cached
    var attrs = cachedClosestStoreData.store;
    cachedClosestStoreData.store = new exports.Models.Store(attrs);
  }

  function _cacheClosestStore(coords, store) {
    var data = {
      store: store,
      coords: coords
    };
    LocalCache.store(CACHED_CLOSEST_STORE, JSON.stringify(data));
    cachedClosestStoreData = data;
  }

  Stores.closest = function(callback, failback, options) {
    Phoenix.getLocation(function(coords) {
      var cachedCoords = cachedClosestStoreData.coords;
      if (!cachedCoords || !exports.Util.isWithinRange(cachedCoords, coords)) {
        // location is out of date, get new store data
        _getClosestStore(coords, function(store) {
          _cacheClosestStore(coords, store);
          if (store) {
            callback(store);
          } else {
            failback && failback();
          }
        }, options);
      } else {
        // the cached store location is still the same
        callback(cachedClosestStoreData.store);
      }
    }, failback, options && options.useCachedLocation);
  };
})();


;;
/*global i18n */
i18n.dictionary = {
  'ASDAGWS_InvalidFormat': '{{attribute}} is invalid'
};

;;
/**
 * Implements a mask for DOM events. This will prevent the user from tapping on any elements
 * other than those that are ignored by the `options.test` field.
 *
 * General lifecycle:
 *  - "Mask" UI is displayed. This is up to the caller.
 *  - User taps on screen
 *    - options.test is executed if defined
 *    - If undefined or the return is truthy then the click event is cancelled and the
 *      `options.complete` call occurs.
 *
 * Test should generally return false for elements that you want to allow the user to interact
 * with and true for the elements whose behavior you want to disabled.
 */
Phoenix.Util.clickMask = function(options) {
  var eventName = Thorax._fastClickEventName || 'click',
      test = options.test,
      complete = options.complete;

  function eventHandler(event) {
    // Test checks to see if the click lands within the region we care about
    if (!test || test(event)) {
      event.preventDefault();
      event.stopPropagation();

      complete(event);
      cleanup();
    }
  }
  function cleanup() {
    document.body.removeEventListener(eventName, eventHandler, true);
  }
  document.body.addEventListener(eventName, eventHandler, true);

  return {
    cleanup: cleanup
  };
};

;;
var INFINITE_SCROLL_LISTENER_INTERVAL = 250,
    //height in pixels before indicator is visible where pagination will be triggered 
    INFINITE_SCROLL_THRESHOLD_PADDING = 3500; //roughly the height 30 items on one shelf + header

exports.Views.Paginator = exports.View.extend({
  name: 'paginator',
  nonBlockingLoad: true,
  pagingPadding: INFINITE_SCROLL_THRESHOLD_PADDING,

  events: {
    collection: {
      'load:start': function() {
        this.setState('loading');
      },
      'load:end': 'updateState'
    },
    rendered: '_startInfiniteScroll',
    destroyed: '_cleanupInfiniteScroll'
  },
  show: function() {
    if (!this.noMas) {
      $(this.el).show();
    }
    this.forceHide = false;
  },
  hide: function() {
    $(this.el).hide();
    this.forceHide = true;
  },

  setState: function(state) {
    this.loading = state === 'loading';
    $(this.el).toggleClass('loading', this.loading);

    if (state === 'no-more') {
      $(this.el).hide();
      this.noMas = true;
    } else if (!this.forceHide) {
      $(this.el).show();
    }
  },
  isVisible: function() {
    return this.el && !!this.el.offsetHeight;
  },
  updateState: function() {
    if (this.collection.hasMore && this.collection.hasMore()) {
      this.setState('more');
    } else {
      this.setState('no-more');
    }
  },

  setCollection: function(collection) {
    this.constructor.__super__.setCollection.call(this, collection, {fetch: false});

    // If we already have data display as such. Otherwise assume
    // that we are or will be loading soon. This prevents
    // race conditions with the load:start event
    if (collection.isPopulated()) {
      this.updateState();
    } else {
      this.setState('loading');
      $(this.el).addClass('loading');
    }
  },

  //no render operations in paginator for collections
  renderCollection: exports.View.prototype.render,
  appendItem: function(){},
  html: function(html) {
    $(this.el).html(html);
  },

  _startInfiniteScroll: function() {
    if (!this._infiniteScrollHandler) {
      this._infiniteScrollHandler = _.debounce(_.bind(function() {
        try {
          // Handle possible race condition between debounce and destroy
          if (!this.el) {
            return;
          }

          var contentLength = $(this.el).offset().top,
              bottomOfScreen = window.scrollY + window.innerHeight;

          if (this.isVisible() && contentLength < (bottomOfScreen + this.pagingPadding)) {
            this.paginate();
          }
        } catch (err) {
          Phoenix.trackCatch('paginator.infScroll', err);
        }
      }, this), INFINITE_SCROLL_LISTENER_INTERVAL);
      $(document).bind('scroll', this._infiniteScrollHandler);
    }
  },

  _cleanupInfiniteScroll: function() {
    if (this._infiniteScrollHandler) {
      $(document).unbind('scroll', this._infiniteScrollHandler);
    }
  },

  paginate: function() {
    if (!this.loading && this.collection.hasMore()) {
      //view using paginator should listen to this event
      //then trigger load on collection which will trigger
      //load:start -> updateState
      this.trigger('paginate');
    }
  }
});

;;
Thorax.templates['paginator'] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [2,'>= 1.0.0-rc.3'];
helpers = helpers || Handlebars.helpers; data = data || {};
  var buffer = "", escapeExpression=this.escapeExpression;


  buffer += escapeExpression(helpers.template.call(depth0, "inline-loading-indicator", {hash:{
    'label': ("Loading")
  },data:data}))
    + "\n";
  return buffer;
  });Thorax.View.registerMixin('ScrollPosition', function() {
  this._onScroll = _.throttle(_.bind(function() {
    try {
      this._lastScrollY = window.scrollY;
      this._lastScrollX = window.scrollX;
      this.trigger('scroll', this._lastScrollX, this._lastScrollY);
    } catch (err) {
      Phoenix.trackCatch('onScroll', err);
    }
  }, this), 50);
  this.bind('ready', _.bind(function() {
    $(window).bind('scroll', this._onScroll);
  }, this));
  this.bind('deactivated', _.bind(function() {
    $(window).unbind('scroll', this._onScroll);
  }, this));
});

;;
exports.tests = function() {
/*global SessionCache */
describe('SessionCache', function() {
  it('should be able to set property', function() {
    // This primarily tests browsers in private browsing mode
    SessionCache.setItem('test', 'foo');
    expect(SessionCache.getItem('test')).to.equal('foo');

    SessionCache.removeItem('test');
    expect(SessionCache.getItem('test')).to.not.exist;
  });
});

;;
/*global Util, authentication */
describe('util', function() {
  describe('#latLng', function() {
    it('should truncate', function() {
      expect(Util.latLng(123)).to.equal(123);
      expect(Util.latLng(123.123)).to.equal(123.123);
      expect(Util.latLng(123.12345)).to.equal(123.123);
      expect(Util.latLng(123.09876)).to.equal(123.098);
    });

    it('should convert strings', function() {
      expect(Util.latLng('123')).to.equal(123);
      expect(Util.latLng('123.123')).to.equal(123.123);
      expect(Util.latLng('123.12345')).to.equal(123.123);
      expect(Util.latLng('123.09876')).to.equal(123.098);
    });
  });

  describe('#appendParams', function() {
    it('should work with strings', function() {
      expect(Util.appendParams('base', 'key=value')).to.equal('base?key=value');
      expect(Util.appendParams('base?key1=value1', 'key2=value2')).to.equal('base?key1=value1&key2=value2');
    });

    it('shold work with objects', function() {
      expect(Util.appendParams('base', {k1: 'v1', k2: 'v2'})).to.equal('base?k1=v1&k2=v2');
      expect(Util.appendParams('base?key=value', {k1: 'v1', k2: 'v2'})).to.equal('base?key=value&k1=v1&k2=v2');
    });

    it('shold skip undefined values in objects', function() {
      expect(Util.appendParams('base', {k1: 'v1', k2: undefined, k3: 'v3'})).to.equal('base?k1=v1&k3=v3');
      expect(Util.appendParams('base?key=value', {k1: 'v1', k2: undefined, k3: 'v3'})).to.equal('base?key=value&k1=v1&k3=v3');
    });
    it('should handle empty parameters', function() {
      expect(Util.appendParams('fu', '')).to.equal('fu');
      expect(Util.appendParams('gazi', {})).to.equal('gazi');
    });
  });

  describe('#stripParams', function() {
    it('should return url without params unchanged', function() {
      expect(Util.stripParams('http://google.com')).to.equal('http://google.com');
    });
    it('should strip params from url', function() {
      expect(Util.stripParams('http://google.com?bar=1&foo=2')).to.equal('http://google.com');
    });
    it('should strip trailing question mark from url', function() {
      expect(Util.stripParams('http://google.com?')).to.equal('http://google.com');
    });
  });

  describe('#pickBy', function() {
    it('should return object with only values for which the iterator returns true', function() {
      var obj = {
        a1: 'foo',
        a2: 'bar'
      };
      expect(Util.pickBy(obj, function(v) {
        return v === 'bar';
      })).to.eql({a2: 'bar'});
    });
  });

  describe('#serializeParams', function() {
    it('should serialize params properly', function() {
      expect(Util.serializeParams({p1: 'k1', p2: 'k2'})).to.equal('p1=k1&p2=k2');
    });
    it('should return empty string for empty params', function() {
      expect(Util.serializeParams({})).to.equal('');
    });
    it('should not replace spaces with pluses', function() {
      expect(Util.serializeParams({p1: 'with space'})).to.equal('p1=with%20space');
    });
  });

  describe('#cachedSingletonMixin', function() {
    it('should match session', function() {
      var Model = Phoenix.Model.extend({});
      Util.cachedSingletonMixin(Model, 'test');

      this.spy(Model, 'release');

      var data = Model.get();
      expect(Model.release).to.not.have.been.called;

      Date.clock.tick(authentication.SESSION_DURATION - 1);
      expect(Model.get()).to.eql(data);
      expect(Model.release).to.not.have.been.called;

      // Access should extend the cache
      Date.clock.tick(authentication.SESSION_DURATION - 1);
      expect(Model.get()).to.eql(data);
      expect(Model.release).to.not.have.been.called;

      Date.clock.tick(authentication.SESSION_DURATION + 1);
      expect(Model.get()).to.eql(data);
      expect(Model.release).to.have.been.calledOnce;
    });

    it('should match custom duration', function() {
      var Model = Phoenix.Model.extend({});
      Util.cachedSingletonMixin(Model, 'test', 1000);

      this.spy(Model, 'release');

      var data = Model.get();
      expect(Model.release).to.not.have.been.called;

      Date.clock.tick(1000 - 1);
      expect(Model.get()).to.eql(data);
      expect(Model.release).to.not.have.been.called;

      Date.clock.tick(1000 + 1);
      expect(Model.get()).to.eql(data);
      expect(Model.release).to.have.been.calledOnce;
    });

    it('should release on triggers', function() {
      var self = this;
      function setup(get, type) {
        var Clazz = Phoenix.Model.extend({});
        Util.cachedSingletonMixin(Clazz, type);

        var instance = Clazz.get(!get);
        expect(!get).to.equal(!instance);
        if (instance) {
          self.spy(instance, 'clear');
        } else {
          self.spy(Clazz, 'release');
        }
        return Clazz;
      }
      function verify(modelCount, emptyCount, otherCount, noneCount) {
        expect(Model.get(true).clear.callCount).to.equal(modelCount, 'model count');
        expect(Empty.get(true).clear.callCount).to.equal(emptyCount, 'empty count');
        expect(Other.get(true).clear.callCount).to.equal(otherCount, 'other count');
        expect(None.release.callCount).to.equal(noneCount, 'none count');
      }

      var Model = setup(true, 'test'),
          Empty = setup(true),
          Other = setup(true),
          None = setup();

      exports.trigger('resetData', {type: 'test'});
      verify(1, 0, 0, 0);

      exports.trigger('resetData', {type: 'all'});
      verify(2, 1, 1, 1);

      exports.trigger('resetData', {});
      verify(3, 2, 2, 2);

      // Note: We can not track release binds on the none instance
      exports.trigger('fatal-error');
      verify(4, 3, 3, 2);

      authentication.trigger('loggedout');
      verify(5, 4, 4, 2);

      authentication.trigger(Connection.SESSION_EXPIRED);
      verify(6, 5, 5, 2);

      var stub = this.stub(authentication, 'isAuthed').returns(true);
      authentication.trigger('session-activity');
      verify(6, 5, 5, 2);
      stub.restore();

      stub = this.stub(authentication, 'isAuthed').returns(false);
      authentication.trigger('session-activity');
      verify(7, 6, 6, 3);
      stub.restore();

      exports.trigger('order:complete');
      verify(8, 7, 7, 3);
    });
  });
});

;;
/*global ANIVIA_TIMEOUT, LocalCache, aniviaConfig, console, exports, visitId, visitorId, _aniviaConfig:true */
describe('anivia', function() {
  beforeEach(function() {
    exports.config.analyticsEnabled = true;

    var config;
    this.stub(LocalCache, 'get', function() { return config; });
    this.stub(LocalCache, 'store', function(name, value) { config = value; return true; });
  });
  afterEach(function() {
    exports.config.analyticsEnabled = false;

    _aniviaConfig = undefined;
  });

  it('vistor id does not expire', function() {
    var now = 1000;
    this.stub(Date, 'now', function() { return now; });

    var original = visitorId();
    expect(original).to.not.be.undefined;
    expect(LocalCache.store.calledOnce).to.be.true;

    now = 1355270400;
    expect(visitorId()).to.equal(original);
    expect(LocalCache.store.calledOnce).to.be.true;
  });

  it('visit id expires after 30 min', function() {
    var now = 1000;
    this.stub(Date, 'now', function() { return now; });

    var original = visitId();
    expect(original).to.not.be.undefined;
    expect(LocalCache.store.calledOnce).to.be.true;

    now += 29*60*1000 + 1;
    expect(visitId()).to.not.equal(original);
    expect(LocalCache.store.calledTwice).to.be.true;
  });

  it('config loaded from localstorage', function() {
    var visitor = visitorId(),
        visit = visitId();
    expect(LocalCache.store.calledTwice).to.be.true;

    _aniviaConfig = undefined;

    expect(visitorId()).to.equal(visitor);
    expect(visitId()).to.equal(visit);
  });

  it('events are sent after timeout', function() {
    exports.trackEvent('foo', {'man': 'chu'});
    expect(this.requests.length).to.equal(0);
    expect(_aniviaConfig.queue.length).to.equal(1);

    this.clock.tick(ANIVIA_TIMEOUT + 1);
    expect(this.requests.length).to.equal(1);
    expect(_aniviaConfig.queue.length).to.equal(0);
  });

  it('Storage error does not cause flow exception', function() {
    this.stub(exports, 'trackError');

    LocalCache.store.restore();
    this.stub(LocalCache, 'store', function() { return false; /* Quota error */ });

    exports.trackEvent('foo', {'man': 'chu'});
    expect(this.requests.length).to.equal(0);
    expect(_aniviaConfig.queue.length).to.equal(1);
    expect(exports.trackError.callCount).to.equal(1);

    this.clock.tick(ANIVIA_TIMEOUT + 1);
    expect(this.requests.length).to.equal(1);
    expect(_aniviaConfig.queue.length).to.equal(0);
  });

  it('multiple events are batched into a single request', function() {
    exports.trackEvent('foo', {'man': 'chu'});
    this.clock.tick(ANIVIA_TIMEOUT / 2);

    exports.trackEvent('bar', {'man': 'chu?'});
    expect(this.requests.length).to.equal(0);
    expect(_aniviaConfig.queue.length).to.equal(2);

    this.clock.tick(ANIVIA_TIMEOUT);
    expect(this.requests.length).to.equal(1);
    expect(_aniviaConfig.queue.length).to.equal(0);
  });

  it('analytics calls survive a refresh', function() {
    exports.trackEvent('foo', {'man': 'chu'});
    exports.trackEvent('bar', {'man': 'chu?'});
    expect(this.requests.length).to.equal(0);
    expect(_aniviaConfig.queue.length).to.equal(2);

    _aniviaConfig = undefined;

    aniviaConfig();   // Reload
    expect(_aniviaConfig.queue.length).to.equal(2);

    this.clock.tick(ANIVIA_TIMEOUT + 1);
    expect(this.requests.length).to.equal(1);
    expect(_aniviaConfig.queue.length).to.equal(0);
  });

  it('multiple connection events are reduced to a single', function() {
    this.stub(console, 'error');

    exports.trackError('connection', {});
    expect(_aniviaConfig.queue.length).to.equal(1);

    exports.trackError('connection', {});
    expect(_aniviaConfig.queue.length).to.equal(1);
  });
});

;;
describe('anivia events', function() {
  beforeEach(function() {
    this.stub(exports, 'trackEvent');
  });

  it('should route should cause page view event', function() {
    var fragment = 'foo';
    this.stub(Backbone.history, 'getFragment', function() { return fragment; });

    Backbone.history.trigger('route');
    fragment = 'bar';
    Backbone.history.trigger('route');

    expect(exports.trackEvent).to.have.been.calledWith('pageView', {name: 'foo'});
    expect(exports.trackEvent).to.have.been.calledWith('pageView', {name: 'bar'});
    expect(exports.trackEvent.callCount).to.equal(2);
  });

  it('should duplicate route should cause page view event once', function() {
    var fragment = 'foo';
    this.stub(Backbone.history, 'getFragment', function() { return fragment; });

    Backbone.history.trigger('route');
    Backbone.history.trigger('route');

    expect(exports.trackEvent).to.have.been.calledWith('pageView', {name: 'foo'});
    expect(exports.trackEvent.callCount).to.equal(1);
  });
});

;;
/*global Connection, applyConnectionOptions */

describe('connection', function() {
  var startHandler, dataHandler, errorHandler, endHandler, cacheErrorHandler,
      model,
      event,
      options;
  beforeEach(function() {
    model = new Thorax.Model();
    event = undefined;
    options = {};

    function callback(_event) {
      event = _event;
    }
    startHandler = this.on(Connection, 'start', callback);
    dataHandler = this.on(Connection, 'data', callback);
    errorHandler = this.on(Connection, 'error', callback);
    endHandler = this.on(Connection, 'end', callback);
    cacheErrorHandler = this.on(Connection, 'cache-error', callback);
  });

  describe('#applyConnectionOptions', function() {
    it('should call start event', function() {
      applyConnectionOptions(options, model);
      expect(startHandler).to.have.been.calledOnce;
      expect(event.options).to.equal(options);
    });
    it('should call data event', function() {
      applyConnectionOptions(options, model);
      options.success('data', Connection.SUCCESS, 'xhr');

      expect(dataHandler).to.have.been.calledOnce;
      expect(event.options).to.equal(options);
      expect(event.responseData).to.equal('data');
      expect(event.status).to.equal(Connection.SUCCESS);
      expect(event.xhr).to.equal('xhr');
    });
    it('should call error event', function() {
      var xhr = { onreadystatechange: function() {}, status: 404 };
      this.stub(exports, 'trackError');

      applyConnectionOptions(options, model);
      options.error(xhr, 'puke', 'error!');

      expect(errorHandler).to.have.been.calledOnce;
      expect(event.options).to.equal(options);
      expect(event.errorInfo).to.equal('error!');
      expect(event.status).to.equal('puke');
      expect(event.xhr).to.equal(xhr);
    });
    it('should trigger error events', function() {
      var xhr = { onreadystatechange: function() {}, status: 404 };
      this.stub(Connection, 'isFatal', function() { return true; });
      this.stub(exports, 'trackError');
      var spy = this.on(model, 'error'),
          globalSpy = this.on(exports, 'fatal-error');

      applyConnectionOptions(options, model);
      options.error(xhr, 'puke', 'error!');

      expect(spy).to.have.been.calledWith(model, 'puke', 'error!');
      expect(globalSpy).to.have.been.calledWith('puke', 'error!');
    });
    it('should not trigger fatal-error event', function() {
      var xhr = { onreadystatechange: function() {}, status: 404 };
      this.stub(exports, 'trackError');
      this.stub(Connection, 'isFatal', function() { return false; });
      var spy = this.on(model, 'error'),
          globalSpy = this.on(exports, 'fatal-error');

      applyConnectionOptions(options, model);
      options.error(xhr, 'puke', 'error!');

      expect(spy).to.have.been.calledWith(model, 'puke', 'error!');
      expect(globalSpy).to.not.have.been.called;
    });
    it('should call end event', function() {
      var xhr = { onreadystatechange: function() {} };

      applyConnectionOptions(options, model);
      options.complete(xhr, Connection.SUCCESS);

      expect(endHandler).to.have.been.calledOnce;
      expect(event.options).to.equal(options);
      expect(event.status).to.equal(Connection.SUCCESS);
      expect(event.xhr).to.equal(xhr);
    });
    it('should call cache error event', function() {
      this.stub(exports, 'trackCatch', function() {});
      this.on(Connection, 'start', function(event) {
        event.responseData = 'foo';
      });

      options.success = function() { throw new Error(); };
      applyConnectionOptions(options, model);

      expect(cacheErrorHandler).to.have.been.calledOnce;
      expect(event.options).to.equal(options);
    });
    it('should provide updated data to callbacks', function() {
      var xhr = { status: 200, onreadystatechange: function() {} },
          xhr2 = { status: 200, onreadystatechange: function() {}, v2: true };

      this.stub(exports, 'trackError');
      this.on(Connection, 'data', function(event) {
        event.responseData = 'foo';
        event.status = 'bar';
        event.xhr = xhr2;
      });

      var error = options.error = sinon.spy(),
          complete = options.complete = sinon.spy();
      applyConnectionOptions(options, model);
      options.success('data', Connection.SUCCESS, xhr);
      options.complete(xhr, Connection.SUCCESS);

      // Verify that the data propagated through to complete
      expect(error).to.have.been.calledOnce;
      expect(error).to.have.been.calledWith(xhr2, 'bar');
      expect(complete).to.have.been.calledOnce;
      expect(complete).to.have.been.calledWith(xhr2, 'bar');
      expect(event.responseData).to.equal('foo');
      expect(event.status).to.equal('bar');
      expect(event.xhr).to.equal(xhr2);
    });
  });

  describe('#ajax', function() {
    beforeEach(function() {
      this.stub($, 'ajax');
    });

    it('should call start event', function() {
      Connection.ajax.call(model, options);
      expect(startHandler).to.have.been.calledOnce;
      expect($.ajax).to.have.been.called;
    });
    it('should handle cached responses', function() {
      var cacheHelper = sinon.spy(function(options) {
        options.responseData = {foo: true};
      });
      afterEach(function() {
        Connection.off('start', cacheHelper);
      });
      this.on(Connection, 'start', cacheHelper);
      var success = options.success = sinon.spy();

      Connection.ajax.call(model, options);
      expect(success).to.have.been.calledWith({foo: true}, Connection.SUCCESS);
      expect($.ajax).to.not.have.been.called;
    });

    it('should handle invalidate flag', function() {
      $.ajax.restore();
      this.stub(Connection, 'invalidate');

      options.invalidate = true;

      var event;
      model.invalidateUrl = function(_event) {
        event = _event;
        expect(this).to.equal(model);
        expect(event).to.exist;
        return 'invalidate!';
      };

      Connection.ajax.call(model, options);
      this.requests[0].respond(200, {}, '{}');

      expect(Connection.invalidate).to.have.been.calledOnce
          .to.have.been.calledWith('invalidate!', event.options);
    });
  });

  describe('#sync', function() {
    beforeEach(function() {
      this.stub(Thorax, 'sync', function() {});
      options.url = 'foo';
    });

    it('should call start event', function() {
      Connection.sync.call(model, 'get', model, options);
      expect(startHandler).to.have.been.calledOnce;
      expect(Thorax.sync).to.have.been.calledOnce;
    });
    it('should handle cached responses', function() {
      var cacheHelper = sinon.spy(function(options) {
        options.responseData = {foo: true};
      });
      afterEach(function() {
        Connection.off('start', cacheHelper);
      });
      this.on(Connection, 'start', cacheHelper);
      var success = options.success = sinon.spy(),
          complete = options.complete = sinon.spy();

      Connection.sync.call(model, 'get', model, options);
      expect(success).to.have.been.calledWith({foo: true}, Connection.SUCCESS);
      expect(complete).to.have.been.called;
      expect(Thorax.sync).to.not.have.been.called;
    });
  });

  describe('integration', function() {
    beforeEach(function() {
      this.stub(console, 'error');
    });
    describe('ajax', function() {
      it('should propagate success', function() {
        var success = options.success = sinon.spy();

        Connection.ajax.call(model, options);
        this.requests[0].respond(200, {}, '{"foo": true}');

        expect(success).to.have.been.calledOnce
            .calledWith({foo: true}, 'success', this.requests[0]);
      });
      it('should propagate parse error info', function() {
        this.stub(Phoenix, 'setView');

        var error = options.error = sinon.spy();

        Connection.ajax.call(model, options);
        this.requests[0].respond(200, {}, '{"foo": tru e}');

        expect(error).to.have.been.calledOnce
            .calledWith(this.requests[0], 'parsererror');
      });
    });
    describe('sync', function() {
      beforeEach(function() {
        options.url = 'foo';
      });

      it('should propagate success', function() {
        var success = options.success = sinon.spy();

        Connection.sync.call(model, 'get', model, options);
        this.requests[0].respond(200, {}, '{"foo": true}');

        expect(success).to.have.been.calledOnce
            .calledWith({foo: true}, 'success', this.requests[0]);
      });
      it('should propagate parse error info', function() {
        this.stub(Phoenix, 'setView');

        var error = options.error = sinon.spy();

        Connection.sync.call(model, 'get', model, options);
        this.requests[0].respond(200, {}, '{"foo": tru e}');

        expect(error).to.have.been.calledOnce
            .calledWith(this.requests[0], 'parsererror');
      });
    });
  });
});

;;
/*global Connection */
describe('connection/error-tracking', function() {
  var model, options;
  beforeEach(function() {
    this.stub(exports, 'trackError');
    this.stub(exports, 'setView');

    model = new Thorax.Model();
    options = {};
  });

  it('should include response text with parsererror', function() {
    var success = options.success = this.spy(),
        error = options.error = this.spy();

    Connection.ajax.call(model, options);
    this.requests[0].respond(200, {}, 'San Diego!');

    expect(success).to.not.have.been.called;
    expect(error).to.have.been.called;
    expect(exports.trackError).to.have.been.calledOnce;
    expect(exports.trackError).to.have.been.calledWith('parsererror', sinon.match(/"responseText":"San Diego!"/));
  });
  it('should include response text with empty parsererror', function() {
    var error = options.error = this.spy();

    Connection.ajax.call(model, options);
    this.requests[0].respond(200, {}, '');

    expect(error).to.have.been.called;
    expect(exports.trackError).to.have.been.calledOnce;
    expect(exports.trackError).to.have.been.calledWith('parsererror', sinon.match(/"responseText":""/));
  });
  it('should mark connection errors as such', function() {
    var event;
    this.on(Connection, 'error', function(_event) {
      event = _event;
    });

    Connection.ajax.call(model, options);
    this.requests[0].respond(0, {}, '');

    expect(event.connectionError).to.be.true;
    expect(event.status).to.equal('connection');
    expect(event.errorInfo).to.be.undefined;
    expect(exports.trackError).to.have.been.calledWith('connection', sinon.match(/"status":0,"responseText":".*online:/));
  });

  it('should not error for ignored', function() {
    var error = options.error = this.spy();
    this.stub(Connection, 'errorHandler');

    options.ignoreErrors = true;
    Connection.ajax.call(model, options);
    this.requests[0].respond(0, {}, '');

    expect(error).to.have.been.called;
    expect(Connection.errorHandler).to.not.have.been.called;
    expect(exports.trackError).to.have.been.calledWith('connection', sinon.match(/"ignored":true/));
  });
  it('should not log aborted', function() {
    Connection.ajax.call(model, options);
    model._aborted = true;

    this.requests[0].respond(0, {}, '');

    expect(exports.trackError).to.not.have.been.called;
  });
  it('should log auth exceptions', function() {
    var event;
    this.on(Connection, 'data', function(_event) {
      event = _event;
      event.status = Connection.SESSION_EXPIRED;
    });

    options.url = 'aurl!';
    Connection.ajax.call(model, options);
    this.requests[0].respond(200, {}, '{}');

    expect(event.status).to.equal(Connection.SESSION_EXPIRED);
    expect(event.errorInfo).to.be.undefined;
    expect(exports.trackError).to.have.been.calledWith('auth-expired', sinon.match(/aurl!/));
  });
});

;;
/*global Connection, LocalCache, Model */
describe('connection/local-cache', function() {
  beforeEach(function() {
    this.stub(exports, 'trackError');
  });

  function modelTTL(ttl) {
    var model = new Model();
    model.ttl = ttl;
    return model;
  }

  describe('loading', function() {
    beforeEach(function() {
      this.stub(Thorax, 'sync');
      this.stub(LocalCache, 'get', function() {
        return '{"foo":1}';
      });
    });

    it('loads from cache', function() {
      var success = this.spy();

      Connection.sync('read', modelTTL(LocalCache.TTL.WEEK), {
          url: 'bar',
          success: success
        });

      expect(LocalCache.get).to.have.been.calledOnce;
      expect(success).to.have.been.calledOnce;
      expect(success).to.have.been.calledWith({foo: 1}, Connection.SUCCESS);
    });

    it('fails over to ajax if cache error occurs', function() {
      this.stub(exports, 'trackCatch');

      var success = this.stub().throws();

      Connection.sync('read', modelTTL(LocalCache.TTL.WEEK), {
          url: 'bar',
          success: success
        });

      expect(LocalCache.get).to.have.been.calledOnce;
      expect(success).to.have.been.calledOnce;
      expect(success).to.have.been.calledWith({foo: 1}, Connection.SUCCESS);
      expect(Thorax.sync).to.have.been.calledOnce;
    });

    it('does not load from no ttl model', function() {
      Connection.sync('read', new Model({}), {
          url: 'bar'
        });

      expect(LocalCache.get.callCount, 0);
      expect(Thorax.sync).to.have.been.calledOnce;
    });
  });

  describe('cache storage', function() {
    var success;
    beforeEach(function() {
      this.stub(LocalCache, 'store');
      success = this.spy();
    });
    it('stores for ttl cache case', function() {
      Connection.sync('read', modelTTL(LocalCache.TTL.WEEK), {
          url: 'bar',
          success: success
        });
      this.requests[0].respond(200, {}, '{"foo": "bar"}');


      expect(success).to.have.been.calledOnce;
      expect(LocalCache.store).to.have.been.calledOnce;
      expect(LocalCache.store).to.have.been.calledWith('bar', '{"foo":"bar"}');
    });
    it('does not store for no ttl case', function() {
      Connection.sync('read', new Model({}), {
          url: 'bar',
          success: success
        });
      this.requests[0].respond(200, {}, '{"foo": "bar"}');

      expect(success).to.have.been.calledOnce;
      expect(LocalCache.store).to.not.have.been.called;
    });
  });

  describe('cache invalidation', function() {
    it('should handle invalidate event', function() {
      this.stub(LocalCache, 'invalidate');

      Connection.invalidate('foo', {hard: 'bar'});

      expect(LocalCache.invalidate).to.have.been.calledOnce
          .to.have.been.calledWith('foo', 'bar');
    });
  });
});

;;
/*global Connection */
describe('connection/outofband', function() {
  var started = Backbone.History.started;
  beforeEach(function() {
    this.model = new Phoenix.Model({url: 'foo'});
  });
  after(function() {
    Backbone.History.started = started;
  });

  it('route change during connection marks as aborted', function() {
    Backbone.History.started = true;

    var fragment = 'foo';
    this.stub(Backbone.history, 'getFragment', function() { return fragment; });

    Connection.ajax.call(this.model, {});
    fragment = 'bar';
    this.requests[0].respond(200, {}, '{}');

    expect(this.model._aborted).to.be.true;
  });
});

;;
/*global Connection, isUnloading:true, unloadTracker, unloadTrackerCount:true */
afterEach(function() {
  isUnloading = false;
  unloadTrackerCount = 0;
  window.removeEventListener('beforeunload', unloadTracker, false);
});
describe('connection/unload', function() {
  var model, options;
  beforeEach(function() {
    model = new Thorax.Model();
    options = {};

    this.stub(exports, 'setView');
    this.stub(window, 'addEventListener', function() {});
    this.stub(window, 'removeEventListener', function() {});
  });

  // Warn this test does not work under phantom. Disabling for now.
  it.skip('should manage listener lifetime', function() {
    Connection.ajax.call(model, options);
    expect(window.addEventListener).to.have.been.calledOnce;
    expect(window.addEventListener).to.have.been.calledWith('beforeunload', unloadTracker, false);

    Connection.ajax.call(model, options);
    expect(unloadTrackerCount).to.equal(2);
    expect(window.addEventListener).to.have.been.calledOnce;

    this.requests[1].respond(200, {}, '{}');
    expect(unloadTrackerCount).to.equal(1);
    expect(window.removeEventListener).to.not.have.been.called;

    this.requests[0].respond(200, {}, '{}');
    expect(window.removeEventListener).to.have.been.calledOnce;
    expect(window.removeEventListener).to.have.been.calledWith('beforeunload', unloadTracker, false);
  });
  it('should mark as unloading', function() {
    expect(isUnloading).to.be.false;
    unloadTracker();
    expect(isUnloading).to.be.true;
  });
  it('should not ignore connection errors when unloading', function() {
    this.stub(exports, 'trackError');

    var error = options.error = this.spy();
    Connection.ajax.call(model, options);
    this.requests[0].respond(0, {}, '');

    expect(error).to.have.been.calledOnce;
  });
  it('should ignore connection errors when unloading', function() {
    this.stub(exports, 'trackError');
    unloadTracker();

    var error = options.error = this.spy();
    Connection.ajax.call(model, options);
    this.requests[0].respond(0, {}, '');

    expect(error).to.not.have.been.called;
  });
});

;;
describe('model', function() {
  it('changes should trigger needsUpdate', function() {
    var Model = exports.Model.extend({
      url: 'dummy'
    });
    var model = new Model();
    expect(model.shortCircuitUpdate()).to.be.true;
    model.set({foo: 'foo'});
    expect(model.shortCircuitUpdate()).to.be.false;

    var spy = this.spy();
    model.save({foo: 'bars'}, {success: spy});
    expect(this.requests.length, 1);
    expect(model.shortCircuitUpdate()).to.be.false;

    this.requests[0].respond(200, {},  '{"foo": "bars"}');
    expect(spy).to.have.been.called;

    model.set({foo: 'bar'}, {silent: true});
    expect(model.shortCircuitUpdate()).to.be.false;
  });
});

;;
/*global Validate, valueFromAttrName */
describe('validate', function() {
  describe('validator', function() {
    it('should validate data object attribute', function() {
      expect(Validate.validate(
          {bar: 1},
          {
            foo: {notEmpty: {msg: 'empty'}},
            baz: {same: {as: 'bar', msg: 'same'}}
          }))
        .to.eql([
          {name: 'foo', message: 'empty'},
          {name: ['baz', 'bar'], message: 'same'}
        ]);
    });
    it('should validate multiple fields', function() {
      expect(Validate.validate(
          {bar: 1},
          {
            'foo baz': {notEmpty: {msg: 'empty'}}
          }))
        .to.eql([
          {name: 'foo', message: 'empty'},
          {name: 'baz', message: 'empty'}
        ]);
    });
    it('should execute array objects multiple times', function() {
      expect(Validate.validate(
          {bar: 1},
          {
            foo: {
              same: [
                {as: 'bar', msg: 'same'},
                {as: 'baz', msg: 'same2'}
              ]
            }
          }))
        .to.eql([
          {name: ['foo', 'bar'], message: 'same'}
        ]);
      expect(Validate.validate(
          {baz: 1},
          {
            foo: {
              same: [
                {as: 'bar', msg: 'same'},
                {as: 'baz', msg: 'same2'}
              ]
            }
          }))
        .to.eql([
          {name: ['foo', 'baz'], message: 'same2'}
        ]);
    });
    it('should execute custom validators', function() {
      expect(Validate.validate(
          {bar: 1},
          {
            anyShitYouWant: {
              same: function() { return ['msg']; }
            }
          }))
        .to.eql(['msg']);
    });
    it('should only display one error per field', function() {
      expect(Validate.validate(
          {bar: 1, baz: 1},
          {
            foo: {
              same: [
                {as: 'bar', msg: 'same'},
                {as: 'baz', msg: 'same2'}
              ]
            }
          }))
        .to.eql([
          {name: ['foo', 'bar'], message: 'same'}
        ]);
    });
    it('should handle primitives', function() {
      expect(Validate.validate(
          {bar: 'a', baz: '{', bak: 'k', bat: 'bar'},
          {
            foo: {
              notEmpty: true,
            },
            bar: {
              numeric: true,
            },
            baz: {
              invalidCharacters: true,
            },
            bak: {
              invalidCharacters: /k/,
            },
            bat: {
              pattern: /foo/
            }
          }))
        .to.eql([
          {name: 'foo', message: {format: '{{attribute}} cannot be blank'}},
          {name: 'bar', message: {value: 'a', format: '{{attribute}} must be a number.'}},
          {name: 'baz', message: {value: '{', format: '{{attribute}} cannot contain \'{{value}}\''}},
          {name: 'bak', message: {value: 'k', format: '{{attribute}} cannot contain \'{{value}}\''}},
          {name: 'bat', message: {value: 'bar', format: '{{attribute}} value {{value}} is invalid.'}}
        ]);
    });
  });

  describe('#notEmpty', function() {
    it('should not error with content', function() {
      var options = {fields: ['foo']};
      expect(Validate.notEmpty({foo: 'bar'}, options)).to.eql([]);
      expect(Validate.notEmpty({foo: 0}, options)).to.eql([]);
    });
    it('should error when empty', function() {
      var errors = [{name: 'foo', message: 'foo'}],
          options = {fields: ['foo'], msg: 'foo'};
      expect(Validate.notEmpty({foo: ''}, options)).to.eql(errors);
      expect(Validate.notEmpty({foo: ' '}, options)).to.eql(errors);
      expect(Validate.notEmpty({foo: ' \n\t '}, options)).to.eql(errors);
      expect(Validate.notEmpty({}, options)).to.eql(errors);
    });
  });
  describe('#same', function() {
    var options = {fields: ['foo', 'bar'], msg: 'YOUR SHIT MUST MATCH!'};

    it('should not error if two fields are the same', function() {
      expect(Validate.same({foo: 1, bar: 1}, options)).to.eql([]);
      expect(Validate.same({}, options)).to.eql([]);
      expect(Validate.same({foo: 'a', bar: 'a'}, options)).to.eql([]);

      expect(Validate.same(
          {foo: 'a', bar: 'a', baz: 'a'},
          {fields: ['foo', 'bar', 'baz']}))
        .to.eql([]);
    });
    it('should error if two fields do not match', function() {
      var errors = [{name: ['foo', 'bar'], message: 'YOUR SHIT MUST MATCH!'}];
      expect(Validate.same({foo: 1}, options)).to.eql(errors);
      expect(Validate.same({bar: 1}, options)).to.eql(errors);
      expect(Validate.same({foo: 1, bar: '1'}, options)).to.eql(errors);
      expect(Validate.same({foo: 'asdf', bar: 'jkl;'}, options)).to.eql(errors);

      expect(Validate.same(
          {foo: 'a', bar: 'a', baz: 'b'},
          {fields: ['foo', 'bar', 'baz'], msg: 'YOUR SHIT MUST MATCH!'}))
        .to.eql([{name: ['foo', 'bar', 'baz'], message: 'YOUR SHIT MUST MATCH!'}]);
    });
  });
  describe('#pattern', function() {
    it('should not error when valid', function() {
      var options = {fields: ['foo'], pattern: /abcd/};
      expect(Validate.pattern({foo: 'abcd'}, options)).to.eql([]);

      options = {fields: ['foo'], pattern: /abc/};
      expect(Validate.pattern({foo: 'abcd'}, options)).to.eql([]);
    });
    it('should error when does not match', function() {
      var errors = [{name: 'foo', message: {value: '123', format: 'foo'}}],
          options = {fields: ['foo'], msg: {format: 'foo'}, pattern: /abcd/};
      expect(Validate.pattern({foo: '123'}, options)).to.eql(errors);

      options = {fields: ['foo'], msg: {format: 'foo'}, pattern: /^12$/};
      expect(Validate.pattern({foo: '123'}, options)).to.eql(errors);
    });
    it('should match email', function() {
      expect(Validate.pattern(
          {foo: 'blaz@blaz.me'},
          {fields: ['foo'], pattern: Validate.email}))
        .to.eql([]);
    });
  });
  describe('#invalidCharacters', function() {
    it('should not error when valid', function() {
      var options = {fields: ['foo']};
      expect(Validate.invalidCharacters({foo: 'abcd'}, options)).to.eql([]);
    });
    it('should error when matches', function() {
      var errors = [{name: 'foo', message: {value: '{', format: 'foo'}}],
          options = {fields: ['foo'], msg: {format: 'foo'}};
      expect(Validate.invalidCharacters({foo: '{'}, options)).to.eql(errors);
    });
    it('should pull pattern from options', function() {
      var errors = [{name: 'foo', message: 'foo'}],
          options = {fields: ['foo'], msg: 'foo', pattern: /a/};
      expect(Validate.invalidCharacters({foo: 'a'}, options)).to.eql(errors);

      options = {fields: ['foo'], msg: 'foo', pattern: {foo: /a/}};
      expect(Validate.invalidCharacters({foo: 'a'}, options)).to.eql(errors);

      options = {fields: ['foo'], msg: 'foo', pattern: {bar: /a/}};
      expect(Validate.invalidCharacters({foo: 'a'}, options)).to.eql([]);

      options = {fields: ['foo'], msg: 'foo', pattern: /a/};
      expect(Validate.invalidCharacters({foo: '{'}, options)).to.eql([]);
    });
  });

  describe('#numeric', function() {
    it('should cast to integers', function() {
      var attributes = {foo: '1'};
      expect(Validate.numeric(attributes, {fields: ['foo']})).to.eql([]);
      expect(attributes.foo).to.equal(1);

      attributes = {foo: '-1'};
      expect(Validate.numeric(attributes, {fields: ['foo']})).to.eql([]);
      expect(attributes.foo).to.equal(-1);

      attributes = {foo: '  1   '};
      expect(Validate.numeric(attributes, {fields: ['foo']})).to.eql([]);
      expect(attributes.foo).to.equal(1);

      attributes = {foo: '0'};
      expect(Validate.numeric(attributes, {fields: ['foo']})).to.eql([]);
      expect(attributes.foo).to.equal(0);

      attributes = {foo: '0.1'};
      expect(Validate.numeric(attributes, {fields: ['foo']})).to.eql([]);
      expect(attributes.foo).to.equal(0.1);

      attributes = {foo: 1};
      expect(Validate.numeric(attributes, {fields: ['foo']})).to.eql([]);
      expect(attributes.foo).to.equal(1);
    });
    it('should allow for custom matcher', function() {
      var attributes = {foo: 'a1'};
      expect(Validate.numeric(
          attributes,
          {fields: ['foo'], pattern: /^a(\d+)$/}))
        .to.eql([]);
      expect(attributes.foo).to.equal(1);
    });
    it('should error on mismatch', function() {
      var options = {fields: ['foo'], msg: 'FAIL'},
          error = [{name: 'foo', message: 'FAIL'}];

      var attributes = {foo: 'asdf'};
      expect(Validate.numeric(attributes, options)).to.eql(error);
      expect(attributes.foo).to.equal('asdf');

      attributes = {foo: '1a'};
      expect(Validate.numeric(attributes, options)).to.eql(error);
      expect(attributes.foo).to.equal('1a');

      attributes = {foo: 'a1'};
      expect(Validate.numeric(attributes, options)).to.eql(error);
      expect(attributes.foo).to.equal('a1');
    });
  });
  describe('#range', function() {
    it('should accept a valid input range', function() {
      expect(Validate.range({foo: 1}, {fields: ['foo']})).to.eql([]);
      expect(Validate.range({foo: 1}, {fields: ['foo'], lt: 1.1})).to.eql([]);
      expect(Validate.range({foo: 1}, {fields: ['foo'], lte: 1})).to.eql([]);
      expect(Validate.range({foo: 1}, {fields: ['foo'], gte: 1})).to.eql([]);
      expect(Validate.range({foo: 1}, {fields: ['foo'], gt: 0.9})).to.eql([]);
      expect(Validate.range({foo: -1}, {fields: ['foo'], lt: 0})).to.eql([]);
      expect(Validate.range({foo: -1}, {fields: ['foo'], lte: 0})).to.eql([]);
      expect(Validate.range({foo: 1}, {fields: ['foo'], gte: 0})).to.eql([]);
      expect(Validate.range({foo: 1}, {fields: ['foo'], gt: 0})).to.eql([]);

      expect(Validate.range({foo: 'bar'}, {fields: ['foo']})).to.eql([]);
      expect(Validate.range({foo: 'bar'}, {fields: ['foo'], lt: 'bas'})).to.eql([]);
      expect(Validate.range({foo: 'bar'}, {fields: ['foo'], lte: 'bar'})).to.eql([]);
      expect(Validate.range({foo: 'bar'}, {fields: ['foo'], gte: 'bar'})).to.eql([]);
      expect(Validate.range({foo: 'bar'}, {fields: ['foo'], gt: 'ba'})).to.eql([]);
    });
    it('should error if out of range', function() {
      expect(Validate.range({foo: 1}, {fields: ['foo'], gt: 1.1, msg: 'it died'}))
        .to.eql([{name: 'foo', message: 'it died'}]);
      expect(Validate.range({foo: 0.9}, {fields: ['foo'], gte: 1, msg: 'it died'}))
        .to.eql([{name: 'foo', message: 'it died'}]);
      expect(Validate.range({foo: 1.1}, {fields: ['foo'], lte: 1, msg: 'it died'}))
        .to.eql([{name: 'foo', message: 'it died'}]);
      expect(Validate.range({foo: 1}, {fields: ['foo'], lt: 0.9, msg: 'it died'}))
        .to.eql([{name: 'foo', message: 'it died'}]);
      expect(Validate.range({foo: -1}, {fields: ['foo'], gt: 0, msg: 'it died'}))
        .to.eql([{name: 'foo', message: 'it died'}]);
      expect(Validate.range({foo: -1}, {fields: ['foo'], gte: 0, msg: 'it died'}))
        .to.eql([{name: 'foo', message: 'it died'}]);
      expect(Validate.range({foo: 1}, {fields: ['foo'], lte: 0, msg: 'it died'}))
        .to.eql([{name: 'foo', message: 'it died'}]);
      expect(Validate.range({foo: 1}, {fields: ['foo'], lt: 0, msg: 'it died'}))
        .to.eql([{name: 'foo', message: 'it died'}]);

      expect(Validate.range({foo: 'bar'}, {fields: ['foo'], gt: 'bas', msg: 'it died'}))
        .to.eql([{name: 'foo', message: 'it died'}]);
      expect(Validate.range({foo: 'bar'}, {fields: ['foo'], gte: 'bas', msg: 'it died'}))
        .to.eql([{name: 'foo', message: 'it died'}]);
      expect(Validate.range({foo: 'bar'}, {fields: ['foo'], lte: 'ba', msg: 'it died'}))
        .to.eql([{name: 'foo', message: 'it died'}]);
      expect(Validate.range({foo: 'bar'}, {fields: ['foo'], lt: 'ba', msg: 'it died'}))
        .to.eql([{name: 'foo', message: 'it died'}]);
    });
  });

  describe('#valueFromAttrName', function() {
    it('should lookup simple values', function() {
      expect(valueFromAttrName({foo: 123}, 'foo')).to.equal(123);
      expect(valueFromAttrName({foo: 0}, 'foo')).to.equal(0);
    });
    it('should lookup nested values', function() {
      expect(valueFromAttrName({baz: {foo: 123}}, 'baz[foo]')).to.equal(123);
      expect(valueFromAttrName({baz: {bar: {foo: 123}}}, 'baz[bar][foo]')).to.equal(123);
    });
    it('should handle missing fields', function() {
      expect(valueFromAttrName({foo: 123}, 'bar')).to.equal('');
      expect(valueFromAttrName({baz: {foo: 123}}, 'bar')).to.equal('');
      expect(valueFromAttrName({baz: {foo: 123}}, 'bar[baz]')).to.equal('');
      expect(valueFromAttrName({baz: {foo: 123}}, 'baz[foo][bat]')).to.equal('');
    });
  });
});

;;
/*global Collection, PagedCollection */
describe('PagedCollection', function() {
  var collection;
  beforeEach(function() {
    collection = new PagedCollection();
    collection.url = 'foo';
    collection.collectionField = 'item';
    collection.countField = 'totalCount';
    collection.pageSize = 3;
  });

  it('should read fields', function() {
    collection.fetch();
    this.requests[0].respond(200, {}, JSON.stringify({item: [{id: 1}, {id: 2}, {id: 3}], totalCount: 5}));

    expect(_.pluck(collection.models, 'id')).to.eql([1, 2, 3]);
    expect(collection.totalCount).to.equal(5);

    collection.collectionField = 'otherShit';
    collection.countField = 'totalCount2';
    collection.fetch();
    this.requests[1].respond(200, {}, JSON.stringify({otherShit: [{id: 11}, {id: 2}, {id: 3}], totalCount2: 6}));

    expect(_.pluck(collection.models, 'id')).to.eql([11, 2, 3]);
    expect(collection.totalCount).to.equal(6);
  });
  it('should read subsequent content on the next page', function() {
    collection.fetch();
    this.requests[0].respond(200, {}, JSON.stringify({item: [{id: 1}, {id: 2}, {id: 3}], totalCount: 5}));

    expect(_.pluck(collection.models, 'id')).to.eql([1, 2, 3]);
    expect(collection.totalCount).to.equal(5);
    expect(collection.hasMore()).to.be.true;

    collection.nextPage();
    this.requests[1].respond(200, {}, JSON.stringify({item: [{id: 4}, {id: 5}, {id: 6}], totalCount: 5}));

    expect(_.pluck(collection.models, 'id')).to.eql([1, 2, 3, 4, 5, 6]);
    expect(collection.totalCount).to.equal(5);
  });
  it('should not read subsequent content on the next page', function() {
    collection.fetch();
    this.requests[0].respond(200, {}, JSON.stringify({item: [{id: 1}, {id: 2}, {id: 3}], totalCount: 3}));
    expect(collection.hasMore()).to.be.false;

    collection.nextPage();
    expect(this.requests.length).to.equal(1);
  });

  describe('#mergeFetch', function() {
    var collection;
    beforeEach(function() {
      collection = new Collection();
      collection.url = 'foo';
      collection.fetch = PagedCollection.mergeFetch();
    });
    it('should load from multiple pages', function() {
      var spy = this.spy(),
          startSpy = this.spy(),
          endSpy = this.spy();
      collection.on('load:start', startSpy);
      collection.on('load:end', endSpy);

      collection.fetch({success: spy});

      for (var i = 0; i < 3; i++) {
        expect(this.requests.length).to.equal(i + 1);

        expect(this.requests[i].url).to.match(/pagenum=(\d+)/);
        expect(RegExp.$1).to.equal(i+1+'');
        expect(startSpy).to.have.been.calledOnce;
        expect(endSpy).to.not.have.been.called;

        this.requests[i].respond(200, {}, JSON.stringify({
          totalResult: 150,
          item: _.range(50*i, 50*(i+1)).map(function(value) { return { id: value }; })
        }));
        if (i < 2) {
          expect(spy).to.not.have.been.called;
        }
      }
      expect(startSpy).to.have.been.calledOnce;
      expect(endSpy).to.have.been.calledOnce;

      expect(spy).to.have.been.called;
      expect(collection.length).to.equal(150);
      expect(collection.at(0).id).to.equal(0);
      expect(collection.at(0).collection).to.equal(collection);
      expect(collection.at(149).id).to.equal(149);
    });
    it('should forward errors', function() {
      this.stub(Phoenix, 'trackError');
      this.stub(Phoenix, 'setView');

      var collection = new Collection(),
          spy = this.spy(),
          errorSpy = this.spy();
      collection.on('error', errorSpy);

      collection.fetch = PagedCollection.mergeFetch();
      collection.fetch({error: spy});

      this.requests[0].respond(404, {}, '');
      expect(spy).to.have.been.calledOnce;
      expect(errorSpy).to.have.been.calledOnce;
    });
  });
});

;;
/*global cleanHTML */
describe('markup-helpers', function() {
  describe('#cleanHTML', function() {
    // TODO : Additional testing for the various cleanHTML cases
    it('should remove scripts', function() {
      expect(cleanHTML('foo<script>really?</script>foo')).to.equal('foofoo');
    });

    it('should clean screwy encoding', function() {
      expect(cleanHTML('\uFFFDfoo\uFFFDfoo')).to.equal(' foo foo');
    });
  });
});

;;
/*global LocalCache, appVersion */
describe('app-version', function() {
  beforeEach(function() {
    this.originalTime = appVersion.loadTime;
    this.originalConfig = exports.config.configRefreshRate;
    exports.config.configRefreshRate = 5 * 60 * 1000;

    this.originalStarted = Backbone.history.started;
    Backbone.history.started = true;
    this.stub(Backbone.history, 'loadUrl');
    this.stub(LocalCache, 'store');
    this.resetSpy = this.spy();
    exports.bind('cache-reset', this.resetSpy);
  });
  afterEach(function() {
    if (this.originalTime) {
      appVersion.loadTime = this.originalTime;
    }
    Backbone.history.started = this.originalStarted;
    exports.config.configRefreshRate = this.originalConfig;
    exports.unbind('cache-reset', this.resetSpy);
  });

  describe('#isPopulated', function() {
    it('should return false with no loadTime', function() {
      var original = appVersion.loadTime;
      delete appVersion.loadTime;

      expect(appVersion.isPopulated()).to.be.false;
      if (original) {
        appVersion.loadTime = original;
      }
    });

    it('should return false if expired', function() {
      appVersion.loadTime = Date.now();
      this.clock.tick(exports.config.configRefreshRate);

      expect(appVersion.isPopulated()).to.be.false;
    });

    it('should return true if config is invalid', function() {
      appVersion.loadTime = Date.now();
      this.clock.tick(1);

      exports.config.configRefreshRate = 'foo';
      expect(appVersion.isPopulated()).to.be.false;
    });

    it('should return true if refresh is a string', function() {
      exports.config.configRefreshRate = '100';

      appVersion.loadTime = Date.now();
      this.clock.tick(99);

      expect(appVersion.isPopulated()).to.be.true;
    });

    it('should return true if refresh is 0 string', function() {
      exports.config.configRefreshRate = '0';

      appVersion.loadTime = Date.now();
      this.clock.tick(99);

      expect(appVersion.isPopulated()).to.be.true;
    });

    it('should not triger under 5 minutes', function() {
      exports.config.configRefreshRate = '100';

      appVersion.loadTime = Date.now();
      this.clock.tick(5 * 60 * 1000 - 1);

      expect(appVersion.isPopulated()).to.be.true;
    });

    it('should return true if not expired', function() {
      appVersion.loadTime = Date.now();
      this.clock.tick(exports.config.configRefreshRate - 1);

      expect(appVersion.isPopulated()).to.be.true;
    });

    it('should return true if expiration is disabled', function() {
      appVersion.loadTime = Date.now();

      exports.config.configRefreshRate = 0;
      this.clock.tick(1000);
      expect(appVersion.isPopulated()).to.be.true;

      exports.config.configRefreshRate = undefined;
      this.clock.tick(1000);
      expect(appVersion.isPopulated()).to.be.true;
    });
  });

  describe('cache-reset', function() {
    it('should trigger on changed value', function() {
      this.stub(LocalCache, 'get', function() { return '1234'; });
      appVersion.set('clearClientCache', '1234', {silent: true});

      appVersion.set('clearClientCache', '1234');
      expect(this.resetSpy).to.not.have.been.called;
      expect(LocalCache.store).to.not.have.been.called;

      appVersion.set('clearClientCache', '12345');
      expect(this.resetSpy).to.have.been.calledOnce;
      expect(LocalCache.store).to.have.been.calledOnce;
    });

    it('should cause url load', function() {
      var fragment = 'foo';
      this.stub(Backbone.history, 'getFragment', function() { return fragment; });

      Backbone.history.started = false;
      exports.trigger('cache-reset');
      expect(Backbone.history.loadUrl).to.not.have.been.called;

      Backbone.history.started = true;
      exports.trigger('cache-reset');
      expect(Backbone.history.loadUrl).to.have.been.calledOnce;

      fragment = 'checkout/place';
      exports.trigger('cache-reset');
      expect(Backbone.history.loadUrl).to.have.been.calledOnce;

      fragment = 'photo/bar';
      exports.trigger('cache-reset');
      expect(Backbone.history.loadUrl).to.have.been.calledOnce;
    });
  });
});

;;
/*global Authentication, Connection, authentication:true */
describe('connection/authentication', function() {
  var model, options, success, error;
  beforeEach(function() {
    model = new Thorax.Model();
    options = {authed: true};
    success = options.success = this.spy();
    error = options.error = this.spy();

    this.authentication = authentication;
    authentication = new Authentication();
    authentication.set('loggedIn', true);
  });
  afterEach(function() {
    authentication = this.authentication;
  });

  describe('authenticated', function() {
    beforeEach(function() {
      authentication.set('loggedIn', true);
    });

    it('should not short circuit auth required', function() {
      Connection.ajax.call(model, options);
      this.requests[0].respond(200, {}, '{}');

      expect(success).to.have.been.called;
      expect(error).to.not.have.been.called;
    });
    it('should record authed', function() {
      this.stub(authentication, 'sessionActivity');

      Connection.ajax.call(model, options);
      this.requests[0].respond(200, {}, '{}');

      expect(authentication.sessionActivity).to.have.been.calledWith(true);
      expect(success).to.have.been.called;
      expect(error).to.not.have.been.called;
    });
    it('should record auth expired', function() {
      var event;
      this.stub(exports, 'trackError');
      this.stub(authentication, 'sessionExpired');
      this.on(Connection, 'start', function(_event) { event = _event; });

      authentication.sessionId = 1;

      Connection.ajax.call(model, options);
      event.status = Connection.SESSION_EXPIRED;
      this.requests[0].respond(200, {}, '{}');

      expect(authentication.sessionExpired).to.have.been.calledWith(1);
      expect(success).to.not.have.been.called;
      expect(error).to.have.been.called;
    });
  });
  describe('unauthenticated', function() {
    beforeEach(function() {
      authentication.set('loggedIn', false);
    });

    it('should short circuit auth required', function() {
      this.stub(exports, 'trackError');

      Connection.ajax.call(model, options);
      expect(this.requests.length).to.equal(0);

      expect(success).to.not.have.been.called;
      expect(error).to.have.been.called;
      expect(exports.trackError).to.have.been.calledWith('auth-expired');
    });
    it('should record auth expired', function() {
      var event;
      this.stub(exports, 'trackError');
      this.stub(authentication, 'sessionExpired');
      this.on(Connection, 'start', function(_event) { event = _event; });

      options.authed = false;

      Connection.ajax.call(model, options);
      event.status = Connection.SESSION_EXPIRED;
      this.requests[0].respond(200, {}, '{}');

      expect(authentication.sessionExpired).to.not.have.been.called;
      expect(success).to.not.have.been.called;
      expect(error).to.have.been.called;
    });
  });
  describe('unknown', function() {
    beforeEach(function() {
      authentication.unset('loggedIn');
    });

    it('should not short circuit auth required', function() {
      Connection.ajax.call(model, options);
      this.requests[0].respond(200, {}, '{}');

      expect(success).to.have.been.called;
      expect(error).to.not.have.been.called;
    });
    it('should record authed', function() {
      this.stub(authentication, 'sessionActivity');

      Connection.ajax.call(model, options);
      this.requests[0].respond(200, {}, '{}');

      expect(authentication.sessionActivity).to.have.been.calledWith(true);
      expect(success).to.have.been.called;
      expect(error).to.not.have.been.called;
    });

    it('should record auth expired', function() {
      var event;
      this.stub(exports, 'trackError');
      this.stub(authentication, 'sessionExpired');
      this.on(Connection, 'start', function(_event) { event = _event; });

      options.authed = false;

      Connection.ajax.call(model, options);
      event.status = Connection.SESSION_EXPIRED;
      this.requests[0].respond(200, {}, '{}');

      expect(authentication.sessionExpired).to.have.been.called;
      expect(success).to.not.have.been.called;
      expect(error).to.have.been.called;
    });
  });
});

;;
/*global Authentication, LocalCache, authentication:true */
describe('authentication', function() {
  beforeEach(function() {
    this.authentication = authentication;
    authentication = new Authentication();
    authentication.sessionActivity(true);
  });
  afterEach(function() {
    authentication = this.authentication;
  });

  describe('lastUserName', function() {
    it('should load the last user name', function() {
      this.stub(LocalCache, 'get', function() { return 'a name!'; });
      authentication = new Authentication();
      expect(authentication.lastUserName).to.equal('a name!');
    });
    it('should save the last user name', function() {
      this.stub(LocalCache, 'store');
      authentication.setLastUserName('another name!');
      expect(LocalCache.store).to.have.been.calledWith('lastUserName', 'another name!');
    });
  });

  describe('session timeout', function() {
    it('should return to unknown state after timeout', function() {
      expect(authentication.isAuthed()).to.be.true;
      this.clock.tick(authentication.SESSION_DURATION + 1);
      expect(authentication.isAuthed()).to.be.undefined;

      authentication.sessionActivity(false);
      expect(authentication.isAuthed()).to.be.false;
      this.clock.tick(authentication.SESSION_DURATION + 1);
      expect(authentication.isAuthed()).to.be.undefined;
    });
    it('should update last access time', function() {
      expect(authentication.lastAccessTime).to.equal(10);
      this.clock.tick(10);
      authentication.sessionActivity();
      expect(authentication.lastAccessTime).to.equal(20);
    });
  });

  describe('#sessionExpired', function() {
    it('should update sessionId', function() {
      var sessionId = authentication.sessionId;
      authentication.sessionExpired(authentication.sessionId);
      expect(authentication.sessionId).to.equal(sessionId + 1);
    });
    it('should trigger session-expired', function() {
      var spy = this.on(authentication, 'session-expired');

      authentication.sessionExpired(authentication.sessionId);
      expect(spy).to.have.been.calledOnce;
    });
    it('should not trigger session-expired', function() {
      var spy = this.on(authentication, 'session-expired');

      authentication.sessionExpired(authentication.sessionId - 1);
      expect(spy).to.not.have.been.called;
    });
  });

  describe('#sessionActivity', function() {
    it('should ignore unknown state', function() {
      var spy = this.on(authentication, 'session-activity');
      authentication.sessionActivity();
      expect(spy).to.not.have.been.called;
    });
    it('should trigger without change', function() {
      var activitySpy = this.on(authentication, 'session-activity'),
          changeSpy = this.on(authentication, 'change');

      authentication.sessionActivity(authentication.isAuthed());
      expect(activitySpy).to.have.been.calledOnce;
      expect(changeSpy).to.not.have.been.called;
      expect(authentication.isAuthed()).to.be.true;
    });
    it('should trigger loggedin', function() {
      authentication.set('loggedIn', false);

      var activitySpy = this.on(authentication, 'session-activity'),
          changeSpy = this.on(authentication, 'change');

      authentication.sessionActivity(!authentication.isAuthed());
      expect(activitySpy).to.have.been.calledOnce;
      expect(changeSpy).to.have.been.calledOnce;
      expect(authentication.isAuthed()).to.be.true;
    });
    it('should trigger loggedout', function() {
      var activitySpy = this.on(authentication, 'session-activity'),
          changeSpy = this.on(authentication, 'change');

      authentication.sessionActivity(!authentication.isAuthed());
      expect(activitySpy).to.have.been.calledOnce;
      expect(changeSpy).to.have.been.calledOnce;
      expect(authentication.isAuthed()).to.be.false;
    });
  });
});

;;
/*global Validate, View */
describe('validate-thorax', function() {
  it('should execute validation methods', function() {
    this.stub(Validate, 'validate', function() { return [ 1, 2 ]; });

    var view = new View();
    view.model = {
      validateInput: this.spy(function() { return [ 3, 4 ]; }),
      validation: this.spy(function() { return validation; })
    };
    view.validation = this.spy(function() { return validation; });

    var attributes = {},
        errors = [ 5, 6 ],
        validation = {};
    view.trigger('validate', attributes, errors);

    expect(view.validation).to.have.been.calledOnce;
    expect(view.model.validation).to.have.been.calledOnce;
    expect(view.model.validateInput).to.have.been.calledOnce
        .to.have.been.calledWith(attributes);

    expect(Validate.validate).to.have.been.calledTwice
        .to.have.been.calledWith(attributes, validation);

    expect(errors).to.eql([ 5, 6, 3, 4, 1, 2, 1, 2 ]);
  });
});

;;
/*global Connection */
describe('error view', function() {
  function test(name) {
    return function() {
      this.stub(Phoenix, 'setView');

      exports.trigger('fatal-error', name);
      expect(Phoenix.setView).to.have.been.calledOnce;
      expect(Phoenix.setView.args[0][0].name).to.equal('error');
    };
  }
  it('should display on HTTP_ERROR', test(Connection.HTTP_ERROR));
  it('should display on TIMEOUT_ERROR', test(Connection.TIMEOUT_ERROR));
  it('should display on CONNECTION_ERROR', test(Connection.CONNECTION_ERROR));
  it('should display on PARSER_ERROR', test(Connection.PARSER_ERROR));
  it('should display on MAINTENANCE_ERROR', test(Connection.MAINTENANCE_ERROR));
  it('should display on UNKNOWN_ERROR', test(Connection.UNKNOWN_ERROR));
});

;;
/*global i18n */
describe('i18n', function() {
  beforeEach(function() {
    this.i18n = i18n.dictionary;
    this.locale = i18n.getLocale();

    i18n.dictionary = {
      'foo': 'bar',
      'foo[0]': 'bar none',
      'foo[1]': 'bar one',
      'foo[2]': 'bar two',
      'foo[few]': 'bar few',
      'foo[many]': 'bar many',
      'few[few]': 'few (transformed)',
      'many[many]': 'many (transformed)',
      'hello': 'hello {{name}}',
      'hello[0]': 'hello none {{name}}',

      '_locale': {
        'es': {
          'hello': 'hola {{name}}',
          'foo': 'el bar'
        },
        'es-mx': {
          'foo': 'el bar-mx'
        }
      }
    };
  });
  afterEach(function() {
    i18n.dictionary = this.i18n;
    i18n.setLocale(this.locale && this.locale.language, this.locale && this.locale.country);
  });

  it('No Plurality', function() {
    expect(i18n('baz')).to.equal('baz');
    expect(i18n('foo')).to.equal('bar');
  });

  it('Default value', function() {
    expect(i18n('baz', -1, 'bar')).to.equal('bar');
  });

  it('Dynamic', function() {
    // dynamic
    expect(i18n.call({name: 'Joe'}, 'hello')).to.equal('hello {{name}}');
  });

  it('Expand Token', function() {
    expect(i18n.call({name: 'Joe'}, 'hello', {'expand-tokens': true})).to.equal('hello Joe');
    expect(i18n.call({name: 'Joe'}, 'hello', {hash: {'expand-tokens': true}})).to.equal('hello Joe');
    expect(i18n.call({name: 'Joe'}, 'hello', -1, {hash: {'expand-tokens': true}})).to.equal('hello Joe');
    expect(i18n.call({name: 'Joe'}, 'hello', -1, 'foo', {hash: {'expand-tokens': true}})).to.equal('hello Joe');
  });

  it('Expand token with multiple tokens', function() {
    expect(i18n.call({name: 'Joe', value: 'Tester'}, '{{name}} {{value}}', {'expand-tokens': true})).to.equal('Joe Tester');
  });

  it('Expand tokens only operates one level', function() {
    expect(i18n.call({name: 'J{{oh}}e', oh: 'fuck'}, 'hello', {'expand-tokens': true})).to.equal('hello J{{oh}}e');
  });

  it('Static Plurality', function() {
    expect(i18n('foo', 0)).to.equal('bar none');
    expect(i18n('foo', 1)).to.equal('bar one');
    expect(i18n('foo', 2)).to.equal('bar two');
    expect(i18n('foo', 3)).to.equal('bar few');
    expect(i18n('foo', 10)).to.equal('bar many');
  });

  it('Few Fallbacks', function() {
    expect(i18n('few', 0)).to.equal('few (transformed)');
    expect(i18n('few', 1)).to.equal('few');
    expect(i18n('few', 2)).to.equal('few (transformed)');
    expect(i18n('few', 10)).to.equal('few');
  });

  it('Many Fallbacks', function() {
    expect(i18n('many', 0)).to.equal('many (transformed)');
    expect(i18n('many', 1)).to.equal('many');
    expect(i18n('many', 2)).to.equal('many (transformed)');
    expect(i18n('many', 3)).to.equal('many (transformed)');
  });

  it('locale', function() {
    i18n.setLocale('es', 'mx'); // spanish language, mexico country

    expect(i18n.call({name: 'Joe'}, 'hello')).to.equal('hola {{name}}');
    expect(i18n.call({name: 'Joe'}, 'hello', {hash: {'expand-tokens': true}})).to.equal('hola Joe');
    expect(i18n('foo')).to.equal('el bar-mx');
  });
});

;;
/*global Connection */
describe('404 router', function() {
  it('should display on NOT_FOUND_ERROR', function() {
    this.stub(Phoenix, 'setView');

    exports.trigger('fatal-error', Connection.NOT_FOUND_ERROR);
    expect(Phoenix.setView).to.have.been.calledOnce;
    expect(Phoenix.setView.args[0][0].name).to.equal('error-not-found');
  });
});

;;
/*global Collection, Model, View */
describe('data-preview', function() {
  var view,
      model,
      collection;
  beforeEach(function() {
    view = new View({template: function() { return ''; }});
    model = new Model();
    model.id = 1234;
    model.previewClass = 'order';

    collection = new Collection([model]);
    collection.previewClass = 'law';

    this.stub(exports, 'getView', function() { return view; });
  });

  it('should lookup model', function() {
    view.setModel(model);

    expect(Model.fromCurrent(1234)).to.equal(model);
    expect(Model.fromCurrent(12345)).to.not.exist;
  });
  it('should lookup any model', function() {
    view.bindDataObject('model', model);

    expect(Model.fromCurrent(1234)).to.equal(model);
  });
  it('should lookup from collection', function() {
    view.setCollection(collection);

    expect(Model.fromCurrent(1234)).to.equal(model);
    expect(Model.fromCurrent(12345)).to.not.exist;
  });
  it('should lookup from any collection', function() {
    view.bindDataObject('collection', collection);

    expect(Model.fromCurrent(1234)).to.equal(model);
    expect(Model.fromCurrent(12345)).to.not.exist;
  });

  it('should honor model previewClass', function() {
    view.setModel(model);

    expect(Model.fromCurrent(1234, 'order')).to.equal(model);
    expect(Model.fromCurrent(1234, 'law')).to.not.exist;
  });
  it('should honor collection previewClass', function() {
    view.setCollection(collection);

    expect(Model.fromCurrent(1234, 'order')).to.equal(model);
    expect(Model.fromCurrent(1234, 'law')).to.equal(model);
    expect(Model.fromCurrent(1234, 'foo')).to.not.exist;
  });

  it('should walk into non-helper child views', function() {
    this.spy(View.prototype, 'lookupModel');

    var subView = new View({model: model, template: function() { return ''; }});
    view._addChild(subView);

    Handlebars.helpers.collection({hash: {}, data: {view: view}});
    expect(_.keys(view.children).length).to.equal(2);

    // Expection of 2 due to early termination here
    expect(Model.fromCurrent(1234)).to.equal(model);
    expect(View.prototype.lookupModel).to.have.been.calledTwice;

    // Expectation of 2 (more) due to filtering of helper views
    expect(Model.fromCurrent('not found')).to.not.exist;
    expect(View.prototype.lookupModel.callCount).to.equal(4);
  });

  it('should load immediate values from helpers', function() {
    this.spy(View.prototype, 'lookupModel');

    var subView = new View({template: function() { return ''; }});
    view._addChild(subView);

    Handlebars.helpers.collection({hash: {}, data: {view: view}});
    expect(_.keys(view.children).length).to.equal(2);
    _.values(view.children)[1]._boundDataObjectsByCid[1] = model;

    // Expection of 2 due to early termination here
    expect(Model.fromCurrent(1234)).to.equal(model);
    expect(View.prototype.lookupModel).to.have.been.calledTwice;
  });
});

;;
describe('Dialog', function() {
  beforeEach(function() {
    Phoenix.Dialog.open(new (Phoenix.View.extend({render: function(){}}))());
  });

  afterEach(function() {
    Phoenix.Dialog.close();
  });

  describe('#open', function() {
    it('should add full-screen-view class and dialog div to body', function() {
      expect($('body').hasClass('full-screen-view')).to.be.true;
      expect($('body').children('[data-view-name="dialog"]').length).to.equal(1);
    });

    it('should clean up after close', function() {
      Phoenix.Dialog.close();

      expect($('body').hasClass('full-screen-view')).to.be.false;
      expect($('body').children('[data-view-name="dialog"]').length).to.equal(0);
    });

    it('should close on change:view:start event', function() {
      Phoenix.trigger('change:view:start');

      expect($('body').hasClass('full-screen-view')).to.be.false;
      expect($('body').children('[data-view-name="dialog"]').length).to.equal(0);
    });
  });
});

;;
/*global FIELD_ERROR_CLASS, Collection, Model, View, applyErrors, i18n, markErrorState, sortErrors */
describe('error-handler: core', function() {
  var fixture;
  beforeEach(function() {
    fixture = $('<div>');
    fixture.html(
      '<input name="foo" aria-label="5">'
      + '<textarea id="bar" name="bar"></textarea>'
      + '<label for="bar">7</label>'
      + '<label>'
        + '6'
        + '<select name="baz"></select>'
      + '</label>');
    $('#qunit-fixture').append(fixture);
  });
  afterEach(function() {
    fixture.remove();
  });

  function state() {
    return fixture.children().map(function() {
      return $(this).hasClass(FIELD_ERROR_CLASS);
    });
  }

  describe('error propagation', function() {
    it('should propagate errors up the stack', function() {
      var view = new View(),
          child = new View(),
          grandChild = new View(),
          spy = this.spy();

      child.errorHandler = this.spy();
      child._addChild(grandChild);
      view._addChild(child);

      child.on('error', spy);
      view.on('error', spy);

      grandChild.trigger('error', []);
      expect(spy).to.have.been.calledTwice;
      expect(child.errorHandler).to.have.been.calledOnce;
    });
    it('should stop error propagation if handled', function() {
      var view = new View(),
          child = new View(),
          grandChild = new View(),
          spy = this.spy();

      child.errorHandler = this.spy(function() { return false; });
      child._addChild(grandChild);
      view._addChild(child);

      child.on('error', spy);
      view.on('error', spy);

      grandChild.trigger('error', []);
      expect(spy).to.have.been.calledOnce;
      expect(child.errorHandler).to.have.been.calledOnce;
    });

    it('should handle forwarded collection errors', function() {
      var collection = new Collection(),
          view = new View({template: function() { return ''; }}),
          spy = this.spy();
      view.on('error', spy);
      view.bindDataObject('collection', collection);
      collection.trigger('error', collection, '1234');

      expect(spy)
          .to.have.been.calledOnce
          .to.have.been.calledWith('1234', collection);
    });
    it('should handle forwarded model errors', function() {
      var model = new Model(),
          view = new View({template: function() { return ''; }}),
          spy = this.spy();
      view.on('error', spy);
      view.bindDataObject('model', model);
      model.trigger('error', model, '1234');

      expect(spy)
          .to.have.been.calledOnce
          .to.have.been.calledWith('1234', model);
    });
  });

  describe('#applyErrors', function() {
    it('should handle non-field messages', function() {
      expect(applyErrors(fixture, [
          {message: 'foo!'}
        ])).to.eql({messages: ['foo!']});
      expect(state()).to.eql([false, false, false, false]);
    });
    it('should handle field messages', function() {
      expect(applyErrors(fixture, [
          {message: 'foo!', name: 'bar'}
        ])).to.eql({messages: ['foo!']});
      expect(state()).to.eql([false, true, true, false]);
    });
    it('should handle formated field messages', function() {
      expect(applyErrors(fixture, [
          {message: {format: 'foo!{{attribute}}'}, name: 'bar'}
        ])).to.eql({messages: ['foo!7']});
      expect(state()).to.eql([false, true, true, false]);
    });
    it('should handle multiple field messages', function() {
      expect(applyErrors(fixture, [
          {message: 'first!'},
          {message: {format: 'foo!{{attribute}}'}, name: ['foo', 'bar']},
          {message: {format: 'foo!{{attribute}}'}, name: ['bar', 'foo']}
        ])).to.eql({messages: ['first!', 'foo!5', 'foo!5']});
      expect(state()).to.eql([true, true, true, false]);
    });
    it('should handle counts', function() {
      var _dictionary = i18n.dictionary;
      i18n.dictionary = {
        'foo': 'YOU FAILED!',
        'foo[1]': 'YOU WIN!'
      };

      expect(applyErrors(fixture, [{message: {format: 'foo', count: 1}}]))
          .to.eql({messages: ['YOU WIN!']});
      i18n.dictionary = _dictionary;
    });
  });

  describe('field error state', function() {
    it('should mark fields as errored', function() {
      expect($('input,textarea,select', fixture).map(function() {
          return markErrorState(this);
        })).to.eql(['5', '7', '6']);
      expect(state()).to.eql([true, true, true, true]);
    });
    it('should toggle error state on edit', function() {
      // Create a view for error handling here
      new View({el: fixture});

      fixture.children().addClass(FIELD_ERROR_CLASS);
      expect(state()).to.eql([true, true, true, true]);

      fixture.find('[name=bar]').trigger('change');
      expect(state()).to.eql([true, false, false, true]);

      fixture.find('[name=baz]').trigger('keypress');
      expect(state()).to.eql([true, false, false, false]);
    });
  });

  describe('#sortErrors', function() {
    it('should sort errors by DOM order', function() {
      expect(sortErrors(fixture, [{name: 'foo'}, {name: 'bar'}, {name: 'baz'}]))
          .to.eql([{name: 'foo'}, {name: 'bar'}, {name: 'baz'}]);
      expect(sortErrors(fixture, [{name: 'baz'}, {name: 'foo'}, {name: 'bar'}]))
          .to.eql([{name: 'foo'}, {name: 'bar'}, {name: 'baz'}]);
    });
    it('should sort multiple field errors based on the first entry', function() {
      expect(sortErrors(fixture, [{name: 'foo'}, {name: 'bar'}, {name: ['baz', 'foo']}]))
          .to.eql([{name: 'foo'}, {name: ['foo', 'baz']}, {name: 'bar'}]);
    });
    it('should put missing errors at the top', function() {
      expect(sortErrors(fixture, [{name: 'baz'}, {name: 'foo'}, {name: 'bat'}]))
          .to.eql([{name: 'bat'}, {name: 'foo'}, {name: 'baz'}]);
    });
  });
});

;;
/*global View, i18n */
describe('error-handler: alert', function() {
  beforeEach(function() {
    this.stub(Phoenix, 'alert');
  });

  it('should do nothing on separate views', function() {
    var view = new View();
    view.trigger('error');
    expect(Phoenix.alert).to.not.have.been.called;
  });
  it('should handle errors on activated views', function() {
    var view = new View();
    view.trigger('activated');
    view.trigger('error', []);
    expect(Phoenix.alert).to.have.been.called;
  });
  it('should handle child errors', function() {
    var view = new View(),
        child = new View();
    view._addChild(child);

    view.trigger('activated');
    child.trigger('error', []);
    expect(Phoenix.alert).to.have.been.called;
  });

  it('should show title', function() {
    var view = new View();
    view.trigger('activated');
    view.trigger('error', [{title: 'foo'}]);
    expect(Phoenix.alert).to.have.been.called;
    expect(Phoenix.alert.args[0][0].title).to.equal('foo');
  });
  it('should i18n title', function() {
    var _dictionary = i18n.dictionary;
    i18n.dictionary = {
      'foo': 'YOU FAILED!',
      'foo[1]': 'YOU WIN!'
    };

    var view = new View();
    view.trigger('activated');
    view.trigger('error', [{title: {format: 'foo', count: 1}}]);
    expect(Phoenix.alert).to.have.been.called;
    expect(Phoenix.alert.args[0][0].title).to.equal('YOU WIN!');
    i18n.dictionary = _dictionary;
  });
});

;;
/*global i18n:true */
describe('input helpers', function() {
  var os = $.os,
      _i18n = i18n,
      input = Handlebars.helpers.input,
      textarea = Handlebars.helpers.textarea,
      select = Handlebars.helpers.select;

  beforeEach(function() {
    var counter = 0;
    this.stub(_, 'uniqueId', function() { return 'foo' + counter++; });
  });
  afterEach(function() {
    $.os = os;
    i18n = _i18n;   // Sinon can not autowire module vars easily
  });

  describe('input helper', function() {
    describe('input type="text"', function() {
      it('should output text type', function() {
        expect(input({hash: {type: 'text', 'form-field': false}}).toString()).to.eql(
            '\n<input type="text" id="foo0">');
        expect(input({hash: {'form-field': false}}).toString()).to.eql(
            '\n<input type="text" id="foo1">');
      });

      it('should output labels', function() {
        i18n = this.mock();
        i18n.once()
            .withArgs('not i18n')
            .returns('i18n!');

        expect(input({hash: {label: 'not i18n'}}).toString()).to.eql(
            '<div class="form-field  text">'
              + '<label class="text-label" for="foo0">i18n!</label>'
              + '\n<input type="text" id="foo0" placeholder="i18n!">'
            + '</div>');
      });
    });

    describe('input type="number"', function() {
      it('should use pattern for ios', function() {
        $.os = {ios: true};
        expect(input({hash: {type: 'number', 'form-field': false}}).toString()).to.eql(
            '\n<input type="text" pattern="[0-9]*" id="foo0">');
      });
      it('should use number for android', function() {
        $.os = {android: true};
        expect(input({hash: {type: 'number', 'form-field': false}}).toString()).to.eql(
            '\n<input type="number" pattern="[0-9]*" id="foo0">');
      });
    });

    describe('input type="password"', function() {
      it('should disable auto fields', function() {
        expect(input({hash: {type: 'password', 'form-field': false}}).toString()).to.eql(
            '\n<input type="password" autocapitalize="off" autocomplete="off" autocorrect="off" id="foo0">');
      });
    });

    describe('input type="checkbox"', function() {
      it('should output text type', function() {
        expect(input({hash: {type: 'checkbox', 'form-field': false}}).toString()).to.eql(
            '\n<input type="checkbox" id="foo0">');
      });

      it('should output labels', function() {
        i18n = this.mock();
        i18n.once()
            .withArgs('not i18n')
            .returns('i18n!');

        expect(input({hash: {type: 'checkbox', label: 'not i18n'}}).toString()).to.eql(
            '<div class="form-field  checkbox">'
              + '\n<input type="checkbox" id="foo0" placeholder="i18n!">'
              + '<label class="text-label" for="foo0">i18n!</label>'
            + '</div>');
      });
    });

    describe('input type="radio"', function() {
      it('should output text type', function() {
        expect(input({hash: {type: 'radio', 'form-field': false}}).toString()).to.eql(
            '\n<input type="radio" id="foo0">');
      });

      it('should output labels', function() {
        i18n = this.mock();
        i18n.once()
            .withArgs('not i18n')
            .returns('i18n!');

        expect(input({hash: {type: 'radio', label: 'not i18n'}}).toString()).to.eql(
            '<div class="form-field  radio">'
              + '\n<input type="radio" id="foo0" placeholder="i18n!">'
              + '<label class="text-label" for="foo0">i18n!</label>'
            + '</div>');
      });
    });

    describe('textarea', function() {
      it('should output textareas', function() {
        expect(input({hash: {type: 'textarea', 'form-field': false}}).toString()).to.eql(
            '\n<textarea id="foo0"></textarea>');
        expect(textarea({hash: {'form-field': false}}).toString()).to.eql(
            '\n<textarea id="foo1"></textarea>');
      });
    });

    describe('select', function() {
      it('should output selects', function() {
        expect(select({hash: {name: 'foo', 'form-field': false}, fn: function(){ return 'abcd'; }}).toString()).to.eql(
            '\n<select name="foo" id="foo0">abcd</select>');
        expect(select({hash: {name: 'foo', 'form-field': false}}).toString()).to.eql(
            '\n<select name="foo" id="foo1"></select>');
      });

      var items = [{id: '1', name: 'foo', key: '2', foo: 'bar'}];
      it('should output select options from a list', function() {
        expect(select({hash: {options: items, 'form-field': false}}).toString()).to.eql(
            '\n<select id="foo0"><option value="1">foo</option></select>');
        expect(select({hash: {options: items, valueProp: 'key', displayProp: 'foo', 'form-field': false}}).toString()).to.eql(
            '\n<select id="foo1"><option value="2">bar</option></select>');
      });

      it('should check the appropriate option', function() {
        expect(select({hash: {options: items, value: "1", 'form-field': false}}).toString()).to.eql(
            '\n<select id="foo0"><option value="1" selected>foo</option></select>');
        expect(select({hash: {options: items, valueProp: 'key', displayProp: 'foo', value: "2", 'form-field': false}}).toString()).to.eql(
            '\n<select id="foo1"><option value="2" selected>bar</option></select>');
        expect(select({hash: {options: items, value: items[0], 'form-field': false}}).toString()).to.eql(
            '\n<select id="foo2"><option value="1" selected>foo</option></select>');
      });
    });
  });
});

;;
/*global i18n:true */
describe('tel', function() {
  var tel = Handlebars.helpers.tel;

  it('should output block content if available', function() {
    expect(tel('1234567890', {fn: function() {return 'foo';}}).toString()).to.eql(
        '<a href="tel:1234567890">foo</a>');
    expect(tel('(123) 456 - 7890', {}).toString()).to.eql(
        '<a href="tel:1234567890">(123) 456 - 7890</a>');
  });
});

;;
describe('link-wrapper helper', function() {
  var linkWrapper = Handlebars.helpers['link-wrapper'],
      url = Handlebars.helpers.url;

  function options(hash, content) {
    return {
      hash: hash,
      fn: function() {
        return content || 'foo';
      }
    };
  }

  describe('link-wrapper', function() {
    it('should output the input w/o changes', function() {
      expect(linkWrapper(options({})).toString()).to.eql('foo');
    });
  });

  describe('link-wrapper altTagName="bar"', function() {
    it('should output the input wrapped in "bar" tag', function() {
      expect(linkWrapper(options({altTagName: 'bar'})).toString()).to.eql('<bar>foo</bar>');
    });

    it('should output the input wrapped in "bar" tag, with class name', function() {
      expect(linkWrapper(options({altTagName: 'bar', className: 'foo-class'})).toString()).to.eql(
          '<bar class="foo-class">foo</bar>');
    });
  });

  describe('link-wrapper isLink=true', function() {
    it('should output the input wrapped in anchor tag', function() {
      expect(linkWrapper(options({isLink: true, url: 'foo-link'})).toString()).to.eql(
          '<a href="' + url('foo-link') + '">foo</a>');
    });

    it('should output the input wrapped in in anchor tag, with class name', function() {
      expect(linkWrapper(options({isLink: true, url: 'foo-link', className: 'foo-class'})).toString()).to.eql(
          '<a href="' + url('foo-link') + '" class="foo-class">foo</a>');
    });

    it('should output the input wrapped in in anchor tag, with class name, if url is undefined', function() {
      expect(linkWrapper(options({isLink: true, url: undefined, className: 'foo-class'})).toString()).to.eql(
          '<a href="' + url(undefined) + '" class="foo-class">foo</a>');
    });

    it('should output the input wrapped in in anchor tag, with class name, if url is empty', function() {
      expect(linkWrapper(options({isLink: true, url: '', className: 'foo-class'})).toString()).to.eql(
          '<a href="' + url('') + '" class="foo-class">foo</a>');
    });
  });
});

;;
describe('load-view helper', function() {
  it('should display loading view until "loaded" event is triggered, thed display main view', function() {
    var mainView = new Phoenix.View({ template: function() {return "";} }),
        loadingView = new Phoenix.View({ template: function() {return "";} }),
        view = new Phoenix.View({
          template: Thorax.templates['test/templates/load-view-test'],
          mainView: mainView,
          loadingView: loadingView
        });

    // make the view look like it is currently loading
    mainView._isLoading = true;
    view.render();
    expect(view.$el.children()[0]).to.equal(loadingView.el);
    mainView.trigger('loaded');
    expect(view.$el.children()[0]).to.equal(mainView.el);
  });

  it('should display main view if it has already been loaded', function() {
    var mainView = new Phoenix.View({ template: function() {return "";} }),
        loadingView = new Phoenix.View({ template: function() {return "";} }),
        view = new Phoenix.View({
          template: Thorax.templates['test/templates/load-view-test'],
          mainView: mainView,
          loadingView: loadingView
        });

    view.render();
    expect(view.$el.children()[0]).to.equal(mainView.el);
  });
});

;;
Thorax.templates['test/templates/load-view-test'] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [2,'>= 1.0.0-rc.3'];
helpers = helpers || Handlebars.helpers; data = data || {};
  var buffer = "", escapeExpression=this.escapeExpression;


  buffer += escapeExpression(helpers['load-view'].call(depth0, depth0.mainView, {hash:{
    'loading-view': (depth0.loadingView)
  },data:data}))
    + "\n";
  return buffer;
  });/*global Data */
describe('price helper', function() {
  var price = function(price) {
    var ret = Handlebars.helpers.price(price);
    if (ret) {
      expect(ret).to.be.an.instanceof(SafeString);
    }
    return ret.toString();
  };

  beforeEach(function() {
    Phoenix.config.currencySymbol = '$';
  });
  it('should handle empty', function() {
    expect(price(undefined)).to.equal('');
    expect(price(NaN)).to.be.equal('');
    expect(price('')).to.be.equal('');
  });

  it('should handle floats', function() {
    expect(price(1234.56)).to.equal('$1234.<span class="decimal">56</span>');
  });
  it('should format arbitrary decimal (including zero)', function() {
    expect(price(123.456)).to.be.equal('$123.<span class="decimal">46</span>');
    expect(price(0)).to.be.equal('$0.<span class="decimal">00</span>');
  });

  it('should handle numeric strings', function() {
    expect(price('  1234.56  ')).to.equal('$1234.<span class="decimal">56</span>');
    expect(price('1234.56')).to.equal('$1234.<span class="decimal">56</span>');
    expect(price('$1234.56')).to.equal('$1234.<span class="decimal">56</span>');
    expect(price('$1,234.56')).to.equal('$1,234.<span class="decimal">56</span>');
  });

  it('should handle tagged strings', function() {
    expect(price('   From $1,234.56   ')).to.equal('   From $1,234.<span class="decimal">56</span>   ');
  });
  it('should handle multiple strings', function() {
    expect(price('$5.00-$200.00')).to.equal('$5.<span class="decimal">00</span> - $200.<span class="decimal">00</span>');
    expect(price('$5.00 -   $200.00')).to.equal('$5.<span class="decimal">00</span> - $200.<span class="decimal">00</span>');
  });

  it('should handle other currency symbols', function() {
    Phoenix.config.currencySymbol = '£';
    expect(price(123.456)).to.be.equal('£123.<span class="decimal">46</span>');
    expect(price('£1,234.56')).to.equal('£1,234.<span class="decimal">56</span>');
  });
});

;;
};


  if (Phoenix !== module.exports) {
    console.warn("Phoenix internally differs from global");
  }
  return module.exports;
}).call(this, Handlebars);

//@ sourceMappingURL=base.js.map
