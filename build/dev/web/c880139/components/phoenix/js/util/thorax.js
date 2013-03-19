Thorax.Router.create = function(module, props) {
  return module.exports.router = new (Thorax.Router.extend(_.defaults(props, module)))();
};
