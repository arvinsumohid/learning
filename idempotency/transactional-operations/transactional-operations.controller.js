const service = require('./transactional-operations.service');

function createOrder(req, res) {
  const result = service.createOrderIfAbsent(req.params.orderId, req.body || {});

  return res.status(result.statusCode).json(result.body);
}

module.exports = {
  createOrder,
};
