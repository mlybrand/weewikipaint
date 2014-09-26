"use strict";

var http = require("http");

exports.start = function() {
    var server = http.createServer();

    server.on("request", function(request, response) {
        console.log("Received request");
        response.end("foo");
    });

    server.listen(8080);    // TODO: remove duplication of port number
};