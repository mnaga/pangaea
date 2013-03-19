/*global cleanHTML */
describe('markup-helpers', function() {
  describe('#cleanHTML', function() {
    // TODO : Additional testing for the various cleanHTML cases
    it('should remove scripts', function() {
      expect(cleanHTML('foo<script>really?</script>foo')).to.equal('foofoo');
    });

    it('should clean screwy encoding', function() {
      expect(cleanHTML('\uFFFDfoo\uFFFDfoo')).to.equal(' foo foo');
    });
  });
});
