var InlineLoading = exports.Views.InlineLoading = View.extend({
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
