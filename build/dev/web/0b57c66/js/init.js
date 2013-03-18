_.extend(Phoenix, {
  platformName: 'asda-mweb',
  useNativeScroll: function() {
    return $.os.ios && parseInt($.os.version, 10) >= 5;
  }
});
