/*
 * Application-wide event handlers
 */

// Needs to be the .flex element, not body so absolutely positioned elements
// fill the height correctly.
var flexEl = $('body')[0];
function setMinimumHeight(orientation) {
  try {
    if (window.screen && !exports.isDesktop) {
      // Clear out the style so we can get real values on rotation.
      var originalHeight = flexEl.style.minHeight;
      flexEl.style.minHeight = '';

      var height,
          isPortrait = orientation === 0 || orientation === 180;
      if ($.os.android) {
        // when using the orientationchange event, the window's outerHeight value
        // would be stale.
        height = window.outerHeight / (exports.devicePixelRatio || 1);
      } else if ($.os.iphone) {
        if (isPortrait) {
          height = screen.height;
        } else {
          height = screen.width;
        }

        // Pull out any status bar height
        // On some devices this is taken out of the avilable
        // width and on others the height, regardless of orientation. Fun times.
        //
        // This seems to work on all tested devices including IOS6, the current bleeding edge...
        height -= (screen.width - screen.availWidth) || (screen.height - screen.availHeight);

        // we can determine whether the user is in mobile safari or
        // in desktop bookmark with navigator.standalone property
        if (!navigator.standalone) {
          // portrait toolbar is 44px
          // landscape toolbar is 32px
          height -= isPortrait ? 44 : 32;

          // sanity check for current devices:
          //  landscape - now window.innerHeight should be 268
          //  portrait - now window.innerHeight should be 416
        }
      } else {
        // hope that this comes out in the wash
        if (isPortrait) {
          height = screen.availHeight || screen.height;
        } else {
          height = screen.availWidth || screen.width;
        }
      }

      height = height + 'px';
      flexEl.style.minHeight = height;

      // If we had our size change due to an orrientation change, scroll to the top
      if (originalHeight !== height) {
        Thorax.Util.scrollToTop();
      }
    }
  } catch (err) {
    exports.trackCatch('minHeight', err);
  }
}

// Mobile safari do not handle orientation media queries correctly (but webviews do...)
// Hack around that with a body class for landscape mode
function setLandscape() {
  $(document.body).toggleClass('landscape', Math.abs(window.orientation) === 90);
}
setLandscape();

function orientationHandler() {
  setLandscape();

  // TODO : Revisit this as it doesn't work quite right in the map view
  setMinimumHeight(window.orientation);
}

exports.bind('init', function() {
  setMinimumHeight(window.orientation);
});

if ($.os.iphone) {
  window.addEventListener('orientationchange', orientationHandler, true);
} else {
  // Instead of using orientationchange we are going to use resize as it is more
  // reliable. for example, on android, first orientationchange fires then the
  // screen size changes, then reisze fires, so the window.outerHeight and other
  // screen size values would be stale during the orientationchange.  Once
  // switching to resize, we run into another problem where the resize gets
  // called twice due to us setting the .flex element's minHeight in the first
  // call. Therefore, we want to run our handler on the first resize event and
  // dismiss all the remaining resize events within the next 200 milliseconds.
  window.addEventListener('resize', _.debounce(orientationHandler, 200, true));
}
