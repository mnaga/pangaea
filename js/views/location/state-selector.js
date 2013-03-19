//takes "back" and "continue" options in the constructor which may be
//a string url or callback function
Phoenix.Views.StateSelector = Phoenix.View.extend({
  name: 'location/state-selector',
  className: 'form-field',
  events: {
    'change select': '_handleStateChange',
    'populate': '_handleStateChange'
  },

  initialize: function() {
    if(this.fieldClass) {
      $(this.el).addClass(this.fieldClass);
    }
  },

  context: function() {
    return {
      value: '',
      states: Phoenix.Data.states
    };
  },

  _handleStateChange: function(event) {
    var sel = this.$('select');
    if (sel.val()) {
      sel.addClass('selected');
      if (sel[0].options[0].value === '') {
        sel[0].remove(0);
      }
    }
  }
});
