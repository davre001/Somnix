import type { ClaimRecord, LockRecord, TradeSnapshot } from "../types/api.js";
import type { PersistenceStore } from "./interfaces.js";

class MemoryLockRepository {
  private locks = new Map<string, LockRecord>();

  async saveLock(lock: LockRecord): Promise<LockRecord> {
    this.locks.set(lock.id, lock);
    return lock;
  }

  async getLock(id: string): Promise<LockRecord | undefined> {
    return this.locks.get(id);
  }

  async listLocks(): Promise<LockRecord[]> {
    return Array.from(this.locks.values());
  }
}

class MemoryTradeRepository {
  private trades = new Map<string, TradeSnapshot>();

  async saveTrade(trade: TradeSnapshot): Promise<TradeSnapshot> {
    const key = `${trade.marketId}:${trade.side}:${trade.length}`;
    this.trades.set(key, trade);
    return trade;
  }

  async getTrade(key: string): Promise<TradeSnapshot | undefined> {
    return this.trades.get(key);
  }

  async listTrades(): Promise<TradeSnapshot[]> {
    return Array.from(this.trades.values());
  }
}

class MemoryClaimRepository {
  private claims = new Map<string, ClaimRecord>();

  async saveClaim(claim: ClaimRecord): Promise<ClaimRecord> {
    this.claims.set(claim.lockId, claim);
    return claim;
  }

  async getClaim(lockId: string): Promise<ClaimRecord | undefined> {
    return this.claims.get(lockId);
  }

  async updateClaimStatus(lockId: string, status: ClaimRecord["status"]): Promise<ClaimRecord | undefined> {
    const claim = this.claims.get(lockId);
    if (!claim) return undefined;

    claim.status = status;
    return claim;
  }

  async listClaims(): Promise<ClaimRecord[]> {
    return Array.from(this.claims.values());
  }
}

class MemoryStore implements PersistenceStore {
  public readonly locks: MemoryLockRepository = new MemoryLockRepository();
  public readonly trades: MemoryTradeRepository = new MemoryTradeRepository();
  public readonly claims: MemoryClaimRepository = new MemoryClaimRepository();

  async saveLock(lock: LockRecord): Promise<LockRecord> {
    return this.locks.saveLock(lock);
  }

  async getLock(id: string): Promise<LockRecord | undefined> {
    return this.locks.getLock(id);
  }

  async listLocks(): Promise<LockRecord[]> {
    return this.locks.listLocks();
  }

  async saveTrade(trade: TradeSnapshot): Promise<TradeSnapshot> {
    return this.trades.saveTrade(trade);
  }

  async getTrade(key: string): Promise<TradeSnapshot | undefined> {
    return this.trades.getTrade(key);
  }

  async listTrades(): Promise<TradeSnapshot[]> {
    return this.trades.listTrades();
  }

  async saveClaim(claim: ClaimRecord): Promise<ClaimRecord> {
    return this.claims.saveClaim(claim);
  }

  async getClaim(lockId: string): Promise<ClaimRecord | undefined> {
    return this.claims.getClaim(lockId);
  }

  async updateClaimStatus(lockId: string, status: ClaimRecord["status"]): Promise<ClaimRecord | undefined> {
    return this.claims.updateClaimStatus(lockId, status);
  }

  async listClaims(): Promise<ClaimRecord[]> {
    return this.claims.listClaims();
  }
}

export const memoryStore = new MemoryStore();
export const lockRepository = memoryStore.locks;
export const tradeRepository = memoryStore.trades;
export const claimRepository = memoryStore.claims;
