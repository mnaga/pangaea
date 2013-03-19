/*global Collection, PagedCollection */
describe('PagedCollection', function() {
  var collection;
  beforeEach(function() {
    collection = new PagedCollection();
    collection.url = 'foo';
    collection.collectionField = 'item';
    collection.countField = 'totalCount';
    collection.pageSize = 3;
  });

  it('should read fields', function() {
    collection.fetch();
    this.requests[0].respond(200, {}, JSON.stringify({item: [{id: 1}, {id: 2}, {id: 3}], totalCount: 5}));

    expect(_.pluck(collection.models, 'id')).to.eql([1, 2, 3]);
    expect(collection.totalCount).to.equal(5);

    collection.collectionField = 'otherShit';
    collection.countField = 'totalCount2';
    collection.fetch();
    this.requests[1].respond(200, {}, JSON.stringify({otherShit: [{id: 11}, {id: 2}, {id: 3}], totalCount2: 6}));

    expect(_.pluck(collection.models, 'id')).to.eql([11, 2, 3]);
    expect(collection.totalCount).to.equal(6);
  });
  it('should read subsequent content on the next page', function() {
    collection.fetch();
    this.requests[0].respond(200, {}, JSON.stringify({item: [{id: 1}, {id: 2}, {id: 3}], totalCount: 5}));

    expect(_.pluck(collection.models, 'id')).to.eql([1, 2, 3]);
    expect(collection.totalCount).to.equal(5);
    expect(collection.hasMore()).to.be.true;

    collection.nextPage();
    this.requests[1].respond(200, {}, JSON.stringify({item: [{id: 4}, {id: 5}, {id: 6}], totalCount: 5}));

    expect(_.pluck(collection.models, 'id')).to.eql([1, 2, 3, 4, 5, 6]);
    expect(collection.totalCount).to.equal(5);
  });
  it('should not read subsequent content on the next page', function() {
    collection.fetch();
    this.requests[0].respond(200, {}, JSON.stringify({item: [{id: 1}, {id: 2}, {id: 3}], totalCount: 3}));
    expect(collection.hasMore()).to.be.false;

    collection.nextPage();
    expect(this.requests.length).to.equal(1);
  });

  describe('#mergeFetch', function() {
    var collection;
    beforeEach(function() {
      collection = new Collection();
      collection.url = 'foo';
      collection.fetch = PagedCollection.mergeFetch();
    });
    it('should load from multiple pages', function() {
      var spy = this.spy(),
          startSpy = this.spy(),
          endSpy = this.spy();
      collection.on('load:start', startSpy);
      collection.on('load:end', endSpy);

      collection.fetch({success: spy});

      for (var i = 0; i < 3; i++) {
        expect(this.requests.length).to.equal(i + 1);

        expect(this.requests[i].url).to.match(/pagenum=(\d+)/);
        expect(RegExp.$1).to.equal(i+1+'');
        expect(startSpy).to.have.been.calledOnce;
        expect(endSpy).to.not.have.been.called;

        this.requests[i].respond(200, {}, JSON.stringify({
          totalResult: 150,
          item: _.range(50*i, 50*(i+1)).map(function(value) { return { id: value }; })
        }));
        if (i < 2) {
          expect(spy).to.not.have.been.called;
        }
      }
      expect(startSpy).to.have.been.calledOnce;
      expect(endSpy).to.have.been.calledOnce;

      expect(spy).to.have.been.called;
      expect(collection.length).to.equal(150);
      expect(collection.at(0).id).to.equal(0);
      expect(collection.at(0).collection).to.equal(collection);
      expect(collection.at(149).id).to.equal(149);
    });
    it('should forward errors', function() {
      this.stub(Phoenix, 'trackError');
      this.stub(Phoenix, 'setView');

      var collection = new Collection(),
          spy = this.spy(),
          errorSpy = this.spy();
      collection.on('error', errorSpy);

      collection.fetch = PagedCollection.mergeFetch();
      collection.fetch({error: spy});

      this.requests[0].respond(404, {}, '');
      expect(spy).to.have.been.calledOnce;
      expect(errorSpy).to.have.been.calledOnce;
    });
  });
});
