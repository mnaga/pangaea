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
