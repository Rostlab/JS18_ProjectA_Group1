module.exports = function(config) {
  config.set({
    files: [
      // App entry point
      '../public/js/application.js',
      // Unit tests
      'test/unit/**/*.test.js'
    ],

    autoWatch: true,

    frameworks: ['mocha', 'chai'],

    browsers: ['PhantomJS'],

    plugins: [
      'karma-phantomjs-launcher',
      'karma-mocha',
      'karma-chai',
      'karma-coverage'
    ],

    reporters: ['progress', 'coverage'],

    preprocessors: {
      'app.js': ['coverage']
    },

    coverageReporter: {
      type: 'lcov',
      dir: 'test',
      subdir: 'coverage'
    }
  });
};
