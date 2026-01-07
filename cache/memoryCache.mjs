const store = new Map();

export function setCache(key, value, ttlSeconds = 300) {
  store.set(key, {
    value,
    expires: Date.now() + ttlSeconds * 1000
  });
}

export function getCache(key) {
  const entry = store.get(key);
  if (!entry) return null;

  if (Date.now() > entry.expires) {
    store.delete(key);
    return null;
  }

  return entry.value;
}
