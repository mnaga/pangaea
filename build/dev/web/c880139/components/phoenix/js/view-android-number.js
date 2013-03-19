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
