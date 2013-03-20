Pangaea Prototype
=================

Component Based Architecture
----------------------------
Phoenix + Thorax + Lumbar Loader + custom components

Responsive Design
-----------------

Platform Design
---------------
{{#desktop}}

{{/desktop}}

Flexible Build Tools with Grunt
-------------------------------

Analytics
---------
Keep it simple. In addition to page view / navigation tracking a simple API is available in JS:

    Phoenix.track('event', {key: 'value'});

Or via:

    data-track-event="keypress"
    data-track-name="search-keypress"
    data-track-key="value"

In the demo the search box has the attributes above, open the console to see the tracking occur.

A/B Testing
-----------
[Abba](https://github.com/maccman/abba)

    Abba('zebra-stripes')
      .control('no-stripes', function(){})
      .variant('stripes', _.bind(function() {
        this.$('li').each(function(i) {
          if (i % 2 === 0) {
            $(this).css({backgroundColor: '#aaa'});
          }
        })
      }, this))
      .start();

    this.$('li').click(function(event) {
      Abba('zebra-stripes').complete();
    });
