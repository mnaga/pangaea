/*global largeThumbnail */
var FeaturedStories = Phoenix.CollectionView.extend({
  name: 'shelf/featured-stories',

  crumbs: {
    name: 'Featured Stories',
    type: 'root'
  },
  events: {
    'initialize:before': function() {
      var merchData = Phoenix.config.merchData || {},
          featuredCategories = merchData.featuredCategories || {},
          crumb = featuredCategories.title || featuredCategories.name;
      if (crumb) {
        this.crumbs.name = crumb;
      }

      this.theme = featuredCategories.theme || this.theme;
    },
    'click a.button': function(event) {
      var el = $(event.currentTarget);
      Phoenix.Track.miniStoryView(el.data('id'), el.data('position'));
    }
  },

  itemContext: function(item, index) {
    return _.defaults({
        thumbnail: largeThumbnail(item.attributes),
        position: (index + 1)
      },
      item.attributes);
  }
});
