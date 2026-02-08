/**
 * Rate Limiting Utility
 *
 * In-memory rate limiter using a sliding window approach.
 * Suitable for Vercel serverless functions (per-instance limiting).
 *
 * For distributed rate limiting across instances, consider
 * using Vercel KV (Redis) or Upstash.
 */

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

// Clean up old entries periodically to prevent memory leaks
const CLEANUP_INTERVAL_MS = 60_000;
let lastCleanup = Date.now();

function cleanup(windowMs: number): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  const cutoff = now - windowMs;
  store.forEach((entry, key) => {
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
    if (entry.timestamps.length === 0) {
      store.delete(key);
    }
  });
}

interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  limit: number;
  /** Time window in milliseconds (default: 60_000 = 1 minute) */
  windowMs?: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check if a request is within rate limits.
 *
 * @param key - Unique identifier (e.g., userId, IP address)
 * @param config - Rate limit configuration
 * @returns Whether the request is allowed and remaining quota
 */
export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const { limit, windowMs = 60_000 } = config;
  const now = Date.now();
  const cutoff = now - windowMs;

  cleanup(windowMs);

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter((t) => t > cutoff);

  if (entry.timestamps.length >= limit) {
    const oldestInWindow = entry.timestamps[0]!;
    return {
      allowed: false,
      remaining: 0,
      resetAt: oldestInWindow + windowMs,
    };
  }

  entry.timestamps.push(now);
  return {
    allowed: true,
    remaining: limit - entry.timestamps.length,
    resetAt: now + windowMs,
  };
}

/**
 * Pre-configured rate limiters for different endpoint types
 */
export const RateLimits = {
  /** AI endpoints: 10 requests per minute per user */
  ai: { limit: 10, windowMs: 60_000 },

  /** Email endpoints: 20 requests per minute per user */
  email: { limit: 20, windowMs: 60_000 },

  /** BankID endpoints: 5 requests per minute per user */
  bankid: { limit: 5, windowMs: 60_000 },

  /** General API: 100 requests per minute per user */
  api: { limit: 100, windowMs: 60_000 },

  /** Auth endpoints: 10 requests per minute per IP */
  auth: { limit: 10, windowMs: 60_000 },
} as const;
