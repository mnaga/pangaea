var DRAG_RANGE = 150,
    DRAG_TRIGGER = 50,
    DRAG_START = 5;

/*
 * Carousel view implementation.
 *
 * Behavior flags:
 *   - oneUp: Truthy to resize children to fill the carousel view, horizontally.
 *   - noSize: Truthy to disable automatic height management in the view.
 *   - snapTo: Truthy to force positioning on element boundaries rather than arbitrary
 *        coordinates. This disables native scroll for the instance  if supported on the platform.
 */
var Carousel = Phoenix.Views.Carousel = Phoenix.View.extend({
  name: 'carousel',
  firstItem: 0,
  nonBlockingLoad: true,
  containerTagName: 'div',

  // Force controls that do not implement prev next buttons to opt into touch scrolling
  // under android
  disableTouch: $.os.android,

  context: function() {
    var res = Phoenix.View.prototype.context.apply(this, arguments);
    return _.extend(res, {
      showButtons: this.showButtons !== undefined ? this.showButtons : (!this.useNativeScroll && !this.oneUp)
    });
  },

  goto: function(index) {
    if (this.firstItem !== index) {
      this.firstItem = index;
      this.updatePosition();
    }
  },
  next: function() {
    // Find the current range so we can calc the next
    var currentRange = this.lastVisible(this.firstItem),
        displayRange = this.lastVisible(currentRange.right+1);

    this.goto(displayRange.left);
  },
  prev: function() {
    var displayRange = this.lastVisible(this.firstItem-1, true);
    this.goto(displayRange.left);
  },
  seedHeight: function(height) {
    this.$('.carousel').css('height', height);
  },

  initialize: function() {
    Phoenix.View.prototype.initialize.apply(this, arguments);

    this.useNativeScroll = useNativeScroll() && !this.snapTo;
    if (this.useNativeScroll && !this.oneUp) {
      $(this.el).addClass('native-scroll');
    }

    if (this.oneUp) {
      $(this.el).addClass('one-up-carousel');
    }

    this.resizeHandler = _.bind(_.debounce(this.sizeCarousel, 100), this);
    $(window).bind('resize', this.resizeHandler);
  },
  handleDestroyed: function() {
    $(window).unbind('resize', this.resizeHandler);
  },

  calcContentSection: function() {
    var carousel = this.$('.carousel'),
        prev = carousel.find('.prev'),
        next = carousel.find('.next');

    if (!carousel.length) {
      return;
    }

    var carouselBorderLeft = parseInt(carousel.css('border-left-width'), 10) || 0,
        carouselPaddingLeft = parseInt(carousel.css('padding-left'), 10) || 0,
        carouselPaddingRight = parseInt(carousel.css('padding-right'), 10) || 0,
        carouselBorderRight = parseInt(carousel.css('border-right-width'), 10) || 0,

        prevPaddingLeft = prev.length && parseInt(prev.css('padding-left'), 10) || 0,
        prevWidth = prev.length && parseInt(prev.css('width'), 10) || 0,
        prevPaddingRight = prev.length && parseInt(prev.css('padding-right'), 10) || 0,

        nextPaddingLeft = next.length && parseInt(next.css('padding-left'), 10) || 0,
        nextWidth = next.length && parseInt(next.css('width'), 10) || 0,
        nextPaddingRight = next.length && parseInt(next.css('padding-right'), 10) || 0;

    this.carouselWidth = carousel.width() - carouselBorderLeft - carouselBorderRight;
    this.paddingLeft = carouselPaddingLeft;
    this.paddingRight = carouselPaddingRight;
    this.prevWidth = (prevPaddingLeft + prevWidth + prevPaddingRight) || 0;
    this.nextWidth = (nextPaddingLeft + nextWidth + nextPaddingRight) || 0;
  },
  sizeCarousel: function() {
    try {
      // If we have been destroyed do not perform any operations.
      if (!this.el) {
        this.handleDestroyed();
        return;
      }

      this.calcContentSection();
      // If we haven't been inserted into the document do nothing
      if (!this.carouselWidth) {
        if (!this.sizeTimeout) {
          this.sizeTimeout = setTimeout(_.bind(function() {
            // Clear the timeout flag so we will properly reset the timeout if we aren't
            // ready yet.
            this.sizeTimeout = undefined;
            this.sizeCarousel();
          }, this), 10);
        }
        return;
      }
      this.sizeTimeout = undefined;

      this.sizeChildren();

      // Measure the size of the carousel after everything is adjusted for the children
      this.collectionWidth = this.useNativeScroll && !this.oneUp ?
        this.$('.carousel')[0].scrollWidth :
        this.$('.collection').width();

      // Size the height to the children
      if (!this.noSize) {
        this.$('.carousel').css('height', this.$('.collection').height());
      }

      if (this.useNativeScroll && !this.oneUp) {
        //if all items will fit on the screen remove native-scroll class
        //add the extra native-scroll-disabled to remove padding
        //from carousel navigation not being present
        var enable = this.collectionWidth > this.carouselWidth;
        $(this.el)
            .toggleClass('native-scroll', enable)
            .toggleClass('native-scroll-disabled', !enable);
      } else if (!this.useNativeScroll && this.collection) {
        this.updatePosition(true);
      }
    } catch (err) {
      Phoenix.trackCatch('sizeCarousel', err);
    }
  },
  handleNext: function() {
    this.next();
  },
  handlePrev: function() {
    this.prev();
  },

  handleTouchStart: function(event) {
    if (this.useNativeScroll || this.disableTouch) {
      return;
    }
    Phoenix.touchSanity(event);

    var priorTouches = this.touchesSeen || 0;
    this.touchesSeen = Math.max(event.touches.length, priorTouches);

    if (!priorTouches) {
      this.touchOffset = $(event.currentTarget).offset();
      this.touchStart = touchElementCoords(this.touchOffset, event.touches[0]);
      this.touchScroll = window.scrollY;
    } else if (this.xDelta && this.touchesSeen > 1) {
      // If we have any movement reset on additional fingers
      this.dragMove($(event.currentTarget), 0, 0);
    }
    this.xDelta = 0;

    this.cullTouchEvent(event);
  },
  handleTouchMove: function(event) {
    if (this.useNativeScroll || this.disableTouch) {
      return;
    }
    Phoenix.touchSanity(event);

    if (this.touchesSeen === 1) {
      // If we have scrolled force a reset back to the original location
      var touchStart = this.touchStart,
          touch = !this.hasScrolled() ? touchElementCoords(this.touchOffset, event.touches[0]) : touchStart,
          x = 0,
          y = 0;

      if (touch && touchStart) {
        x = touch.x-touchStart.x;
        y = touch.y-touchStart.y;
      }

      this.dragMove($(event.currentTarget), x, y);
    }

    this.cullTouchEvent(event);
  },
  handleTouchEnd: function(event) {
    if (this.useNativeScroll || this.disableTouch) {
      return;
    }
    Phoenix.touchSanity(event);

    if (this.xDelta && !this.hasScrolled()) {
      if (Math.abs(this.xDelta) < DRAG_TRIGGER) {
        this.updatePosition();
      } else {
        this[this.xDelta > 0 ? 'prev' : 'next']();
      }

      event.stopPropagation();
      event.preventDefault();
    } else if (this.hasScrolled()) {
      // Cleanup any delta that may have been applied
      this.dragMove($(event.currentTarget), 0, 0);

      // Prevent zepto from doing anything as we scolled and it's not scroll aware.
      event.stopPropagation();
    }

    if (!event.touches.length) {
      this.touchesSeen = 0;
    }
  },

  handleRenderedItem: function(collectionView, collection, model, itemElement) {
    $(itemElement[0]).addClass('carousel-item');
  },

  hasScrolled: function() {
    return this.touchScroll !== window.scrollY;
  },
  cullTouchEvent: function(event) {
    if (this.zoomed || Math.abs(this.xDelta) > DRAG_START) {
      // This is supposed to help Android play nicely.
      // See http://uihacker.blogspot.com/2011/01/android-touchmove-event-bug.html
      //
      // Note that we are not stopping propagation so the zepto libs can
      // still work when we do this
      event.preventDefault();
    }
  },

  sizeChildren: function(expectedWidth) {
    if (this.oneUp || this.itemsPerPage) {
      var sideWidth = !this.useNativeScroll && !this.oneUp ? this.prevWidth + this.nextWidth : this.paddingLeft + this.paddingRight,
          viewWidth = (expectedWidth || this.carouselWidth) - sideWidth,
          itemWidth = viewWidth / (this.itemsPerPage || 1);

      // make the item width slightly smaller to create overflow in native scroll
      if (this.useNativeScroll && !this.oneUp) {
        itemWidth = itemWidth * 0.925;
      }
      if (this.minItemWidth) {
        itemWidth = Math.max(parseWidth(this.minItemWidth, viewWidth), itemWidth);
      }
      if (this.maxItemWidth) {
        itemWidth = Math.min(parseWidth(this.maxItemWidth, viewWidth), itemWidth);
      }

      this.$('.collection').children().css('width', Math.floor(itemWidth) + 'px');
    }
  },

  dragMove: function(el, xDelta) {
    // Clip to the image size
    xDelta = this.clipDeltaX(xDelta);
    if (Math.abs(xDelta) < DRAG_START) {
      xDelta = 0;
    }

    if (this.xDelta !== xDelta) {
      this.xDelta = xDelta;

      this.moveCarousel(true);
    }
  },
  clipDeltaX: function(x) {
    return Math.max(
        this.lastItem < this.collection.length-1 ? -DRAG_RANGE : 0,
        Math.min(
            x,
            this.firstItem > 0 ? DRAG_RANGE : 0));
  },

  updatePosition: function(noTransition) {
    this.xDelta = 0;

    var displayRange = this.lastVisible(this.firstItem);
    this.lastItem = displayRange.right;

    if (!this.useNativeScroll && !this.oneUp) {
      this.$('.prev').toggle(!displayRange.hidePrev);
      this.$('.next').toggle(!displayRange.hideNext);
    }

    var maxOffset = this.collectionWidth - (this.carouselWidth - this.paddingRight - this.paddingLeft),
        prevSize = !displayRange.hidePrev ? this.prevWidth || this.paddingLeft : this.paddingLeft,
        offset = displayRange.offsetLeft - displayRange.availableWidth/2 - prevSize;

    // transform3d coordinates are relative to the padding so we need to offset that out
    offset += this.paddingLeft;

    offset = Math.min(offset, maxOffset);

    this.collectionPos = Math.min(-offset, 0);
    this.moveCarousel(noTransition);

    this.trigger('position', displayRange);
  },
  moveCarousel: function(noTransition) {
    clearTimeout(this.moveTimeout);

    var collection = this.$('.collection');
    collection
      .toggleClass('dragging', !!noTransition)
      .css(
        '-webkit-transform',
        'translate3d(' + (this.collectionPos + (this.xDelta || 0)) + 'px, 0px, 0)');

    if (noTransition) {
      this.moveTimeout = setTimeout(function() {
        collection.removeClass('dragging');
      }, 10);
    }
  },

  // Determines the element that would be the last visible item in the list if it started
  // at a given index. For previousScreen index is on the right side of the viewport,
  // otherwise index is on the left side.
  lastVisible: function(index, previousScreen, noBackScan) {
    var prevWidth = this.prevWidth,
        nextWidth = this.nextWidth,
        availableWidth = this.carouselWidth - (prevWidth || this.paddingLeft) - (nextWidth || this.paddingRight),

        children = this.$('.collection').children(),

        offset = previousScreen ? -1 : 1;

    index = Math.max(0, Math.min(index, children.length-1));

    var originalIndex = index,
        item = children[index];

    if (!item) {
      return {
        offsetLeft: 0,
        index: 0,
        availableWidth: availableWidth,
        hidePrev: true,
        hideNext: true
      };
    }

    function iterateItem() {
      var itemSize = carouselDisplaySize(item);

      // Always force atleast one exec even if the current item is larger than the viewport
      if (item && ((index === originalIndex && itemSize > availableWidth) || itemSize <= availableWidth)) {
        availableWidth -= itemSize;
        index += offset;
        item = item[previousScreen ? 'previousElementSibling' : 'nextElementSibling'];
        return itemSize;
      }
    }

    // Walk the list to determine how many elements we can show
    while (iterateItem()) { /* NOP */ }

    // Check to see if we can remove the prev button and fit one more in
    if (prevWidth && (originalIndex < 1 || index < 1)) {
      var delta = carouselDisplaySize(item) - (prevWidth-this.paddingLeft);
      if (availableWidth >= delta) {
        if (index > offset) {
          availableWidth -= delta;
          index += offset;
        }
      }
    }

    // Check to see if we can remove the next button and fit one more in
    if (nextWidth && (originalIndex >= children.length-1 || index >= children.length-1)) {
      var delta = carouselDisplaySize(item) - (nextWidth-this.paddingRight);
      if (availableWidth >= delta) {
        if (index < children.length) {
          availableWidth -= delta;
          index += offset;
        }
      }
    }

    index = Math.min(Math.max(0, index - offset), children.length-1);

    if (!item && !noBackScan) {
      // If we hit the end check to see if we can show more items on the otherside
      var backScan = this.lastVisible(index, !previousScreen, true);
      if (backScan.right-backScan.left > index-originalIndex) {
        return backScan;
      }
    }

    var left = previousScreen ? index : originalIndex,
        right = previousScreen ? originalIndex : index,

        offsetItem = children[left],
        leftMargin = parseInt($(offsetItem).css('margin-left'), 10) || 0;

    return {
      offsetLeft: offsetItem.offsetLeft - leftMargin,
      left: left,
      right: right,
      availableWidth: availableWidth,
      hidePrev: !left,
      hideNext: right === children.length - 1
    };
  }
});

var pctWidth = /(\d*)%/;
function parseWidth(val, viewWidth) {
  if (_.isString(val)) {
    var match = val.match(pctWidth);
    if (match) {
      return Math.floor(viewWidth * parseInt(match[1], 10) / 100);
    }
  }
  return val;
}

function useNativeScroll() {
  return $.os.ios && parseInt($.os.version, 10) >= 5;
}

function carouselDisplaySize(item) {
  if (!item) {
    return 0;
  }

  // TODO : Offer an option to fast track this if we know that everything will be the same size?
  var $item = $(item),
      marginLeft = parseInt($item.css('margin-left'), 10) || 0,
      marginRight = parseInt($item.css('margin-right'), 10) || 0;
  return marginLeft + item.offsetWidth + marginRight;
}
function touchElementCoords(offset, touch) {
  return {x: touch.pageX-offset.left, y: touch.pageY-offset.top};
}

Carousel.on({
  'rendered:collection': 'sizeCarousel',
  'rendered:item': 'handleRenderedItem',
  'destroyed': 'handleDestroyed',
  'click .next': 'handleNext',
  'click .prev': 'handlePrev',
  'nested touchstart [data-model-cid]': 'handleTouchStart',
  'nested touchmove [data-model-cid]': 'handleTouchMove',
  'nested touchend [data-model-cid]': 'handleTouchEnd'
});
