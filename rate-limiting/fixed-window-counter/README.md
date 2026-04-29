# Fixed Window Counter

Tracks requests in a discrete time window. This example allows `3` requests every `15` seconds per `X-Client-Id`.

## Endpoint

```http
GET /rate-limiting/fixed-window-counter/feed
```

## Try it

```bash
curl -H "X-Client-Id: user-1" http://localhost:3001/rate-limiting/fixed-window-counter/feed
```

Run the command more than three times inside fifteen seconds to receive `429 Too Many Requests`.
