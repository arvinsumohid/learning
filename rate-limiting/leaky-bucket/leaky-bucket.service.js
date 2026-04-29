const { buckets } = require('./leaky-bucket.store');

const QUEUE_CAPACITY = 3;
const LEAK_INTERVAL_MS = 2_000;

function drainQueue(bucket, now) {
  const elapsed = now - bucket.lastDrainedAt;
  const processedCount = Math.floor(elapsed / LEAK_INTERVAL_MS);

  if (processedCount <= 0) {
    return;
  }

  bucket.queue.splice(0, processedCount);
  bucket.lastDrainedAt += processedCount * LEAK_INTERVAL_MS;

  if (bucket.queue.length === 0) {
    bucket.lastDrainedAt = now;
  }
}

function checkLimit(clientId) {
  const now = Date.now();
  const bucket = buckets.get(clientId) || {
    queue: [],
    lastDrainedAt: now,
  };

  drainQueue(bucket, now);

  const allowed = bucket.queue.length < QUEUE_CAPACITY;

  if (allowed) {
    bucket.queue.push({ acceptedAt: now });
  }

  buckets.set(clientId, bucket);

  const retryAfter = Math.max(1, Math.ceil(LEAK_INTERVAL_MS / 1000));

  return {
    allowed,
    limit: QUEUE_CAPACITY,
    remaining: Math.max(0, QUEUE_CAPACITY - bucket.queue.length),
    resetAt: now + retryAfter * 1000,
    retryAfter,
    queueDepth: bucket.queue.length,
    leakIntervalMs: LEAK_INTERVAL_MS,
  };
}

function sendEmail(clientId) {
  const result = checkLimit(clientId);

  if (!result.allowed) {
    return {
      statusCode: 429,
      headers: result,
      body: {
        error: 'Too many requests',
        algorithm: 'leaky-bucket',
        explanation: 'The queue is full, so new work is rejected until one slot leaks out.',
        queueDepth: result.queueDepth,
      },
    };
  }

  return {
    statusCode: 202,
    headers: result,
    body: {
      message: 'Email accepted for steady processing.',
      algorithm: 'leaky-bucket',
      explanation: 'Requests enter a small queue and leave at a steady rate.',
      queueDepth: result.queueDepth,
      leakEveryMs: result.leakIntervalMs,
    },
  };
}

module.exports = {
  sendEmail,
};
