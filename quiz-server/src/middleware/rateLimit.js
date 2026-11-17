import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import net from 'net';

// Read a positive integer from env, falling back to `fallback` when missing/invalid
const envInt = (key, fallback) => {
  const val = parseInt(process.env[key], 10);
  return Number.isFinite(val) && val > 0 ? val : fallback;
};

const MINUTE = 60 * 1000;

// Shared message shape so the client can read `success` like every other endpoint
const tooMany = (message) => ({ success: false, message });

// ── Per-client bucket keys ───────────────────────────────────────────────────
// Campus NAT means many students can share one public IP, so prefer the
// AUTHENTICATED USER when a valid JWT is present (each player gets their own
// budget), else the best-effort client IP. A forged token fails the local
// signature check and falls through to the IP bucket.
function normalizeIp(v) {
  let value = typeof v === 'string' ? v.trim() : '';
  if (!value) return '';
  if (value.startsWith('::ffff:')) value = value.slice(7); // IPv4-mapped IPv6
  if (net.isIPv4(value) && value.split('.').length === 4) {
    // strip an appended :port if present
    const withPort = /^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/.exec(value);
    if (withPort) value = withPort[1];
  }
  return value.slice(0, 64);
}

// Signature-checked user id from the bearer token — local HMAC verify only
// (no Redis/DB), cheap and safe to run per request. '' when absent/invalid.
function userIdFromToken(req) {
  const raw = req?.headers?.authorization;
  if (typeof raw !== 'string' || !raw) return '';
  const token = raw.startsWith('Bearer ') ? raw.slice(7).trim() : raw.trim();
  const secret = process.env.JWT_SECRET;
  if (!token || !secret) return '';
  try {
    const decoded = jwt.verify(token, secret);
    return decoded?.id ? String(decoded.id).slice(0, 64) : '';
  } catch {
    return '';
  }
}

function bucketKey(req) {
  const uid = userIdFromToken(req);
  if (uid) return `user:${uid}`;
  const ip =
    normalizeIp(req?.headers?.['x-client-ip']) ||
    normalizeIp(req?.headers?.['x-forwarded-for']?.split(',')[0]) ||
    normalizeIp(req?.headers?.['x-real-ip']) ||
    normalizeIp(req?.ip);
  if (ip) return `ip:${ip}`;
  return `ip:${normalizeIp(req?.socket?.remoteAddress) || 'unknown'}`;
}

// General API limiter — leaderboard, history, room CRUD. Generous enough that
// normal play never trips it; the point is stopping abusive scraping/loops.
export const apiLimiter = rateLimit({
  windowMs: envInt('RATE_LIMIT_WINDOW_MS', MINUTE),
  limit: envInt('RATE_LIMIT_MAX', 240),
  standardHeaders: true,
  legacyHeaders: false,
  message: tooMany('Too many requests — slow down a little.'),
  keyGenerator: bucketKey,
});
