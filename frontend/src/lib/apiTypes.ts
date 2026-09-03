import type { WindowPair, WindowLength, MarketSide } from './types';

// Shared between the client (history.ts posts these shapes) and the server
// (app/api/lock, app/api/claim validate + persist them) — one contract, not
// two independently-maintained copies.

export interface ApiErrorResponse {
  ok: false;
  error: string;
  details?: Record<string, unknown>;
}

export interface ApiSuccessResponse<T> {
  ok: true;
  data: T;
}

/**
 * A lock/claim record only ever gets created from data the caller reports
 * AFTER a real on-chain action succeeded — never a pre-trade estimate. `txHash`
 * is verified server-side (see lib/server/chainVerify.ts) before persisting:
 * it must be a real, mined, successful transaction sent by `walletAddress`.
 * That check doesn't prove the exact amount/price claimed — this store is a
 * best-effort history mirror, never the authorization path for a claim
 * (that's always the real on-chain redeem call).
 */
export interface LockRequest {
  marketId: string;
  pair: WindowPair;
  length: WindowLength;
  side: MarketSide;
  amount: number;
  /** Real outcome tokens acquired (the order's actual fill, not a promise). */
  filledAmount: number;
  /** Real average price paid per outcome token (0-1). */
  fillPrice: number;
  walletAddress?: string | null;
  /** Real on-chain market expiry (ms), not the app's locally-computed window bound. */
  hidePriceUntil: number;
  txHash: string;
}

export interface LockRecord {
  id: string;
  marketId: string;
  pair: WindowPair;
  length: WindowLength;
  side: MarketSide;
  amount: number;
  filledAmount: number;
  fillPrice: number;
  walletAddress: string | null;
  lockedAt: number;
  hidePriceUntil: number;
  status: 'locked' | 'claimed';
  txHash: string;
}

export interface ClaimRequest {
  lockId: string;
  walletAddress?: string | null;
  /** Real outcome tokens redeemed (should match the lock's filledAmount). */
  filledAmount: number;
  txHash: string;
}

export interface ClaimRecord {
  id: string;
  lockId: string;
  walletAddress: string | null;
  status: 'claimed' | 'pending' | 'failed';
  filledAmount: number;
  txHash: string;
  claimedAt: number;
}
