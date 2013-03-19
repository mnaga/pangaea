/*global Connection */
describe('connection/error-tracking', function() {
  var model, options;
  beforeEach(function() {
    this.stub(exports, 'trackError');
    this.stub(exports, 'setView');

    model = new Thorax.Model();
    options = {};
  });

  it('should include response text with parsererror', function() {
    var success = options.success = this.spy(),
        error = options.error = this.spy();

    Connection.ajax.call(model, options);
    this.requests[0].respond(200, {}, 'San Diego!');

    expect(success).to.not.have.been.called;
    expect(error).to.have.been.called;
    expect(exports.trackError).to.have.been.calledOnce;
    expect(exports.trackError).to.have.been.calledWith('parsererror', sinon.match(/"responseText":"San Diego!"/));
  });
  it('should include response text with empty parsererror', function() {
    var error = options.error = this.spy();

    Connection.ajax.call(model, options);
    this.requests[0].respond(200, {}, '');

    expect(error).to.have.been.called;
    expect(exports.trackError).to.have.been.calledOnce;
    expect(exports.trackError).to.have.been.calledWith('parsererror', sinon.match(/"responseText":""/));
  });
  it('should mark connection errors as such', function() {
    var event;
    this.on(Connection, 'error', function(_event) {
      event = _event;
    });

    Connection.ajax.call(model, options);
    this.requests[0].respond(0, {}, '');

    expect(event.connectionError).to.be.true;
    expect(event.status).to.equal('connection');
    expect(event.errorInfo).to.be.undefined;
    expect(exports.trackError).to.have.been.calledWith('connection', sinon.match(/"status":0,"responseText":".*online:/));
  });

  it('should not error for ignored', function() {
    var error = options.error = this.spy();
    this.stub(Connection, 'errorHandler');

    options.ignoreErrors = true;
    Connection.ajax.call(model, options);
    this.requests[0].respond(0, {}, '');

    expect(error).to.have.been.called;
    expect(Connection.errorHandler).to.not.have.been.called;
    expect(exports.trackError).to.have.been.calledWith('connection', sinon.match(/"ignored":true/));
  });
  it('should not log aborted', function() {
    Connection.ajax.call(model, options);
    model._aborted = true;

    this.requests[0].respond(0, {}, '');

    expect(exports.trackError).to.not.have.been.called;
  });
  it('should log auth exceptions', function() {
    var event;
    this.on(Connection, 'data', function(_event) {
      event = _event;
      event.status = Connection.SESSION_EXPIRED;
    });

    options.url = 'aurl!';
    Connection.ajax.call(model, options);
    this.requests[0].respond(200, {}, '{}');

    expect(event.status).to.equal(Connection.SESSION_EXPIRED);
    expect(event.errorInfo).to.be.undefined;
    expect(exports.trackError).to.have.been.calledWith('auth-expired', sinon.match(/aurl!/));
  });
});
