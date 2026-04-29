const service = require('./idempotency-keys.service');

function createPayment(req, res) {
  const result = service.createPayment(req.body || {}, req.get('Idempotency-Key'));

  return res.status(result.statusCode).json(result.body);
}

module.exports = {
  createPayment,
};
