_.extend(exports.PagedCollection.prototype, {
  countField: 'totalResult',

  offsetParams: function(append) {
    return (append ? '&' : '?')
        + 'pagesize=' + this.pageSize
        + '&pagenum=' + (this.page + 1);
  }
});
