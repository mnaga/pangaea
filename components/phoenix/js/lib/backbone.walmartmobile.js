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
