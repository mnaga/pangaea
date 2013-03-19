/*global LocalCache, appVersion */
describe('app-version', function() {
  beforeEach(function() {
    this.originalTime = appVersion.loadTime;
    this.originalConfig = exports.config.configRefreshRate;
    exports.config.configRefreshRate = 5 * 60 * 1000;

    this.originalStarted = Backbone.history.started;
    Backbone.history.started = true;
    this.stub(Backbone.history, 'loadUrl');
    this.stub(LocalCache, 'store');
    this.resetSpy = this.spy();
    exports.bind('cache-reset', this.resetSpy);
  });
  afterEach(function() {
    if (this.originalTime) {
      appVersion.loadTime = this.originalTime;
    }
    Backbone.history.started = this.originalStarted;
    exports.config.configRefreshRate = this.originalConfig;
    exports.unbind('cache-reset', this.resetSpy);
  });

  describe('#isPopulated', function() {
    it('should return false with no loadTime', function() {
      var original = appVersion.loadTime;
      delete appVersion.loadTime;

      expect(appVersion.isPopulated()).to.be.false;
      if (original) {
        appVersion.loadTime = original;
      }
    });

    it('should return false if expired', function() {
      appVersion.loadTime = Date.now();
      this.clock.tick(exports.config.configRefreshRate);

      expect(appVersion.isPopulated()).to.be.false;
    });

    it('should return true if config is invalid', function() {
      appVersion.loadTime = Date.now();
      this.clock.tick(1);

      exports.config.configRefreshRate = 'foo';
      expect(appVersion.isPopulated()).to.be.false;
    });

    it('should return true if refresh is a string', function() {
      exports.config.configRefreshRate = '100';

      appVersion.loadTime = Date.now();
      this.clock.tick(99);

      expect(appVersion.isPopulated()).to.be.true;
    });

    it('should return true if refresh is 0 string', function() {
      exports.config.configRefreshRate = '0';

      appVersion.loadTime = Date.now();
      this.clock.tick(99);

      expect(appVersion.isPopulated()).to.be.true;
    });

    it('should not triger under 5 minutes', function() {
      exports.config.configRefreshRate = '100';

      appVersion.loadTime = Date.now();
      this.clock.tick(5 * 60 * 1000 - 1);

      expect(appVersion.isPopulated()).to.be.true;
    });

    it('should return true if not expired', function() {
      appVersion.loadTime = Date.now();
      this.clock.tick(exports.config.configRefreshRate - 1);

      expect(appVersion.isPopulated()).to.be.true;
    });

    it('should return true if expiration is disabled', function() {
      appVersion.loadTime = Date.now();

      exports.config.configRefreshRate = 0;
      this.clock.tick(1000);
      expect(appVersion.isPopulated()).to.be.true;

      exports.config.configRefreshRate = undefined;
      this.clock.tick(1000);
      expect(appVersion.isPopulated()).to.be.true;
    });
  });

  describe('cache-reset', function() {
    it('should trigger on changed value', function() {
      this.stub(LocalCache, 'get', function() { return '1234'; });
      appVersion.set('clearClientCache', '1234', {silent: true});

      appVersion.set('clearClientCache', '1234');
      expect(this.resetSpy).to.not.have.been.called;
      expect(LocalCache.store).to.not.have.been.called;

      appVersion.set('clearClientCache', '12345');
      expect(this.resetSpy).to.have.been.calledOnce;
      expect(LocalCache.store).to.have.been.calledOnce;
    });

    it('should cause url load', function() {
      var fragment = 'foo';
      this.stub(Backbone.history, 'getFragment', function() { return fragment; });

      Backbone.history.started = false;
      exports.trigger('cache-reset');
      expect(Backbone.history.loadUrl).to.not.have.been.called;

      Backbone.history.started = true;
      exports.trigger('cache-reset');
      expect(Backbone.history.loadUrl).to.have.been.calledOnce;

      fragment = 'checkout/place';
      exports.trigger('cache-reset');
      expect(Backbone.history.loadUrl).to.have.been.calledOnce;

      fragment = 'photo/bar';
      exports.trigger('cache-reset');
      expect(Backbone.history.loadUrl).to.have.been.calledOnce;
    });
  });
});
