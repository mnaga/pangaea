/*global Connection */
describe('connection/outofband', function() {
  var started = Backbone.History.started;
  beforeEach(function() {
    this.model = new Phoenix.Model({url: 'foo'});
  });
  after(function() {
    Backbone.History.started = started;
  });

  it('route change during connection marks as aborted', function() {
    Backbone.History.started = true;

    var fragment = 'foo';
    this.stub(Backbone.history, 'getFragment', function() { return fragment; });

    Connection.ajax.call(this.model, {});
    fragment = 'bar';
    this.requests[0].respond(200, {}, '{}');

    expect(this.model._aborted).to.be.true;
  });
});
