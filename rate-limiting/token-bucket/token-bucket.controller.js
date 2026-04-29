const service = require('./token-bucket.service');

function generateReport(req, res) {
  const clientId = req.get('X-Client-Id') || req.ip;
  const cost = Number(req.query.cost || 2);
  const result = service.generateReport(clientId, cost);

  res.set('RateLimit-Limit', String(result.headers.limit));
  res.set('RateLimit-Remaining', String(result.headers.remaining));
  res.set('RateLimit-Reset', String(Math.ceil(result.headers.resetAt / 1000)));

  if (result.statusCode === 429) {
    res.set('Retry-After', String(result.headers.retryAfter));
  }

  return res.status(result.statusCode).json(result.body);
}

module.exports = {
  generateReport,
};
