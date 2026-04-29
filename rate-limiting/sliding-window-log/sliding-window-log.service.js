const { requestLogs } = require('./sliding-window-log.store');

const LIMIT = 3;
const WINDOW_MS = 15_000;

function checkLimit(clientId) {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;
  const timestamps = (requestLogs.get(clientId) || []).filter((timestamp) => timestamp > windowStart);
  const allowed = timestamps.length < LIMIT;

  if (allowed) {
    timestamps.push(now);
  }

  requestLogs.set(clientId, timestamps);

  const oldestRequestAt = timestamps[0] || now;
  const resetAt = oldestRequestAt + WINDOW_MS;
  const retryAfter = Math.max(1, Math.ceil((resetAt - now) / 1000));

  return {
    allowed,
    limit: LIMIT,
    remaining: Math.max(0, LIMIT - timestamps.length),
    resetAt,
    retryAfter,
    timestamps,
  };
}

function search(clientId) {
  const result = checkLimit(clientId);

  if (!result.allowed) {
    return {
      statusCode: 429,
      headers: result,
      body: {
        error: 'Too many requests',
        algorithm: 'sliding-window-log',
        explanation: 'Every request timestamp inside the rolling window is counted exactly.',
      },
    };
  }

  return {
    statusCode: 200,
    headers: result,
    body: {
      message: 'Search completed.',
      algorithm: 'sliding-window-log',
      explanation: 'Old timestamps fall out continuously instead of waiting for a fixed reset boundary.',
      timestampsInWindow: result.timestamps.length,
    },
  };
}

module.exports = {
  search,
};
