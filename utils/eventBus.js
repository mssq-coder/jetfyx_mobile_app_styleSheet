const listeners = {};

export function on(event, cb) {
  if (!listeners[event]) listeners[event] = new Set();
  listeners[event].add(cb);
  return () => off(event, cb);
}

export function off(event, cb) {
  if (!listeners[event]) return;
  listeners[event].delete(cb);
}

export function emit(event, payload) {
  const set = listeners[event];
  if (!set) return;
  for (const cb of Array.from(set)) {
    try {
      cb(payload);
    } catch (e) {
      // swallow
    }
  }
}

export default { on, off, emit };
