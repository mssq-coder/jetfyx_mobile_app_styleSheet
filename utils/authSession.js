let onAuthFailure = null;

export function setOnAuthFailure(handler) {
  onAuthFailure = typeof handler === "function" ? handler : null;
}

export function notifyAuthFailure(reason) {
  try {
    if (onAuthFailure) onAuthFailure(reason);
  } catch (_e) {}
}
