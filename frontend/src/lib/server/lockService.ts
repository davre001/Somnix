import 'server-only';
import type { LockRecord } from '../apiTypes';
import type { WindowPair, WindowLength, MarketSide } from '../types';

export function createLockRecord(
  marketId: string,
  pair: WindowPair,
  length: WindowLength,
  side: MarketSide,
  amount: number,
  filledAmount: number,
  fillPrice: number,
  walletAddress: string | null,
  hidePriceUntil: number,
  txHash: string,
): LockRecord {
  const lockId = `lock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  return {
    id: lockId,
    marketId,
    pair,
    length,
    side,
    amount: Number(amount.toFixed(2)),
    filledAmount: Number(filledAmount.toFixed(6)),
    fillPrice: Number(fillPrice.toFixed(6)),
    walletAddress,
    lockedAt: Date.now(),
    hidePriceUntil,
    status: 'locked',
    txHash,
  };
}
