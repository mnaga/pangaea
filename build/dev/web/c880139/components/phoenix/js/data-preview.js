/*global Model */
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
