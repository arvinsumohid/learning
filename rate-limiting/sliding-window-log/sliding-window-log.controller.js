const service = require('./sliding-window-log.service');

function search(req, res) {
  const clientId = req.get('X-Client-Id') || req.ip;
  const result = service.search(clientId);

  res.set('RateLimit-Limit', String(result.headers.limit));
  res.set('RateLimit-Remaining', String(result.headers.remaining));
  res.set('RateLimit-Reset', String(Math.ceil(result.headers.resetAt / 1000)));

  if (result.statusCode === 429) {
    res.set('Retry-After', String(result.headers.retryAfter));
  }

  return res.status(result.statusCode).json(result.body);
}

module.exports = {
  search,
};
