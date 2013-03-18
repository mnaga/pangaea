before(function() {
  var $superCatch = Phoenix.trackCatch;
  Thorax.onException = Phoenix.trackCatch = function(location, err) {
    $superCatch.apply(this, arguments);
    throw err;
  };
});

exports.testAll = function(f, tests) {
  _.each(tests, function(test) {
    it(test.name, function() {
      expect(f.apply(this, test.input)).to.eql(test.output);
    });
  });
};

