/*global Util, Validate, View */
View.on({
  validate: function(attributes, errors) {
    // Allow procedural validation on models
    if (this.model && this.model.validateInput) {
      errors.push.apply(
        errors,
        this.model.validateInput(attributes) || []);
    }

    // Parameter-based validation on the validation fields
    var validation = Util.valueOf(this.validation, this);
    if (validation) {
      errors.push.apply(
        errors,
        Validate.validate(attributes, validation));
    }

    if (this.model) {
      validation = Util.valueOf(this.model.validation, this);
      if (validation) {
        errors.push.apply(
          errors,
          Validate.validate(attributes, validation));
      }
    }
  }
});

