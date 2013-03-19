var relativePattern = /^(?:https?:\/|\/)([^\/].*)/,
    absolutePattern = /^https?:\/\/.*/,
    itemLinkPattern = /^https?:\/\/www\.walmart\.com\/(ip\/\d+)$/;


var cleanHTML = exports.cleanHTML = function cleanHTML(html) {
  if (!html) {
    return;
  }

  // The merchandisers sometimes send iso-latin-1 data in the utf8 stream
  // Do our best to protect ourselves from these cases (hopefully rare)
  html = html.replace(/\uFFFD/g, ' ');

  // Try to protect ourselves from crap data....
  var womb = document.createElement('div');
  womb.innerHTML = html;

  $(womb).find('script').remove();

  //remove any empty p tags
  $(womb).find('p:empty').remove();

  $(womb).find("a").each(function(){
    var a = $(this);
    var href = a.attr('href');
    if (href) {

      // add target to any external links
      if (href.match(absolutePattern)) {
        a.attr('target', Phoenix.openTarget);
      } else {
        // change any relative links to be absolute www links
        var match = href.match(relativePattern);
        if (match) {
          href = 'http://' + Phoenix.config.wwwHost + '/' + match[1];
          a.attr('href', href);
          a.attr('target', '_blank');
        }
      }

      // if it's a product id, just make it a relative link
      match = href.match(itemLinkPattern);
      if (match) {
        href = Phoenix.View.link(match[1]);
        a.attr('href', href);
      }
    }
  });

  return womb.innerHTML;
}
