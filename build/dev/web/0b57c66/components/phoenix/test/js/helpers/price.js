/*global Data */
describe('price helper', function() {
  var price = function(price) {
    var ret = Handlebars.helpers.price(price);
    if (ret) {
      expect(ret).to.be.an.instanceof(SafeString);
    }
    return ret.toString();
  };

  beforeEach(function() {
    Phoenix.config.currencySymbol = '$';
  });
  it('should handle empty', function() {
    expect(price(undefined)).to.equal('');
    expect(price(NaN)).to.be.equal('');
    expect(price('')).to.be.equal('');
  });

  it('should handle floats', function() {
    expect(price(1234.56)).to.equal('$1234.<span class="decimal">56</span>');
  });
  it('should format arbitrary decimal (including zero)', function() {
    expect(price(123.456)).to.be.equal('$123.<span class="decimal">46</span>');
    expect(price(0)).to.be.equal('$0.<span class="decimal">00</span>');
  });

  it('should handle numeric strings', function() {
    expect(price('  1234.56  ')).to.equal('$1234.<span class="decimal">56</span>');
    expect(price('1234.56')).to.equal('$1234.<span class="decimal">56</span>');
    expect(price('$1234.56')).to.equal('$1234.<span class="decimal">56</span>');
    expect(price('$1,234.56')).to.equal('$1,234.<span class="decimal">56</span>');
  });

  it('should handle tagged strings', function() {
    expect(price('   From $1,234.56   ')).to.equal('   From $1,234.<span class="decimal">56</span>   ');
  });
  it('should handle multiple strings', function() {
    expect(price('$5.00-$200.00')).to.equal('$5.<span class="decimal">00</span> - $200.<span class="decimal">00</span>');
    expect(price('$5.00 -   $200.00')).to.equal('$5.<span class="decimal">00</span> - $200.<span class="decimal">00</span>');
  });

  it('should handle other currency symbols', function() {
    Phoenix.config.currencySymbol = '£';
    expect(price(123.456)).to.be.equal('£123.<span class="decimal">46</span>');
    expect(price('£1,234.56')).to.equal('£1,234.<span class="decimal">56</span>');
  });
});
