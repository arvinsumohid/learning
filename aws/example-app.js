const path = require('node:path');

require('dotenv').config({ path: path.join(__dirname, '.env'), quiet: true });

const express = require('express');

const s3Routes = require('./s3/s3.routes');

const app = express();

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/aws/s3', s3Routes);

app.use((error, _req, res, _next) => {
  res.status(500).json({
    error: 'AWS example failed.',
    message: error.message,
  });
});

if (require.main === module) {
  const portArgIndex = process.argv.indexOf('--port');
  const portFromArg = portArgIndex === -1 ? null : process.argv[portArgIndex + 1];
  const port = process.env.PORT || portFromArg || 3005;

  app.listen(port, () => {
    console.log(`AWS examples running at http://localhost:${port}`);
  });
}

module.exports = app;
