# Leaky Bucket

Keeps a small queue and drains it at a steady rate. This example accepts up to `3` queued email jobs per `X-Client-Id` and leaks one job every `2` seconds.

## Endpoint

```http
POST /rate-limiting/leaky-bucket/emails
```

## Try it

```bash
curl -X POST -H "X-Client-Id: user-1" http://localhost:3001/rate-limiting/leaky-bucket/emails
```

Send requests quickly to fill the queue. Once the queue is full, new requests return `429 Too Many Requests`.
