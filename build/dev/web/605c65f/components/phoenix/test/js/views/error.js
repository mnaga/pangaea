/*global Connection */
describe('error view', function() {
  function test(name) {
    return function() {
      this.stub(Phoenix, 'setView');

      exports.trigger('fatal-error', name);
      expect(Phoenix.setView).to.have.been.calledOnce;
      expect(Phoenix.setView.args[0][0].name).to.equal('error');
    };
  }
  it('should display on HTTP_ERROR', test(Connection.HTTP_ERROR));
  it('should display on TIMEOUT_ERROR', test(Connection.TIMEOUT_ERROR));
  it('should display on CONNECTION_ERROR', test(Connection.CONNECTION_ERROR));
  it('should display on PARSER_ERROR', test(Connection.PARSER_ERROR));
  it('should display on MAINTENANCE_ERROR', test(Connection.MAINTENANCE_ERROR));
  it('should display on UNKNOWN_ERROR', test(Connection.UNKNOWN_ERROR));
});
