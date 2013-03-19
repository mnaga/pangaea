/*global ANIVIA_TIMEOUT, LocalCache, aniviaConfig, console, exports, visitId, visitorId, _aniviaConfig:true */
describe('anivia', function() {
  beforeEach(function() {
    exports.config.analyticsEnabled = true;

    var config;
    this.stub(LocalCache, 'get', function() { return config; });
    this.stub(LocalCache, 'store', function(name, value) { config = value; return true; });
  });
  afterEach(function() {
    exports.config.analyticsEnabled = false;

    _aniviaConfig = undefined;
  });

  it('vistor id does not expire', function() {
    var now = 1000;
    this.stub(Date, 'now', function() { return now; });

    var original = visitorId();
    expect(original).to.not.be.undefined;
    expect(LocalCache.store.calledOnce).to.be.true;

    now = 1355270400;
    expect(visitorId()).to.equal(original);
    expect(LocalCache.store.calledOnce).to.be.true;
  });

  it('visit id expires after 30 min', function() {
    var now = 1000;
    this.stub(Date, 'now', function() { return now; });

    var original = visitId();
    expect(original).to.not.be.undefined;
    expect(LocalCache.store.calledOnce).to.be.true;

    now += 29*60*1000 + 1;
    expect(visitId()).to.not.equal(original);
    expect(LocalCache.store.calledTwice).to.be.true;
  });

  it('config loaded from localstorage', function() {
    var visitor = visitorId(),
        visit = visitId();
    expect(LocalCache.store.calledTwice).to.be.true;

    _aniviaConfig = undefined;

    expect(visitorId()).to.equal(visitor);
    expect(visitId()).to.equal(visit);
  });

  it('events are sent after timeout', function() {
    exports.trackEvent('foo', {'man': 'chu'});
    expect(this.requests.length).to.equal(0);
    expect(_aniviaConfig.queue.length).to.equal(1);

    this.clock.tick(ANIVIA_TIMEOUT + 1);
    expect(this.requests.length).to.equal(1);
    expect(_aniviaConfig.queue.length).to.equal(0);
  });

  it('Storage error does not cause flow exception', function() {
    this.stub(exports, 'trackError');

    LocalCache.store.restore();
    this.stub(LocalCache, 'store', function() { return false; /* Quota error */ });

    exports.trackEvent('foo', {'man': 'chu'});
    expect(this.requests.length).to.equal(0);
    expect(_aniviaConfig.queue.length).to.equal(1);
    expect(exports.trackError.callCount).to.equal(1);

    this.clock.tick(ANIVIA_TIMEOUT + 1);
    expect(this.requests.length).to.equal(1);
    expect(_aniviaConfig.queue.length).to.equal(0);
  });

  it('multiple events are batched into a single request', function() {
    exports.trackEvent('foo', {'man': 'chu'});
    this.clock.tick(ANIVIA_TIMEOUT / 2);

    exports.trackEvent('bar', {'man': 'chu?'});
    expect(this.requests.length).to.equal(0);
    expect(_aniviaConfig.queue.length).to.equal(2);

    this.clock.tick(ANIVIA_TIMEOUT);
    expect(this.requests.length).to.equal(1);
    expect(_aniviaConfig.queue.length).to.equal(0);
  });

  it('analytics calls survive a refresh', function() {
    exports.trackEvent('foo', {'man': 'chu'});
    exports.trackEvent('bar', {'man': 'chu?'});
    expect(this.requests.length).to.equal(0);
    expect(_aniviaConfig.queue.length).to.equal(2);

    _aniviaConfig = undefined;

    aniviaConfig();   // Reload
    expect(_aniviaConfig.queue.length).to.equal(2);

    this.clock.tick(ANIVIA_TIMEOUT + 1);
    expect(this.requests.length).to.equal(1);
    expect(_aniviaConfig.queue.length).to.equal(0);
  });

  it('multiple connection events are reduced to a single', function() {
    this.stub(console, 'error');

    exports.trackError('connection', {});
    expect(_aniviaConfig.queue.length).to.equal(1);

    exports.trackError('connection', {});
    expect(_aniviaConfig.queue.length).to.equal(1);
  });
});
