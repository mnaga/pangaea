var Alert = exports.AlertView = Phoenix.View.extend({
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
