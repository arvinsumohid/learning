const { counters } = require('./sliding-window-counter.store');

const LIMIT = 3;
const WINDOW_MS = 15_000;

function getWindowStart(now) {
  return Math.floor(now / WINDOW_MS) * WINDOW_MS;
}

function checkLimit(clientId) {
  const now = Date.now();
  const currentWindowStart = getWindowStart(now);
  const previousWindowStart = currentWindowStart - WINDOW_MS;
  const counter = counters.get(clientId) || {
    currentWindowStart,
    currentCount: 0,
    previousWindowStart,
    previousCount: 0,
  };

  if (counter.currentWindowStart !== currentWindowStart) {
    counter.previousWindowStart =
      counter.currentWindowStart === previousWindowStart ? counter.currentWindowStart : previousWindowStart;
    counter.previousCount = counter.currentWindowStart === previousWindowStart ? counter.currentCount : 0;
    counter.currentWindowStart = currentWindowStart;
    counter.currentCount = 0;
  }

  const elapsedInWindow = now - currentWindowStart;
  const previousWindowWeight = (WINDOW_MS - elapsedInWindow) / WINDOW_MS;
  const estimatedCountBeforeRequest = counter.currentCount + counter.previousCount * previousWindowWeight;
  const allowed = estimatedCountBeforeRequest < LIMIT;

  if (allowed) {
    counter.currentCount += 1;
  }

  counters.set(clientId, counter);

  const estimatedCount = counter.currentCount + counter.previousCount * previousWindowWeight;
  const resetAt = currentWindowStart + WINDOW_MS;
  const retryAfter = Math.max(1, Math.ceil((resetAt - now) / 1000));

  return {
    allowed,
    limit: LIMIT,
    remaining: Math.max(0, Math.floor(LIMIT - estimatedCount)),
    resetAt,
    retryAfter,
    estimatedCount: Number(estimatedCount.toFixed(2)),
    currentCount: counter.currentCount,
    previousCount: counter.previousCount,
  };
}

function readMetrics(clientId) {
  const result = checkLimit(clientId);

  if (!result.allowed) {
    return {
      statusCode: 429,
      headers: result,
      body: {
        error: 'Too many requests',
        algorithm: 'sliding-window-counter',
        explanation: 'The weighted previous window plus current window is over the limit.',
        estimatedCount: result.estimatedCount,
      },
    };
  }

  return {
    statusCode: 200,
    headers: result,
    body: {
      message: 'Metrics loaded.',
      algorithm: 'sliding-window-counter',
      explanation: 'This approximates a rolling window without storing every request timestamp.',
      estimatedCount: result.estimatedCount,
      currentCount: result.currentCount,
      previousCount: result.previousCount,
    },
  };
}

module.exports = {
  readMetrics,
};
