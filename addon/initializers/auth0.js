import Ember from 'ember';


var auth0 = Ember.Object.extend({
  callbacks: {
    onLoginSuccess:  function(){},
    onLoginError:    function(err){ console.log(err); },
    onSignupSuccess: function(){},
    onSignupError:   function(err){ console.log(err); }
  },

  // Redirect after use has been successfully logged out
  logoutUrl: null,
  signupUrl: '/protected',
  loginUrl:  '/login',

  isAuthed: false,
  isAnonymous: Ember.computed.not('isAuthed'),

  // Auth0 user profile
  profile: null,

  // Auth0 access token
  token: null,

  // Auth0Lock configurable options
  // https://github.com/auth0/lock/wiki/Auth0Lock-customization
  lockOptions: {
    authParams: {}
  },

  // update authentication properties
  setAuth: function(token, profile) {

    Ember.debug('Auth0-user successfully logged in');

    this.set('token', token);
    this.set('isAuthed', true);
    this.set('profile', profile);
  },

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
        window.location = this.loginUrl;
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
        window.location = this.loginUrl;
      }.bind(this)
    );
  },

  signup: function() {
    this.authClient.showSignup(function(err) {
      if (err) {
        return this.callbacks.onSignupError.call(this, err);
      }
      this.callbacks.onSignupSuccess.call(this);
      this.transitionTo(this.get('signupUrl'));
    }.bind(this));
  },

  logout: function() {
    this.authClient.logout({
      returnTo: this.get('logoutUrl')
    });
  }
});


export function initialize(container, application) {
  var config = container.lookupFactory('config:environment'),
      auth0Config = config ? config['ember-cli-auth0-lock'] : null;

  application.register('auth0:main', auth0, { singleton: true });
  application.inject('controller', 'auth0', 'auth0:main');
  application.inject('route', 'auth0', 'auth0:main');
  application.inject('adapter', 'auth0', 'auth0:main');

  // add APP auth0 config options
  if (auth0Config) {
    auth0.reopen({

      logoutUrl: auth0Config.logoutUrl,

      init: function() {
        var authParams = Ember.merge(this.get('lockOptions.authParams'), auth0Config.authParams);

        // update authparams config
        this.set('lockOptions.authParams', authParams);

        this.authClient = new Auth0Lock(auth0Config.cid, auth0Config.domain);

        // insert dummy authentication data, useful for development
        if (auth0Config.dummy) {
          this.set('token', auth0Config.dummyToken);
          this.set('isAuthed', true);
          this.set('profile', auth0Config.dummyProfile);
        }
      }
    });
  }
}

export default {
  name: 'auth0',
  initialize: initialize
};
