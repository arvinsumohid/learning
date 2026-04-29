# Sliding Window Log

Stores recent request timestamps and counts only those inside a rolling window. This example allows `3` requests every rolling `15` seconds per `X-Client-Id`.

## Endpoint

```http
GET /rate-limiting/sliding-window-log/search
```

## Try it

```bash
curl -H "X-Client-Id: user-1" http://localhost:3001/rate-limiting/sliding-window-log/search
```

The fourth request inside the rolling window returns `429 Too Many Requests`.
