module.exports.config = {
    baseUrl: 'http://127.0.0.1:8080/index_test.html',
    getPageTimeout: 11000,
    allScriptsTimeout: 11000,
    seleniumServerJar: '../../node_modules/protractor/selenium/selenium-server-standalone-2.42.2.jar',
    rootElement: 'body',

    onPrepare: function() {
        browser.manage().window().setSize(1024, 768);
    },

    specs: [
        '../tests/features/**/*.feature'
    ],

    capabilities: {
        'browserName': 'chrome'
    },

    framework: 'cucumber',

    cucumberOpts: {
        require: 'features/support/bootstrap.js',
        format: 'pretty'
    }
};
