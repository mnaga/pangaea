describe('anivia events', function() {
  beforeEach(function() {
    this.stub(exports, 'trackEvent');
  });

  it('should route should cause page view event', function() {
    var fragment = 'foo';
    this.stub(Backbone.history, 'getFragment', function() { return fragment; });

    Backbone.history.trigger('route');
    fragment = 'bar';
    Backbone.history.trigger('route');

    expect(exports.trackEvent).to.have.been.calledWith('pageView', {name: 'foo'});
    expect(exports.trackEvent).to.have.been.calledWith('pageView', {name: 'bar'});
    expect(exports.trackEvent.callCount).to.equal(2);
  });

  it('should duplicate route should cause page view event once', function() {
    var fragment = 'foo';
    this.stub(Backbone.history, 'getFragment', function() { return fragment; });

    Backbone.history.trigger('route');
    Backbone.history.trigger('route');

    expect(exports.trackEvent).to.have.been.calledWith('pageView', {name: 'foo'});
    expect(exports.trackEvent.callCount).to.equal(1);
  });
});
