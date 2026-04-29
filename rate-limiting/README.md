# Rate Limiting

## Overview

Rate limiting is a control mechanism that restricts how often a client, user, service, or system can perform an action within a specific time period. It protects applications from overload, abusive traffic, accidental retry storms, runaway automation, and expensive resource consumption.

Rate limiting is common at API gateways, reverse proxies, application servers, job queues, message consumers, authentication endpoints, and third-party integration clients.

## Runnable Examples

Start the example app:

```bash
npm run start:rate-limiting
```

The examples run on `http://localhost:3001` by default. Each algorithm has its own folder with a controller, service, route, store, and README.

## Definition

A rate limit defines:

- **Who** is being limited: IP address, user ID, API key, tenant, device, service, or endpoint
- **What** is being limited: requests, login attempts, writes, emails, messages, tokens, bytes, or expensive operations
- **How much** is allowed: for example, `100 requests per minute`
- **What happens when exceeded**: reject, delay, queue, degrade, or require additional verification

In API terms, a client that exceeds a limit commonly receives:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 30
```

The limit should be enforced on the smallest boundary that matches the risk. A public read endpoint, password reset endpoint, payment endpoint, and internal batch job usually need different policies.

## Why Rate Limiting Matters

### 1. Availability
- Prevents one client or tenant from consuming all shared capacity
- Reduces the chance of cascading failures during traffic spikes
- Gives systems a predictable operating envelope

### 2. Abuse Prevention
- Slows brute-force login attempts, scraping, spam, credential stuffing, and enumeration
- Makes automated abuse more expensive
- Gives monitoring and fraud systems time to react

### 3. Cost Control
- Caps use of expensive resources such as LLM calls, SMS messages, emails, database writes, and third-party APIs
- Prevents accidental loops or retry storms from creating large bills

### 4. Fairness
- Ensures shared infrastructure is distributed reasonably across users, tenants, and API keys
- Allows higher service tiers to receive higher quotas without affecting lower tiers

### 5. Backpressure
- Tells clients when to slow down instead of allowing unbounded work to pile up
- Helps preserve latency and stability under load

## Common Algorithms

### 1. Fixed Window Counter

Runnable example:

```http
GET /rate-limiting/fixed-window-counter/feed
```

A fixed window counter tracks usage for a discrete interval, such as a calendar minute.

```javascript
async function allowRequest(userId) {
  const key = `rate:${userId}:${Math.floor(Date.now() / 60000)}`;
  const count = await redis.incr(key);

  if (count === 1) {
    await redis.expire(key, 60);
  }

  return count <= 100;
}
```

**Pros**
- Simple to understand and implement
- Efficient in memory and storage

**Cons**
- Allows bursts at window boundaries
- A client can send `100` requests at the end of one minute and `100` more at the start of the next

### 2. Sliding Window Log

Runnable example:

```http
GET /rate-limiting/sliding-window-log/search
```

A sliding window log stores timestamps for recent requests and removes entries outside the active window.

```javascript
async function allowRequest(userId) {
  const key = `rate:${userId}`;
  const now = Date.now();
  const windowStart = now - 60_000;

  await redis.zremrangebyscore(key, 0, windowStart);
  const count = await redis.zcard(key);

  if (count >= 100) {
    return false;
  }

  await redis.zadd(key, now, `${now}:${crypto.randomUUID()}`);
  await redis.expire(key, 60);
  return true;
}
```

**Pros**
- Accurate over a rolling time period
- Prevents boundary bursts

**Cons**
- Stores one entry per request
- More expensive at high traffic volume

### 3. Sliding Window Counter

Runnable example:

```http
GET /rate-limiting/sliding-window-counter/metrics
```

A sliding window counter approximates a rolling limit by combining the current and previous fixed windows.

```text
estimated_count =
  current_window_count +
  previous_window_count * overlap_fraction
```

**Pros**
- More accurate than fixed windows
- Cheaper than storing every request timestamp

**Cons**
- Approximate, not exact
- Requires careful time calculations

### 4. Token Bucket

Runnable example:

```http
GET /rate-limiting/token-bucket/reports?cost=2
```

A token bucket refills at a steady rate up to a maximum capacity. Each request consumes one or more tokens.

```javascript
function allowRequest(bucket, now) {
  const elapsed = (now - bucket.lastRefillAt) / 1000;
  const refill = elapsed * bucket.refillRatePerSecond;

  bucket.tokens = Math.min(bucket.capacity, bucket.tokens + refill);
  bucket.lastRefillAt = now;

  if (bucket.tokens < 1) {
    return false;
  }

  bucket.tokens -= 1;
  return true;
}
```

**Pros**
- Allows controlled bursts
- Good for APIs where short spikes are acceptable
- Easy to express as "average rate plus burst capacity"

**Cons**
- Needs atomic updates in distributed systems
- Requires clear choices for refill rate and capacity

### 5. Leaky Bucket

Runnable example:

```http
POST /rate-limiting/leaky-bucket/emails
```

A leaky bucket processes requests at a steady rate. Excess requests wait in a queue or are rejected when the queue is full.

**Pros**
- Smooths traffic
- Useful when downstream systems need steady throughput

**Cons**
- Queues can increase latency
- Rejected work can be delayed instead of immediately visible if queue behavior is unclear

## Implementation Patterns

### 1. API Middleware

```javascript
function rateLimit({ limit, windowMs }) {
  const requests = new Map();

  return (req, res, next) => {
    const key = req.user?.id ?? req.ip;
    const now = Date.now();
    const entry = requests.get(key) ?? { count: 0, resetAt: now + windowMs };

    if (now > entry.resetAt) {
      entry.count = 0;
      entry.resetAt = now + windowMs;
    }

    entry.count += 1;
    requests.set(key, entry);

    res.setHeader('RateLimit-Limit', limit);
    res.setHeader('RateLimit-Remaining', Math.max(0, limit - entry.count));
    res.setHeader('RateLimit-Reset', Math.ceil(entry.resetAt / 1000));

    if (entry.count > limit) {
      res.setHeader('Retry-After', Math.ceil((entry.resetAt - now) / 1000));
      return res.status(429).json({ error: 'Too many requests' });
    }

    next();
  };
}
```

In-memory limiters are useful for local development and single-process services, but production systems usually need shared storage such as Redis, Memcached, a gateway, or a service mesh policy.

### 2. Distributed Counter with Redis

```javascript
async function checkLimit(redis, key, limit, windowSeconds) {
  const count = await redis.incr(key);

  if (count === 1) {
    await redis.expire(key, windowSeconds);
  }

  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
  };
}
```

For stricter correctness, combine increment and expiration in a Lua script or transaction so the counter cannot be left without a TTL if the process crashes between commands.

### 3. Multiple Limit Dimensions

```text
POST /login
- 5 attempts per minute per IP address
- 10 attempts per hour per account
- 100 attempts per hour per tenant

POST /payments
- 20 requests per minute per user
- 500 requests per minute per tenant
- 2,000 requests per minute globally
```

Layered limits catch different failure modes. A per-user limit protects individual accounts, while a per-tenant or global limit protects shared infrastructure.

### 4. Weighted Requests

Not all requests cost the same. A cheap health check and a report export should not consume the same budget.

```javascript
const weights = {
  'GET /search': 1,
  'POST /exports': 20,
  'POST /ai/completions': 50,
};

const cost = weights[`${req.method} ${req.route.path}`] ?? 1;
```

Weighted limits are especially useful for compute-heavy endpoints, third-party calls, and APIs where payload size changes the real cost.

### 5. Client-Side Throttling

```javascript
async function fetchWithRateLimit(url, options) {
  const response = await fetch(url, options);

  if (response.status !== 429) {
    return response;
  }

  const retryAfter = Number(response.headers.get('Retry-After') ?? 1);
  await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));

  return fetch(url, options);
}
```

Servers should enforce limits, but well-behaved clients should also respect `429`, `Retry-After`, and rate-limit headers.

## HTTP Headers

Common response headers include:

```http
RateLimit-Limit: 100
RateLimit-Remaining: 42
RateLimit-Reset: 1714435200
Retry-After: 30
```

Useful headers communicate:

- The maximum allowed quota
- The remaining quota
- When the quota resets
- How long a rejected client should wait before retrying

Do not expose sensitive internal capacity details. Public headers should help clients behave correctly without giving attackers a detailed map of system limits.

## Choosing Limits

### 1. Start from Real Capacity
- Measure normal traffic, peak traffic, and expensive operations
- Understand database, queue, cache, and third-party limits
- Leave headroom for retries, deploys, failovers, and background jobs

### 2. Use Different Policies for Different Risks
- Authentication endpoints need stricter abuse controls
- Read endpoints can often tolerate higher rates
- Write endpoints may need lower limits because they mutate state
- Admin or export endpoints may need small quotas with longer windows

### 3. Match the Customer Model
- Anonymous traffic: IP or device limits
- Authenticated users: user ID limits
- B2B applications: tenant and API key limits
- Internal services: service identity and endpoint limits

### 4. Include Burst Behavior
- A limit of `60 requests per minute` is not the same as `1 request per second`
- Token buckets are useful when short bursts are acceptable
- Leaky buckets are useful when downstream systems need smooth traffic

### 5. Plan for Overrides
- Higher service tiers may need higher quotas
- Trusted internal tools may need special policies
- Temporary incident controls may need emergency lower limits
- Manual overrides should be auditable and expire automatically when possible

## Common Pitfalls

### 1. Limiting Only by IP Address
- Many users can share one NAT, VPN, office, or mobile carrier IP
- Attackers can rotate IP addresses
- IP limits are useful, but they should often be combined with user, tenant, API key, or account limits

### 2. Using Local Memory in a Multi-Instance Service
- Each instance enforces its own separate limit
- A client can exceed the intended global quota by spreading traffic across instances
- Restarts erase counters

### 3. Forgetting Atomicity
- Concurrent requests can read the same remaining quota and all pass
- Counters can be left without expiration if updates are not atomic
- Distributed limiters should use atomic operations, transactions, scripts, or purpose-built infrastructure

### 4. Treating All Endpoints the Same
- A single global policy can be too strict for cheap endpoints and too loose for expensive ones
- Sensitive endpoints need limits based on abuse patterns, not average traffic alone

### 5. Returning Unhelpful Errors
- Clients need to know whether to retry and when
- `429 Too Many Requests` should usually include `Retry-After`
- Error bodies should be clear without revealing sensitive internals

### 6. Ignoring Retries
- Retries can multiply traffic during partial outages
- Rate limits should work with exponential backoff, jitter, deadlines, and circuit breakers
- Clients should avoid retrying non-idempotent operations unless the API supports idempotency keys

### 7. Failing Open or Closed Without Intention
- If the limiter store is unavailable, allowing all requests can overload the system
- Blocking all requests can create a full outage
- The fallback behavior should be explicit and tested

## Rate Limiting vs. Related Concepts

### Throttling
Throttling slows traffic down. It may delay or queue requests instead of rejecting them immediately.

### Quotas
Quotas usually apply over longer periods, such as `10,000 requests per month` or `1 TB per day`.

### Backpressure
Backpressure signals upstream clients or services to slow down because downstream capacity is constrained.

### Circuit Breakers
Circuit breakers stop calls to a failing dependency for a period of time to prevent repeated failures and cascading load.

### Idempotency
Idempotency makes retries safer. Rate limiting controls how many retries or requests are allowed. Reliable systems often need both.

## Testing Rate Limiting

### Unit Tests

```javascript
it('rejects requests after the limit is exceeded', () => {
  const limiter = createFixedWindowLimiter({ limit: 2, windowMs: 60_000 });

  expect(limiter.allow('user-123')).toBe(true);
  expect(limiter.allow('user-123')).toBe(true);
  expect(limiter.allow('user-123')).toBe(false);
});
```

### Integration Tests

```javascript
it('returns 429 and Retry-After after too many requests', async () => {
  await request(app).get('/api/search').expect(200);
  await request(app).get('/api/search').expect(200);

  const response = await request(app).get('/api/search').expect(429);

  expect(response.headers['retry-after']).toBeDefined();
  expect(response.body.error).toBe('Too many requests');
});
```

### Concurrency Tests

```javascript
it('does not allow concurrent requests to exceed the quota', async () => {
  const results = await Promise.all(
    Array.from({ length: 50 }, () => limiter.allow('user-123'))
  );

  expect(results.filter(Boolean)).toHaveLength(10);
});
```

## Observability

Track rate limiting behavior so limits can be tuned safely.

Useful signals include:

- Allowed request count by route, user, tenant, API key, and region
- Rejected request count and `429` rate
- Near-limit events before clients are rejected
- Limiter store latency and errors
- Top limited users, tenants, IP addresses, and endpoints
- Retry behavior after clients receive `429`
- Business impact, such as failed logins, blocked exports, or delayed jobs

Alerts should distinguish expected abuse prevention from accidental customer impact.

## Production Checklist

- Define the limited identity: IP, user, tenant, API key, service, or a combination
- Define the limited action: endpoint, operation type, resource, or cost unit
- Choose the algorithm: fixed window, sliding window, token bucket, leaky bucket, or quota
- Set limits from capacity data and abuse risk, not guesswork alone
- Use shared durable storage or gateway-level enforcement for multi-instance services
- Make limiter updates atomic
- Return `429 Too Many Requests` with useful retry information
- Add jittered exponential backoff to clients that retry
- Use different limits for anonymous, authenticated, tenant, and privileged traffic
- Test boundary bursts, concurrent requests, store failures, and clock behavior
- Monitor allowed, rejected, and near-limit traffic
- Document how overrides, tiers, and emergency limits work

## Conclusion

Rate limiting is a practical reliability and safety tool. Good limits protect shared systems while still allowing normal users to work smoothly. The best implementations are specific about identity, action, algorithm, error behavior, observability, and failure modes.

Rate limiting should be designed alongside retries, idempotency, authentication, quotas, and backpressure. Together, those patterns help systems stay predictable even when clients, dependencies, or traffic patterns behave badly.
