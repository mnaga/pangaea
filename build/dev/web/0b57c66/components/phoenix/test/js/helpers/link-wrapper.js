describe('link-wrapper helper', function() {
  var linkWrapper = Handlebars.helpers['link-wrapper'],
      url = Handlebars.helpers.url;

  function options(hash, content) {
    return {
      hash: hash,
      fn: function() {
        return content || 'foo';
      }
    };
  }

  describe('link-wrapper', function() {
    it('should output the input w/o changes', function() {
      expect(linkWrapper(options({})).toString()).to.eql('foo');
    });
  });

  describe('link-wrapper altTagName="bar"', function() {
    it('should output the input wrapped in "bar" tag', function() {
      expect(linkWrapper(options({altTagName: 'bar'})).toString()).to.eql('<bar>foo</bar>');
    });

    it('should output the input wrapped in "bar" tag, with class name', function() {
      expect(linkWrapper(options({altTagName: 'bar', className: 'foo-class'})).toString()).to.eql(
          '<bar class="foo-class">foo</bar>');
    });
  });

  describe('link-wrapper isLink=true', function() {
    it('should output the input wrapped in anchor tag', function() {
      expect(linkWrapper(options({isLink: true, url: 'foo-link'})).toString()).to.eql(
          '<a href="' + url('foo-link') + '">foo</a>');
    });

    it('should output the input wrapped in in anchor tag, with class name', function() {
      expect(linkWrapper(options({isLink: true, url: 'foo-link', className: 'foo-class'})).toString()).to.eql(
          '<a href="' + url('foo-link') + '" class="foo-class">foo</a>');
    });

    it('should output the input wrapped in in anchor tag, with class name, if url is undefined', function() {
      expect(linkWrapper(options({isLink: true, url: undefined, className: 'foo-class'})).toString()).to.eql(
          '<a href="' + url(undefined) + '" class="foo-class">foo</a>');
    });

    it('should output the input wrapped in in anchor tag, with class name, if url is empty', function() {
      expect(linkWrapper(options({isLink: true, url: '', className: 'foo-class'})).toString()).to.eql(
          '<a href="' + url('') + '" class="foo-class">foo</a>');
    });
  });
});
