module.exports = function(grunt) {
  grunt.loadNpmTasks('grunt-bg-shell');
  grunt.loadNpmTasks('thorax-inspector');

  grunt.initConfig({
    // allows files to be opened when the
    // Thorax Inspector Chrome extension
    // is installed
    thorax: {
      inspector: {
        background: true,
        editor: "subl",
        livereload: {
          base: './build/dev',
          exts: [
            'html',
            'css',
            'jpg',
            'png',
            'gif',
            'js'
          ]
        },
        paths: {
          views: "./js/views",
          models: "./js/models",
          collections: "./js/collections",
          templates: "./templates"
        }
      }
    },
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
    'thorax:inspector',
    'bgShell:mockData',
    'bgShell:phoenixWatch'
  ]);

  grunt.registerTask('production', [
    'bgShell:mockData',
    'phoenixStart'
  ]);
};