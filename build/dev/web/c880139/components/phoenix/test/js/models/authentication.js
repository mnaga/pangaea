/*global Authentication, LocalCache, authentication:true */
describe('authentication', function() {
  beforeEach(function() {
    this.authentication = authentication;
    authentication = new Authentication();
    authentication.sessionActivity(true);
  });
  afterEach(function() {
    authentication = this.authentication;
  });

  describe('lastUserName', function() {
    it('should load the last user name', function() {
      this.stub(LocalCache, 'get', function() { return 'a name!'; });
      authentication = new Authentication();
      expect(authentication.lastUserName).to.equal('a name!');
    });
    it('should save the last user name', function() {
      this.stub(LocalCache, 'store');
      authentication.setLastUserName('another name!');
      expect(LocalCache.store).to.have.been.calledWith('lastUserName', 'another name!');
    });
  });

  describe('session timeout', function() {
    it('should return to unknown state after timeout', function() {
      expect(authentication.isAuthed()).to.be.true;
      this.clock.tick(authentication.SESSION_DURATION + 1);
      expect(authentication.isAuthed()).to.be.undefined;

      authentication.sessionActivity(false);
      expect(authentication.isAuthed()).to.be.false;
      this.clock.tick(authentication.SESSION_DURATION + 1);
      expect(authentication.isAuthed()).to.be.undefined;
    });
    it('should update last access time', function() {
      expect(authentication.lastAccessTime).to.equal(10);
      this.clock.tick(10);
      authentication.sessionActivity();
      expect(authentication.lastAccessTime).to.equal(20);
    });
  });

  describe('#sessionExpired', function() {
    it('should update sessionId', function() {
      var sessionId = authentication.sessionId;
      authentication.sessionExpired(authentication.sessionId);
      expect(authentication.sessionId).to.equal(sessionId + 1);
    });
    it('should trigger session-expired', function() {
      var spy = this.on(authentication, 'session-expired');

      authentication.sessionExpired(authentication.sessionId);
      expect(spy).to.have.been.calledOnce;
    });
    it('should not trigger session-expired', function() {
      var spy = this.on(authentication, 'session-expired');

      authentication.sessionExpired(authentication.sessionId - 1);
      expect(spy).to.not.have.been.called;
    });
  });

  describe('#sessionActivity', function() {
    it('should ignore unknown state', function() {
      var spy = this.on(authentication, 'session-activity');
      authentication.sessionActivity();
      expect(spy).to.not.have.been.called;
    });
    it('should trigger without change', function() {
      var activitySpy = this.on(authentication, 'session-activity'),
          changeSpy = this.on(authentication, 'change');

      authentication.sessionActivity(authentication.isAuthed());
      expect(activitySpy).to.have.been.calledOnce;
      expect(changeSpy).to.not.have.been.called;
      expect(authentication.isAuthed()).to.be.true;
    });
    it('should trigger loggedin', function() {
      authentication.set('loggedIn', false);

      var activitySpy = this.on(authentication, 'session-activity'),
          changeSpy = this.on(authentication, 'change');

      authentication.sessionActivity(!authentication.isAuthed());
      expect(activitySpy).to.have.been.calledOnce;
      expect(changeSpy).to.have.been.calledOnce;
      expect(authentication.isAuthed()).to.be.true;
    });
    it('should trigger loggedout', function() {
      var activitySpy = this.on(authentication, 'session-activity'),
          changeSpy = this.on(authentication, 'change');

      authentication.sessionActivity(!authentication.isAuthed());
      expect(activitySpy).to.have.been.calledOnce;
      expect(changeSpy).to.have.been.calledOnce;
      expect(authentication.isAuthed()).to.be.false;
    });
  });
});
