const { users } = require('./conditional-operations.store');

function setUserStatus(userId, status) {
  const user = users.get(userId);

  if (!user) {
    return {
      statusCode: 404,
      body: { error: 'User not found' },
    };
  }

  if (user.status === status) {
    return {
      statusCode: 200,
      body: {
        user,
        changed: false,
        explanation: 'The condition prevented duplicate work because the user already has this status.',
      },
    };
  }

  const updatedUser = {
    ...user,
    status,
    statusChangedCount: user.statusChangedCount + 1,
  };

  users.set(userId, updatedUser);

  return {
    statusCode: 200,
    body: {
      user: updatedUser,
      changed: true,
      explanation: 'Only the first request that changes the status increments the counter.',
    },
  };
}

module.exports = {
  setUserStatus,
};
