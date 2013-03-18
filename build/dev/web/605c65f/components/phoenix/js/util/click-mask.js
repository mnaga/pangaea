/**
 * Implements a mask for DOM events. This will prevent the user from tapping on any elements
 * other than those that are ignored by the `options.test` field.
 *
 * General lifecycle:
 *  - "Mask" UI is displayed. This is up to the caller.
 *  - User taps on screen
 *    - options.test is executed if defined
 *    - If undefined or the return is truthy then the click event is cancelled and the
 *      `options.complete` call occurs.
 *
 * Test should generally return false for elements that you want to allow the user to interact
 * with and true for the elements whose behavior you want to disabled.
 */
Phoenix.Util.clickMask = function(options) {
  var eventName = Thorax._fastClickEventName || 'click',
      test = options.test,
      complete = options.complete;

  function eventHandler(event) {
    // Test checks to see if the click lands within the region we care about
    if (!test || test(event)) {
      event.preventDefault();
      event.stopPropagation();

      complete(event);
      cleanup();
    }
  }
  function cleanup() {
    document.body.removeEventListener(eventName, eventHandler, true);
  }
  document.body.addEventListener(eventName, eventHandler, true);

  return {
    cleanup: cleanup
  };
};
