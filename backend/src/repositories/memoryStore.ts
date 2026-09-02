import type { ClaimRecord, LockRecord, TradeSnapshot } from "../types/api.js";
import type { PersistenceStore } from "./interfaces.js";

class MemoryLockRepository {
  private locks = new Map<string, LockRecord>();

  saveLock(lock: LockRecord): LockRecord {
    this.locks.set(lock.id, lock);
    return lock;
  }

  getLock(id: string): LockRecord | undefined {
    return this.locks.get(id);
  }

  listLocks(): LockRecord[] {
    return Array.from(this.locks.values());
  }
}

class MemoryTradeRepository {
  private trades = new Map<string, TradeSnapshot>();

  saveTrade(trade: TradeSnapshot): TradeSnapshot {
    const key = `${trade.marketId}:${trade.side}:${trade.length}`;
    this.trades.set(key, trade);
    return trade;
  }

  getTrade(key: string): TradeSnapshot | undefined {
    return this.trades.get(key);
  }

  listTrades(): TradeSnapshot[] {
    return Array.from(this.trades.values());
  }
}

class MemoryClaimRepository {
  private claims = new Map<string, ClaimRecord>();

  saveClaim(claim: ClaimRecord): ClaimRecord {
    this.claims.set(claim.lockId, claim);
    return claim;
  }

  getClaim(lockId: string): ClaimRecord | undefined {
    return this.claims.get(lockId);
  }

  listClaims(): ClaimRecord[] {
    return Array.from(this.claims.values());
  }
}

class MemoryStore implements PersistenceStore {
  public readonly locks: MemoryLockRepository = new MemoryLockRepository();
  public readonly trades: MemoryTradeRepository = new MemoryTradeRepository();
  public readonly claims: MemoryClaimRepository = new MemoryClaimRepository();

  saveLock(lock: LockRecord): LockRecord {
    return this.locks.saveLock(lock);
  }

  getLock(id: string): LockRecord | undefined {
    return this.locks.getLock(id);
  }

  listLocks(): LockRecord[] {
    return this.locks.listLocks();
  }

  saveTrade(trade: TradeSnapshot): TradeSnapshot {
    return this.trades.saveTrade(trade);
  }

  getTrade(key: string): TradeSnapshot | undefined {
    return this.trades.getTrade(key);
  }

  listTrades(): TradeSnapshot[] {
    return this.trades.listTrades();
  }

  saveClaim(claim: ClaimRecord): ClaimRecord {
    return this.claims.saveClaim(claim);
  }

  getClaim(lockId: string): ClaimRecord | undefined {
    return this.claims.getClaim(lockId);
  }

  listClaims(): ClaimRecord[] {
    return this.claims.listClaims();
  }
}

export const memoryStore = new MemoryStore();
export const lockRepository = memoryStore.locks;
export const tradeRepository = memoryStore.trades;
export const claimRepository = memoryStore.claims;
