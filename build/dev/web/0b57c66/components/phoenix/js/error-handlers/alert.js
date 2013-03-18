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
