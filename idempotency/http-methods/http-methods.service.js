const { profiles } = require('./http-methods.store');

function getProfile(id) {
  return profiles.get(id) || null;
}

function replaceProfile(id, data) {
  const profile = {
    id,
    name: data.name || 'Unnamed',
    role: data.role || 'reader',
  };

  profiles.set(id, profile);

  return {
    profile,
    explanation: 'Repeating the same PUT leaves this profile in the same final state.',
  };
}

function deleteProfile(id) {
  const existedBeforeDelete = profiles.delete(id);

  return {
    deleted: true,
    existedBeforeDelete,
    explanation: 'Repeating DELETE may change metadata, but the final resource state stays deleted.',
  };
}

module.exports = {
  getProfile,
  replaceProfile,
  deleteProfile,
};
