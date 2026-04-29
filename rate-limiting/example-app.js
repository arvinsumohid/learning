const express = require('express');

const fixedWindowCounterRoutes = require('./fixed-window-counter/fixed-window-counter.routes');
const slidingWindowLogRoutes = require('./sliding-window-log/sliding-window-log.routes');
const slidingWindowCounterRoutes = require('./sliding-window-counter/sliding-window-counter.routes');
const tokenBucketRoutes = require('./token-bucket/token-bucket.routes');
const leakyBucketRoutes = require('./leaky-bucket/leaky-bucket.routes');

const app = express();

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/rate-limiting/fixed-window-counter', fixedWindowCounterRoutes);
app.use('/rate-limiting/sliding-window-log', slidingWindowLogRoutes);
app.use('/rate-limiting/sliding-window-counter', slidingWindowCounterRoutes);
app.use('/rate-limiting/token-bucket', tokenBucketRoutes);
app.use('/rate-limiting/leaky-bucket', leakyBucketRoutes);

if (require.main === module) {
  const portArgIndex = process.argv.indexOf('--port');
  const portFromArg = portArgIndex === -1 ? null : process.argv[portArgIndex + 1];
  const port = process.env.PORT || portFromArg || 3001;

  app.listen(port, () => {
    console.log(`Rate limiting examples running at http://localhost:${port}`);
  });
}

module.exports = app;
