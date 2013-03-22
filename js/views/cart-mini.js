View.extend({
  name: 'cart-mini',
  dataURL: 'http://delayed-data.herokuapp.com/cart.json?callback=?',
  events: {
    "toggle": 'toggleCart'
  },
  toggleCart:function() {
    if (this.$el.css("display")=="none") {
      this.$el.show();
      this.$el.html("Loading...");
      $.ajax({
        dataType: "jsonp",
        url: this.dataURL,
        success: this.drawCart.bind(this)
      });
    } else {
      this.$el.hide();
    }
  },
  drawCart:function(data) {
    this.cart = data[0];
    this.render();
  }
});