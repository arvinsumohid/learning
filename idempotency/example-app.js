const express = require('express');

const httpMethodRoutes = require('./http-methods/http-methods.routes');
const idempotencyKeyRoutes = require('./idempotency-keys/idempotency-keys.routes');
const conditionalOperationRoutes = require('./conditional-operations/conditional-operations.routes');
const stateBasedOperationRoutes = require('./state-based-operations/state-based-operations.routes');
const transactionalOperationRoutes = require('./transactional-operations/transactional-operations.routes');

const app = express();

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/idempotency/http-methods', httpMethodRoutes);
app.use('/idempotency/idempotency-keys', idempotencyKeyRoutes);
app.use('/idempotency/conditional-operations', conditionalOperationRoutes);
app.use('/idempotency/state-based-operations', stateBasedOperationRoutes);
app.use('/idempotency/transactional-operations', transactionalOperationRoutes);

if (require.main === module) {
  const portArgIndex = process.argv.indexOf('--port');
  const portFromArg = portArgIndex === -1 ? null : process.argv[portArgIndex + 1];
  const port = process.env.PORT || portFromArg || 3000;

  app.listen(port, () => {
    console.log(`Idempotency examples running at http://localhost:${port}`);
  });
}

module.exports = app;
