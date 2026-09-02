import type { LockRecord, MarketLength, MarketPair, MarketSide } from "../types/api.js";

export function createLockRecord(
  marketId: string,
  pair: MarketPair,
  length: MarketLength,
  side: MarketSide,
  amount: number,
  walletAddress: string | null,
  startPrice: number,
  hidePriceUntil: number,
  payout: number,
  txHash?: string,
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
    hidePriceUntil,
    status: "locked",
    payout: Number(payout.toFixed(2)),
    startPrice,
    ...(txHash ? { txHash } : {}),
  };
}
