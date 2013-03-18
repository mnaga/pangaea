/*global Connection, LocalCache, Model */
describe('connection/local-cache', function() {
  beforeEach(function() {
    this.stub(exports, 'trackError');
  });

  function modelTTL(ttl) {
    var model = new Model();
    model.ttl = ttl;
    return model;
  }

  describe('loading', function() {
    beforeEach(function() {
      this.stub(Thorax, 'sync');
      this.stub(LocalCache, 'get', function() {
        return '{"foo":1}';
      });
    });

    it('loads from cache', function() {
      var success = this.spy();

      Connection.sync('read', modelTTL(LocalCache.TTL.WEEK), {
          url: 'bar',
          success: success
        });

      expect(LocalCache.get).to.have.been.calledOnce;
      expect(success).to.have.been.calledOnce;
      expect(success).to.have.been.calledWith({foo: 1}, Connection.SUCCESS);
    });

    it('fails over to ajax if cache error occurs', function() {
      this.stub(exports, 'trackCatch');

      var success = this.stub().throws();

      Connection.sync('read', modelTTL(LocalCache.TTL.WEEK), {
          url: 'bar',
          success: success
        });

      expect(LocalCache.get).to.have.been.calledOnce;
      expect(success).to.have.been.calledOnce;
      expect(success).to.have.been.calledWith({foo: 1}, Connection.SUCCESS);
      expect(Thorax.sync).to.have.been.calledOnce;
    });

    it('does not load from no ttl model', function() {
      Connection.sync('read', new Model({}), {
          url: 'bar'
        });

      expect(LocalCache.get.callCount, 0);
      expect(Thorax.sync).to.have.been.calledOnce;
    });
  });

  describe('cache storage', function() {
    var success;
    beforeEach(function() {
      this.stub(LocalCache, 'store');
      success = this.spy();
    });
    it('stores for ttl cache case', function() {
      Connection.sync('read', modelTTL(LocalCache.TTL.WEEK), {
          url: 'bar',
          success: success
        });
      this.requests[0].respond(200, {}, '{"foo": "bar"}');


      expect(success).to.have.been.calledOnce;
      expect(LocalCache.store).to.have.been.calledOnce;
      expect(LocalCache.store).to.have.been.calledWith('bar', '{"foo":"bar"}');
    });
    it('does not store for no ttl case', function() {
      Connection.sync('read', new Model({}), {
          url: 'bar',
          success: success
        });
      this.requests[0].respond(200, {}, '{"foo": "bar"}');

      expect(success).to.have.been.calledOnce;
      expect(LocalCache.store).to.not.have.been.called;
    });
  });

  describe('cache invalidation', function() {
    it('should handle invalidate event', function() {
      this.stub(LocalCache, 'invalidate');

      Connection.invalidate('foo', {hard: 'bar'});

      expect(LocalCache.invalidate).to.have.been.calledOnce
          .to.have.been.calledWith('foo', 'bar');
    });
  });
});
