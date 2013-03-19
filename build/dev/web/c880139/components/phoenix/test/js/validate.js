/*global Validate, valueFromAttrName */
describe('validate', function() {
  describe('validator', function() {
    it('should validate data object attribute', function() {
      expect(Validate.validate(
          {bar: 1},
          {
            foo: {notEmpty: {msg: 'empty'}},
            baz: {same: {as: 'bar', msg: 'same'}}
          }))
        .to.eql([
          {name: 'foo', message: 'empty'},
          {name: ['baz', 'bar'], message: 'same'}
        ]);
    });
    it('should validate multiple fields', function() {
      expect(Validate.validate(
          {bar: 1},
          {
            'foo baz': {notEmpty: {msg: 'empty'}}
          }))
        .to.eql([
          {name: 'foo', message: 'empty'},
          {name: 'baz', message: 'empty'}
        ]);
    });
    it('should execute array objects multiple times', function() {
      expect(Validate.validate(
          {bar: 1},
          {
            foo: {
              same: [
                {as: 'bar', msg: 'same'},
                {as: 'baz', msg: 'same2'}
              ]
            }
          }))
        .to.eql([
          {name: ['foo', 'bar'], message: 'same'}
        ]);
      expect(Validate.validate(
          {baz: 1},
          {
            foo: {
              same: [
                {as: 'bar', msg: 'same'},
                {as: 'baz', msg: 'same2'}
              ]
            }
          }))
        .to.eql([
          {name: ['foo', 'baz'], message: 'same2'}
        ]);
    });
    it('should execute custom validators', function() {
      expect(Validate.validate(
          {bar: 1},
          {
            anyShitYouWant: {
              same: function() { return ['msg']; }
            }
          }))
        .to.eql(['msg']);
    });
    it('should only display one error per field', function() {
      expect(Validate.validate(
          {bar: 1, baz: 1},
          {
            foo: {
              same: [
                {as: 'bar', msg: 'same'},
                {as: 'baz', msg: 'same2'}
              ]
            }
          }))
        .to.eql([
          {name: ['foo', 'bar'], message: 'same'}
        ]);
    });
    it('should handle primitives', function() {
      expect(Validate.validate(
          {bar: 'a', baz: '{', bak: 'k', bat: 'bar'},
          {
            foo: {
              notEmpty: true,
            },
            bar: {
              numeric: true,
            },
            baz: {
              invalidCharacters: true,
            },
            bak: {
              invalidCharacters: /k/,
            },
            bat: {
              pattern: /foo/
            }
          }))
        .to.eql([
          {name: 'foo', message: {format: '{{attribute}} cannot be blank'}},
          {name: 'bar', message: {value: 'a', format: '{{attribute}} must be a number.'}},
          {name: 'baz', message: {value: '{', format: '{{attribute}} cannot contain \'{{value}}\''}},
          {name: 'bak', message: {value: 'k', format: '{{attribute}} cannot contain \'{{value}}\''}},
          {name: 'bat', message: {value: 'bar', format: '{{attribute}} value {{value}} is invalid.'}}
        ]);
    });
  });

  describe('#notEmpty', function() {
    it('should not error with content', function() {
      var options = {fields: ['foo']};
      expect(Validate.notEmpty({foo: 'bar'}, options)).to.eql([]);
      expect(Validate.notEmpty({foo: 0}, options)).to.eql([]);
    });
    it('should error when empty', function() {
      var errors = [{name: 'foo', message: 'foo'}],
          options = {fields: ['foo'], msg: 'foo'};
      expect(Validate.notEmpty({foo: ''}, options)).to.eql(errors);
      expect(Validate.notEmpty({foo: ' '}, options)).to.eql(errors);
      expect(Validate.notEmpty({foo: ' \n\t '}, options)).to.eql(errors);
      expect(Validate.notEmpty({}, options)).to.eql(errors);
    });
  });
  describe('#same', function() {
    var options = {fields: ['foo', 'bar'], msg: 'YOUR SHIT MUST MATCH!'};

    it('should not error if two fields are the same', function() {
      expect(Validate.same({foo: 1, bar: 1}, options)).to.eql([]);
      expect(Validate.same({}, options)).to.eql([]);
      expect(Validate.same({foo: 'a', bar: 'a'}, options)).to.eql([]);

      expect(Validate.same(
          {foo: 'a', bar: 'a', baz: 'a'},
          {fields: ['foo', 'bar', 'baz']}))
        .to.eql([]);
    });
    it('should error if two fields do not match', function() {
      var errors = [{name: ['foo', 'bar'], message: 'YOUR SHIT MUST MATCH!'}];
      expect(Validate.same({foo: 1}, options)).to.eql(errors);
      expect(Validate.same({bar: 1}, options)).to.eql(errors);
      expect(Validate.same({foo: 1, bar: '1'}, options)).to.eql(errors);
      expect(Validate.same({foo: 'asdf', bar: 'jkl;'}, options)).to.eql(errors);

      expect(Validate.same(
          {foo: 'a', bar: 'a', baz: 'b'},
          {fields: ['foo', 'bar', 'baz'], msg: 'YOUR SHIT MUST MATCH!'}))
        .to.eql([{name: ['foo', 'bar', 'baz'], message: 'YOUR SHIT MUST MATCH!'}]);
    });
  });
  describe('#pattern', function() {
    it('should not error when valid', function() {
      var options = {fields: ['foo'], pattern: /abcd/};
      expect(Validate.pattern({foo: 'abcd'}, options)).to.eql([]);

      options = {fields: ['foo'], pattern: /abc/};
      expect(Validate.pattern({foo: 'abcd'}, options)).to.eql([]);
    });
    it('should error when does not match', function() {
      var errors = [{name: 'foo', message: {value: '123', format: 'foo'}}],
          options = {fields: ['foo'], msg: {format: 'foo'}, pattern: /abcd/};
      expect(Validate.pattern({foo: '123'}, options)).to.eql(errors);

      options = {fields: ['foo'], msg: {format: 'foo'}, pattern: /^12$/};
      expect(Validate.pattern({foo: '123'}, options)).to.eql(errors);
    });
    it('should match email', function() {
      expect(Validate.pattern(
          {foo: 'blaz@blaz.me'},
          {fields: ['foo'], pattern: Validate.email}))
        .to.eql([]);
    });
  });
  describe('#invalidCharacters', function() {
    it('should not error when valid', function() {
      var options = {fields: ['foo']};
      expect(Validate.invalidCharacters({foo: 'abcd'}, options)).to.eql([]);
    });
    it('should error when matches', function() {
      var errors = [{name: 'foo', message: {value: '{', format: 'foo'}}],
          options = {fields: ['foo'], msg: {format: 'foo'}};
      expect(Validate.invalidCharacters({foo: '{'}, options)).to.eql(errors);
    });
    it('should pull pattern from options', function() {
      var errors = [{name: 'foo', message: 'foo'}],
          options = {fields: ['foo'], msg: 'foo', pattern: /a/};
      expect(Validate.invalidCharacters({foo: 'a'}, options)).to.eql(errors);

      options = {fields: ['foo'], msg: 'foo', pattern: {foo: /a/}};
      expect(Validate.invalidCharacters({foo: 'a'}, options)).to.eql(errors);

      options = {fields: ['foo'], msg: 'foo', pattern: {bar: /a/}};
      expect(Validate.invalidCharacters({foo: 'a'}, options)).to.eql([]);

      options = {fields: ['foo'], msg: 'foo', pattern: /a/};
      expect(Validate.invalidCharacters({foo: '{'}, options)).to.eql([]);
    });
  });

  describe('#numeric', function() {
    it('should cast to integers', function() {
      var attributes = {foo: '1'};
      expect(Validate.numeric(attributes, {fields: ['foo']})).to.eql([]);
      expect(attributes.foo).to.equal(1);

      attributes = {foo: '-1'};
      expect(Validate.numeric(attributes, {fields: ['foo']})).to.eql([]);
      expect(attributes.foo).to.equal(-1);

      attributes = {foo: '  1   '};
      expect(Validate.numeric(attributes, {fields: ['foo']})).to.eql([]);
      expect(attributes.foo).to.equal(1);

      attributes = {foo: '0'};
      expect(Validate.numeric(attributes, {fields: ['foo']})).to.eql([]);
      expect(attributes.foo).to.equal(0);

      attributes = {foo: '0.1'};
      expect(Validate.numeric(attributes, {fields: ['foo']})).to.eql([]);
      expect(attributes.foo).to.equal(0.1);

      attributes = {foo: 1};
      expect(Validate.numeric(attributes, {fields: ['foo']})).to.eql([]);
      expect(attributes.foo).to.equal(1);
    });
    it('should allow for custom matcher', function() {
      var attributes = {foo: 'a1'};
      expect(Validate.numeric(
          attributes,
          {fields: ['foo'], pattern: /^a(\d+)$/}))
        .to.eql([]);
      expect(attributes.foo).to.equal(1);
    });
    it('should error on mismatch', function() {
      var options = {fields: ['foo'], msg: 'FAIL'},
          error = [{name: 'foo', message: 'FAIL'}];

      var attributes = {foo: 'asdf'};
      expect(Validate.numeric(attributes, options)).to.eql(error);
      expect(attributes.foo).to.equal('asdf');

      attributes = {foo: '1a'};
      expect(Validate.numeric(attributes, options)).to.eql(error);
      expect(attributes.foo).to.equal('1a');

      attributes = {foo: 'a1'};
      expect(Validate.numeric(attributes, options)).to.eql(error);
      expect(attributes.foo).to.equal('a1');
    });
  });
  describe('#range', function() {
    it('should accept a valid input range', function() {
      expect(Validate.range({foo: 1}, {fields: ['foo']})).to.eql([]);
      expect(Validate.range({foo: 1}, {fields: ['foo'], lt: 1.1})).to.eql([]);
      expect(Validate.range({foo: 1}, {fields: ['foo'], lte: 1})).to.eql([]);
      expect(Validate.range({foo: 1}, {fields: ['foo'], gte: 1})).to.eql([]);
      expect(Validate.range({foo: 1}, {fields: ['foo'], gt: 0.9})).to.eql([]);
      expect(Validate.range({foo: -1}, {fields: ['foo'], lt: 0})).to.eql([]);
      expect(Validate.range({foo: -1}, {fields: ['foo'], lte: 0})).to.eql([]);
      expect(Validate.range({foo: 1}, {fields: ['foo'], gte: 0})).to.eql([]);
      expect(Validate.range({foo: 1}, {fields: ['foo'], gt: 0})).to.eql([]);

      expect(Validate.range({foo: 'bar'}, {fields: ['foo']})).to.eql([]);
      expect(Validate.range({foo: 'bar'}, {fields: ['foo'], lt: 'bas'})).to.eql([]);
      expect(Validate.range({foo: 'bar'}, {fields: ['foo'], lte: 'bar'})).to.eql([]);
      expect(Validate.range({foo: 'bar'}, {fields: ['foo'], gte: 'bar'})).to.eql([]);
      expect(Validate.range({foo: 'bar'}, {fields: ['foo'], gt: 'ba'})).to.eql([]);
    });
    it('should error if out of range', function() {
      expect(Validate.range({foo: 1}, {fields: ['foo'], gt: 1.1, msg: 'it died'}))
        .to.eql([{name: 'foo', message: 'it died'}]);
      expect(Validate.range({foo: 0.9}, {fields: ['foo'], gte: 1, msg: 'it died'}))
        .to.eql([{name: 'foo', message: 'it died'}]);
      expect(Validate.range({foo: 1.1}, {fields: ['foo'], lte: 1, msg: 'it died'}))
        .to.eql([{name: 'foo', message: 'it died'}]);
      expect(Validate.range({foo: 1}, {fields: ['foo'], lt: 0.9, msg: 'it died'}))
        .to.eql([{name: 'foo', message: 'it died'}]);
      expect(Validate.range({foo: -1}, {fields: ['foo'], gt: 0, msg: 'it died'}))
        .to.eql([{name: 'foo', message: 'it died'}]);
      expect(Validate.range({foo: -1}, {fields: ['foo'], gte: 0, msg: 'it died'}))
        .to.eql([{name: 'foo', message: 'it died'}]);
      expect(Validate.range({foo: 1}, {fields: ['foo'], lte: 0, msg: 'it died'}))
        .to.eql([{name: 'foo', message: 'it died'}]);
      expect(Validate.range({foo: 1}, {fields: ['foo'], lt: 0, msg: 'it died'}))
        .to.eql([{name: 'foo', message: 'it died'}]);

      expect(Validate.range({foo: 'bar'}, {fields: ['foo'], gt: 'bas', msg: 'it died'}))
        .to.eql([{name: 'foo', message: 'it died'}]);
      expect(Validate.range({foo: 'bar'}, {fields: ['foo'], gte: 'bas', msg: 'it died'}))
        .to.eql([{name: 'foo', message: 'it died'}]);
      expect(Validate.range({foo: 'bar'}, {fields: ['foo'], lte: 'ba', msg: 'it died'}))
        .to.eql([{name: 'foo', message: 'it died'}]);
      expect(Validate.range({foo: 'bar'}, {fields: ['foo'], lt: 'ba', msg: 'it died'}))
        .to.eql([{name: 'foo', message: 'it died'}]);
    });
  });

  describe('#valueFromAttrName', function() {
    it('should lookup simple values', function() {
      expect(valueFromAttrName({foo: 123}, 'foo')).to.equal(123);
      expect(valueFromAttrName({foo: 0}, 'foo')).to.equal(0);
    });
    it('should lookup nested values', function() {
      expect(valueFromAttrName({baz: {foo: 123}}, 'baz[foo]')).to.equal(123);
      expect(valueFromAttrName({baz: {bar: {foo: 123}}}, 'baz[bar][foo]')).to.equal(123);
    });
    it('should handle missing fields', function() {
      expect(valueFromAttrName({foo: 123}, 'bar')).to.equal('');
      expect(valueFromAttrName({baz: {foo: 123}}, 'bar')).to.equal('');
      expect(valueFromAttrName({baz: {foo: 123}}, 'bar[baz]')).to.equal('');
      expect(valueFromAttrName({baz: {foo: 123}}, 'baz[foo][bat]')).to.equal('');
    });
  });
});
