var ReMap;
ReMap = (function() {
  var module = {exports: {}};
  var exports = module.exports;
  var ReMap = exports;

  /*global Loader*/

// Provide uniform access to module map from the remap module.
exports.moduleMap = Loader.moduleMap;

;;
/* lumbar module map */
exports.moduleMap({"base":{"css":[{"href":"base.css","maxRatio":1.5},{"href":"base@2x.css","minRatio":1.5}],"js":"base.js"},"modules":{"browse-search":{"depends":["locationCore"],"js":"browse-search.js"},"loader":{"js":"loader.js"},"locationCore":{"js":"locationCore.js"},"remap":{"js":"remap.js"},"test":{"css":[{"href":"test.css","maxRatio":1.5},{"href":"test@2x.css","minRatio":1.5}],"js":"test.js"}},"routes":{"search/:searchTerms":"browse-search"}});
exports.tests = function() {
};


  if (ReMap !== module.exports) {
    console.warn("ReMap internally differs from global");
  }
  return module.exports;
}).call(this);

//@ sourceMappingURL=remap.js.map
