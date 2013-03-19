/*global SessionCache */
describe('SessionCache', function() {
  it('should be able to set property', function() {
    // This primarily tests browsers in private browsing mode
    SessionCache.setItem('test', 'foo');
    expect(SessionCache.getItem('test')).to.equal('foo');

    SessionCache.removeItem('test');
    expect(SessionCache.getItem('test')).to.not.exist;
  });
});
