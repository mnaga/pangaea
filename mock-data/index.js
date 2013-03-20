var express = require('express'),
    fs = require('fs'),
    path = require('path');

var server = express();

fs.readdir(path.join(__dirname, 'json'), function(e, results) {
  results.forEach(function(file) {
    server.get('/' + file, function(request, response) {
      setTimeout(function() {
        var fileData = fs.readFileSync(path.join(__dirname, 'json', file)).toString();
        response.send(request.query.callback + '(' + fileData + ')');
      }, 500);
    });
  });
});

server.listen('8008');