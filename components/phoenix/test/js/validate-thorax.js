/*global Validate, View */
describe('validate-thorax', function() {
  it('should execute validation methods', function() {
    this.stub(Validate, 'validate', function() { return [ 1, 2 ]; });

    var view = new View();
    view.model = {
      validateInput: this.spy(function() { return [ 3, 4 ]; }),
      validation: this.spy(function() { return validation; })
    };
    view.validation = this.spy(function() { return validation; });

    var attributes = {},
        errors = [ 5, 6 ],
        validation = {};
    view.trigger('validate', attributes, errors);

    expect(view.validation).to.have.been.calledOnce;
    expect(view.model.validation).to.have.been.calledOnce;
    expect(view.model.validateInput).to.have.been.calledOnce
        .to.have.been.calledWith(attributes);

    expect(Validate.validate).to.have.been.calledTwice
        .to.have.been.calledWith(attributes, validation);

    expect(errors).to.eql([ 5, 6, 3, 4, 1, 2, 1, 2 ]);
  });
});
