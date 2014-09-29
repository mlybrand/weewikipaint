"use strict";

var http = require("http");
var server;

exports.start = function() {
    server = http.createServer();

    server.on("request", function(request, response) {
        response.end("Hello World");
    });

    server.listen(8080);    // TODO: remove duplication of port number
};

exports.stop = function(callback) {
    server.close(callback);
};