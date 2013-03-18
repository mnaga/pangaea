/*global i18n */
describe('i18n', function() {
  beforeEach(function() {
    this.i18n = i18n.dictionary;
    this.locale = i18n.getLocale();

    i18n.dictionary = {
      'foo': 'bar',
      'foo[0]': 'bar none',
      'foo[1]': 'bar one',
      'foo[2]': 'bar two',
      'foo[few]': 'bar few',
      'foo[many]': 'bar many',
      'few[few]': 'few (transformed)',
      'many[many]': 'many (transformed)',
      'hello': 'hello {{name}}',
      'hello[0]': 'hello none {{name}}',

      '_locale': {
        'es': {
          'hello': 'hola {{name}}',
          'foo': 'el bar'
        },
        'es-mx': {
          'foo': 'el bar-mx'
        }
      }
    };
  });
  afterEach(function() {
    i18n.dictionary = this.i18n;
    i18n.setLocale(this.locale && this.locale.language, this.locale && this.locale.country);
  });

  it('No Plurality', function() {
    expect(i18n('baz')).to.equal('baz');
    expect(i18n('foo')).to.equal('bar');
  });

  it('Default value', function() {
    expect(i18n('baz', -1, 'bar')).to.equal('bar');
  });

  it('Dynamic', function() {
    // dynamic
    expect(i18n.call({name: 'Joe'}, 'hello')).to.equal('hello {{name}}');
  });

  it('Expand Token', function() {
    expect(i18n.call({name: 'Joe'}, 'hello', {'expand-tokens': true})).to.equal('hello Joe');
    expect(i18n.call({name: 'Joe'}, 'hello', {hash: {'expand-tokens': true}})).to.equal('hello Joe');
    expect(i18n.call({name: 'Joe'}, 'hello', -1, {hash: {'expand-tokens': true}})).to.equal('hello Joe');
    expect(i18n.call({name: 'Joe'}, 'hello', -1, 'foo', {hash: {'expand-tokens': true}})).to.equal('hello Joe');
  });

  it('Expand token with multiple tokens', function() {
    expect(i18n.call({name: 'Joe', value: 'Tester'}, '{{name}} {{value}}', {'expand-tokens': true})).to.equal('Joe Tester');
  });

  it('Expand tokens only operates one level', function() {
    expect(i18n.call({name: 'J{{oh}}e', oh: 'fuck'}, 'hello', {'expand-tokens': true})).to.equal('hello J{{oh}}e');
  });

  it('Static Plurality', function() {
    expect(i18n('foo', 0)).to.equal('bar none');
    expect(i18n('foo', 1)).to.equal('bar one');
    expect(i18n('foo', 2)).to.equal('bar two');
    expect(i18n('foo', 3)).to.equal('bar few');
    expect(i18n('foo', 10)).to.equal('bar many');
  });

  it('Few Fallbacks', function() {
    expect(i18n('few', 0)).to.equal('few (transformed)');
    expect(i18n('few', 1)).to.equal('few');
    expect(i18n('few', 2)).to.equal('few (transformed)');
    expect(i18n('few', 10)).to.equal('few');
  });

  it('Many Fallbacks', function() {
    expect(i18n('many', 0)).to.equal('many (transformed)');
    expect(i18n('many', 1)).to.equal('many');
    expect(i18n('many', 2)).to.equal('many (transformed)');
    expect(i18n('many', 3)).to.equal('many (transformed)');
  });

  it('locale', function() {
    i18n.setLocale('es', 'mx'); // spanish language, mexico country

    expect(i18n.call({name: 'Joe'}, 'hello')).to.equal('hola {{name}}');
    expect(i18n.call({name: 'Joe'}, 'hello', {hash: {'expand-tokens': true}})).to.equal('hola Joe');
    expect(i18n('foo')).to.equal('el bar-mx');
  });
});
