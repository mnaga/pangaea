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