Thorax.LayoutView.extend({
  name: 'departments-global',
  dataURL: 'http://delayed-data.herokuapp.com/departments.json?callback=?',
  departments:null,
  events: {
    "toggle": "toggleMenu"
       /*
    "mouseout [data-view-name='departments-global']" : "hideMenu"
    */
  },
  toggleMenu:function() {
    if (this.$el.css("display")=="none") {
      this.$el.find(".departments").html("Loading...");
      this.$el.show();

      if (deptData) {  //Load locally...
        this.departments = deptData;
      }

      if (this.departments) {
        this.drawMenu();
      } else {
        $.ajax({
          dataType: "jsonp",
          url: this.dataURL,
          success: function(data) {
            this.departments = data
            this.drawMenu()
          }.bind(this)
        })
      }
    } else {
      this.hideMenu();
    }
  },
  drawMenu:function() {
    this.render()
    this.$el.find(".departments ul").menuAim({
      rowSelector: ".departments ul li",
      tolerance: 300,
      activate: this.showDepartment.bind(this),
      deactivate: this.hideDepartment.bind()
    });
  },
  hideMenu:function() {
    this.$el.hide();
    this.setView(null);
    this.$el.find(".expanded").hide();
  },
  showDepartment:function(deptElement) {
    var deptID = $(deptElement).data("department-id");
    if (this.departments[deptID-1]) {
      this.subs = this.departments[deptID-1]["subs"];
      var view = new SubView({
        subs: this.subs
      })
      this.setView(view);
      this.$el.find(".expanded").show()
    }
  },
  hideDepartment:function(row) {
  }
});

var SubView = View.extend({
  name: 'departments-subs'
})

var deptData = [
    {
        "subs": [
            {
                "name": "Electronics",
                "entries": [
                    "Accessories",
                    "Auto Electronics",
                    "Cameras & Camcorders",
                    "Cell Phones & Services",
                    "Computers",
                    "GPS & Navigation",
                    "Home Audio & Theater",
                    "iPad, Tablets & eReaders",
                    "iPods & MP3 Players",
                    "TV & Video",
                    "Video Games"
                ]
            },
            {
                "name": "Electronics Learning Center",
                "entries": []
            },
            {
                "name": "Computers",
                "entries": [
                    "Desktops",
                    "Laptops",
                    "Monitors",
                    "Networking",
                    "Printers & Supplies",
                    "Tablets",
                    "See all"
                ]
            },
            {
                "name": "Office",
                "entries": [
                    "Breakroom Supplies",
                    "Business Office Furniture",
                    "Home Office Furniture",
                    "Janitorial Supplies",
                    "Office Supplies",
                    "Office Technology",
                    "Phones & Accessories",
                    "School Supplies"
                ]
            }
        ],
        "name": "Electronics & Office",
        "id":1
    },
    {
        "subs": [
            {
                "name": "Movies & TV",
                "entries": [
                    "Blu-ray Discs",
                    "Moviecenter",
                    "Movies (DVD)",
                    "New Releases (Blu-ray & DVD) ",
                    "Preorders (Blu-ray & DVD) ",
                    "TV Shows (DVD) ",
                    "Videos on Demand by VUDU"
                ]
            },
            {
                "name": "Music",
                "entries": [
                    "Music CDs",
                    "Musical Instruments",
                    "New Releases",
                    "Preorders",
                    "Soundcheck"
                ]
            },
            {
                "name": "Books",
                "entries": [
                    "Top 200 Sellers",
                    "New Releases",
                    "Preorders",
                    "See all"
                ]
            }
        ],
        "name": "Movies, Music & Books",
        "id":2
    },
    {
        "subs": [
            {
                "name": "Home",
                "entries": [
                    "Appliances",
                    "Bath",
                    "Bedding",
                    "Decor",
                    "Home Improvement",
                    "Kitchen & Dining",
                    "Luggage",
                    "Pets",
                    "Rugs",
                    "Storage & Organization",
                    "Window Coverings",
                    "Vacuums & Floor Care"
                ]
            },
            {
                "name": "Wedding Registry",
                "entries": []
            },
            {
                "name": "Furniture",
                "entries": [
                    "Baby",
                    "Bedroom",
                    "Kids & Teen",
                    "Kitchen & Dining",
                    "Living Room",
                    "Mattresses",
                    "Office",
                    "TV Stands & Entertainment Centers "
                ]
            },
            {
                "name": "Patio & Garden",
                "entries": [
                    "Gardening & Lawn Care",
                    "Grills & Outdoor Cooking ",
                    "Outdoor Play",
                    "Outdoor Power Equipment",
                    "Patio Furniture",
                    "Patio & Outdoor Decor"
                ]
            }
        ],
        "name": "Home, Furniture & Patio",
        "id":3
    },
    {
        "subs": [
            {
                "name": "Apparel",
                "entries": []
            },
            {
                "name": "Shop for Her",
                "entries": [
                    "Intimates & Sleepwear",
                    "Juniors",
                    "Maternity",
                    "Women",
                    "Women's Plus",
                    "Women's Shoes"
                ]
            },
            {
                "name": "Shop for Him",
                "entries": [
                    "Men",
                    "Men's Big & Tall",
                    "Men's Shoes",
                    "Workwear Shop",
                    "Young Men"
                ]
            },
            {
                "name": "Shop for Baby & Kids",
                "entries": [
                    "Baby & Toddler",
                    "Boys",
                    "Girls",
                    "Baby & Kids' Shoes"
                ]
            },
            {
                "name": "Featured Shops",
                "entries": [
                    "Baby & Kids Extravaganza",
                    "Dress Shop",
                    "Easter Styles",
                    "School Uniform Shop",
                    "Swim Shop",
                    "Team Sports Shop",
                    "The Fitting Room"
                ]
            },
            {
                "name": "Shoes & Accessories",
                "entries": [
                    "Backpacks",
                    "Bags & Luggage",
                    "Hats & Accessories",
                    "Shoes"
                ]
            },
            {
                "name": "Jewelry",
                "entries": [
                    "Bracelets",
                    "Earrings",
                    "Pendants & Necklaces",
                    "Personalized Jewelry",
                    "Rings",
                    "Watches",
                    "Wedding & Engagement",
                    "Jewelry Storage"
                ]
            }
        ],
        "name": "Apparel, Shoes & Jewelry",
        "id":4
    },
    {
        "subs": [
            {
                "name": "Baby Registry",
                "entries": []
            },
            {
                "name": "Baby",
                "entries": [
                    "Activities & Toys",
                    "Baby Bath & Skin Care",
                    "Bedding & Decor",
                    "Car Seats",
                    "Cribs",
                    "Diapering",
                    "Feeding",
                    "Baby Gear ",
                    "Gifts for Baby",
                    "Health & Safety",
                    "Nursery Furniture",
                    "Strollers",
                    "Toddler"
                ]
            },
            {
                "name": "Baby & Toddler Clothing",
                "entries": [
                    "Newborn Boy Clothing",
                    "Newborn Girl Clothing",
                    "Baby Boy Clothing",
                    "Baby Girl Clothing"
                ]
            },
            {
                "name": "Maternity",
                "entries": []
            },
            {
                "name": "Activities & Toys",
                "entries": [
                    "Bouncers & Jumpers",
                    "Gift Sets",
                    "Learning Toys",
                    "Playards",
                    "Swings",
                    "Walkers"
                ]
            },
            {
                "name": "Toddler",
                "entries": [
                    "Toddler Beds",
                    "Bedroom Sets",
                    "Lounge Seating",
                    "Table & Chair Sets"
                ]
            },
            {
                "name": "Kids' & Teen Room",
                "entries": [
                    "Bath",
                    "Bedding",
                    "Decor",
                    "Furniture",
                    "Storage"
                ]
            },
            {
                "name": "School Uniforms Shop",
                "entries": []
            },
            {
                "name": "Girls' Apparel",
                "entries": []
            },
            {
                "name": "Boys' Apparel",
                "entries": []
            },
            {
                "name": "Kids' Shoes",
                "entries": []
            }
        ],
        "name": "Baby & Kids",
        "id":5
    },
    {
        "subs": [
            {
                "name": "Toys",
                "entries": [
                    "Action Figures",
                    "Arts & Crafts",
                    "Bath Toys",
                    "Building Sets & Blocks",
                    "Development & Learning Toys",
                    "Dolls & Dollhouses",
                    "Games & Puzzles",
                    "Kid's and Teen Electronics",
                    "Music Instruments & Karaoke",
                    "Pretend Play"
                ]
            },
            {
                "name": "Outdoor Play",
                "entries": [
                    "Bouncers & Ball Pits",
                    "Climbers & Slides",
                    "Swimming Pools & Waterslides",
                    "Swing Sets",
                    "Trampolines"
                ]
            },
            {
                "name": "Bikes & Riding Toys",
                "entries": [
                    "Bikes",
                    "Pedal & Push",
                    "Powered Ride On's",
                    "Scooters"
                ]
            },
            {
                "name": "Toys: Shop by Age",
                "entries": [
                    "Baby",
                    "Preschool and Toddlers",
                    "5 to 7 Years",
                    "8 to 11 Years",
                    "12 and Up"
                ]
            },
            {
                "name": "Video Games",
                "entries": [
                    "Gamecenter",
                    "Kids & Family Gaming",
                    "Nintendo 3DS",
                    "Nintendo DS / DSi",
                    "Nintendo Wii",
                    "Nintendo Wii U",
                    "PlayStation 3",
                    "PlayStation Vita",
                    "Xbox 360",
                    "PC Gaming"
                ]
            }
        ],
        "name": "Toys & Video Games",
        "id":6
    },
    {
        "subs": [
            {
                "name": "Sports & Outdoors",
                "entries": []
            },
            {
                "name": "Exercise & Fitness",
                "entries": [
                    "Ab & Core Toners",
                    "Boxing",
                    "Ellipticals",
                    "Exercise Bikes",
                    "Exercise & Fitness Accessories",
                    "Home Gyms",
                    "Inversion Tables",
                    "Mixed Martial Arts",
                    "Steppers & Rowers",
                    "Strength & Weight Training",
                    "Treadmills",
                    "Yoga & Pilates"
                ]
            },
            {
                "name": "Outdoors & Recreation",
                "entries": [
                    "Bikes",
                    "Camping",
                    "Fishing & Marine",
                    "Hunting",
                    "Lawn Games",
                    "Optics & Binoculars",
                    "Paintball & Air Guns",
                    "Swimming Pools & Waterslides",
                    "Trampolines",
                    "Winter Sports"
                ]
            },
            {
                "name": "Team Sports",
                "entries": [
                    "Baseball & Softball",
                    "Basketball",
                    "Football",
                    "Golf",
                    "Hockey",
                    "Lacrosse",
                    "Soccer",
                    "Swimming",
                    "Tennis & Racquet",
                    "Volleyball"
                ]
            },
            {
                "name": "Sports Fan Shop",
                "entries": [
                    "MLB",
                    "NBA",
                    "NHL",
                    "NCAA",
                    "NFL",
                    "NASCAR",
                    "Soccer"
                ]
            },
            {
                "name": "Game Room",
                "entries": []
            }
        ],
        "name": "Sports, Fitness & Outdoors",
        "id":7
    },
    {
        "subs": [
            {
                "name": "Auto & Tires",
                "entries": [
                    "Auto Batteries",
                    "Auto Electronics",
                    "ATV, Motorcycle, RV",
                    "Car Care & Maintenance",
                    "Exterior Accessories",
                    "Interior Accessories",
                    "Tires",
                    "Tools & Equipment"
                ]
            },
            {
                "name": "Gardening & Lawn Care",
                "entries": [
                    "Gardening Tools",
                    "Greenhouses",
                    "Pest Control",
                    "Pots & Planters",
                    "Sheds & Outdoor Storage",
                    "Watering"
                ]
            },
            {
                "name": "Outdoor Power Equipment",
                "entries": [
                    "Chainsaws",
                    "Leaf Blowers",
                    "Lawn Mowers",
                    "Snow Removal",
                    "Trimmers & Edgers"
                ]
            },
            {
                "name": "Home Improvement",
                "entries": [
                    "Air Conditioners",
                    "Flooring",
                    "Garage Storage",
                    "Generators",
                    "Hardware",
                    "Heating, Cooling & Air Quality",
                    "Home Safety & Security ",
                    "Lighting",
                    "Patio & Garden",
                    "Paint & Home Decor",
                    "Plumbing & Fixtures",
                    "Pressure Washers",
                    "Tools"
                ]
            },
            {
                "name": "In Stores Now",
                "entries": [
                    "Auto Center",
                    "Home & Family Center"
                ]
            }
        ],
        "name": "Auto & Home Improvement",
        "id":8
    },
    {
        "subs": [
            {
                "name": "Photo",
                "entries": [
                    "Available in 1-Hr",
                    "Available Same Day",
                    "Blankets",
                    "Calendars",
                    "Canvas & Wall Art",
                    "Cards & Invitations",
                    "Mugs",
                    "Photo Books",
                    "Prints",
                    "See all Products"
                ]
            }
        ],
        "name": "Photo",
        "id":9
    },
    {
        "subs": [
            {
                "name": "Crafts",
                "entries": [
                    "Accessories",
                    "Albums",
                    "Art Supplies",
                    "Artificial Trees & Floral",
                    "Beads & Jewelry",
                    "Craft Storage",
                    "Fabrics",
                    "Kids' Crafts",
                    "Needlecrafts & Yarn",
                    "Scrapbooking & Paper Crafts",
                    "Sewing & Quilting"
                ]
            },
            {
                "name": "Party & Occasions",
                "entries": [
                    "Cake Supplies",
                    "Decorations",
                    "Disposable Tableware",
                    "Invitations & Cards",
                    "Party Favors",
                    "Pinatas & Balloons"
                ]
            },
            {
                "name": "Wedding Shop",
                "entries": []
            },
            {
                "name": "Gift Cards",
                "entries": [
                    "Check Your Gift Card Balance",
                    "Corporate Gift Cards",
                    "eGift Cards",
                    "Gift Cards",
                    "Specialty Gift Cards"
                ]
            },
            {
                "name": "Gift Shop",
                "entries": [
                    "Easter",
                    "Gift Baskets",
                    "Gift Cards",
                    "Gift Registry",
                    "Personalized Gifts",
                    "Gifts for Her",
                    "Gifts for Him",
                    "Gifts for Kids",
                    "Gifts for Baby",
                    "Gifts for Pets"
                ]
            }
        ],
        "name": "Gifts, Craft & Party Supplies",
        "id":10
    },
    {
        "subs": [
            {
                "name": "Pharmacy",
                "entries": [
                    "Rx Services & Savings Programs",
                    "Health Insurance & Benefits ",
                    "Medicare",
                    "Refill Prescriptions",
                    "Transfer Prescriptions",
                    "View Order History",
                    "New Pharmacy Customer",
                    "Fill New Prescriptions"
                ]
            },
            {
                "name": "Health",
                "entries": [
                    "Diet & Nutrition",
                    "Home Health Care",
                    "Medicine Cabinet",
                    "Oral Care",
                    "Personal Care",
                    "Vision Center",
                    "Vitamins",
                    "Wellness Shops"
                ]
            },
            {
                "name": "Beauty",
                "entries": [
                    "Bath & Body",
                    "Deodorants & Anti-Perspirants",
                    "Fragrances",
                    "Hair Care",
                    "Makeup",
                    "Massagers & Spa",
                    "Men's Grooming",
                    "Shaving",
                    "Skin Care"
                ]
            },
            {
                "name": "Vision Center",
                "entries": [
                    "Contact Lenses",
                    "Eye Care Products",
                    "Reading Glasses"
                ]
            },
            {
                "name": "Health Tools",
                "entries": [
                    "Calorie Burn Calculator",
                    "Diet & Fitness Tracker",
                    "Health Shopping Advisors",
                    "Over-the-Counter Medication Finder "
                ]
            }
        ],
        "name": "Pharmacy, Health & Beauty",
        "id":11
    },
    {
        "subs": [
            {
                "name": "Grocery",
                "entries": [
                    "Baking",
                    "Beverages",
                    "Breakfast & Cereal",
                    "Candy",
                    "Canned Goods & Soups",
                    "Condiments, Spices & Sauces",
                    "Fresh Food",
                    "Food Gifts",
                    "Frozen Foods",
                    "Infant & Childcare",
                    "Meal Solutions, Grains  & Pasta",
                    "Snacks, Cookies & Chips"
                ]
            },
            {
                "name": "Household Essentials",
                "entries": [
                    "Batteries",
                    "Bathroom",
                    "Cleaning Supplies",
                    "Family Room",
                    "Kitchen",
                    "Laundry Room",
                    "Paper & Plastic"
                ]
            },
            {
                "name": "Pets",
                "entries": [
                    "Birds",
                    "Cats",
                    "Dogs",
                    "Fish",
                    "Pet Food",
                    "Small Animals"
                ]
            },
            {
                "name": "In Stores Now",
                "entries": [
                    "Baking",
                    "Cleaning Center",
                    "Food & Recipes Center",
                    "Healthy Eating ",
                    "Pets Center"
                ]
            },
            {
                "name": "Grocery Delivery - <font size=\"1px\"> Beta</font>",
                "entries": []
            }
        ],
        "name": "Grocery & Pets",
        "id":12
    }
]
