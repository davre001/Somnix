import type { ClaimRecord, LockRecord, TradeSnapshot } from "../types/api.js";

export interface LockRepository {
  saveLock(lock: LockRecord): LockRecord;
  getLock(id: string): LockRecord | undefined;
  listLocks(): LockRecord[];
}

export interface TradeRepository {
  saveTrade(trade: TradeSnapshot): TradeSnapshot;
  getTrade(key: string): TradeSnapshot | undefined;
  listTrades(): TradeSnapshot[];
}

export interface ClaimRepository {
  saveClaim(claim: ClaimRecord): ClaimRecord;
  getClaim(lockId: string): ClaimRecord | undefined;
  listClaims(): ClaimRecord[];
}

export interface PersistenceStore extends LockRepository, TradeRepository, ClaimRepository {}
