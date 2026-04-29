# Sliding Window Counter

Combines the current fixed window with a weighted part of the previous window. This example allows about `3` requests per rolling `15` seconds per `X-Client-Id`.

## Endpoint

```http
GET /rate-limiting/sliding-window-counter/metrics
```

## Try it

```bash
curl -H "X-Client-Id: user-1" http://localhost:3001/rate-limiting/sliding-window-counter/metrics
```

The response includes the estimated count so you can see the approximation.
