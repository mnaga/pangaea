/*global carouselDisplaySize: true, DRAG_START: true, DRAG_TRIGGER: true, useNativeScroll */
var TRANSFORM_PROP = '-webkit-transform';

describe('carousel view', function() {
  it('should parse min/max width correctly', function() {
    expect(parseWidth(10, 200)).to.eql(10);
    expect(parseWidth('10%', 200)).to.eql(20);
  });
});

describe('carousel view', function() {

  afterEach(function() {
    cleanupCarousel(this.view);
  });

  it('should recalculate on window resize', function() {
    this.view = setupCarousel();
    setCarouselWidth.call(this, 20);
    this.spy(this.view, 'calcContentSection');

    $(window).trigger('resize');
    this.clock.tick(1000);
    expect(this.view.calcContentSection).to.have.been.calledOnce;
  });

  it('should cleanup event listener on dispose', function() {
    this.view = setupCarousel();
    this.spy($.fn, 'unbind');

    cleanupCarousel(this.view);
    expect($.fn.unbind).to.have.been.calledWith('resize', this.view.resizeHandler);
  });

  describe('carousel view : snap to', function() {

    beforeEach(function() {
      this.view = setupCarousel({
        snapTo: true,
        showButtons: false,
      });
      this.setWidth = setCarouselWidth;
      this.setItems = setCarouselItems;
    });

    it('prev/next should jump a full page', function() {
      // Width of 140 px - 20px*2 padding = 100px per page
      this.setItems(4, 'width: 50px');
      this.setWidth('140');

      expect(this.view.firstItem).to.equal(0);

      this.view.handleNext();
      expect(this.view.firstItem).to.equal(2);

      this.view.handleNext();
      expect(this.view.firstItem).to.equal(2);

      this.view.handlePrev();
      expect(this.view.firstItem).to.equal(0);

      this.view.handlePrev();
      expect(this.view.firstItem).to.equal(0);
    });

    it('prev/next should work when content is the size of the viewport', function() {
      // Width of 140 px - 20px*2 padding = 100px per page
      this.setItems(3, 'width: 40px; padding: 10px; margin: 10px; border: 10px solid red;');
      this.setWidth('140px');

      var collection = this.view.$('.collection');
      expect(this.view.firstItem).to.equal(0);
      expect(collection.css(TRANSFORM_PROP)).to.equal('translate3d(0px, 0px, 0px)');

      this.view.handleNext();
      expect(this.view.firstItem, 1);
      expect(collection.css(TRANSFORM_PROP)).to.equal('translate3d(-100px, 0px, 0px)');

      this.view.handleNext();
      expect(this.view.firstItem).to.equal(2);
      expect(collection.css(TRANSFORM_PROP)).to.equal('translate3d(-200px, 0px, 0px)');

      this.view.handlePrev();
      expect(this.view.firstItem).to.equal(1);
      expect(collection.css(TRANSFORM_PROP)).to.equal('translate3d(-100px, 0px, 0px)');

      this.view.handlePrev();
      expect(this.view.firstItem).to.equal(0);
      expect(collection.css(TRANSFORM_PROP)).to.equal('translate3d(0px, 0px, 0px)');
    });

    it('prev/next should work when content is the size of the viewport : with buttons', function() {
      this.view.showButtons = true;
      this.view.render();

      // Width of 140 px - 20px*2 padding = 100px per page
      this.setItems(3, 'width: 40px; padding: 10px; margin: 10px; border: 10px solid red;');
      this.setWidth('240px');

      var collection = this.view.$('.collection');
      expect(this.view.firstItem).to.equal(0);
      expect(collection.css(TRANSFORM_PROP)).to.equal('translate3d(0px, 0px, 0px)');

      this.view.handleNext();
      expect(this.view.firstItem).to.equal(1);
      expect(collection.css(TRANSFORM_PROP)).to.equal('translate3d(-50px, 0px, 0px)');

      this.view.handleNext();
      expect(this.view.firstItem).to.equal(2);
      expect(collection.css(TRANSFORM_PROP)).to.equal('translate3d(-100px, 0px, 0px)');

      this.view.handlePrev();
      expect(this.view.firstItem).to.equal(1);
      expect(collection.css(TRANSFORM_PROP)).to.equal('translate3d(-50px, 0px, 0px)');

      this.view.handlePrev();
      expect(this.view.firstItem).to.equal(0);
      expect(collection.css(TRANSFORM_PROP)).to.equal('translate3d(0px, 0px, 0px)');
    });

    it('prev/next should work when content is larger than the viewport', function() {
      this.setItems(3, 'width: 150px; padding: 10px; margin: 10px; border: 10px solid red;');
      this.setWidth('150px');

      // All centered within the parent view
      var collection = this.view.$('.collection');
      expect(this.view.firstItem).to.equal(0);
      expect(collection.css(TRANSFORM_PROP)).to.equal('translate3d(-50px, 0px, 0px)'); // 150/2-(150+60)/2-20

      this.view.handleNext();
      expect(this.view.firstItem).to.equal(1);
      expect(collection.css(TRANSFORM_PROP)).to.equal('translate3d(-260px, 0px, 0px)');

      this.view.handleNext();
      expect(this.view.firstItem).to.equal(2);
      expect(collection.css(TRANSFORM_PROP)).to.equal('translate3d(-470px, 0px, 0px)');

      this.view.handlePrev();
      expect(this.view.firstItem).to.equal(1);

      this.view.handlePrev();
      expect(this.view.firstItem).to.equal(0);
    });

    it('carouselDisplaySize should return full size', function() {
      var self = this;
      function testStyle(style) {
        self.setItems(3, style);
        _.each(self.view.$('.collection > div'), function(item) {
          expect(carouselDisplaySize(item)).to.equal(74);
        });
      }

      testStyle('width: 74px;');
      testStyle('width: 68px; margin-right: 6px;');
      testStyle('width: 48px; margin: 0 3px; border: 10px solid red;');
      testStyle('width: 28px; margin: 0 3px; border: 10px solid red; padding: 10px');
      testStyle('width: 68px; margin: 0 3px; border: 10px solid red; padding: 10px; box-sizing: border-box;');
    });

    it('lastVisible can be called on an empty collection', function() {
      var last = this.view.lastVisible(0);
      expect(last.offsetLeft).to.equal(0);
      expect(last.hideNext).to.equal(true);
      expect(last.hidePrev).to.equal(true);
    });

    it('lastVisible should should return proper index', function() {
      this.setItems(7, 'width: 48px; margin: 0 3px; border: 10px solid red;');
      this.setWidth('298px');

      runLastVisibleTest(this, [
        {index: 0, left: 0, right: 2, availableWidth: 36, offsetLeft: 0},
        {index: 1, left: 1, right: 3, availableWidth: 36, offsetLeft: 74},
        {index: 2, left: 2, right: 4, availableWidth: 36, offsetLeft: 148},
        {index: 3, left: 3, right: 5, availableWidth: 36, offsetLeft: 222},
        {index: 4, left: 4, right: 6, availableWidth: 36, offsetLeft: 296},
        {index: 5, left: 4, right: 6, availableWidth: 36, offsetLeft: 296},
        {index: 6, left: 4, right: 6, availableWidth: 36, offsetLeft: 296},
        {reverse: true, index: 6, left: 4, right: 6, availableWidth: 36, offsetLeft: 296},
        {reverse: true, index: 5, left: 3, right: 5, availableWidth: 36, offsetLeft: 222},
        {reverse: true, index: 4, left: 2, right: 4, availableWidth: 36, offsetLeft: 148},
        {reverse: true, index: 3, left: 1, right: 3, availableWidth: 36, offsetLeft: 74},
        {reverse: true, index: 2, left: 0, right: 2, availableWidth: 36, offsetLeft: 0},
        {reverse: true, index: 1, left: 0, right: 2, availableWidth: 36, offsetLeft: 0},
        {reverse: true, index: 0, left: 0, right: 2, availableWidth: 36, offsetLeft: 0}
      ]);
    });

    it('lastVisible should should return proper index : buttons', function() {
      // Mirrors the styles used in the bundles implementation
      this.view.showButtons = true;
      this.view.render();
      this.setItems(7, 'width: 48px; margin: 0 2px; border: 10px solid red;');
      this.setWidth('298px');

      runLastVisibleTest(this, [
        {index: 0, left: 0, right: 2, hidePrev: true, hideNext: false, availableWidth: 17, offsetLeft: 0},
        {index: 1, left: 1, right: 2, hidePrev: false, hideNext: false, availableWidth: 64, reverseWidth: 6, offsetLeft: 72},
        {index: 2, left: 2, right: 3, hidePrev: false, hideNext: false, availableWidth: 64, reverseWidth: 6, offsetLeft: 144},
        {index: 3, left: 3, right: 4, hidePrev: false, hideNext: false, availableWidth: 64, offsetLeft: 216},
        {index: 4, left: 4, right: 6, hidePrev: false, hideNext: true, availableWidth: 17, reverseWidth: 50, offsetLeft: 288},
        {index: 5, left: 4, right: 6, hidePrev: false, hideNext: true, availableWidth: 17, reverseWidth: 50, offsetLeft: 288},
        {index: 6, left: 4, right: 6, hidePrev: false, hideNext: true, availableWidth: 17, reverseWidth: 6, offsetLeft: 288},
        {reverse: true, index: 6, left: 4, right: 6, hidePrev: false, hideNext: true, availableWidth: 17, offsetLeft: 288},
        {reverse: true, index: 5, left: 4, right: 5, hidePrev: false, hideNext: false, availableWidth: 64, offsetLeft: 288},
        {reverse: true, index: 4, left: 3, right: 4, hidePrev: false, hideNext: false, availableWidth: 64, offsetLeft: 216},
        {reverse: true, index: 3, left: 2, right: 3, hidePrev: false, hideNext: false, availableWidth: 64, offsetLeft: 144},
        {reverse: true, index: 2, left: 0, right: 2, hidePrev: true, hideNext: false, availableWidth: 17, offsetLeft: 0},
        {reverse: true, index: 1, left: 0, right: 2, hidePrev: true, hideNext: false, availableWidth: 17, offsetLeft: 0},
        {reverse: true, index: 0, left: 0, right: 2, hidePrev: true, hideNext: false, availableWidth: 17, offsetLeft: 0}
      ]);
    });

    it('lastVisible should should return proper index : content = viewport', function() {
      this.setItems(3, 'width: 60px; margin: 0; border: 10px solid red;');
      this.setWidth('120px');

      runLastVisibleTest(this, [
        {index: 0, left: 0, right: 0, availableWidth: 0, offsetLeft: 0},
        {index: 1, left: 1, right: 1, availableWidth: 0, offsetLeft: 80},
        {index: 2, left: 2, right: 2, availableWidth: 0, offsetLeft: 160},
        {reverse: true, index: 2, left: 2, right: 2, availableWidth: 0, offsetLeft: 160},
        {reverse: true, index: 1, left: 1, right: 1, availableWidth: 0, offsetLeft: 80},
        {reverse: true, index: 0, left: 0, right: 0, availableWidth: 0, offsetLeft: 0}
      ]);
    });

    it('lastVisible should should return proper index : content > viewport', function() {
      this.setItems(3, 'width: 60px; margin: 0; border: 10px solid red;');
      this.setWidth('100px');

      runLastVisibleTest(this, [
        {index: 0, left: 0, right: 0, availableWidth: -20, offsetLeft: 0},
        {index: 1, left: 1, right: 1, availableWidth: -20, offsetLeft: 80},
        {index: 2, left: 2, right: 2, availableWidth: -20, offsetLeft: 160}
      ]);
    });
  });

  describe('carousel view : one up', function() {

    beforeEach(function() {
      this.view = setupCarousel({oneUp: true});
      this.setWidth = setCarouselWidth;
      this.setItems = setCarouselItems;
    });

    it('mario class', function() {
      expect(this.view.$el.hasClass('one-up-carousel')).to.be.true;
    });

    it('resize items', function() {
      this.setItems(2, 'width: 50px');

      this.setWidth('150px');
      expect(this.view.$('.collection > div')[0].offsetWidth).to.equal(150 - 20 /* padding on carousel */);
      expect(this.view.$('.collection > div')[1].offsetWidth).to.equal(150 - 20);
      expect(this.view.collectionWidth).to.equal(2*(150-20));

      this.setWidth('75px');
      expect(this.view.$('.collection > div')[0].offsetWidth).to.equal(75 - 20);
      expect(this.view.$('.collection > div')[1].offsetWidth).to.equal(75 - 20);
      expect(this.view.collectionWidth).to.equal(2*(75-20));
    });
  });

  if (!$.os.android) {

    describe('carousel view : dragging', function() {

      beforeEach(function() {
        this.view = setupCarousel({oneUp: true, snapTo: true});

        setCarouselItems.call(this, 3, 'width: 50px');
        this.view.next();

        this.stub(this.view, 'cullTouchEvent');
        this.spy(this.view, 'updatePosition');
      });

      it('dragging less than start should do nothing', function() {
        testMove(this.view, DRAG_START-1, 0);
        expect(this.view.updatePosition.callCount).to.equal(0);

        testMove(this.view, 1-DRAG_START, 0);
        expect(this.view.updatePosition.callCount).to.equal(0);
      });

      it('dragging less than limit should return to current', function() {
        testMove(this.view, DRAG_TRIGGER-1, DRAG_TRIGGER-1);
        expect(this.view.updatePosition.callCount).to.equal(1);

        testMove(this.view, 1-DRAG_TRIGGER, 1-DRAG_TRIGGER);
        expect(this.view.updatePosition.callCount).to.equal(2);
      });

      it('dragging more than limit should move to prev', function() {
        testMove(this.view, DRAG_TRIGGER+1, DRAG_TRIGGER+1);
        expect(this.view.updatePosition.callCount).to.equal(1);
      });

      it('dragging more than limit should move to next', function() {
        testMove(this.view, -1-DRAG_TRIGGER, -1-DRAG_TRIGGER);
        expect(this.view.updatePosition.callCount).to.equal(1);
      });

      it('dragging at edges should be clipped', function() {
        this.view.goto(0);

        testMove(this.view, DRAG_TRIGGER-1, 0);
        expect(this.view.updatePosition.callCount).to.equal(1);   // From the test itself

        this.view.goto(2);

        testMove(this.view, 1-DRAG_TRIGGER, 0);
        expect(this.view.updatePosition.callCount).to.equal(2);   // From the test itself
      });

      it('multiple touches should not cause changes', function() {
        this.view.handleTouchStart(touchEvent(this.view, [{pageX: 0, pageY: 0}]));
        expect(this.view.xDelta, 'delta unchanged after start').to.equal(0);
        expect(this.view.touchesSeen).to.equal(1);

        this.view.handleTouchMove(touchEvent(this.view, [ {pageX: DRAG_TRIGGER+1, pageY: 0} ]));
        expect(this.view.xDelta, 'delta matches after move').to.equal(DRAG_TRIGGER+1);
        expect(this.view.touchesSeen).to.equal(1);

        this.view.handleTouchStart(
            touchEvent(this.view, [ {pageX: DRAG_TRIGGER+1, pageY: 0}, {pageX: 0, pageY: 0}]));
        expect(this.view.xDelta, 'delta reset after start').to.equal(0);
        expect(this.view.touchesSeen).to.equal(2);

        this.view.handleTouchMove(touchEvent(this.view, [ {pageX: DRAG_TRIGGER+1, pageY: 0} ]));
        expect(this.view.xDelta, 'delta not changed after multiple').to.equal(0);
        expect(this.view.touchesSeen).to.equal(2);

        this.view.handleTouchEnd(touchEvent(this.view, [{pageX: 0, pageY: 0}]));
        this.view.handleTouchEnd(touchEvent(this.view));
        expect(this.view.xDelta, 'delta reset after end').to.equal(0);
        expect(this.view.touchesSeen).to.equal(0);
      });
    });
  }

  if (useNativeScroll()) {
    describe('carousel view : native-scroll', function() {

      beforeEach(function() {
        this.view = setupCarousel();
        this.setWidth = setCarouselWidth;
        this.setItems = setCarouselItems;
      });

      it('native-scroll class', function() {
        expect(this.view.$el.hasClass('native-scroll')).to.be.true;
      });

      it('native-scroll disabled', function() {
        this.setItems(2, 'width: 50px');
        this.setWidth('150px');

        expect(this.view.$el.hasClass('native-scroll-disabled')).to.be.true;

        this.setWidth('75px');
        expect(!this.view.$el.hasClass('native-scroll-disabled')).to.be.true;
      });

    });
  }
});

function runLastVisibleTest(self, tests) {
  _.each(tests, function(test) {
    var last = this.view.lastVisible(test.index, test.reverse);
    expect(last.left, 'left: ' + test.index + ' ' + test.reverse).to.equal(test.left);
    expect(last.right, 'right: ' + test.index + ' ' + test.reverse).to.equal(test.right);
    expect(last.availableWidth, 'availableWidth: ' + test.index + ' ' + test.reverse).to.equal(test.availableWidth);
    expect(last.offsetLeft, 'offsetLeft: ' + test.index + ' ' + test.reverse).to.equal(test.offsetLeft);
    if ('hideNext' in test) {
      expect(!!last.hideNext, 'hideNext index: ' + test.index + ' ' + test.reverse).to.equal(test.hideNext);
    }
    if ('hidePrev' in test) {
      expect(!!last.hidePrev, 'hidePrev index: ' + test.index + ' ' + test.reverse).to.equal(test.hidePrev);
    }
  }, self);
}

function testMove(view, x, xExpected, y) {
  view.handleTouchStart(touchEvent(view, [{pageX: 0, pageY: 0}]));
  expect(view.xDelta, 'delta unchanged after start').to.equal(0);
  expect(view.touchesSeen).to.equal(1);

  view.handleTouchMove(touchEvent(view, [ {pageX: x, pageY: y || 0} ]));
  expect(view.xDelta, 'delta matches after move').to.equal(xExpected);
  expect(view.touchesSeen).to.equal(1);

  view.handleTouchEnd(touchEvent(view));
  expect(view.xDelta, 'delta reset after end').to.equal(0);
  expect(view.touchesSeen).to.equal(0);
}

function touchEvent(view, touches) {
  return {
    currentTarget: view.$('[data-model-cid]')[0],
    touches: touches || [],
    preventDefault: function() {},
    stopPropagation: function() {}
  };
}

function setupCarousel(options) {
  options = _.defaults({
      itemTemplate: function() {
        return '<div></div>';
      }
    },
    options);

  var view = new Phoenix.Views.Carousel(options);
  view.render();
  $('#qunit-fixture').append(view.el);
  return view;
}

function cleanupCarousel(view) {
  view.destroy();
  view.$el.remove();
}

function setCarouselWidth(width) {
  this.view.$el.css('width', width);
  this.view.sizeCarousel();
}

function setCarouselItems(count, style) {
  var items = [];
  while (count--) {
    items.push({count: count});
  }

  this.view.itemTemplate = _.isFunction(style) ? style : function() {
    return '<div style="display: inline-block; ' + style + '">foo</div>';
  };
  this.view.setCollection(new Phoenix.Collection(items));
  this.view.render();
}
