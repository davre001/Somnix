import 'server-only';
import { createClient, type Client, type InArgs } from '@libsql/client';
import type { ClaimRecord, LockRecord } from '../apiTypes';

// Local file fallback (e.g. `pnpm dev` without Turso configured) — a real
// deployment sets TURSO_DATABASE_URL/TURSO_AUTH_TOKEN so the store survives
// a serverless cold start instead of depending on ephemeral local disk.
const url = process.env.TURSO_DATABASE_URL ?? 'file:local.db';
const authToken = process.env.TURSO_AUTH_TOKEN;

let client: Client | undefined;
function getClient(): Client {
  if (!client) {
    client = createClient(authToken ? { url, authToken } : { url });
  }
  return client;
}

// v1 -> v2: real-fill schema (filledAmount/fillPrice replace the client-asserted
// startPrice/payout; endPrice and the won/lost lock statuses are dropped —
// nothing ever wrote them, and resolution stays a live chain read rather than a
// second, driftable copy). The trades table is dropped entirely; odds/price
// snapshots go stale within seconds and had no consumer.
const currentSchemaVersion = 2;

let initPromise: Promise<void> | undefined;

async function ensureSchema(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      const db = getClient();
      // NOT `PRAGMA user_version` — Turso's remote HTTP protocol rejects it
      // outright (`SQL_PARSE_ERROR: SQL not allowed statement`). Only found by
      // hitting a real deployed Turso database; the local `:memory:`/`file:`
      // mode used in tests runs the real SQLite engine directly and allows any
      // PRAGMA, so this gap is invisible to `tursoStore.test.ts`. A plain table
      // is fully supported over both.
      await db.execute(`
        CREATE TABLE IF NOT EXISTS schema_meta (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          version INTEGER NOT NULL
        )
      `);
      const versionResult = await db.execute('SELECT version FROM schema_meta WHERE id = 1');
      const databaseVersion = Number((versionResult.rows[0] as { version?: number } | undefined)?.version ?? 0);

      if (databaseVersion > currentSchemaVersion) {
        throw new Error(`Turso schema version ${databaseVersion} is newer than supported version ${currentSchemaVersion}`);
      }

      // Local dev/testnet database only — an in-place destructive migration is
      // acceptable here; there is no production data to preserve.
      if (databaseVersion > 0 && databaseVersion < currentSchemaVersion) {
        await db.execute('DROP TABLE IF EXISTS locks');
        await db.execute('DROP TABLE IF EXISTS claims');
        await db.execute('DROP TABLE IF EXISTS trades');
      }

      await db.execute(`
        CREATE TABLE IF NOT EXISTS locks (
          id TEXT PRIMARY KEY,
          marketId TEXT NOT NULL,
          pair TEXT NOT NULL,
          -- Named windowLength, not length: libsql's Row is array-like, so a
          -- column literally named "length" reads back as the ROW's own
          -- column count (via row.length), not this value. Caught by a test.
          windowLength TEXT NOT NULL,
          side TEXT NOT NULL,
          amount REAL NOT NULL,
          filledAmount REAL NOT NULL,
          fillPrice REAL NOT NULL,
          walletAddress TEXT,
          lockedAt INTEGER NOT NULL,
          hidePriceUntil INTEGER NOT NULL,
          status TEXT NOT NULL,
          txHash TEXT NOT NULL
        )
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS claims (
          id TEXT PRIMARY KEY,
          lockId TEXT NOT NULL,
          walletAddress TEXT,
          status TEXT NOT NULL,
          filledAmount REAL NOT NULL,
          txHash TEXT NOT NULL,
          claimedAt INTEGER NOT NULL
        )
      `);

      await db.execute({
        sql: `
          INSERT INTO schema_meta (id, version) VALUES (1, ?)
          ON CONFLICT(id) DO UPDATE SET version = excluded.version
        `,
        args: [currentSchemaVersion],
      });
    })();
  }
  return initPromise;
}

async function run(sql: string, args: InArgs = []) {
  await ensureSchema();
  return getClient().execute({ sql, args });
}

function toLockRecord(row: Record<string, unknown>): LockRecord {
  return {
    id: String(row.id),
    marketId: String(row.marketId),
    pair: row.pair as LockRecord['pair'],
    length: row.windowLength as LockRecord['length'],
    side: row.side as LockRecord['side'],
    amount: Number(row.amount),
    filledAmount: Number(row.filledAmount),
    fillPrice: Number(row.fillPrice),
    walletAddress: row.walletAddress == null ? null : String(row.walletAddress),
    lockedAt: Number(row.lockedAt),
    hidePriceUntil: Number(row.hidePriceUntil),
    status: row.status as LockRecord['status'],
    txHash: String(row.txHash),
  };
}

function toClaimRecord(row: Record<string, unknown>): ClaimRecord {
  return {
    id: String(row.id),
    lockId: String(row.lockId),
    walletAddress: row.walletAddress == null ? null : String(row.walletAddress),
    status: row.status as ClaimRecord['status'],
    filledAmount: Number(row.filledAmount),
    txHash: String(row.txHash),
    claimedAt: Number(row.claimedAt),
  };
}

export async function saveLock(lock: LockRecord): Promise<LockRecord> {
  await run(
    `
      INSERT INTO locks (id, marketId, pair, windowLength, side, amount, filledAmount, fillPrice, walletAddress, lockedAt, hidePriceUntil, status, txHash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        marketId = excluded.marketId,
        pair = excluded.pair,
        windowLength = excluded.windowLength,
        side = excluded.side,
        amount = excluded.amount,
        filledAmount = excluded.filledAmount,
        fillPrice = excluded.fillPrice,
        walletAddress = excluded.walletAddress,
        lockedAt = excluded.lockedAt,
        hidePriceUntil = excluded.hidePriceUntil,
        status = excluded.status,
        txHash = excluded.txHash
    `,
    [
      lock.id,
      lock.marketId,
      lock.pair,
      lock.length,
      lock.side,
      lock.amount,
      lock.filledAmount,
      lock.fillPrice,
      lock.walletAddress,
      lock.lockedAt,
      lock.hidePriceUntil,
      lock.status,
      lock.txHash,
    ],
  );
  return lock;
}

export async function getLock(id: string): Promise<LockRecord | undefined> {
  const result = await run('SELECT * FROM locks WHERE id = ?', [id]);
  const row = result.rows[0] as Record<string, unknown> | undefined;
  return row ? toLockRecord(row) : undefined;
}

export async function listLocks(): Promise<LockRecord[]> {
  const result = await run('SELECT * FROM locks ORDER BY lockedAt DESC');
  return (result.rows as unknown as Record<string, unknown>[]).map(toLockRecord);
}

export async function saveClaim(claim: ClaimRecord): Promise<ClaimRecord> {
  await run(
    `
      INSERT INTO claims (id, lockId, walletAddress, status, filledAmount, txHash, claimedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        lockId = excluded.lockId,
        walletAddress = excluded.walletAddress,
        status = excluded.status,
        filledAmount = excluded.filledAmount,
        txHash = excluded.txHash,
        claimedAt = excluded.claimedAt
    `,
    [claim.id, claim.lockId, claim.walletAddress, claim.status, claim.filledAmount, claim.txHash, claim.claimedAt],
  );
  return claim;
}

export async function getClaim(lockId: string): Promise<ClaimRecord | undefined> {
  const result = await run('SELECT * FROM claims WHERE lockId = ?', [lockId]);
  const row = result.rows[0] as Record<string, unknown> | undefined;
  return row ? toClaimRecord(row) : undefined;
}

export async function updateClaimStatus(lockId: string, status: ClaimRecord['status']): Promise<ClaimRecord | undefined> {
  // Conditional on the row's CURRENT status at write time (not a value read
  // earlier), so two concurrent finalizations can't both "win" and leave the
  // status flapping between them — only a `pending` row (or an idempotent
  // re-assertion of the same status) is ever updated.
  await run(`UPDATE claims SET status = ? WHERE lockId = ? AND (status = 'pending' OR status = ?)`, [status, lockId, status]);
  return getClaim(lockId);
}

export async function listClaims(): Promise<ClaimRecord[]> {
  const result = await run('SELECT * FROM claims ORDER BY claimedAt DESC');
  return (result.rows as unknown as Record<string, unknown>[]).map(toClaimRecord);
}
