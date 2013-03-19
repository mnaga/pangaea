_.extend(exports.PagedCollection.prototype, {
  collectionField: 'item',
  countField: 'totalResult',
  offset: function() {
    return this.pageSize * this.page;
  },

  offsetParams: function(paramNumber) {
    return '&p' + paramNumber + '=' + this.offset() + '&p' + (paramNumber + 1) + '=' + this.pageSize;
  },
  parse: function(response) {
    this.totalCount = Data.float(response.totalCount);
    return response[this.collectionField];
  }

});
