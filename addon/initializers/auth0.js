import Ember from 'ember';

var auth0 = Ember.Object.extend(Ember.Evented, {
  callbacks: {
    onLoginSuccess:  function(){
      // window.location = 'activities';
      console.log('login success');  
    },
    onLoginError:    function(err){ console.log(err); },
    onSignupSuccess: function(){},
    onSignupError:   function(err){ console.log(err); }
  },

  // Redirect after use has been successfully logged out
  logoutUrl: null,
  signupUrl: 'activities',
  loginUrl:  'activities',

  isAuthed: localStorage.isAuthed == "true",
  isAnonymous: Ember.computed.not('isAuthed'),

  // Auth0 user profile
  profile: localStorage.profile,

  // Auth0 access token
  token: localStorage.token,
  userid: localStorage.userid,

  getUser: function(){
    JSON.parse(localStorage.user);
  },

  // Auth0Lock configurable options
  // https://github.com/auth0/lock/wiki/Auth0Lock-customization
  lockOptions: {
    authParams: {}
  },

  tokenChanged: function(){
    localStorage.token = this.get('token');
  }.observes('token'),

  isAuthedChanged: function(){
    localStorage.isAuthed = this.get('isAuthed'); 
  }.observes('isAuthed'),


  // complete Lock widget, incl. signup and reset password option
  completeLogin: function() {
    this.authClient.show(
      this.get('lockOptions'),
      function onLogin(err, profile, token) {
        if (err) {
          return this.callbacks.onLoginError.call(this, err);
        }
        this.setAuth(token, profile);
        this.callbacks.onLoginSuccess.call(this, token, profile);
        console.log('logged in', this);
        if(this.loginUrl) window.location = this.loginUrl;
      }.bind(this)
    );
  },

  login: function() {
    this.authClient.showSignin(
      this.get('lockOptions'),
      function onLogin(err, profile, token) {
        if (err) {
          return this.callbacks.onLoginError.call(this, err);
        }
        this.setAuth(token, profile);
        this.callbacks.onLoginSuccess.call(this, token, profile);
      }.bind(this)
    );
  },

  signup: function() {
    this.authClient.showSignup(function(err) {
      if (err) {
        return this.callbacks.onSignupError.call(this, err);
      }
      this.callbacks.onSignupSuccess.call(this);
      if(this.signupUrl) window.location = this.signupUrl;
    }.bind(this));
  },

  logout: function() {
    this.authClient.logout({
      returnTo: this.get('logoutUrl')
    });
  },

  session_destroy: function(){
    localStorage.userid = null;
    localStorage.token = null;
    localStorage.isAuthed = false;
    this.set('userid', null);
    this.set('user', null);
    this.set('token', null);
    this.set('isAuthed', false);
  }
});

export function initialize(container, application) {
  var config = container.lookupFactory('config:environment'),
      auth0Config = config ? config['ember-cli-auth0-lock'] : null;

  application.register('auth0:main', auth0, { singleton: true });
  application.inject('adapter', 'auth0', 'auth0:main');
  application.inject('controller', 'auth0', 'auth0:main');
  application.inject('route', 'auth0', 'auth0:main');
  application.inject('view', 'auth0', 'auth0:main');

  // add APP auth0 config options
  if (auth0Config) {
    auth0.reopen({
      logoutUrl: auth0Config.logoutUrl,
      loginUrl: auth0Config.loginUrl,

      init: function() {
        var authParams = Ember.merge(this.get('lockOptions.authParams'), auth0Config.authParams);

        // update authparams config
        this.set('lockOptions.authParams', authParams);
        this.authClient = new Auth0Lock(auth0Config.cid, auth0Config.domain);

        if(this.userid){
          this.syncUser();
        }
      },

      // update authentication properties
      setAuth: function(token, profile) {
        var self = this;
        var store = container.lookup('store:main');
        var user = store.createRecord('user', {
          email: profile.email
        });

        console.log('set auth');

        user.save().then(function(_user){
          self.set('userid', _user.id);
        });

        this.set('token', token);
        this.set('isAuthed', true);
      },

      clearAuth: function(){
        this.set('token', null);
        this.set('isAuthed', false);
        this.set('user', null);
        this.set('userid', null);
      },

      syncUser: function(){
        var store = container.lookup('store:main'),
            uid   = this.get('userid');

        console.log('sync before', uid);

        if(uid == null) return;

        store.find('user', uid).then(function(user){
          this.set('user', user);
          console.log('user synced');
          this.trigger('complete');
        }.bind(this));

        localStorage.userid = uid;
      },

      userChanged: function(){
        this.syncUser();
      }.observes('userid')
    });
  }
}

export default {
  before: 'ember-data',
  name: 'auth0',
  initialize: initialize
};
