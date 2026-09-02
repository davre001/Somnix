import type { ClaimRecord, LockRecord, TradeSnapshot } from "../types/api.js";

class MemoryStore {
  private locks = new Map<string, LockRecord>();
  private claims = new Map<string, ClaimRecord>();
  private trades = new Map<string, TradeSnapshot>();

  getLocks() {
    return this.locks;
  }

  getClaims() {
    return this.claims;
  }

  getTrades() {
    return this.trades;
  }
}

export const memoryStore = new MemoryStore();
