const service = require('./conditional-operations.service');

function setUserStatus(req, res) {
  const result = service.setUserStatus(req.params.id, req.body?.status || 'active');

  return res.status(result.statusCode).json(result.body);
}

module.exports = {
  setUserStatus,
};
