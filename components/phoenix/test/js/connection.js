/*global Connection, applyConnectionOptions */

describe('connection', function() {
  var startHandler, dataHandler, errorHandler, endHandler, cacheErrorHandler,
      model,
      event,
      options;
  beforeEach(function() {
    model = new Thorax.Model();
    event = undefined;
    options = {};

    function callback(_event) {
      event = _event;
    }
    startHandler = this.on(Connection, 'start', callback);
    dataHandler = this.on(Connection, 'data', callback);
    errorHandler = this.on(Connection, 'error', callback);
    endHandler = this.on(Connection, 'end', callback);
    cacheErrorHandler = this.on(Connection, 'cache-error', callback);
  });

  describe('#applyConnectionOptions', function() {
    it('should call start event', function() {
      applyConnectionOptions(options, model);
      expect(startHandler).to.have.been.calledOnce;
      expect(event.options).to.equal(options);
    });
    it('should call data event', function() {
      applyConnectionOptions(options, model);
      options.success('data', Connection.SUCCESS, 'xhr');

      expect(dataHandler).to.have.been.calledOnce;
      expect(event.options).to.equal(options);
      expect(event.responseData).to.equal('data');
      expect(event.status).to.equal(Connection.SUCCESS);
      expect(event.xhr).to.equal('xhr');
    });
    it('should call error event', function() {
      var xhr = { onreadystatechange: function() {}, status: 404 };
      this.stub(exports, 'trackError');

      applyConnectionOptions(options, model);
      options.error(xhr, 'puke', 'error!');

      expect(errorHandler).to.have.been.calledOnce;
      expect(event.options).to.equal(options);
      expect(event.errorInfo).to.equal('error!');
      expect(event.status).to.equal('puke');
      expect(event.xhr).to.equal(xhr);
    });
    it('should trigger error events', function() {
      var xhr = { onreadystatechange: function() {}, status: 404 };
      this.stub(Connection, 'isFatal', function() { return true; });
      this.stub(exports, 'trackError');
      var spy = this.on(model, 'error'),
          globalSpy = this.on(exports, 'fatal-error');

      applyConnectionOptions(options, model);
      options.error(xhr, 'puke', 'error!');

      expect(spy).to.have.been.calledWith(model, 'puke', 'error!');
      expect(globalSpy).to.have.been.calledWith('puke', 'error!');
    });
    it('should not trigger fatal-error event', function() {
      var xhr = { onreadystatechange: function() {}, status: 404 };
      this.stub(exports, 'trackError');
      this.stub(Connection, 'isFatal', function() { return false; });
      var spy = this.on(model, 'error'),
          globalSpy = this.on(exports, 'fatal-error');

      applyConnectionOptions(options, model);
      options.error(xhr, 'puke', 'error!');

      expect(spy).to.have.been.calledWith(model, 'puke', 'error!');
      expect(globalSpy).to.not.have.been.called;
    });
    it('should call end event', function() {
      var xhr = { onreadystatechange: function() {} };

      applyConnectionOptions(options, model);
      options.complete(xhr, Connection.SUCCESS);

      expect(endHandler).to.have.been.calledOnce;
      expect(event.options).to.equal(options);
      expect(event.status).to.equal(Connection.SUCCESS);
      expect(event.xhr).to.equal(xhr);
    });
    it('should call cache error event', function() {
      this.stub(exports, 'trackCatch', function() {});
      this.on(Connection, 'start', function(event) {
        event.responseData = 'foo';
      });

      options.success = function() { throw new Error(); };
      applyConnectionOptions(options, model);

      expect(cacheErrorHandler).to.have.been.calledOnce;
      expect(event.options).to.equal(options);
    });
    it('should provide updated data to callbacks', function() {
      var xhr = { status: 200, onreadystatechange: function() {} },
          xhr2 = { status: 200, onreadystatechange: function() {}, v2: true };

      this.stub(exports, 'trackError');
      this.on(Connection, 'data', function(event) {
        event.responseData = 'foo';
        event.status = 'bar';
        event.xhr = xhr2;
      });

      var error = options.error = sinon.spy(),
          complete = options.complete = sinon.spy();
      applyConnectionOptions(options, model);
      options.success('data', Connection.SUCCESS, xhr);
      options.complete(xhr, Connection.SUCCESS);

      // Verify that the data propagated through to complete
      expect(error).to.have.been.calledOnce;
      expect(error).to.have.been.calledWith(xhr2, 'bar');
      expect(complete).to.have.been.calledOnce;
      expect(complete).to.have.been.calledWith(xhr2, 'bar');
      expect(event.responseData).to.equal('foo');
      expect(event.status).to.equal('bar');
      expect(event.xhr).to.equal(xhr2);
    });
  });

  describe('#ajax', function() {
    beforeEach(function() {
      this.stub($, 'ajax');
    });

    it('should call start event', function() {
      Connection.ajax.call(model, options);
      expect(startHandler).to.have.been.calledOnce;
      expect($.ajax).to.have.been.called;
    });
    it('should handle cached responses', function() {
      var cacheHelper = sinon.spy(function(options) {
        options.responseData = {foo: true};
      });
      afterEach(function() {
        Connection.off('start', cacheHelper);
      });
      this.on(Connection, 'start', cacheHelper);
      var success = options.success = sinon.spy();

      Connection.ajax.call(model, options);
      expect(success).to.have.been.calledWith({foo: true}, Connection.SUCCESS);
      expect($.ajax).to.not.have.been.called;
    });

    it('should handle invalidate flag', function() {
      $.ajax.restore();
      this.stub(Connection, 'invalidate');

      options.invalidate = true;

      var event;
      model.invalidateUrl = function(_event) {
        event = _event;
        expect(this).to.equal(model);
        expect(event).to.exist;
        return 'invalidate!';
      };

      Connection.ajax.call(model, options);
      this.requests[0].respond(200, {}, '{}');

      expect(Connection.invalidate).to.have.been.calledOnce
          .to.have.been.calledWith('invalidate!', event.options);
    });
  });

  describe('#sync', function() {
    beforeEach(function() {
      this.stub(Thorax, 'sync', function() {});
      options.url = 'foo';
    });

    it('should call start event', function() {
      Connection.sync.call(model, 'get', model, options);
      expect(startHandler).to.have.been.calledOnce;
      expect(Thorax.sync).to.have.been.calledOnce;
    });
    it('should handle cached responses', function() {
      var cacheHelper = sinon.spy(function(options) {
        options.responseData = {foo: true};
      });
      afterEach(function() {
        Connection.off('start', cacheHelper);
      });
      this.on(Connection, 'start', cacheHelper);
      var success = options.success = sinon.spy(),
          complete = options.complete = sinon.spy();

      Connection.sync.call(model, 'get', model, options);
      expect(success).to.have.been.calledWith({foo: true}, Connection.SUCCESS);
      expect(complete).to.have.been.called;
      expect(Thorax.sync).to.not.have.been.called;
    });
  });

  describe('integration', function() {
    beforeEach(function() {
      this.stub(console, 'error');
    });
    describe('ajax', function() {
      it('should propagate success', function() {
        var success = options.success = sinon.spy();

        Connection.ajax.call(model, options);
        this.requests[0].respond(200, {}, '{"foo": true}');

        expect(success).to.have.been.calledOnce
            .calledWith({foo: true}, 'success', this.requests[0]);
      });
      it('should propagate parse error info', function() {
        this.stub(Phoenix, 'setView');

        var error = options.error = sinon.spy();

        Connection.ajax.call(model, options);
        this.requests[0].respond(200, {}, '{"foo": tru e}');

        expect(error).to.have.been.calledOnce
            .calledWith(this.requests[0], 'parsererror');
      });
    });
    describe('sync', function() {
      beforeEach(function() {
        options.url = 'foo';
      });

      it('should propagate success', function() {
        var success = options.success = sinon.spy();

        Connection.sync.call(model, 'get', model, options);
        this.requests[0].respond(200, {}, '{"foo": true}');

        expect(success).to.have.been.calledOnce
            .calledWith({foo: true}, 'success', this.requests[0]);
      });
      it('should propagate parse error info', function() {
        this.stub(Phoenix, 'setView');

        var error = options.error = sinon.spy();

        Connection.sync.call(model, 'get', model, options);
        this.requests[0].respond(200, {}, '{"foo": tru e}');

        expect(error).to.have.been.calledOnce
            .calledWith(this.requests[0], 'parsererror');
      });
    });
  });
});
