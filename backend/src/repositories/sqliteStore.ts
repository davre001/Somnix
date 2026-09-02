import path from "node:path";
import sqlite3 from "sqlite3";
import type { ClaimRecord, LockRecord, TradeSnapshot } from "../types/api.js";
import type { PersistenceStore } from "./interfaces.js";

const databasePath = process.env.SOMNIX_DB_PATH ?? path.resolve(process.cwd(), "somnix.db");
const db = new sqlite3.Database(databasePath);

const initDatabasePromise = new Promise<void>((resolve, reject) => {
  db.serialize(() => {
    db.run(
      `
        CREATE TABLE IF NOT EXISTS locks (
          id TEXT PRIMARY KEY,
          marketId TEXT NOT NULL,
          pair TEXT NOT NULL,
          length TEXT NOT NULL,
          side TEXT NOT NULL,
          amount REAL NOT NULL,
          walletAddress TEXT,
          lockedAt INTEGER NOT NULL,
          hidePriceUntil INTEGER NOT NULL,
          status TEXT NOT NULL,
          payout REAL NOT NULL,
          startPrice REAL NOT NULL,
          endPrice REAL,
          txHash TEXT
        );
      `,
      (err) => {
        if (err) {
          reject(err);
          return;
        }

        db.run(
          `
            CREATE TABLE IF NOT EXISTS trades (
              id TEXT PRIMARY KEY,
              marketId TEXT NOT NULL,
              pair TEXT NOT NULL,
              length TEXT NOT NULL,
              side TEXT NOT NULL,
              amount REAL NOT NULL,
              startPrice REAL NOT NULL,
              currentPrice REAL NOT NULL,
              greenOdds REAL NOT NULL,
              redOdds REAL NOT NULL,
              payout REAL NOT NULL,
              isLive INTEGER NOT NULL DEFAULT 1
            );
          `,
          (tradeErr) => {
            if (tradeErr) {
              reject(tradeErr);
              return;
            }

            db.run(
              `
                CREATE TABLE IF NOT EXISTS claims (
                  id TEXT PRIMARY KEY,
                  lockId TEXT NOT NULL,
                  walletAddress TEXT,
                  status TEXT NOT NULL,
                  payout REAL NOT NULL,
                  txHash TEXT NOT NULL,
                  claimedAt INTEGER NOT NULL
                );
              `,
              (claimErr) => {
                if (claimErr) {
                  reject(claimErr);
                  return;
                }
                resolve();
              },
            );
          },
        );
      },
    );
  });
});

async function run(sql: string, params: unknown[] = []): Promise<void> {
  await initDatabasePromise;
  await new Promise<void>((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

async function get<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
  await initDatabasePromise;
  return await new Promise<T | undefined>((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve((row as T | undefined) ?? undefined);
    });
  });
}

async function all<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  await initDatabasePromise;
  return await new Promise<T[]>((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve((rows as T[]) ?? []);
    });
  });
}

class SqliteLockRepository {
  async saveLock(lock: LockRecord): Promise<LockRecord> {
    await run(
      `
        INSERT INTO locks (id, marketId, pair, length, side, amount, walletAddress, lockedAt, hidePriceUntil, status, payout, startPrice, endPrice, txHash)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          marketId = excluded.marketId,
          pair = excluded.pair,
          length = excluded.length,
          side = excluded.side,
          amount = excluded.amount,
          walletAddress = excluded.walletAddress,
          lockedAt = excluded.lockedAt,
          hidePriceUntil = excluded.hidePriceUntil,
          status = excluded.status,
          payout = excluded.payout,
          startPrice = excluded.startPrice,
          endPrice = excluded.endPrice,
          txHash = excluded.txHash
      `,
      [
        lock.id,
        lock.marketId,
        lock.pair,
        lock.length,
        lock.side,
        lock.amount,
        lock.walletAddress,
        lock.lockedAt,
        lock.hidePriceUntil,
        lock.status,
        lock.payout,
        lock.startPrice,
        lock.endPrice ?? null,
        lock.txHash ?? null,
      ],
    );
    return lock;
  }

  async getLock(id: string): Promise<LockRecord | undefined> {
    const row = await get<any>(`SELECT * FROM locks WHERE id = ?`, [id]);
    if (!row) return undefined;
    const record: LockRecord = {
      id: row.id,
      marketId: row.marketId,
      pair: row.pair,
      length: row.length,
      side: row.side,
      amount: Number(row.amount),
      walletAddress: row.walletAddress,
      lockedAt: Number(row.lockedAt),
      hidePriceUntil: Number(row.hidePriceUntil),
      status: row.status,
      payout: Number(row.payout),
      startPrice: Number(row.startPrice),
    };

    if (row.endPrice !== null && row.endPrice !== undefined) {
      record.endPrice = Number(row.endPrice);
    }

    if (row.txHash !== null && row.txHash !== undefined) {
      record.txHash = row.txHash;
    }

    return record;
  }

  async listLocks(): Promise<LockRecord[]> {
    const rows = await all<any>(`SELECT * FROM locks ORDER BY lockedAt DESC`);
    return rows.map((row) => {
      const record: LockRecord = {
        id: row.id,
        marketId: row.marketId,
        pair: row.pair,
        length: row.length,
        side: row.side,
        amount: Number(row.amount),
        walletAddress: row.walletAddress,
        lockedAt: Number(row.lockedAt),
        hidePriceUntil: Number(row.hidePriceUntil),
        status: row.status,
        payout: Number(row.payout),
        startPrice: Number(row.startPrice),
      };

      if (row.endPrice !== null && row.endPrice !== undefined) {
        record.endPrice = Number(row.endPrice);
      }

      if (row.txHash !== null && row.txHash !== undefined) {
        record.txHash = row.txHash;
      }

      return record;
    });
  }
}

class SqliteTradeRepository {
  async saveTrade(trade: TradeSnapshot): Promise<TradeSnapshot> {
    const key = `${trade.marketId}:${trade.side}:${trade.length}`;
    await run(
      `
        INSERT INTO trades (id, marketId, pair, length, side, amount, startPrice, currentPrice, greenOdds, redOdds, payout, isLive)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          marketId = excluded.marketId,
          pair = excluded.pair,
          length = excluded.length,
          side = excluded.side,
          amount = excluded.amount,
          startPrice = excluded.startPrice,
          currentPrice = excluded.currentPrice,
          greenOdds = excluded.greenOdds,
          redOdds = excluded.redOdds,
          payout = excluded.payout,
          isLive = excluded.isLive
      `,
      [
        key,
        trade.marketId,
        trade.pair,
        trade.length,
        trade.side,
        trade.amount,
        trade.startPrice,
        trade.currentPrice,
        trade.greenOdds,
        trade.redOdds,
        trade.payout,
        trade.isLive ? 1 : 0,
      ],
    );
    return trade;
  }

  async getTrade(key: string): Promise<TradeSnapshot | undefined> {
    const row = await get<any>(`SELECT * FROM trades WHERE id = ?`, [key]);
    if (!row) return undefined;
    return {
      marketId: row.marketId,
      pair: row.pair,
      length: row.length,
      side: row.side,
      amount: Number(row.amount),
      startPrice: Number(row.startPrice),
      currentPrice: Number(row.currentPrice),
      greenOdds: Number(row.greenOdds),
      redOdds: Number(row.redOdds),
      payout: Number(row.payout),
      isLive: Number(row.isLive) === 1,
    };
  }

  async listTrades(): Promise<TradeSnapshot[]> {
    const rows = await all<any>(`SELECT * FROM trades ORDER BY marketId DESC`);
    return rows.map((row) => ({
      marketId: row.marketId,
      pair: row.pair,
      length: row.length,
      side: row.side,
      amount: Number(row.amount),
      startPrice: Number(row.startPrice),
      currentPrice: Number(row.currentPrice),
      greenOdds: Number(row.greenOdds),
      redOdds: Number(row.redOdds),
      payout: Number(row.payout),
      isLive: Number(row.isLive) === 1,
    }));
  }
}

class SqliteClaimRepository {
  async saveClaim(claim: ClaimRecord): Promise<ClaimRecord> {
    await run(
      `
        INSERT INTO claims (id, lockId, walletAddress, status, payout, txHash, claimedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          lockId = excluded.lockId,
          walletAddress = excluded.walletAddress,
          status = excluded.status,
          payout = excluded.payout,
          txHash = excluded.txHash,
          claimedAt = excluded.claimedAt
      `,
      [
        claim.id,
        claim.lockId,
        claim.walletAddress,
        claim.status,
        claim.payout,
        claim.txHash,
        claim.claimedAt,
      ],
    );
    return claim;
  }

  async getClaim(lockId: string): Promise<ClaimRecord | undefined> {
    const row = await get<any>(`SELECT * FROM claims WHERE lockId = ?`, [lockId]);
    if (!row) return undefined;
    return {
      id: row.id,
      lockId: row.lockId,
      walletAddress: row.walletAddress,
      status: row.status,
      payout: Number(row.payout),
      txHash: row.txHash,
      claimedAt: Number(row.claimedAt),
    };
  }

  async listClaims(): Promise<ClaimRecord[]> {
    const rows = await all<any>(`SELECT * FROM claims ORDER BY claimedAt DESC`);
    return rows.map((row) => ({
      id: row.id,
      lockId: row.lockId,
      walletAddress: row.walletAddress,
      status: row.status,
      payout: Number(row.payout),
      txHash: row.txHash,
      claimedAt: Number(row.claimedAt),
    }));
  }
}

class SqliteStore implements PersistenceStore {
  public readonly locks = new SqliteLockRepository();
  public readonly trades = new SqliteTradeRepository();
  public readonly claims = new SqliteClaimRepository();

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

  async listClaims(): Promise<ClaimRecord[]> {
    return this.claims.listClaims();
  }
}

export const sqliteStore = new SqliteStore();
export const lockRepository = sqliteStore.locks;
export const tradeRepository = sqliteStore.trades;
export const claimRepository = sqliteStore.claims;

export async function closeSqliteStore(): Promise<void> {
  await initDatabasePromise;
  await new Promise<void>((resolve, reject) => {
    db.close((err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}
