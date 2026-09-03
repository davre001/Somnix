import { describe, it, expect, beforeAll } from 'vitest';
import type { ClaimRecord, LockRecord } from '../../apiTypes';

// Dynamic import AFTER stubbing the env var — tursoStore.ts reads
// TURSO_DATABASE_URL at module-load time, and static imports are hoisted
// before any top-level statement in this file would run.
let store: typeof import('../tursoStore');

beforeAll(async () => {
  process.env.TURSO_DATABASE_URL = ':memory:';
  delete process.env.TURSO_AUTH_TOKEN;
  store = await import('../tursoStore');
});

describe('tursoStore', () => {
  it('persists lock and claim records', async () => {
    const lockId = `lock_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const lock: LockRecord = {
      id: lockId,
      marketId: '0x000000000000000000000000000000000000000000000000000000000000ab',
      pair: 'BTC',
      length: '15m',
      side: 'green',
      amount: 10,
      filledAmount: 19.2,
      fillPrice: 0.52,
      walletAddress: '0xabc123',
      lockedAt: Date.now(),
      hidePriceUntil: Date.now() + 60_000,
      status: 'locked',
      txHash: '0x1111111111111111111111111111111111111111111111111111111111111a',
    };

    await store.saveLock(lock);
    const savedLock = await store.getLock(lock.id);
    expect(savedLock).toEqual(lock);

    const claim: ClaimRecord = {
      id: `claim_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      lockId: lock.id,
      walletAddress: lock.walletAddress,
      status: 'pending',
      filledAmount: lock.filledAmount,
      txHash: '0x2222222222222222222222222222222222222222222222222222222222222b',
      claimedAt: Date.now(),
    };

    await store.saveClaim(claim);
    const savedClaim = await store.getClaim(lock.id);
    expect(savedClaim).toEqual(claim);
  });

  it('updateClaimStatus only transitions a pending claim, never a finalized one', async () => {
    const lockId = `lock_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const claim: ClaimRecord = {
      id: `claim_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      lockId,
      walletAddress: '0xabc123',
      status: 'pending',
      filledAmount: 5,
      txHash: '0x3333333333333333333333333333333333333333333333333333333333333c',
      claimedAt: Date.now(),
    };
    await store.saveClaim(claim);

    const claimed = await store.updateClaimStatus(lockId, 'claimed');
    expect(claimed?.status).toBe('claimed');

    // A finalized claim must not flip to a different terminal status.
    const stillClaimed = await store.updateClaimStatus(lockId, 'failed');
    expect(stillClaimed?.status).toBe('claimed');
  });
});
