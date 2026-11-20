import { getRedis } from './redisClient.js';

/**
 * Best-effort JSON cache over the existing Redis connection.
 *
 * Purpose: on the t3.micro box, repeated identical queries (leaderboard
 * aggregations, per-user stats) were burning CPU credits for work whose
 * answer barely changes. Cached responses are served in ~0ms and the Mongo
 * aggregations run at most once per TTL window.
 *
 * Every call degrades gracefully: if Redis is unavailable, slow, or errors,
 * callers just fall through to the real query. Caching must never be the
 * reason a request fails.
 */

export const getCachedJSON = async (key) => {
  try {
    const client = await getRedis();
    const raw = await client.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const setCachedJSON = async (key, value, ttlSeconds = 30) => {
  try {
    const client = await getRedis();
    await client.set(key, JSON.stringify(value), { EX: ttlSeconds });
  } catch {
    // Cache writes are best-effort — never block the response on them.
  }
};
