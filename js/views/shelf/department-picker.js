var ShelfDepartmentPicker = Phoenix.View.extend({
  name: 'shelf/department-picker',
  tagName: 'button',
  attributes: {
    type: 'button',
    class: 'button'
  },
  events: {
    'click': function() {
      if (this.isOpen) {
        this.hide();
      } else {
        this.show();
      }
    }
  },
  initialize: function() {
    this.render();
    this.setLabel();
  },
  show: function() {
    if (this.isOpen) {
      return;
    }
    this.isOpen = true;
    $(this.el).addClass('open');
    this.trigger('show');
  },
  hide: function() {
    if (!this.isOpen) {
      return;
    }
    this.isOpen = false;
    $(this.el).removeClass('open');
    this.trigger('hide');
  },
  disable: function(label) {
    this.setLabel(label || Phoenix.i18n('Search Results'));
    $(this.el).attr('disabled', 'disabled');
  },
  setLabel: function(label) {
    this.label = label;
    this.hide();
    $(this.el).removeAttr('disabled');
    this.html('<span>' + (label || Phoenix.i18n('Departments')) + '</span>');
  },
  render: function() {
    this.setLabel(this.label);
  }
});

//timeout before closing the picker
var DEPARTMENT_PICKER_CLOSE_TIMEOUT = 250;
var ShelfDepartmentList = Phoenix.CollectionView.extend({
  name: 'shelf/department-list',
  events: {
    'click .filter-item': function(event) {
      var target = $(event.target);
      if (target.hasClass('trigger')) {
        return;
      }
      var row = $(event.currentTarget);
      if (row.hasClass('all-departments')) {
        this.selectAllDepartments();
      } else {
        var browseToken = row.data('browsetoken'),
            id = row.data('id');

        this.collection.setSelectedById(id);
        this.selectNodeByBrowseToken({id: id, browseToken: browseToken});
      }
    },
    rendered: 'hideAllDepartments',
    'click .parent .trigger': function(event) {
      var target = $(event.target).parent('[data-tree-parent]'),
          parentId = target.attr('data-tree-parent');
      if (!target.hasClass('empty')) {
        if (target.hasClass('open')) {
          this.closeNode(parentId);
        } else {
          this.openNode(parentId);
        }
      }
    },
    collection: {
      reset: function(collection) {
        this.totalCount = collection.totalCount; // For all departments count in template
        $(this.el).toggleClass('no-children', !collection.numberOfDepartmentsWithChildren());
      }
    },
    'selected:all': function() {
      this.hideAllDepartments();
      this.collection.sort();
    }
  },
  openNode: function(parentId) {
    this.$('.parent[data-tree-parent="' + parentId + '"]').addClass('open');
    this.$('.child[data-tree-parent="' + parentId + '"]').show();
  },
  closeNode: function(parentId) {
    this.$('.parent[data-tree-parent="' + parentId + '"]').removeClass('open');
    this.$('.child[data-tree-parent="' + parentId + '"]').hide();
  },
  selectNodeByBrowseToken: function(obj, options) {
    options || (options = {});
    this.selectedDept = obj;
    this.$('.selected').removeClass('selected');
    var selectedNode = this.$('[data-browseToken="' + obj.browseToken + '"]');
    selectedNode.addClass('selected');
    if (selectedNode.hasClass('child')) {
      this.openNode(selectedNode.attr('data-tree-parent'));
    }
    if (!options.silent) {
      this._delayedTrigger('selected:browseToken', obj, this.labelFromBrowseToken(obj.browseToken));
    }
    return selectedNode;
  },
  selectAllDepartments: function(options) {
    options || (options = {});
    this.$('.selected').removeClass('selected');
    this.$('.department.all-departments').addClass('selected');
    this.selectedDept = false;
    this._delayedTrigger('selected:all');
  },
  labelFromBrowseToken: function(browseToken) {
    return this.$('[data-browseToken="' + browseToken + '"] .name p').html();
  },
  _delayedTrigger: function() {
    var args = arguments;
    if (this._waitingToTrigger) {
      return;
    }
    this._waitingToTrigger = true;
    _.delay(_.bind(function() {
      try {
        this._waitingToTrigger = false;
        this.trigger.apply(this, args);
      } catch (err) {
        Phoenix.trackCatch('department.trigger', err);
      }
    }, this), DEPARTMENT_PICKER_CLOSE_TIMEOUT);
  },
  show: function() {
    // Called by shelf view in response to events from DepartmentPicker
    $(this.el).show();
  },
  hide: function() {
    $(this.el).hide();
    this.sortBySelected();
    if (this.selectedDept) {
      this.showAllDepartments();
    }
  },
  sortBySelected: function() {
    if (this.collection && this.selectedDept) {
      this.collection.sortBySelectedBrowseToken(this.selectedDept.browseToken);
      this.selectNodeByBrowseToken(this.selectedDept, {silent: true});
    }
  },
  hideAllDepartments: function() {
    this.$('.department.all-departments').hide();
  },
  showAllDepartments: function() {
    // dumb hack to get this to work, selectedDept not set properly
    // because we re-render vs update the shelf
    if (!window.location.href.match(/department=/)) {
      this.$('.department.all-departments').show();
    }
  }
});

