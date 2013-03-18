/*global View, i18n */
describe('error-handler: alert', function() {
  beforeEach(function() {
    this.stub(Phoenix, 'alert');
  });

  it('should do nothing on separate views', function() {
    var view = new View();
    view.trigger('error');
    expect(Phoenix.alert).to.not.have.been.called;
  });
  it('should handle errors on activated views', function() {
    var view = new View();
    view.trigger('activated');
    view.trigger('error', []);
    expect(Phoenix.alert).to.have.been.called;
  });
  it('should handle child errors', function() {
    var view = new View(),
        child = new View();
    view._addChild(child);

    view.trigger('activated');
    child.trigger('error', []);
    expect(Phoenix.alert).to.have.been.called;
  });

  it('should show title', function() {
    var view = new View();
    view.trigger('activated');
    view.trigger('error', [{title: 'foo'}]);
    expect(Phoenix.alert).to.have.been.called;
    expect(Phoenix.alert.args[0][0].title).to.equal('foo');
  });
  it('should i18n title', function() {
    var _dictionary = i18n.dictionary;
    i18n.dictionary = {
      'foo': 'YOU FAILED!',
      'foo[1]': 'YOU WIN!'
    };

    var view = new View();
    view.trigger('activated');
    view.trigger('error', [{title: {format: 'foo', count: 1}}]);
    expect(Phoenix.alert).to.have.been.called;
    expect(Phoenix.alert.args[0][0].title).to.equal('YOU WIN!');
    i18n.dictionary = _dictionary;
  });
});
