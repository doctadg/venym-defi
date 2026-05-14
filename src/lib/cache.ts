// Simple in-memory cache for swap providers
const memoryCache = new Map<string, { value: unknown; expires: number }>();

const get = async (key: string) => {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    memoryCache.delete(key);
    return null;
  }
  return entry.value;
};

const set = async (key: string, value: unknown, ttlSeconds: number) => {
  memoryCache.set(key, { value, expires: Date.now() + ttlSeconds * 1000 });
};

const del = async (key: string) => {
  memoryCache.delete(key);
};

const getTTL = async (key: string) => {
  const entry = memoryCache.get(key);
  if (!entry) return -1;
  const remaining = Math.max(0, Math.floor((entry.expires - Date.now()) / 1000));
  return remaining;
};

const getTimestamp = async (key: string) => {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  return new Date(entry.expires - 300 * 1000).toISOString(); // Approximate
};

export const cache = { get, set, del, getTTL, getTimestamp };
