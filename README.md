Pangaea Prototype
=================

Component Based Architecture
----------------------------
npm for exisiting open source components. Private npm for future internal components.

Responsive Design
-----------------

Platform Design
---------------
{{#desktop}}

{{/desktop}}

Flexible Build Tools with Grunt
-------------------------------
Leveerages existing and future developer ecosystem. Choice of sass, stylus, coffeescript, build tools, watcher tools etc. Lumbar, Thorax already have Grunt plugins.

Realtime Development
--------------------
LiveReload + Thorax inspector FTW.

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
