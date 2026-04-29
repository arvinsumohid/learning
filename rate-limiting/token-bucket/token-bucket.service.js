const { buckets } = require('./token-bucket.store');

const CAPACITY = 5;
const REFILL_RATE_PER_SECOND = 1;

function checkLimit(clientId, cost) {
  const now = Date.now();
  const bucket = buckets.get(clientId) || {
    tokens: CAPACITY,
    lastRefillAt: now,
  };

  const elapsedSeconds = (now - bucket.lastRefillAt) / 1000;
  const refill = elapsedSeconds * REFILL_RATE_PER_SECOND;
  bucket.tokens = Math.min(CAPACITY, bucket.tokens + refill);
  bucket.lastRefillAt = now;

  const allowed = bucket.tokens >= cost;

  if (allowed) {
    bucket.tokens -= cost;
  }

  buckets.set(clientId, bucket);

  const missingTokens = Math.max(0, cost - bucket.tokens);
  const retryAfter = Math.max(1, Math.ceil(missingTokens / REFILL_RATE_PER_SECOND));

  return {
    allowed,
    limit: CAPACITY,
    remaining: Math.floor(bucket.tokens),
    resetAt: now + retryAfter * 1000,
    retryAfter,
    tokens: Number(bucket.tokens.toFixed(2)),
    cost,
  };
}

function generateReport(clientId, requestedCost = 2) {
  const cost = Number.isFinite(requestedCost) && requestedCost > 0 ? Math.ceil(requestedCost) : 2;
  const result = checkLimit(clientId, cost);

  if (!result.allowed) {
    return {
      statusCode: 429,
      headers: result,
      body: {
        error: 'Too many requests',
        algorithm: 'token-bucket',
        explanation: 'The bucket does not currently have enough tokens for this weighted request.',
        tokensAvailable: result.tokens,
        requestCost: result.cost,
      },
    };
  }

  return {
    statusCode: 200,
    headers: result,
    body: {
      message: 'Report generated.',
      algorithm: 'token-bucket',
      explanation: 'Tokens refill steadily, so short bursts are allowed until the bucket is empty.',
      tokensRemaining: result.tokens,
      requestCost: result.cost,
    },
  };
}

module.exports = {
  generateReport,
};
