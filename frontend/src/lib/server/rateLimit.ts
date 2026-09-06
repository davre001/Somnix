import 'server-only';

interface WindowState {
  count: number;
  resetAt: number;
}

const DEFAULT_WINDOW_MS = 60_000;
const MAX_TRACKED_KEYS = 5000;

const buckets = new Map<string, WindowState>();

/**
 * Per-process, in-memory fixed-window rate limiter. Best-effort on
 * serverless: each cold start / instance gets its own counter, so this
 * bounds a single instance's exposure rather than acting as a global,
 * airtight limit — a shared store (Upstash/Redis) would be needed for that.
 * Enough to stop a naive hammering script against a hackathon-tier deploy;
 * see docs/THREAT_MODEL.md §3.
 */
export function checkRateLimit(key: string, limit: number, windowMs = DEFAULT_WINDOW_MS): boolean {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now >= existing.resetAt) {
    if (buckets.size >= MAX_TRACKED_KEYS) pruneExpired(now);
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (existing.count >= limit) return false;
  existing.count += 1;
  return true;
}

function pruneExpired(now: number): void {
  for (const [key, state] of buckets) {
    if (now >= state.resetAt) buckets.delete(key);
  }
}

/** Best-effort caller identity from proxy headers — there is no raw socket address in a Next.js Request. */
export function getClientKey(req: Request): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const first = forwardedFor.split(',')[0]?.trim();
    if (first) return first;
  }
  return req.headers.get('x-real-ip') ?? 'unknown';
}

/** Test-only: clears all tracked state so test cases don't leak into each other. */
export function __resetRateLimitState(): void {
  buckets.clear();
}
