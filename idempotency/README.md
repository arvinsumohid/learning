# Idempotency

## Overview

Idempotency is a fundamental concept in computer science and software engineering that ensures that performing an operation multiple times produces the same result as performing it once. This property is crucial for building reliable, fault-tolerant systems, especially in distributed environments where network failures and retries are common.

## Definition

An operation is **idempotent** if:

```
f(f(x)) = f(x)
```

In practical terms, applying the same operation multiple times has no additional effect after the first successful application. Idempotency is about the externally observable effect on the system; repeated calls may still return different status codes, timestamps, logs, or metadata.

## Examples

### HTTP Methods
- **GET**: Idempotent by design - retrieving data should not change the resource state
- **PUT**: Idempotent - updating a resource with the same data yields the same result
- **DELETE**: Idempotent - deleting a resource multiple times has the same final effect as deleting it once, even if later responses return `404`
- **POST**: Usually not idempotent - creates new resources each time, unless combined with idempotency keys or other deduplication
- **PATCH**: Can be idempotent or not, depending on implementation

### Database Operations
```sql
-- Idempotent
UPDATE users SET status = 'active' WHERE id = 123;

-- Not idempotent
INSERT INTO users (name, email) VALUES ('John', 'john@example.com');

-- Idempotent (conditional)
INSERT INTO users (name, email) VALUES ('John', 'john@example.com')
ON CONFLICT (email) DO NOTHING;
```

### Mathematical Functions
- Identity: `identity(identity(x)) = identity(x)`
- Absolute value: `abs(abs(x)) = abs(x)`
- Floor: `floor(floor(x)) = floor(x)`
- Set union with itself: `A union A = A`

## Why Idempotency Matters

### 1. Network Reliability
- Network failures can cause requests to be lost or duplicated
- Clients may retry operations without knowing if they succeeded
- Idempotency ensures retries don't cause unintended side effects

### 2. Fault Tolerance
- Systems can recover from crashes by replaying operations
- No need for complex state tracking to avoid duplicate processing

### 3. User Experience
- Users can safely retry failed operations
- Prevents duplicate orders, payments, or other critical actions

### 4. System Design
- Simplifies error handling and recovery logic
- Enables event-driven architectures and message queues

## Implementation Patterns

### 1. Idempotency Keys
```javascript
// Example: Payment processing with an idempotency key
async function processPayment(paymentData, idempotencyKey) {
  const cacheKey = `payment:${idempotencyKey}`;
  const existingResult = await cache.get(cacheKey);

  if (existingResult) {
    return existingResult;
  }

  const result = await paymentGateway.charge(paymentData);

  await cache.set(cacheKey, result, { ttl: 3600 });
  return result;
}
```

A production implementation should store the key atomically with the operation status, request fingerprint, response body, response status, and expiration time. This prevents two concurrent requests with the same key from both starting the same side effect.

## Runnable Endpoint Examples

This folder also contains small controller/service/route examples for the main idempotency patterns:

- `http-methods`: `GET`, `PUT`, and `DELETE` endpoints that are idempotent by method semantics
- `idempotency-keys`: a retry-safe `POST /payments` endpoint using an `Idempotency-Key` header
- `conditional-operations`: a status update that only mutates when the value actually changes
- `state-based-operations`: an "ensure this exists" endpoint that targets a final state
- `transactional-operations`: a create-if-absent endpoint that models a transaction plus unique key

To run the examples:

```bash
npm install
npm run start:idempotency
```

The example server starts at `http://localhost:3000`. Each subfolder has a `README.md` with curl commands for its endpoint.

If port `3000` is busy, pass another port:

```bash
npm run start:idempotency:3002
```

### 2. Conditional Operations
```javascript
// Database update with condition
function updateUserStatus(userId, newStatus) {
  return db.query(`
    UPDATE users 
    SET status = $1 
    WHERE id = $2 AND status != $1
    RETURNING *
  `, [newStatus, userId]);
}
```

### 3. State-Based Operations
```javascript
// File operations that check current state
import { mkdir } from 'node:fs/promises';

async function ensureDirectoryExists(path) {
  await mkdir(path, { recursive: true });
}
```

### 4. Transactional Patterns
```javascript
// Using a transaction for atomicity
async function createOrderIfNotExists(db, orderId, data) {
  return db.transaction(async (tx) => {
    const existingOrder = await tx.orders.findById(orderId);

    if (existingOrder) {
      return existingOrder;
    }

    return tx.orders.create({ id: orderId, ...data });
  });
}
```

The database should still enforce uniqueness with a constraint or atomic upsert. A separate "check then insert" can race under concurrent requests unless the transaction isolation level and schema protect it.

## Best Practices

### 1. Design for Idempotency from Start
- Consider idempotency requirements during API design
- Use appropriate HTTP methods
- Design database schemas to support idempotent operations

### 2. Use Idempotency Keys
- Generate unique keys for each logical operation
- Store keys with expiration to manage memory
- Include keys in request headers or payload
- Reject reuse of the same key with a different request payload
- Return the saved result for duplicate requests, including the relevant response status

### 3. Implement Proper Error Handling
- Distinguish between client and server errors
- Return appropriate HTTP status codes
- Provide clear error messages

### 4. Consider Timeouts and Retries
- Set reasonable timeout values
- Implement exponential backoff for retries
- Limit maximum retry attempts
- Make retry behavior explicit in client and server documentation

### 5. Monitor and Log
- Log idempotency key usage
- Monitor for duplicate operations
- Track retry patterns and success rates

## Common Pitfalls

### 1. Assuming All Operations Are Idempotent
- POST requests are typically not idempotent
- Operations with side effects (sending emails, notifications)
- Time-sensitive operations (timestamps, counters)

### 2. Incomplete Idempotency Implementation
- Only checking for duplicates without handling partial failures
- Not considering concurrent operations
- Missing edge cases in conditional logic
- Recording the key only after the side effect succeeds, leaving a window for duplicate work

### 3. Performance Issues
- Overly complex idempotency checks
- Excessive database queries for validation
- Memory leaks from storing too many keys

### 4. Key Generation Problems
- Non-unique idempotency keys
- Keys that are too long or complex
- Keys that don't survive system restarts

### 5. Confusing Response Equality with Effect Equality
- A repeated `DELETE` may return `204` first and `404` later while still being idempotent
- A repeated request may create extra logs, metrics, or audit rows without changing the business resource
- Idempotent APIs should document which parts of the response are replayed and which may be recalculated

## Real-World Examples

### Stripe API
```javascript
const response = await fetch('https://api.stripe.com/v1/payment_intents', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
    'Content-Type': 'application/x-www-form-urlencoded',
    'Idempotency-Key': 'unique_order_id_123',
  },
  body: new URLSearchParams({
    amount: '4000',
    currency: 'usd',
    payment_method: 'pm_card_visa',
    confirm: 'true',
  }),
});

const paymentIntent = await response.json();
```

### AWS S3
```javascript
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const s3 = new S3Client({});

// Repeating the same PUT leaves the latest object at this key with the same content
await s3.send(new PutObjectCommand({
  Bucket: 'my-bucket',
  Key: 'file.txt',
  Body: 'Hello World',
}));
```

With bucket versioning enabled, repeated `PUT` calls can create multiple object versions, so the latest object may look idempotent while the bucket history still changes.

### Database Migrations
```sql
-- Idempotent migration
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100)
);

-- Add column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='email') THEN
        ALTER TABLE users ADD COLUMN email VARCHAR(255);
    END IF;
END $$;
```

## Testing Idempotency

### Unit Tests
```javascript
it('returns the same result for the same idempotency key', async () => {
  const result1 = await processOrder(orderData, 'key123');
  const result2 = await processOrder(orderData, 'key123');

  expect(result1.id).toBe(result2.id);
  expect(result1.status).toBe(result2.status);
});
```

### Integration Tests
```javascript
describe('Payment API', () => {
  it('should handle duplicate requests', async () => {
    const idempotencyKey = uuidv4();
    
    // First request
    const response1 = await request(app)
      .post('/payments')
      .set('Idempotency-Key', idempotencyKey)
      .send(paymentData)
      .expect(201);
    
    // Duplicate request
    const response2 = await request(app)
      .post('/payments')
      .set('Idempotency-Key', idempotencyKey)
      .send(paymentData)
      .expect(200);
    
    expect(response1.body.id).toBe(response2.body.id);
  });
});
```

## Production Checklist

- Define the idempotency boundary: endpoint, operation type, tenant, user, or resource
- Store keys in durable storage, not only in process memory
- Use unique constraints, atomic inserts, locks, or transactions to handle concurrent duplicates
- Save enough response data to replay duplicates consistently
- Compare a request fingerprint when a key is reused
- Decide how long keys should live and what happens after expiration
- Test retries after timeouts, partial failures, crashes, and concurrent duplicate requests

## Conclusion

Idempotency is a critical design principle for building robust distributed systems. By carefully designing operations to be idempotent, you can:

- Improve system reliability and fault tolerance
- Simplify error handling and recovery
- Provide better user experience
- Enable scalable architecture patterns

Remember that idempotency should be considered from the beginning of system design, not added as an afterthought. The investment in designing idempotent operations pays dividends in system reliability and maintainability.
