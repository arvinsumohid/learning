const service = require('./state-based-operations.service');

function ensureDirectory(req, res) {
  const result = service.ensureDirectory(req.params.name);

  return res.status(result.created ? 201 : 200).json(result);
}

module.exports = {
  ensureDirectory,
};
