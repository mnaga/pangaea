describe('load-view helper', function() {
  it('should display loading view until "loaded" event is triggered, thed display main view', function() {
    var mainView = new Phoenix.View({ template: function() {return "";} }),
        loadingView = new Phoenix.View({ template: function() {return "";} }),
        view = new Phoenix.View({
          template: Thorax.templates['test/templates/load-view-test'],
          mainView: mainView,
          loadingView: loadingView
        });

    // make the view look like it is currently loading
    mainView._isLoading = true;
    view.render();
    expect(view.$el.children()[0]).to.equal(loadingView.el);
    mainView.trigger('loaded');
    expect(view.$el.children()[0]).to.equal(mainView.el);
  });

  it('should display main view if it has already been loaded', function() {
    var mainView = new Phoenix.View({ template: function() {return "";} }),
        loadingView = new Phoenix.View({ template: function() {return "";} }),
        view = new Phoenix.View({
          template: Thorax.templates['test/templates/load-view-test'],
          mainView: mainView,
          loadingView: loadingView
        });

    view.render();
    expect(view.$el.children()[0]).to.equal(mainView.el);
  });
});
