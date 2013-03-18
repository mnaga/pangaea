/*global Loader, Themes, View */
QUnit.module('themes', {
  setup: function() {
    this.stub(Loader.loader, 'loadModule', function(name, callback) { callback(); });
  }
});

test('theme should preload', function() {
  expect(2);

  Loader.loader.loadModule.restore();
  this.stub(Loader.loader, 'loadModule', function(name, callback) {
    equal(name, 'theme-christmas');
    callback();
  });

  Themes.preload('christmas', function(err) {
    ok(!err);
  });
});
test('preload should continue on failure', function() {
  expect(2);

  Loader.loader.loadModule.restore();
  this.stub(Loader.loader, 'loadModule', function(name, callback) {
    equal(name, 'theme-christmas');
    callback('fail');
  });

  Themes.preload('christmas', function(err) {
    equal(err, 'fail');
  });
});

test('theme should load if not loaded', function() {
  expect(1);

  Loader.loader.loadModule.restore();
  this.stub(Loader.loader, 'loadModule', function(name, callback) {
    equal(name, 'theme-christmas');
    callback();
  });

  Themes.useTheme('christmas');
});
test('theme should apply', function() {
  var test = exports['theme-test'] = {
    applyTheme: this.stub(),
    resetTheme: this.stub()
  };

  ok(!$('html').hasClass('theme-test'));
  ok(!$('.flex').hasClass('theme-test'));

  Themes.useTheme('test');
  ok($('html').hasClass('theme-test'));
  ok($('.flex').hasClass('theme-test'));
  equal(test.applyTheme.callCount, 1);
  equal(test.resetTheme.callCount, 0);

  // Tese multiple application
  Themes.useTheme('test');
  ok($('html').hasClass('theme-test'));
  ok($('.flex').hasClass('theme-test'));
  equal(test.applyTheme.callCount, 1);
  equal(test.resetTheme.callCount, 0);

  // Test clearing
  Themes.useTheme();
  ok(!$('html').hasClass('theme-test'));
  ok(!$('.flex').hasClass('theme-test'));
  equal(test.applyTheme.callCount, 1);
  equal(test.resetTheme.callCount, 1);

  exports['theme-test'] = undefined;
});
test('theme should not apply on error', function() {
  Loader.loader.loadModule.restore();
  this.stub(Loader.loader, 'loadModule', function(name, callback) {
    callback('fail');
  });

  ok(!$('html').hasClass('theme-test'));
  ok(!$('.flex').hasClass('theme-test'));

  Themes.useTheme('test');

  ok(!$('html').hasClass('theme-test'));
  ok(!$('.flex').hasClass('theme-test'));
});

test('theme should reset on view change', function() {
  Themes.useTheme('test');

  Phoenix.layout.setView(new View({name: 'bar', render: function() {}, theme: 'bar'}));

  ok(!$('html').hasClass('theme-test'));
  ok(!$('.flex').hasClass('theme-test'));
  ok($('html').hasClass('theme-bar'));
  ok($('.flex').hasClass('theme-bar'));

  Phoenix.layout.setView(new View({name: 'bar', render: function() {}}));

  ok(!$('html').hasClass('theme-test'));
  ok(!$('.flex').hasClass('theme-test'));
  ok(!$('html').hasClass('theme-bar'));
  ok(!$('.flex').hasClass('theme-bar'));
});
