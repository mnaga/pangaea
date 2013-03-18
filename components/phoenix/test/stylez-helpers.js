function i18n(token) {
  return token;
}

Handlebars.registerHelper('i18n', i18n);
Handlebars.registerHelper('link', i18n);
Handlebars.registerHelper('url', i18n);
