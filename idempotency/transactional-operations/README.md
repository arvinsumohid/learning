# Transactional Operations

This example shows "create if absent" behavior. A stable client-provided order id makes retries return the existing resource.

## Endpoint

```http
POST /idempotency/transactional-operations/orders/order-123
```

## Try it

```bash
curl -X POST http://localhost:3000/idempotency/transactional-operations/orders/order-123 \
  -H "Content-Type: application/json" \
  -d '{"item":"book","quantity":2}'

curl -X POST http://localhost:3000/idempotency/transactional-operations/orders/order-123 \
  -H "Content-Type: application/json" \
  -d '{"item":"book","quantity":2}'
```

In production, the database transaction and unique constraint are what make this safe under concurrency.
