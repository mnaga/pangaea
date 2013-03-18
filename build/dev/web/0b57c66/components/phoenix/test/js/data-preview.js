/*global Collection, Model, View */
describe('data-preview', function() {
  var view,
      model,
      collection;
  beforeEach(function() {
    view = new View({template: function() { return ''; }});
    model = new Model();
    model.id = 1234;
    model.previewClass = 'order';

    collection = new Collection([model]);
    collection.previewClass = 'law';

    this.stub(exports, 'getView', function() { return view; });
  });

  it('should lookup model', function() {
    view.setModel(model);

    expect(Model.fromCurrent(1234)).to.equal(model);
    expect(Model.fromCurrent(12345)).to.not.exist;
  });
  it('should lookup any model', function() {
    view.bindDataObject('model', model);

    expect(Model.fromCurrent(1234)).to.equal(model);
  });
  it('should lookup from collection', function() {
    view.setCollection(collection);

    expect(Model.fromCurrent(1234)).to.equal(model);
    expect(Model.fromCurrent(12345)).to.not.exist;
  });
  it('should lookup from any collection', function() {
    view.bindDataObject('collection', collection);

    expect(Model.fromCurrent(1234)).to.equal(model);
    expect(Model.fromCurrent(12345)).to.not.exist;
  });

  it('should honor model previewClass', function() {
    view.setModel(model);

    expect(Model.fromCurrent(1234, 'order')).to.equal(model);
    expect(Model.fromCurrent(1234, 'law')).to.not.exist;
  });
  it('should honor collection previewClass', function() {
    view.setCollection(collection);

    expect(Model.fromCurrent(1234, 'order')).to.equal(model);
    expect(Model.fromCurrent(1234, 'law')).to.equal(model);
    expect(Model.fromCurrent(1234, 'foo')).to.not.exist;
  });

  it('should walk into non-helper child views', function() {
    this.spy(View.prototype, 'lookupModel');

    var subView = new View({model: model, template: function() { return ''; }});
    view._addChild(subView);

    Handlebars.helpers.collection({hash: {}, data: {view: view}});
    expect(_.keys(view.children).length).to.equal(2);

    // Expection of 2 due to early termination here
    expect(Model.fromCurrent(1234)).to.equal(model);
    expect(View.prototype.lookupModel).to.have.been.calledTwice;

    // Expectation of 2 (more) due to filtering of helper views
    expect(Model.fromCurrent('not found')).to.not.exist;
    expect(View.prototype.lookupModel.callCount).to.equal(4);
  });

  it('should load immediate values from helpers', function() {
    this.spy(View.prototype, 'lookupModel');

    var subView = new View({template: function() { return ''; }});
    view._addChild(subView);

    Handlebars.helpers.collection({hash: {}, data: {view: view}});
    expect(_.keys(view.children).length).to.equal(2);
    _.values(view.children)[1]._boundDataObjectsByCid[1] = model;

    // Expection of 2 due to early termination here
    expect(Model.fromCurrent(1234)).to.equal(model);
    expect(View.prototype.lookupModel).to.have.been.calledTwice;
  });
});
