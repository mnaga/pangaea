window.trackedEvents = [];

exports.track = function(name, data) {
  console.log('Tracked',name,data);
};

var onAttributeTrack = _.debounce(function($el) {
  var name = $el.attr('data-track-name'),
      data = {};
  _.each($el[0].attributes, function(attr) {
    if (attr.name !== 'data-track-event' && attr.name !== 'data-track-name') {
      if (attr.name.match(/^data-track-/)) {
        data[attr.name.replace(/^data-track-/, '')] = attr.value;
      }
    }
  });
  exports.track(name, data);
});

Thorax.View.on('rendered', function() {
  var view = this;
  this.$('[data-track-event]').each(function() {
    var $el = $(this);
    $el.on($el.attr('data-track-event'), function() {
      onAttributeTrack.call(view, $el);
    });
  });
});
