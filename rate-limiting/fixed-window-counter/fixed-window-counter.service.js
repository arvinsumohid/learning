const { windows } = require('./fixed-window-counter.store');

const LIMIT = 3;
const WINDOW_MS = 15_000;

function checkLimit(clientId) {
  const now = Date.now();
  const existingWindow = windows.get(clientId);
  const activeWindow =
    existingWindow && now < existingWindow.resetAt
      ? existingWindow
      : { count: 0, resetAt: now + WINDOW_MS };

  activeWindow.count += 1;
  windows.set(clientId, activeWindow);

  const allowed = activeWindow.count <= LIMIT;
  const retryAfter = Math.max(1, Math.ceil((activeWindow.resetAt - now) / 1000));

  return {
    allowed,
    limit: LIMIT,
    remaining: Math.max(0, LIMIT - activeWindow.count),
    resetAt: activeWindow.resetAt,
    retryAfter,
    count: activeWindow.count,
  };
}

function readFeed(clientId) {
  const result = checkLimit(clientId);

  if (!result.allowed) {
    return {
      statusCode: 429,
      headers: result,
      body: {
        error: 'Too many requests',
        algorithm: 'fixed-window-counter',
        explanation: 'This client used all requests in the current fixed window.',
      },
    };
  }

  return {
    statusCode: 200,
    headers: result,
    body: {
      message: 'Feed loaded.',
      algorithm: 'fixed-window-counter',
      explanation: 'The counter resets all at once when the fixed window expires.',
      requestCountInWindow: result.count,
    },
  };
}

module.exports = {
  readFeed,
};
