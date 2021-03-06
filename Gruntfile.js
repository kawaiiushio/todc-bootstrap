/* jshint node: true */

module.exports = function (grunt) {
  'use strict';

  // Force use of Unix newlines
  grunt.util.linefeed = '\n';

  RegExp.quote = function (string) {
    return string.replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&')
  }

  var fs = require('fs')

  // Project configuration.
  grunt.initConfig({

    // Metadata.
    pkg: grunt.file.readJSON('package.json'),
    banner: '/*!\n' +
              ' * TODC Bootstrap v<%= pkg.version %> (<%= pkg.homepage %>)\n' +
              ' * Copyright <%= grunt.template.today("yyyy") %> <%= pkg.author %>\n' +
              ' * Licensed under <%= _.pluck(pkg.licenses, "type") %> (<%= _.pluck(pkg.licenses, "url") %>)\n' +
              ' */\n',
    jqueryCheck: 'if (typeof jQuery === "undefined") { throw new Error("Bootstrap requires jQuery") }\n\n',

    // Bootstrap variables
    bootstrapDir: 'bootstrap',
    bootstrapGit: 'https://github.com/twbs/bootstrap.git',
    bootstrapVersion: 'v3.1.0',

    // Task configuration.
    clean: {
      dist: ['dist']
    },

    jshint: {
      options: {
        jshintrc: 'js/.jshintrc'
      },
      gruntfile: {
        src: 'Gruntfile.js'
      },
      assets: {
        src: 'docs/assets/js/application.js'
      }
    },

    jscs: {
      options: {
        config: 'js/.jscs.json',
      },
      gruntfile: {
        src: ['Gruntfile.js']
      },
      src: {
        src: ['docs/assets/js/application.js']
      }
    },

    csslint: {
      options: {
        csslintrc: 'less/.csslintrc'
      },
      src: [
        'dist/css/todc-bootstrap.css',
        'docs/assets/css/docs.css'
      ]
    },

    less: {
      compileCore: {
        options: {
          strictMath: true,
          sourceMap: true,
          outputSourceFiles: true,
          sourceMapURL: '<%= pkg.name %>.css.map',
          sourceMapFilename: 'dist/css/<%= pkg.name %>.css.map'
        },
        files: {
          'dist/css/<%= pkg.name %>.css': 'less/todc-bootstrap.less'
        }
      },
      minify: {
        options: {
          cleancss: true,
          report: 'min'
        },
        files: {
          'dist/css/<%= pkg.name %>.min.css': 'dist/css/<%= pkg.name %>.css'
        }
      }
    },

    usebanner: {
      dist: {
        options: {
          position: 'top',
          banner: '<%= banner %>'
        },
        files: {
          src: [
            'dist/css/<%= pkg.name %>.css',
            'dist/css/<%= pkg.name %>.min.css',
          ]
        }
      }
    },

    csscomb: {
      sort: {
        options: {
          config: 'less/.csscomb.json'
        },
        files: {
          'dist/css/<%= pkg.name %>.css': ['dist/css/<%= pkg.name %>.css']
        }
      }
    },

    copy: {
      bootstrap: {
        expand: true,
        flatten: false,
        cwd: '<%= bootstrapDir %>/dist',
        src: '**',
        dest: 'dist'
      },
      docs: {
        expand: true,
        cwd: './dist',
        src: [
          '{css,js}/*.min.*',
          'css/*.map',
          'fonts/*',
          'img/*'
        ],
        dest: 'docs/dist'
      },
      images: {
        expand: true,
        src: ['img/*'],
        dest: 'dist'
      }
    },

    compress: {
      main: {
        options: {
          archive: 'dist/<%= pkg.name %>-<%= pkg.version %>-dist.zip',
          mode: 'zip',
          pretty: true
        },
        expand: true,
        cwd: 'dist',
        src: '**',
        dest: 'todc-bootstrap/'
      }
    },

    jekyll: {
      docs: {}
    },

    validation: {
      options: {
        charset: 'utf-8',
        doctype: 'HTML5',
        failHard: true,
        reset: true,
        relaxerror: [
          'Bad value X-UA-Compatible for attribute http-equiv on element meta.',
          'Element img is missing required attribute src.'
        ]
      },
      files: {
        src: ['_gh_pages/**/*.html']
      }
    },

    watch: {
      less: {
        files: 'less/*.less',
        tasks: ['less']
      }
    },

    // checkout-bootstrap task
    shell: {
      gitclone: {
        command: 'git clone <%= bootstrapGit %> <%= bootstrapDir %>',
        options: {
          failOnError: true,
          stderr: true,
          stdout: true
        }
      },
      gitcheckout: {
        command: 'git checkout tags/<%= bootstrapVersion %>',
        options: {
          stderr: true,
          stdout: true,
          execOptions: {
            cwd: '<%= bootstrapDir %>'
          }
        }
      }
    },

    sed: {
      versionNumber: {
        pattern: (function () {
          var old = grunt.option('oldver')
          return old ? RegExp.quote(old) : old
        })(),
        replacement: grunt.option('newver'),
        recursive: true
      }
    }
  });


  // These plugins provide necessary tasks.
  require('load-grunt-tasks')(grunt, {scope: 'devDependencies'});

  // Clone bootstrap and checkout the appropriate tag task.
  grunt.registerTask('checkout-bootstrap', ['shell']);

  // Docs HTML validation task
  grunt.registerTask('validate-html', ['jekyll', 'validation']);

  // Test task.
  var testSubtasks = ['dist-css', 'jshint', 'jscs', 'validate-html'];
  grunt.registerTask('test', testSubtasks);

  // CSS distribution task.
  grunt.registerTask('dist-css', ['less', 'csscomb', 'usebanner', 'dist-docs']);

  // Docs distribution task.
  grunt.registerTask('dist-docs', ['copy:docs']);

  // // Full distribution task.
  // grunt.registerTask('dist', ['clean', 'dist-css', 'dist-fonts', 'dist-js']);
  grunt.registerTask('dist', ['clean', 'dist-css', 'copy']);

  // // Default task.
  grunt.registerTask('default', ['test', 'dist', 'build-glyphicons-data']);

  // Version numbering task.
  // grunt change-version-number --oldver=A.B.C --newver=X.Y.Z
  // This can be overzealous, so its changes should always be manually reviewed!
  grunt.registerTask('change-version-number', ['sed']);

  grunt.registerTask('build-glyphicons-data', function () {
    // Pass encoding, utf8, so `readFileSync` will return a string instead of a
    // buffer
    var glyphiconsFile = fs.readFileSync('bootstrap/less/glyphicons.less', 'utf8')
    var glpyhiconsLines = glyphiconsFile.split('\n')

    // Use any line that starts with ".glyphicon-" and capture the class name
    var iconClassName = /^\.(glyphicon-[^\s]+)/
    var glyphiconsData = '# This file is generated via Grunt task. **Do not edit directly.** \n' +
                         '# See the \'build-glyphicons-data\' task in Gruntfile.js.\n\n';
    for (var i = 0, len = glpyhiconsLines.length; i < len; i++) {
      var match = glpyhiconsLines[i].match(iconClassName)

      if (match != null) {
        glyphiconsData += '- ' + match[1] + '\n'
      }
    }

    // Create the `_data` directory if it doesn't already exist
    if (!fs.existsSync('docs/_data')) fs.mkdirSync('docs/_data')

    fs.writeFileSync('docs/_data/glyphicons.yml', glyphiconsData)
  });
};
