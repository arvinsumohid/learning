const service = require('./http-methods.service');

function showProfile(req, res) {
  const profile = service.getProfile(req.params.id);

  if (!profile) {
    return res.status(404).json({ error: 'Profile not found' });
  }

  return res.json({
    profile,
    explanation: 'GET is idempotent because reading the same resource does not change it.',
  });
}

function replaceProfile(req, res) {
  const result = service.replaceProfile(req.params.id, req.body || {});

  return res.json(result);
}

function deleteProfile(req, res) {
  const result = service.deleteProfile(req.params.id);

  return res.status(result.existedBeforeDelete ? 200 : 404).json(result);
}

module.exports = {
  showProfile,
  replaceProfile,
  deleteProfile,
};
