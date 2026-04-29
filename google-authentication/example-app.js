const path = require('node:path');

require('dotenv').config({ path: path.join(__dirname, '.env'), quiet: true });

const express = require('express');
const googleAuthenticationRoutes = require('./google-authentication.routes');

const app = express();

app.use(express.json());

function getPort() {
  const portArgIndex = process.argv.indexOf('--port');
  const portFromArg = portArgIndex === -1 ? null : process.argv[portArgIndex + 1];

  return process.env.PORT || portFromArg || 3004;
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/', googleAuthenticationRoutes);

app.use((error, _req, res, _next) => {
  res.status(500).json({
    error: 'Google authentication failed.',
    message: error.message,
  });
});

if (require.main === module) {
  const port = getPort();

  app.listen(port, () => {
    console.log(`Google authentication example running at http://localhost:${port}`);
  });
}

module.exports = app;
