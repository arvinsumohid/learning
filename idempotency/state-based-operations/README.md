# State-Based Operations

This example models an "ensure this exists" operation. The endpoint cares about the desired final state, not how many times the request was made.

## Endpoint

```http
PUT /idempotency/state-based-operations/directories/reports
```

## Try it

```bash
curl -X PUT http://localhost:3000/idempotency/state-based-operations/directories/reports
curl -X PUT http://localhost:3000/idempotency/state-based-operations/directories/reports
```

The first request creates the directory record. Repeating it leaves the same record in place.
