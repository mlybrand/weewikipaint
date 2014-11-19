// launch the server in the same way it happens in production
// get a page
// confirm we got something

(function () {
    "use strict";

    var child_process = require("child_process");
    var http = require("http");
    var fs = require("fs");
    var procfile = require("procfile");
    var child;

    exports.setUp = function(done) {
        runServer(done);
    };

    exports.tearDown = function(done) {
        child.on("exit", function(code, signal) {
            done();
        });
        child.kill();
    };

    exports.test_canGetHomePage = function (test) {
        httpGet("http://localhost:5000", function (response, receivedData) {
            var foundHomePage = receivedData.indexOf("WeeWikiPaint home page") !== -1;
            test.ok(foundHomePage, "home page should have contained test marker");
            test.done();
        });
    };

    // TODO: Factor out common server name
    exports.test_canGet404Page = function(test) {
        httpGet("http://localhost:5000/nonexistent.html", function (response, receivedData) {
            var foundHomePage = receivedData.indexOf("WeeWikiPaint 404 page") !== -1;
            test.ok(foundHomePage, "404 page should have contained test marker");
            test.done();
        });
    };

    function runServer(callback) {
        var commandLine = parseProcFile();
        child = child_process.spawn(commandLine.command, commandLine.options);
        child.stdout.setEncoding("utf8");
        child.stdout.on("data", function(chunk) {
            if (chunk.trim().indexOf("Server started") !== -1) callback();
        });
    }

    function parseProcFile() {
        var fileData = fs.readFileSync("Procfile", "utf8");
        var webCommand = procfile.parse(fileData).web;
        webCommand.options = webCommand.options.map(function(element) {
            if (element === "$PORT") return "5000";
            else return element;
        });
        return webCommand;
    }

    function httpGet(url, callback) {
        var request = http.get(url);
        request.on("response", function (response) {
            var receivedData = "";
            response.setEncoding("utf8");

            response.on("data", function (chunk) {
                receivedData += chunk;
            });
            response.on("end", function () {
                callback(response, receivedData);
            });
        });
    }


}());