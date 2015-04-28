/*global desc, task, jake, fail, complete, directory */

(function () {
    "use strict";

    var lint = require("./build/lint/lint_runner.js");
    var nodeunit = require("nodeunit").reporters["default"];

    var NODE_VERSION = "v0.8.6";
    var SUPPORTED_BROWSERS = [
        "IE 8.0.0 (Windows XP)",
        "IE 9.0.0 (Windows 7)",
        "Firefox 35.0.0 (Ubuntu)",
        "Chromium 39.0.2171 (Ubuntu)",
        "Chrome 42.0.2311 (Linux)",
        "Safari 5.1.7 (Windows 7)",
        "Opera 26.0.1656 (Linux)"
    ];

    var GENERATED_DIR = "generated";
    var TEMP_TESTFILE_DIR = GENERATED_DIR + "/test";

    directory(TEMP_TESTFILE_DIR);

    desc("Delete all generated files");
    task("clean", [], function () {
        jake.rmRf(GENERATED_DIR);
    });

    desc("Build and test");
    task("default", ["lint", "test"], function() {
        console.log("foo");
        console.log("\n\nOK");
    }, {async: true});

    desc("Start Karma server for testing");
    task("karma", function() {
        sh("node node_modules/.bin/karma start build/karma.conf.js", "Could not start Karma server", complete);
    }, {async: true});

    desc("Lint everything");
    task("lint", ["lintNode", "lintClient"]);

    task("lintNode", ["nodeVersion", TEMP_TESTFILE_DIR], function () {
        var passed = lint.validateFileList(nodeFiles(), nodeLintOptions(), {});
        if (!passed) fail("Lint failed");
    });

    task("lintClient", function () {
        var passed = lint.validateFileList(clientFiles(), browserLintOptions(), {});
        if (!passed) fail("Lint failed");
    });

    desc("Test everything");
    task("test", ["testNode", "testClient"], function() {
        console.log("tests done");
    }, {async: true});

    desc("Test server code");
    task("testNode", ["nodeVersion"], function () {
        nodeunit.run(nodeTestFiles(), null, function (failures) {
            if (failures) fail("Tests failed");
            complete();
        });
    }, {async: true});

    desc("Test client code");
    task("testClient", function () {
        sh("node node_modules/.bin/karma run build/karma.conf.js", "Client tests failed", function (output) {
            var browserMissing = false;
            SUPPORTED_BROWSERS.forEach(function (browser) {
                browserMissing = checkIfBrowserTested(browser, output) || browserMissing;
                //assertBrowserIsTested(browser, output);
            });

            if (browserMissing && !process.env.loose) fail("Did not test all supported browsers (use 'loose=true' to suppress");

            if(output.indexOf("TOTAL: 0 SUCCESS") !== -1) {
                fail("Client tests did not run!");
            }
        });
    }, {async: true});

    function checkIfBrowserTested(browser, output) {
        var missing = output.indexOf(browser + ": Executed") === -1;
        if (missing) console.log(browser + " was not tested!");
        return missing;
    }

    function assertBrowserIsTested(browserName, output) {
        var searchString = browserName + ": Executed";
        var found = output.indexOf(searchString) !== -1;
        if (!found) {
            fail(browserName + " was not tested!");
        } else {
            console.log("Confirmed " + browserName);
        }
    }

    desc("Deploy to Heroku");
    task("deploy", ["default"], function () {
        console.log("1. Make sure 'git status' is clean.");
        console.log("2. 'git push heroku master'");
        console.log("3. 'jake test'");
    });

    desc("Integrate");
    task("integrate", ["default"], function () {
        console.log("1. Make sure 'git status' is clean.");
        console.log("2. Build on the integration box.");
        console.log("   a. Walk over to integration box.");
        console.log("   b. 'git pull'");
        console.log("   c. 'jake'");
        console.log("   d. If jake fails, stop! Try again after fixing the issue.");
        console.log("3. 'git checkout integration'");
        console.log("4. 'git merge master --no-ff --log'");
        console.log("5. 'git checkout master'");
    });

    //desc("Ensure correct version of Node is present");
    task("nodeVersion", [], function () {
        function failWithQualifier(qualifier) {
            fail("Incorrect node version. Expected " + qualifier +
            " [" + expectedString + "], but was [" + actualString + "].");
        }

        var expectedString = NODE_VERSION;
        var actualString = process.version;
        var expected = parseNodeVersion("expected Node version", expectedString);
        var actual = parseNodeVersion("Node version", actualString);

        if (process.env.strict) {
            if (actual[0] !== expected[0] || actual[1] !== expected[1] || actual[2] !== expected[2]) {
                failWithQualifier("exactly");
            }
        } else {
            if (actual[0] < expected[0]) failWithQualifier("at least");
            if (actual[0] === expected[0] && actual[1] < expected[1]) failWithQualifier("at least");
            if (actual[0] === expected[0] && actual[1] === expected[1] && actual[3] < expected[4]) failWithQualifier("at least");
        }
    });

    function parseNodeVersion(description, versionString) {
        var versionMatcher = /^v(\d+)\.(\d+)\.(\d+)$/;
        var versionInfo = versionString.match(versionMatcher);
        if (versionInfo === null) fail("Could not parse " + description + " (was '" + versionString + "')");

        var major = parseInt(versionInfo[1], 10);
        var minor = parseInt(versionInfo[2], 10);
        var bugfix = parseInt(versionInfo[3], 10);
        return [major, minor, bugfix];
    }

    function sh(command, errorMessage, callback) {
        console.log("> " + command);

        var stdout = "";
        var process = jake.createExec(command, {printStdout: true, printStderr: true});

        process.on("stdout", function (chunk) {
            stdout += chunk;
            //console.log(stdout);
        });
        process.on("error", function () {
            fail(errorMessage);
        });
        process.on("cmdEnd", function () {
            callback(stdout);
        });
        process.run();
    }

    function nodeFiles() {
        var javascriptFiles = new jake.FileList();
        javascriptFiles.include("**/*.js");
        javascriptFiles.exclude("node_modules");
        javascriptFiles.exclude("karma.conf.js");
        javascriptFiles.exclude("src/client");
        return javascriptFiles.toArray();
    }

    function nodeTestFiles() {
        var testFiles = new jake.FileList();
        testFiles.include("**/_*_test.js");
        testFiles.exclude("node_modules");
        testFiles.exclude("src/client/**");
        return testFiles.toArray();
    }

    function clientFiles() {
        var javascriptFiles = new jake.FileList();
        javascriptFiles.include("src/client/**/*.js");
        return javascriptFiles.toArray();
    }

    function nodeLintOptions() {
        var options = globalLintOptions();
        options.node = true;
        return options;
    }

    function browserLintOptions() {
        var options = globalLintOptions();
        options.browser = true;
        return options;
    }

    function globalLintOptions() {
        var options = {
            bitwise: true,
            curly: false,
            eqeqeq: true,
            forin: true,
            immed: true,
            latedef: true,
            newcap: true,
            noarg: true,
            noempty: true,
            nonew: true,
            regexp: true,
            undef: true,
            strict: true,
            trailing: true
        };
        return options;
    }

}());
