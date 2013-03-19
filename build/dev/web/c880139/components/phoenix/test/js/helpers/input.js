/*global i18n:true */
describe('input helpers', function() {
  var os = $.os,
      _i18n = i18n,
      input = Handlebars.helpers.input,
      textarea = Handlebars.helpers.textarea,
      select = Handlebars.helpers.select;

  beforeEach(function() {
    var counter = 0;
    this.stub(_, 'uniqueId', function() { return 'foo' + counter++; });
  });
  afterEach(function() {
    $.os = os;
    i18n = _i18n;   // Sinon can not autowire module vars easily
  });

  describe('input helper', function() {
    describe('input type="text"', function() {
      it('should output text type', function() {
        expect(input({hash: {type: 'text', 'form-field': false}}).toString()).to.eql(
            '\n<input type="text" id="foo0">');
        expect(input({hash: {'form-field': false}}).toString()).to.eql(
            '\n<input type="text" id="foo1">');
      });

      it('should output labels', function() {
        i18n = this.mock();
        i18n.once()
            .withArgs('not i18n')
            .returns('i18n!');

        expect(input({hash: {label: 'not i18n'}}).toString()).to.eql(
            '<div class="form-field  text">'
              + '<label class="text-label" for="foo0">i18n!</label>'
              + '\n<input type="text" id="foo0" placeholder="i18n!">'
            + '</div>');
      });
    });

    describe('input type="number"', function() {
      it('should use pattern for ios', function() {
        $.os = {ios: true};
        expect(input({hash: {type: 'number', 'form-field': false}}).toString()).to.eql(
            '\n<input type="text" pattern="[0-9]*" id="foo0">');
      });
      it('should use number for android', function() {
        $.os = {android: true};
        expect(input({hash: {type: 'number', 'form-field': false}}).toString()).to.eql(
            '\n<input type="number" pattern="[0-9]*" id="foo0">');
      });
    });

    describe('input type="password"', function() {
      it('should disable auto fields', function() {
        expect(input({hash: {type: 'password', 'form-field': false}}).toString()).to.eql(
            '\n<input type="password" autocapitalize="off" autocomplete="off" autocorrect="off" id="foo0">');
      });
    });

    describe('input type="checkbox"', function() {
      it('should output text type', function() {
        expect(input({hash: {type: 'checkbox', 'form-field': false}}).toString()).to.eql(
            '\n<input type="checkbox" id="foo0">');
      });

      it('should output labels', function() {
        i18n = this.mock();
        i18n.once()
            .withArgs('not i18n')
            .returns('i18n!');

        expect(input({hash: {type: 'checkbox', label: 'not i18n'}}).toString()).to.eql(
            '<div class="form-field  checkbox">'
              + '\n<input type="checkbox" id="foo0" placeholder="i18n!">'
              + '<label class="text-label" for="foo0">i18n!</label>'
            + '</div>');
      });
    });

    describe('input type="radio"', function() {
      it('should output text type', function() {
        expect(input({hash: {type: 'radio', 'form-field': false}}).toString()).to.eql(
            '\n<input type="radio" id="foo0">');
      });

      it('should output labels', function() {
        i18n = this.mock();
        i18n.once()
            .withArgs('not i18n')
            .returns('i18n!');

        expect(input({hash: {type: 'radio', label: 'not i18n'}}).toString()).to.eql(
            '<div class="form-field  radio">'
              + '\n<input type="radio" id="foo0" placeholder="i18n!">'
              + '<label class="text-label" for="foo0">i18n!</label>'
            + '</div>');
      });
    });

    describe('textarea', function() {
      it('should output textareas', function() {
        expect(input({hash: {type: 'textarea', 'form-field': false}}).toString()).to.eql(
            '\n<textarea id="foo0"></textarea>');
        expect(textarea({hash: {'form-field': false}}).toString()).to.eql(
            '\n<textarea id="foo1"></textarea>');
      });
    });

    describe('select', function() {
      it('should output selects', function() {
        expect(select({hash: {name: 'foo', 'form-field': false}, fn: function(){ return 'abcd'; }}).toString()).to.eql(
            '\n<select name="foo" id="foo0">abcd</select>');
        expect(select({hash: {name: 'foo', 'form-field': false}}).toString()).to.eql(
            '\n<select name="foo" id="foo1"></select>');
      });

      var items = [{id: '1', name: 'foo', key: '2', foo: 'bar'}];
      it('should output select options from a list', function() {
        expect(select({hash: {options: items, 'form-field': false}}).toString()).to.eql(
            '\n<select id="foo0"><option value="1">foo</option></select>');
        expect(select({hash: {options: items, valueProp: 'key', displayProp: 'foo', 'form-field': false}}).toString()).to.eql(
            '\n<select id="foo1"><option value="2">bar</option></select>');
      });

      it('should check the appropriate option', function() {
        expect(select({hash: {options: items, value: "1", 'form-field': false}}).toString()).to.eql(
            '\n<select id="foo0"><option value="1" selected>foo</option></select>');
        expect(select({hash: {options: items, valueProp: 'key', displayProp: 'foo', value: "2", 'form-field': false}}).toString()).to.eql(
            '\n<select id="foo1"><option value="2" selected>bar</option></select>');
        expect(select({hash: {options: items, value: items[0], 'form-field': false}}).toString()).to.eql(
            '\n<select id="foo2"><option value="1" selected>foo</option></select>');
      });
    });
  });
});
