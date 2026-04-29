# Idempotency Keys

This example makes a normally non-idempotent `POST` safe to retry by storing the first result under an `Idempotency-Key`.

## Endpoint

```http
POST /idempotency/idempotency-keys/payments
Idempotency-Key: checkout-123
```

## Try it

```bash
curl -X POST http://localhost:3000/idempotency/idempotency-keys/payments \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: checkout-123" \
  -d '{"amount":4999,"currency":"USD","customerId":"user-1"}'

curl -X POST http://localhost:3000/idempotency/idempotency-keys/payments \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: checkout-123" \
  -d '{"amount":4999,"currency":"USD","customerId":"user-1"}'
```

The second request returns the original payment instead of creating another one.
