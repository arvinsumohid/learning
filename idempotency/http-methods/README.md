# HTTP Methods

This example shows idempotency built into HTTP method semantics.

## Endpoints

```http
GET /idempotency/http-methods/profiles/user-1
PUT /idempotency/http-methods/profiles/user-1
DELETE /idempotency/http-methods/profiles/user-1
```

## Try it

```bash
curl http://localhost:3000/idempotency/http-methods/profiles/user-1

curl -X PUT http://localhost:3000/idempotency/http-methods/profiles/user-1 \
  -H "Content-Type: application/json" \
  -d '{"name":"Ari","role":"admin"}'

curl -X DELETE http://localhost:3000/idempotency/http-methods/profiles/user-1
curl -X DELETE http://localhost:3000/idempotency/http-methods/profiles/user-1
```

The repeated `DELETE` can return different metadata, but the final resource state is still deleted.
