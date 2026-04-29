# Conditional Operations

This example applies a change only when the current state does not already match the requested state.

## Endpoint

```http
PATCH /idempotency/conditional-operations/users/user-1/status
```

## Try it

```bash
curl -X PATCH http://localhost:3000/idempotency/conditional-operations/users/user-1/status \
  -H "Content-Type: application/json" \
  -d '{"status":"active"}'

curl -X PATCH http://localhost:3000/idempotency/conditional-operations/users/user-1/status \
  -H "Content-Type: application/json" \
  -d '{"status":"active"}'
```

The second request sees that the status is already `active`, so it does not increment `statusChangedCount`.
