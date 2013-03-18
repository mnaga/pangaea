var build = require('phoenix-build');

build.projectDir = __dirname;
build.generatePackage = true;
build.mochaTests = true;
build.serverName = function(server) {
  if (server) {
    return 'mobile-e' + server + '.walmart.com';
  } else {
    return 'mobile.walmart.com';
  }
};
build.testPlatforms = [
  {platform: 'web', webOnly: true},
  {platform: 'web', androidUA: true},
  {platform: 'android', androidUA: true},
  {platform: 'iphone'},
  {platform: 'ipad'}
];
