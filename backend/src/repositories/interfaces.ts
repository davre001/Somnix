import type { ClaimRecord, LockRecord, TradeSnapshot } from "../types/api.js";

export interface LockRepository {
  saveLock(lock: LockRecord): Promise<LockRecord>;
  getLock(id: string): Promise<LockRecord | undefined>;
  listLocks(): Promise<LockRecord[]>;
}

export interface TradeRepository {
  saveTrade(trade: TradeSnapshot): Promise<TradeSnapshot>;
  getTrade(key: string): Promise<TradeSnapshot | undefined>;
  listTrades(): Promise<TradeSnapshot[]>;
}

export interface ClaimRepository {
  saveClaim(claim: ClaimRecord): Promise<ClaimRecord>;
  getClaim(lockId: string): Promise<ClaimRecord | undefined>;
  updateClaimStatus(lockId: string, status: ClaimRecord["status"]): Promise<ClaimRecord | undefined>;
  listClaims(): Promise<ClaimRecord[]>;
}

export interface PersistenceStore extends LockRepository, TradeRepository, ClaimRepository {}
