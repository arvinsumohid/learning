# Token Bucket

Refills tokens over time and lets each request consume one or more tokens. This example has a capacity of `5` tokens and refills `1` token per second.

## Endpoint

```http
GET /rate-limiting/token-bucket/reports?cost=2
```

## Try it

```bash
curl -H "X-Client-Id: user-1" "http://localhost:3001/rate-limiting/token-bucket/reports?cost=2"
```

Repeat the request quickly to drain the bucket, then wait a few seconds to watch tokens refill.
