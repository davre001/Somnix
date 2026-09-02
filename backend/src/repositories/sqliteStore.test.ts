import test from "node:test";
import assert from "node:assert/strict";
import { sqliteStore } from "./sqliteStore.js";
import type { ClaimRecord, LockRecord, TradeSnapshot } from "../types/api.js";

test("sqlite repository persists lock, trade, and claim records", async () => {
  const lockId = `lock_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  const lock: LockRecord = {
    id: lockId,
    marketId: "BTC-15m-123",
    pair: "BTC",
    length: "15m",
    side: "green",
    amount: 10,
    walletAddress: "0xabc123",
    lockedAt: Date.now(),
    hidePriceUntil: Date.now() + 60_000,
    status: "locked",
    payout: 19.2,
    startPrice: 64000,
  };

  await sqliteStore.saveLock(lock);
  const savedLock = await sqliteStore.getLock(lock.id);
  assert.deepEqual(savedLock, lock);

  const tradeKey = `${lock.marketId}:${lock.side}:${lock.length}`;
  const trade: TradeSnapshot = {
    marketId: lock.marketId,
    pair: lock.pair,
    length: lock.length,
    side: lock.side,
    amount: lock.amount,
    startPrice: 64000,
    currentPrice: 64120,
    greenOdds: 57,
    redOdds: 43,
    payout: lock.payout,
    isLive: true,
  };

  await sqliteStore.saveTrade(trade);
  const savedTrade = await sqliteStore.getTrade(tradeKey);
  assert.deepEqual(savedTrade, trade);

  const claim: ClaimRecord = {
    id: `claim_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    lockId: lock.id,
    walletAddress: lock.walletAddress,
    status: "claimed",
    payout: lock.payout,
    txHash: "0x1234567890abcdef",
    claimedAt: Date.now(),
  };

  await sqliteStore.saveClaim(claim);
  const savedClaim = await sqliteStore.getClaim(lock.id);
  assert.deepEqual(savedClaim, claim);
});
