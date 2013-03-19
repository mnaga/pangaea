var SortSelectorView = Phoenix.View.extend({
  name: 'sort-selector',
  className: 'button-container',
  nonBlockingLoad: true,
  ignoreFetchError: true,

  events: {
    'click label': function(event) {
      event.preventDefault();

      // handle sorting
      var sort = this.getSort(),
          id = event.currentTarget.getAttribute('for'),
          value = id && this.$('#' + id).val();

      if (value) {
        // Reverse if reversible
        if (sort && sort.reverse && (sort.value === value || sort.reverse.value === value)) {
          this.setSort(sort.value === this.sort ? sort.reverse.value : sort.value);
        } else if (!sort || sort.value !== value || this._isDefaultSort) {
          this.setSort(value);
        } else if (this.model.sortInfo.defaultSort){
          this.setSort(this.model.sortInfo.defaultSort, {isDefaultSort: true});
        }
      }
    }
  },

  getSort: function() {
    return this._getSortObject(this.sort);
  },

  setSort: function(sort, options) {
    options = options || {};
    if (this.sort) {
      this._updateUI(this.sort, false);
    }
    if (!options.isDefaultSort) {
      this._updateUI(sort, true);
    }
    this.sort = sort;
    this._isDefaultSort = !!options.isDefaultSort;
    if (!options.doNotSort) {
      this.model.applySort(this.sort);
    }
    if (!options.silent) {
      this.trigger('change:sort');
    }
  },

  _getSortObject: function(sortValue) {
    var sortInfo = this.model.sortInfo;
    if (sortInfo.defaultSort === sortValue) {
      return {value: sortInfo.defaultSort};
    }
    return _.filter(sortInfo.sorts, function(sort) {
      return sort.value === sortValue || (sort.reverse && sort.reverse.value === sortValue);
    })[0];
  },

  _getInput: function(sortObj) {
    var input = this.$('input[value="' + sortObj.value + '"]');
    if (!input[0] && sortObj.reverse) {
      input = this.$('input[value="' + sortObj.reverse.value + '"]');
    }
    return input;
  },

  _updateUI: function(sortValue, selected) {
    var sortObj = this._getSortObject(sortValue),
        input = this._getInput(sortObj),
        label = this.$('label[for="' + (input[0] || {}).id + '"]');
    if (selected) {
      var realSort = (sortObj.value === sortValue) ? sortObj : sortObj.reverse;
      input.attr('checked', true);
      label.text(realSort.selected);
      input.attr('value', realSort.value);
    } else {
      input.removeAttr('checked');
      label.text(sortObj.name);
      input.attr('value', sortObj.value);
    }
  },

  show: function() {
    $(this.el).show();
  },

  hide: function() {
    $(this.el).hide();
  },

  context: function() {
    return this.model && this.model.sortInfo;
  },
  renderTemplate: function() {
    // Kill off any whitespace so we can do proper empty rendering
    var ret = Phoenix.View.prototype.renderTemplate.apply(this, arguments);
    return ret && ret.trim();
  }
});
