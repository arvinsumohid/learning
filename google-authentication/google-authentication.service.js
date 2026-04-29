const crypto = require('node:crypto');

const { OAuth2Client } = require('google-auth-library');

const stateStore = require('./google-authentication.store');

function getConfig() {
  return {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI,
    scopes: (process.env.GOOGLE_AUTH_SCOPES || 'openid email profile')
      .split(' ')
      .filter(Boolean),
  };
}

function getMissingConfig(config = getConfig()) {
  return Object.entries({
    GOOGLE_CLIENT_ID: config.clientId,
    GOOGLE_CLIENT_SECRET: config.clientSecret,
    GOOGLE_REDIRECT_URI: config.redirectUri,
  })
    .filter(([, value]) => !value || value.startsWith('replace-with') || value.startsWith('your-'))
    .map(([key]) => key);
}

function createOAuthClient(config = getConfig()) {
  return new OAuth2Client(config.clientId, config.clientSecret, config.redirectUri);
}

function getTokenSummary(tokens) {
  return {
    tokenType: tokens.token_type,
    scope: tokens.scope,
    expiryDate: tokens.expiry_date,
    hasAccessToken: Boolean(tokens.access_token),
    hasRefreshToken: Boolean(tokens.refresh_token),
    hasIdToken: Boolean(tokens.id_token),
  };
}

function readStatus() {
  const config = getConfig();
  const missingConfig = getMissingConfig(config);

  return {
    name: 'Google authentication example',
    configured: missingConfig.length === 0,
    missingConfig,
    startUrl: '/auth/google',
    callbackUrl: config.redirectUri,
  };
}

function createAuthorizationUrl() {
  const config = getConfig();
  console.log('config', config);
  const missingConfig = getMissingConfig(config);

  if (missingConfig.length > 0) {
    return {
      ok: false,
      statusCode: 500,
      body: {
        error: 'Google OAuth is not configured.',
        missingConfig,
      },
    };
  }

  const state = crypto.randomBytes(24).toString('hex');
  stateStore.addState(state);

  return {
    ok: true,
    url: createOAuthClient(config).generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: config.scopes,
      state,
    }),
  };
}

async function completeAuthentication(code, state) {
  if (!code || !state || !stateStore.consumeState(state)) {
    return {
      statusCode: 400,
      body: {
        error: 'Invalid Google OAuth callback.',
      },
    };
  }

  const config = getConfig();
  const oauthClient = createOAuthClient(config);
  const { tokens } = await oauthClient.getToken(code);
  oauthClient.setCredentials(tokens);

  if (!tokens.id_token) {
    return {
      statusCode: 400,
      body: {
        error: 'Google did not return an ID token. Make sure the openid scope is enabled.',
        tokens: getTokenSummary(tokens),
      },
    };
  }

  const ticket = await oauthClient.verifyIdToken({
    idToken: tokens.id_token,
    audience: config.clientId,
  });

  const profile = ticket.getPayload();

  return {
    statusCode: 200,
    body: {
      message: 'Google authentication completed.',
      user: {
        googleUserId: profile.sub,
        email: profile.email,
        emailVerified: profile.email_verified,
        name: profile.name,
        picture: profile.picture,
      },
      tokens: getTokenSummary(tokens),
    },
  };
}

module.exports = {
  readStatus,
  createAuthorizationUrl,
  completeAuthentication,
};
