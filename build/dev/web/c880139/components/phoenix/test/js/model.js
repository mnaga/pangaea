describe('model', function() {
  it('changes should trigger needsUpdate', function() {
    var Model = exports.Model.extend({
      url: 'dummy'
    });
    var model = new Model();
    expect(model.shortCircuitUpdate()).to.be.true;
    model.set({foo: 'foo'});
    expect(model.shortCircuitUpdate()).to.be.false;

    var spy = this.spy();
    model.save({foo: 'bars'}, {success: spy});
    expect(this.requests.length, 1);
    expect(model.shortCircuitUpdate()).to.be.false;

    this.requests[0].respond(200, {},  '{"foo": "bars"}');
    expect(spy).to.have.been.called;

    model.set({foo: 'bar'}, {silent: true});
    expect(model.shortCircuitUpdate()).to.be.false;
  });
});
