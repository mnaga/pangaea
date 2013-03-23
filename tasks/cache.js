var spawn = require('child_process').spawn,
    fs = require('fs');

module.exports = function(grunt) {
  grunt.registerTask('cache', 'scrape stuff', function(term) {
    var done = this.async();
    var jake = spawn('jake', ['start']);
    jake.on('exit', function() {
      done();
    });
    //jake.stdout.on('data', function(data) {
    //  process.stdout.write(data);
    //});
    setTimeout(function() {
      var phantom = spawn('phantomjs',['server/runner.js', term]);
      phantom.stdout.on('data', function(data) {
        process.stdout.write(data);
      });
      phantom.stderr.on('data', function(data) {
        process.stderr.write(data);
      });
      phantom.on('exit', function() {
        jake.kill();
      });
    }, 1000);
  });
};