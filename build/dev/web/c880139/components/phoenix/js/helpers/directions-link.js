function directionsLink(address) {
  // Android will default to current location, iOS < 6 needs 'Current Location' explicitly
  // iOS 6 does not support passing the current location flag but the user can select
  // this easily if we do not include it.
  var start = '';
  if ($.os.ios && parseFloat($.os.version) < 6) {
    start = 'saddr=Current+Location&';
  }
  return 'http://maps.apple.com/maps?' + start + 'daddr=' + encodeURIComponent([
    address.street1 + (address.street2 ? ' ' + address.street2 : ''),
    address.city,
    address.state,
    address.zip
  ].join(','));
}

Handlebars.registerHelper('directions-link', directionsLink);
