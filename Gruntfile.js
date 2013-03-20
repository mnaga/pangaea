module.exports = function(grunt) {
  grunt.loadNpmTasks('grunt-bg-shell');

  grunt.initConfig({
    bgShell: {
      _defaults: {
        bg: true
      },
      mockData: {
        cmd: 'node mock-data/index.js'
      },
      phoenixStart: {
        cmd: 'jake start',
        bg: false
      },
      phoenixWatch: {
        cmd: 'jake watch',
        bg: false
      }
    }
  });

  grunt.registerTask('default', [
    'bgShell:mockData',
    'bgShell:phoenixWatch'
  ]);

  grunt.registerTask('production', [
    'mockData',
    'phoenixStart'
  ]);
};