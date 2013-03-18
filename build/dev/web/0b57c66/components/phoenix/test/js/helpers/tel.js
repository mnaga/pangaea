/*global i18n:true */
describe('tel', function() {
  var tel = Handlebars.helpers.tel;

  it('should output block content if available', function() {
    expect(tel('1234567890', {fn: function() {return 'foo';}}).toString()).to.eql(
        '<a href="tel:1234567890">foo</a>');
    expect(tel('(123) 456 - 7890', {}).toString()).to.eql(
        '<a href="tel:1234567890">(123) 456 - 7890</a>');
  });
});
