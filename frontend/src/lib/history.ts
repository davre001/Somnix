import type { LockRequest, ClaimRequest, LockRecord, ApiSuccessResponse, ApiErrorResponse } from './apiTypes';

type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Best-effort history mirror: reports a lock/claim to SOMNIX's own `/api/lock`
 * `/api/claim` routes AFTER it already succeeded on-chain. Never gates or
 * blocks the real action — a failure here (verification rejected, transient
 * error) is only logged, since the on-chain result is already final either
 * way. See docs/API_NOTES.md.
 */

/** Returns the backend's own id for the stored lock record, or null if the report failed. */
export async function reportLock(report: LockRequest): Promise<string | null> {
  try {
    const res = await fetch('/api/lock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report),
    });
    const body = (await res.json().catch(() => null)) as ApiResponse<LockRecord> | null;
    if (!res.ok || !body?.ok) {
      console.warn('[Somnix] Backend did not accept lock history:', body && !body.ok ? body.error : res.status);
      return null;
    }
    return body.data.id;
  } catch (err) {
    console.warn('[Somnix] Failed to report lock to backend history:', err);
    return null;
  }
}

export async function reportClaim(report: ClaimRequest): Promise<void> {
  try {
    const res = await fetch('/api/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as ApiErrorResponse | null;
      console.warn('[Somnix] Backend did not accept claim history:', body?.error ?? res.status);
    }
  } catch (err) {
    console.warn('[Somnix] Failed to report claim to backend history:', err);
  }
}
