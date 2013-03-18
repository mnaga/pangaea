/*global Connection, isUnloading:true, unloadTracker, unloadTrackerCount:true */
afterEach(function() {
  isUnloading = false;
  unloadTrackerCount = 0;
  window.removeEventListener('beforeunload', unloadTracker, false);
});
describe('connection/unload', function() {
  var model, options;
  beforeEach(function() {
    model = new Thorax.Model();
    options = {};

    this.stub(exports, 'setView');
    this.stub(window, 'addEventListener', function() {});
    this.stub(window, 'removeEventListener', function() {});
  });

  // Warn this test does not work under phantom. Disabling for now.
  it.skip('should manage listener lifetime', function() {
    Connection.ajax.call(model, options);
    expect(window.addEventListener).to.have.been.calledOnce;
    expect(window.addEventListener).to.have.been.calledWith('beforeunload', unloadTracker, false);

    Connection.ajax.call(model, options);
    expect(unloadTrackerCount).to.equal(2);
    expect(window.addEventListener).to.have.been.calledOnce;

    this.requests[1].respond(200, {}, '{}');
    expect(unloadTrackerCount).to.equal(1);
    expect(window.removeEventListener).to.not.have.been.called;

    this.requests[0].respond(200, {}, '{}');
    expect(window.removeEventListener).to.have.been.calledOnce;
    expect(window.removeEventListener).to.have.been.calledWith('beforeunload', unloadTracker, false);
  });
  it('should mark as unloading', function() {
    expect(isUnloading).to.be.false;
    unloadTracker();
    expect(isUnloading).to.be.true;
  });
  it('should not ignore connection errors when unloading', function() {
    this.stub(exports, 'trackError');

    var error = options.error = this.spy();
    Connection.ajax.call(model, options);
    this.requests[0].respond(0, {}, '');

    expect(error).to.have.been.calledOnce;
  });
  it('should ignore connection errors when unloading', function() {
    this.stub(exports, 'trackError');
    unloadTracker();

    var error = options.error = this.spy();
    Connection.ajax.call(model, options);
    this.requests[0].respond(0, {}, '');

    expect(error).to.not.have.been.called;
  });
});
