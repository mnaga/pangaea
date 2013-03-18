/*global Authentication, Connection, authentication:true */
describe('connection/authentication', function() {
  var model, options, success, error;
  beforeEach(function() {
    model = new Thorax.Model();
    options = {authed: true};
    success = options.success = this.spy();
    error = options.error = this.spy();

    this.authentication = authentication;
    authentication = new Authentication();
    authentication.set('loggedIn', true);
  });
  afterEach(function() {
    authentication = this.authentication;
  });

  describe('authenticated', function() {
    beforeEach(function() {
      authentication.set('loggedIn', true);
    });

    it('should not short circuit auth required', function() {
      Connection.ajax.call(model, options);
      this.requests[0].respond(200, {}, '{}');

      expect(success).to.have.been.called;
      expect(error).to.not.have.been.called;
    });
    it('should record authed', function() {
      this.stub(authentication, 'sessionActivity');

      Connection.ajax.call(model, options);
      this.requests[0].respond(200, {}, '{}');

      expect(authentication.sessionActivity).to.have.been.calledWith(true);
      expect(success).to.have.been.called;
      expect(error).to.not.have.been.called;
    });
    it('should record auth expired', function() {
      var event;
      this.stub(exports, 'trackError');
      this.stub(authentication, 'sessionExpired');
      this.on(Connection, 'start', function(_event) { event = _event; });

      authentication.sessionId = 1;

      Connection.ajax.call(model, options);
      event.status = Connection.SESSION_EXPIRED;
      this.requests[0].respond(200, {}, '{}');

      expect(authentication.sessionExpired).to.have.been.calledWith(1);
      expect(success).to.not.have.been.called;
      expect(error).to.have.been.called;
    });
  });
  describe('unauthenticated', function() {
    beforeEach(function() {
      authentication.set('loggedIn', false);
    });

    it('should short circuit auth required', function() {
      this.stub(exports, 'trackError');

      Connection.ajax.call(model, options);
      expect(this.requests.length).to.equal(0);

      expect(success).to.not.have.been.called;
      expect(error).to.have.been.called;
      expect(exports.trackError).to.have.been.calledWith('auth-expired');
    });
    it('should record auth expired', function() {
      var event;
      this.stub(exports, 'trackError');
      this.stub(authentication, 'sessionExpired');
      this.on(Connection, 'start', function(_event) { event = _event; });

      options.authed = false;

      Connection.ajax.call(model, options);
      event.status = Connection.SESSION_EXPIRED;
      this.requests[0].respond(200, {}, '{}');

      expect(authentication.sessionExpired).to.not.have.been.called;
      expect(success).to.not.have.been.called;
      expect(error).to.have.been.called;
    });
  });
  describe('unknown', function() {
    beforeEach(function() {
      authentication.unset('loggedIn');
    });

    it('should not short circuit auth required', function() {
      Connection.ajax.call(model, options);
      this.requests[0].respond(200, {}, '{}');

      expect(success).to.have.been.called;
      expect(error).to.not.have.been.called;
    });
    it('should record authed', function() {
      this.stub(authentication, 'sessionActivity');

      Connection.ajax.call(model, options);
      this.requests[0].respond(200, {}, '{}');

      expect(authentication.sessionActivity).to.have.been.calledWith(true);
      expect(success).to.have.been.called;
      expect(error).to.not.have.been.called;
    });

    it('should record auth expired', function() {
      var event;
      this.stub(exports, 'trackError');
      this.stub(authentication, 'sessionExpired');
      this.on(Connection, 'start', function(_event) { event = _event; });

      options.authed = false;

      Connection.ajax.call(model, options);
      event.status = Connection.SESSION_EXPIRED;
      this.requests[0].respond(200, {}, '{}');

      expect(authentication.sessionExpired).to.have.been.called;
      expect(success).to.not.have.been.called;
      expect(error).to.have.been.called;
    });
  });
});
