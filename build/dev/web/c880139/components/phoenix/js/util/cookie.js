function cookieDomain() {
  return '.' + window.location.host.replace(/:.*/, '').split('.').slice(-2).join('.');
}
function setCookie(name, value, maxAge) {
  var expires = '';
  if (maxAge) {
    var date = new Date();
    date.setTime(date.getTime()+maxAge);
    expires = '; expires='+date.toGMTString();
  }
  document.cookie = name + '=' + (value || '') + expires +'; domain=' + cookieDomain() + '; path=/';
}
function clearCookies() {
  var date = new Date();
  date.setTime(date.getTime()-(24*60*60*1000));
  var expires = "; expires="+date.toGMTString()+'; domain=' + cookieDomain() + '; path=/';

  _.each(document.cookie.split(/\s*;\s*/), function(cookie) {
    cookie = cookie.split('=')[0];

    document.cookie = cookie + '=' + expires;
  });
}
