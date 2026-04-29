const { directories } = require('./state-based-operations.store');

function ensureDirectory(name) {
  const existingDirectory = directories.get(name);

  if (existingDirectory) {
    return {
      directory: existingDirectory,
      created: false,
      explanation: 'The desired state already exists, so the repeated request is a no-op.',
    };
  }

  const directory = {
    name,
    path: `/demo/${name}`,
    exists: true,
  };

  directories.set(name, directory);

  return {
    directory,
    created: true,
    explanation: 'The first request created the desired state.',
  };
}

module.exports = {
  ensureDirectory,
};
