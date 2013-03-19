_.extend(exports.PagedCollection.prototype, {
  countField: 'totalResult',
  offset: function() {
    return this.pageSize * this.page;
  },

  offsetParams: function(paramNumber) {
    return '&p' + paramNumber + '=' + this.offset() + '&p' + (paramNumber + 1) + '=' + this.pageSize;
  }

});
