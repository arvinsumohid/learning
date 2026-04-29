const pendingStates = new Set();

function addState(state) {
  pendingStates.add(state);
}

function consumeState(state) {
  if (!pendingStates.has(state)) {
    return false;
  }

  pendingStates.delete(state);
  return true;
}

module.exports = {
  addState,
  consumeState,
};
