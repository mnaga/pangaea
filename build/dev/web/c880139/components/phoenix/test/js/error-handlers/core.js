/*global FIELD_ERROR_CLASS, Collection, Model, View, applyErrors, i18n, markErrorState, sortErrors */
describe('error-handler: core', function() {
  var fixture;
  beforeEach(function() {
    fixture = $('<div>');
    fixture.html(
      '<input name="foo" aria-label="5">'
      + '<textarea id="bar" name="bar"></textarea>'
      + '<label for="bar">7</label>'
      + '<label>'
        + '6'
        + '<select name="baz"></select>'
      + '</label>');
    $('#qunit-fixture').append(fixture);
  });
  afterEach(function() {
    fixture.remove();
  });

  function state() {
    return fixture.children().map(function() {
      return $(this).hasClass(FIELD_ERROR_CLASS);
    });
  }

  describe('error propagation', function() {
    it('should propagate errors up the stack', function() {
      var view = new View(),
          child = new View(),
          grandChild = new View(),
          spy = this.spy();

      child.errorHandler = this.spy();
      child._addChild(grandChild);
      view._addChild(child);

      child.on('error', spy);
      view.on('error', spy);

      grandChild.trigger('error', []);
      expect(spy).to.have.been.calledTwice;
      expect(child.errorHandler).to.have.been.calledOnce;
    });
    it('should stop error propagation if handled', function() {
      var view = new View(),
          child = new View(),
          grandChild = new View(),
          spy = this.spy();

      child.errorHandler = this.spy(function() { return false; });
      child._addChild(grandChild);
      view._addChild(child);

      child.on('error', spy);
      view.on('error', spy);

      grandChild.trigger('error', []);
      expect(spy).to.have.been.calledOnce;
      expect(child.errorHandler).to.have.been.calledOnce;
    });

    it('should handle forwarded collection errors', function() {
      var collection = new Collection(),
          view = new View({template: function() { return ''; }}),
          spy = this.spy();
      view.on('error', spy);
      view.bindDataObject('collection', collection);
      collection.trigger('error', collection, '1234');

      expect(spy)
          .to.have.been.calledOnce
          .to.have.been.calledWith('1234', collection);
    });
    it('should handle forwarded model errors', function() {
      var model = new Model(),
          view = new View({template: function() { return ''; }}),
          spy = this.spy();
      view.on('error', spy);
      view.bindDataObject('model', model);
      model.trigger('error', model, '1234');

      expect(spy)
          .to.have.been.calledOnce
          .to.have.been.calledWith('1234', model);
    });
  });

  describe('#applyErrors', function() {
    it('should handle non-field messages', function() {
      expect(applyErrors(fixture, [
          {message: 'foo!'}
        ])).to.eql({messages: ['foo!']});
      expect(state()).to.eql([false, false, false, false]);
    });
    it('should handle field messages', function() {
      expect(applyErrors(fixture, [
          {message: 'foo!', name: 'bar'}
        ])).to.eql({messages: ['foo!']});
      expect(state()).to.eql([false, true, true, false]);
    });
    it('should handle formated field messages', function() {
      expect(applyErrors(fixture, [
          {message: {format: 'foo!{{attribute}}'}, name: 'bar'}
        ])).to.eql({messages: ['foo!7']});
      expect(state()).to.eql([false, true, true, false]);
    });
    it('should handle multiple field messages', function() {
      expect(applyErrors(fixture, [
          {message: 'first!'},
          {message: {format: 'foo!{{attribute}}'}, name: ['foo', 'bar']},
          {message: {format: 'foo!{{attribute}}'}, name: ['bar', 'foo']}
        ])).to.eql({messages: ['first!', 'foo!5', 'foo!5']});
      expect(state()).to.eql([true, true, true, false]);
    });
    it('should handle counts', function() {
      var _dictionary = i18n.dictionary;
      i18n.dictionary = {
        'foo': 'YOU FAILED!',
        'foo[1]': 'YOU WIN!'
      };

      expect(applyErrors(fixture, [{message: {format: 'foo', count: 1}}]))
          .to.eql({messages: ['YOU WIN!']});
      i18n.dictionary = _dictionary;
    });
  });

  describe('field error state', function() {
    it('should mark fields as errored', function() {
      expect($('input,textarea,select', fixture).map(function() {
          return markErrorState(this);
        })).to.eql(['5', '7', '6']);
      expect(state()).to.eql([true, true, true, true]);
    });
    it('should toggle error state on edit', function() {
      // Create a view for error handling here
      new View({el: fixture});

      fixture.children().addClass(FIELD_ERROR_CLASS);
      expect(state()).to.eql([true, true, true, true]);

      fixture.find('[name=bar]').trigger('change');
      expect(state()).to.eql([true, false, false, true]);

      fixture.find('[name=baz]').trigger('keypress');
      expect(state()).to.eql([true, false, false, false]);
    });
  });

  describe('#sortErrors', function() {
    it('should sort errors by DOM order', function() {
      expect(sortErrors(fixture, [{name: 'foo'}, {name: 'bar'}, {name: 'baz'}]))
          .to.eql([{name: 'foo'}, {name: 'bar'}, {name: 'baz'}]);
      expect(sortErrors(fixture, [{name: 'baz'}, {name: 'foo'}, {name: 'bar'}]))
          .to.eql([{name: 'foo'}, {name: 'bar'}, {name: 'baz'}]);
    });
    it('should sort multiple field errors based on the first entry', function() {
      expect(sortErrors(fixture, [{name: 'foo'}, {name: 'bar'}, {name: ['baz', 'foo']}]))
          .to.eql([{name: 'foo'}, {name: ['foo', 'baz']}, {name: 'bar'}]);
    });
    it('should put missing errors at the top', function() {
      expect(sortErrors(fixture, [{name: 'baz'}, {name: 'foo'}, {name: 'bat'}]))
          .to.eql([{name: 'bat'}, {name: 'foo'}, {name: 'baz'}]);
    });
  });
});
