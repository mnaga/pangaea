# Phoenix Conversion Steps

- Convert to event based paradigms when possible
  - mih-height binding to 'init' event etc.

- Bridge removal
 - Bridge.nativeHost -> Phoenix.platformName
  This is always defined now (prior empty case is now 'mweb' or 'asda-mweb')
 - Phoenix.isNative
 - Native LoadingIndictor class implementing bridge methods

- Style Changes
  - display-flex-box -> display flex
    flex
      flex 1
      flex none
    flex-flow
      flex-flow row
      flex-flow column

    http://bennettfeely.com/flexplorer/

    TODO : What are the other flex box changes?
    TODO : Write a blog post on this and link to it in here.

  - TODO : What are the other helpers that were updated?

- i18n
  - i18n dictionary is now defined on i18n.dictionary.
  - The i18n object is defined directly on the application object

- Convert qunit tests to mocha+chai tests
  - module -> describe
    - setup -> beforeEach
    - teardown -> afterEach
  - test -> it
  - ok/equals/etc -> chai [expects](http://chaijs.com/api/bdd/) or [assert](http://chaijs.com/api/assert/) operations

  - sinon-chai : https://github.com/domenic/sinon-chai

- form-* helpers converted to single input helper

- Connection rework
  - App specific logic should be handled through events on the Connection object. This includes:
    - Determining error cases
    - Auth tracking
    - Global service parameters
    - Others

- Carousel changes
  - {{carousel}} helper converted to carousel.handlebars template
  - Carousel.nonBlockingLoad is set to true by default
  - added `showButtons: !this.useNativeScroll && !this.oneUp` to the context
  - `useNativeScroll()` is declared on module level, not on Phoenix
  - Carousel automatically adds `carousel-item` class to its items
  - PagedCarousel now has autoAdvance option (if `true`, slides the carousel every 10 seconds, or can be set to number of seconds)
  - New class BannerCarousel is perfect for ... well, carousels of banners. It plays nicely with load-view helper (see below)

- Loading
  - New load-view helper can be used for inline loading for things like carousels
  - `collection-loading` css class has been renamed to `inline-view-loading`

