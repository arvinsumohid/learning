const service = require('./google-authentication.service');

function readStatus(_req, res) {
  return res.json(service.readStatus());
}

function redirectToGoogle(_req, res) {
  const result = service.createAuthorizationUrl();

  if (!result.ok) {
    return res.status(result.statusCode).json(result.body);
  }

  return res.redirect(result.url);
}

async function handleGoogleCallback(req, res, next) {
  try {
    const result = await service.completeAuthentication(req.query.code, req.query.state);

    return res.status(result.statusCode).json(result.body);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  readStatus,
  redirectToGoogle,
  handleGoogleCallback,
};
