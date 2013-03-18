/*global Util, authentication */
describe('util', function() {
  describe('#latLng', function() {
    it('should truncate', function() {
      expect(Util.latLng(123)).to.equal(123);
      expect(Util.latLng(123.123)).to.equal(123.123);
      expect(Util.latLng(123.12345)).to.equal(123.123);
      expect(Util.latLng(123.09876)).to.equal(123.098);
    });

    it('should convert strings', function() {
      expect(Util.latLng('123')).to.equal(123);
      expect(Util.latLng('123.123')).to.equal(123.123);
      expect(Util.latLng('123.12345')).to.equal(123.123);
      expect(Util.latLng('123.09876')).to.equal(123.098);
    });
  });

  describe('#appendParams', function() {
    it('should work with strings', function() {
      expect(Util.appendParams('base', 'key=value')).to.equal('base?key=value');
      expect(Util.appendParams('base?key1=value1', 'key2=value2')).to.equal('base?key1=value1&key2=value2');
    });

    it('shold work with objects', function() {
      expect(Util.appendParams('base', {k1: 'v1', k2: 'v2'})).to.equal('base?k1=v1&k2=v2');
      expect(Util.appendParams('base?key=value', {k1: 'v1', k2: 'v2'})).to.equal('base?key=value&k1=v1&k2=v2');
    });

    it('shold skip undefined values in objects', function() {
      expect(Util.appendParams('base', {k1: 'v1', k2: undefined, k3: 'v3'})).to.equal('base?k1=v1&k3=v3');
      expect(Util.appendParams('base?key=value', {k1: 'v1', k2: undefined, k3: 'v3'})).to.equal('base?key=value&k1=v1&k3=v3');
    });
    it('should handle empty parameters', function() {
      expect(Util.appendParams('fu', '')).to.equal('fu');
      expect(Util.appendParams('gazi', {})).to.equal('gazi');
    });
  });

  describe('#stripParams', function() {
    it('should return url without params unchanged', function() {
      expect(Util.stripParams('http://google.com')).to.equal('http://google.com');
    });
    it('should strip params from url', function() {
      expect(Util.stripParams('http://google.com?bar=1&foo=2')).to.equal('http://google.com');
    });
    it('should strip trailing question mark from url', function() {
      expect(Util.stripParams('http://google.com?')).to.equal('http://google.com');
    });
  });

  describe('#pickBy', function() {
    it('should return object with only values for which the iterator returns true', function() {
      var obj = {
        a1: 'foo',
        a2: 'bar'
      };
      expect(Util.pickBy(obj, function(v) {
        return v === 'bar';
      })).to.eql({a2: 'bar'});
    });
  });

  describe('#serializeParams', function() {
    it('should serialize params properly', function() {
      expect(Util.serializeParams({p1: 'k1', p2: 'k2'})).to.equal('p1=k1&p2=k2');
    });
    it('should return empty string for empty params', function() {
      expect(Util.serializeParams({})).to.equal('');
    });
    it('should not replace spaces with pluses', function() {
      expect(Util.serializeParams({p1: 'with space'})).to.equal('p1=with%20space');
    });
  });

  describe('#cachedSingletonMixin', function() {
    it('should match session', function() {
      var Model = Phoenix.Model.extend({});
      Util.cachedSingletonMixin(Model, 'test');

      this.spy(Model, 'release');

      var data = Model.get();
      expect(Model.release).to.not.have.been.called;

      Date.clock.tick(authentication.SESSION_DURATION - 1);
      expect(Model.get()).to.eql(data);
      expect(Model.release).to.not.have.been.called;

      // Access should extend the cache
      Date.clock.tick(authentication.SESSION_DURATION - 1);
      expect(Model.get()).to.eql(data);
      expect(Model.release).to.not.have.been.called;

      Date.clock.tick(authentication.SESSION_DURATION + 1);
      expect(Model.get()).to.eql(data);
      expect(Model.release).to.have.been.calledOnce;
    });

    it('should match custom duration', function() {
      var Model = Phoenix.Model.extend({});
      Util.cachedSingletonMixin(Model, 'test', 1000);

      this.spy(Model, 'release');

      var data = Model.get();
      expect(Model.release).to.not.have.been.called;

      Date.clock.tick(1000 - 1);
      expect(Model.get()).to.eql(data);
      expect(Model.release).to.not.have.been.called;

      Date.clock.tick(1000 + 1);
      expect(Model.get()).to.eql(data);
      expect(Model.release).to.have.been.calledOnce;
    });

    it('should release on triggers', function() {
      var self = this;
      function setup(get, type) {
        var Clazz = Phoenix.Model.extend({});
        Util.cachedSingletonMixin(Clazz, type);

        var instance = Clazz.get(!get);
        expect(!get).to.equal(!instance);
        if (instance) {
          self.spy(instance, 'clear');
        } else {
          self.spy(Clazz, 'release');
        }
        return Clazz;
      }
      function verify(modelCount, emptyCount, otherCount, noneCount) {
        expect(Model.get(true).clear.callCount).to.equal(modelCount, 'model count');
        expect(Empty.get(true).clear.callCount).to.equal(emptyCount, 'empty count');
        expect(Other.get(true).clear.callCount).to.equal(otherCount, 'other count');
        expect(None.release.callCount).to.equal(noneCount, 'none count');
      }

      var Model = setup(true, 'test'),
          Empty = setup(true),
          Other = setup(true),
          None = setup();

      exports.trigger('resetData', {type: 'test'});
      verify(1, 0, 0, 0);

      exports.trigger('resetData', {type: 'all'});
      verify(2, 1, 1, 1);

      exports.trigger('resetData', {});
      verify(3, 2, 2, 2);

      // Note: We can not track release binds on the none instance
      exports.trigger('fatal-error');
      verify(4, 3, 3, 2);

      authentication.trigger('loggedout');
      verify(5, 4, 4, 2);

      authentication.trigger(Connection.SESSION_EXPIRED);
      verify(6, 5, 5, 2);

      var stub = this.stub(authentication, 'isAuthed').returns(true);
      authentication.trigger('session-activity');
      verify(6, 5, 5, 2);
      stub.restore();

      stub = this.stub(authentication, 'isAuthed').returns(false);
      authentication.trigger('session-activity');
      verify(7, 6, 6, 3);
      stub.restore();

      exports.trigger('order:complete');
      verify(8, 7, 7, 3);
    });
  });
});
