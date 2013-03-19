_.extend(Phoenix, {
  platformName: 'asda-mweb',
  useNativeScroll: function() {
    return $.os.ios && parseInt($.os.version, 10) >= 5;
  },
  wwwUrl: function(url) {
    url = url || '/';
    url += (url.indexOf('?') !== -1 ? '&' : '?') + 'adid=1500000000000012981640';
    url += '&veh=mweb';
    return 'http://' + Phoenix.config.wwwHost + '/msharbor' + url;
  }
});
