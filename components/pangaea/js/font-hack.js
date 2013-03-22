// TODO: lumbar prefix won't show up in font urls
// but will in all other urls
$(function() {
  var css = '@font-face {font-family: MyriadPro; src: url("' + lumbarLoadPrefix + 'fonts/MyriadPro-Regular.otf"); format("opentype")} ';
  css += '@font-face {font-family: MyriadPro; font-weight: bold; src: url("' + lumbarLoadPrefix + 'fonts/MyriadPro-Bold.otf"); format("opentype")}';
  $('head').append('<style>' + css + '</style>')
});
