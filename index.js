var fs = require('fs');

exports.register = function (servers, config, next) {
  config.phoenix = config.phoenix || {};
  config.phoenix.resources = config.phoenix.resources || [];

  var packageInfo = JSON.parse(fs.readFileSync(__dirname + '/package.json'));
  config.phoenix.resources.push({
    name: packageInfo.name,
    version: packageInfo.version,
    path: __dirname + (packageInfo.release ? '' : '/build/dev')
  });

  return next();
};
