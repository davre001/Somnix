import type { LockRecord, MarketLength, MarketPair, MarketSide } from "../types/api.js";

export function createLockRecord(
  marketId: string,
  pair: MarketPair,
  length: MarketLength,
  side: MarketSide,
  amount: number,
  walletAddress: string | null,
): LockRecord {
  const lockId = `lock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  return {
    id: lockId,
    marketId,
    pair,
    length,
    side,
    amount: Number(amount.toFixed(2)),
    walletAddress,
    lockedAt: Date.now(),
    hidePriceUntil: Date.now() + 60_000,
    status: "locked",
    payout: Number((amount * 1.92).toFixed(2)),
    startPrice: 0,
  };
}
