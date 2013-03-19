/*global Connection */
describe('404 router', function() {
  it('should display on NOT_FOUND_ERROR', function() {
    this.stub(Phoenix, 'setView');

    exports.trigger('fatal-error', Connection.NOT_FOUND_ERROR);
    expect(Phoenix.setView).to.have.been.calledOnce;
    expect(Phoenix.setView.args[0][0].name).to.equal('error-not-found');
  });
});
