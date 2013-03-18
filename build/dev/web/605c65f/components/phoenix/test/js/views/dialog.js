describe('Dialog', function() {
  beforeEach(function() {
    Phoenix.Dialog.open(new (Phoenix.View.extend({render: function(){}}))());
  });

  afterEach(function() {
    Phoenix.Dialog.close();
  });

  describe('#open', function() {
    it('should add full-screen-view class and dialog div to body', function() {
      expect($('body').hasClass('full-screen-view')).to.be.true;
      expect($('body').children('[data-view-name="dialog"]').length).to.equal(1);
    });

    it('should clean up after close', function() {
      Phoenix.Dialog.close();

      expect($('body').hasClass('full-screen-view')).to.be.false;
      expect($('body').children('[data-view-name="dialog"]').length).to.equal(0);
    });

    it('should close on change:view:start event', function() {
      Phoenix.trigger('change:view:start');

      expect($('body').hasClass('full-screen-view')).to.be.false;
      expect($('body').children('[data-view-name="dialog"]').length).to.equal(0);
    });
  });
});
