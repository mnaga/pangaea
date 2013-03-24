View.extend({
  name: 'cart-mini',
  dataURL: 'http://delayed-data.herokuapp.com/cart.json?callback=?',
  mouseOutTimeout:null,
  cart:null,
  events: {
    'toggle': 'toggleCart',
    'show': 'showCart',
    'mouseover' : 'killRequestHideCart',
    'mouseout' : 'requestHideCart'
  },
  toggleCart:function() {
    if (this.$el.css("display")=="none") {
      this.showCart()
    } else {
      this.$el.hide();
    }
  },
  showCart:function() {
    this.$el.show();
    var loading = new Phoenix.Views.InlineLoading({});
    loading.render();
    this.$el.html(loading.el);
    //return this.drawCart(cartData); //OVERRIDE LOCAL DATA
    if (this.cart) {
      this.drawCart()
    } else {
      $.ajax({
        dataType: "jsonp",
        url: this.dataURL,
        success: this.parseCart.bind(this)
      });
    }
  },
  parseCart:function(data) {
    //Nothing to do for now...
    this.cart = data[0];
    this.drawCart();
  },
  drawCart:function(data) {
    this.render();
  },
  requestHideCart:function() {
    if (!$.contains(this.$el[0], event.toElement)) {
      this.mouseOutTimeout = setTimeout(this.hideCart.bind(this), 500)
    }
  },
  killRequestHideCart:function() {
    if (this.mouseOutTimeout) {
      clearTimeout(this.mouseOutTimeout);
    }
  },
  hideCart:function(event) {
    this.$el.hide();
  }
});
/* HANDY FOR DEBUGGING...
var cartData = [
    {
        "items": [
            {
                "eligibleForActualCart": true,
                "itemClassId": 5,
                "itemClass": "GENERAL",
                "statusMessages": [],
                "properties": [],
                "iD": "ACTUAL__REGULAR__22334914__0__2",
                "itemId": 22334914,
                "name": "FURBY Party Rocker, Scoffby",
                "price": "$19.97",
                "quantity": 1,
                "thresholdFreeShippingEligible": false,
                "contributesToThreshold": false,
                "variantNames": [],
                "imageThumbnailUrl": "http://i.walmartimages.com/i/p/00/65/35/69/82/0065356982778_60X60.gif",
                "itemImage150": "http://i.walmartimages.com/i/p/00/65/35/69/82/0065356982778_150X150.jpg",
                "bundleType": "NON_BUNDLE",
                "freeShippingToHome": false,
                "shipping97Cents": false
            },
            {
                "eligibleForActualCart": true,
                "itemClassId": 5,
                "itemClass": "GENERAL",
                "statusMessages": [],
                "properties": [],
                "iD": "ACTUAL__REGULAR__22334913__0__1",
                "itemId": 22334913,
                "name": "FURBY Party Rocker, Loveby",
                "price": "$19.97",
                "quantity": 1,
                "thresholdFreeShippingEligible": false,
                "contributesToThreshold": false,
                "variantNames": [],
                "imageThumbnailUrl": "http://i.walmartimages.com/i/p/00/65/35/69/82/0065356982780_60X60.gif",
                "itemImage150": "http://i.walmartimages.com/i/p/00/65/35/69/82/0065356982780_150X150.jpg",
                "bundleType": "NON_BUNDLE",
                "freeShippingToHome": false,
                "shipping97Cents": false
            }
        ],
        "subTotal": "$39.94",
        "type": "ACTUAL",
        "visitorCart": true,
        "statusMessages": [],
        "freeShippingThreshold": "45",
        "amountToThreshold": "45",
        "thresholdItemCount": 0
    },
    {
        "items": [],
        "type": "SAVE_FOR_LATER",
        "visitorCart": true,
        "statusMessages": []
    }
]
*/