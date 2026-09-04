# API Notes: DreamDEX & Somnia Integration

Measured/documented behavior of every external dependency SOMNIX's execution
path relies on.

## 0. One app, not two

SOMNIX is a single Next.js app — no separate Express service. There was one
(`backend/`, Express + SQLite on Render) up through an earlier iteration; it
was folded into this app's own `app/api/*` route handlers because every
route it served was stateless request/response (no long-lived connections,
no background jobs), which is exactly what serverless functions are for, and
running it separately bought nothing but a second deploy target, a second
CI job, and — on Render's free tier — a 15-minute-idle cold start with no
equivalent problem on serverless hosting. The database moved from a local
SQLite file (which doesn't survive a serverless cold start, and didn't
survive a Render free-tier sleep either) to Turso (`@libsql/client`), which
is SQLite-compatible over HTTP specifically so a stateless function still has
somewhere durable to write.

Three separate access paths exist inside the one app — keep them distinct,
they have different trust levels (see `docs/THREAT_MODEL.md` §1):

- **Server display proxy** (`app/api/markets/*`, `lib/server/dreamdex.ts`):
  unauthenticated, read-only, used for pre-trade display (market list, odds
  preview) before a wallet is connected or in Watch Mode. Never touches a
  signature or a transaction.
- **Browser SDK client** (`lib/exchange.ts`): a `SomniaMarkets` instance
  bound to the user's own `viem` `walletClient`. Everything that moves
  money — locking, claiming, the faucet, resolution checks — goes through
  this, talking directly to the DreamDEX indexer and the Somnia RPC from the
  browser. This is the one piece that can never move server-side: it needs a
  signature only the user's own wallet can produce.
- **Server history mirror** (`app/api/lock/*`, `app/api/claim/*`,
  Turso-backed; posted to from `lib/history.ts`): receives a report only
  *after* the browser already has a confirmed on-chain result. Never
  authorizes or gates anything — see §5.

---

## 1. DreamDEX Indexer (Hasura GraphQL)

- **Endpoint**: `NEXT_PUBLIC_DREAMDEX_INDEXER_URL`, defaulting to
  `https://dev.smk.somnia.host/v1/graphql` — the real testnet Hasura indexer,
  per the SDK's own README (`@somnia-chain/markets-sdk`, "Create an exchange"
  section: `dev.smk.somnia.host` for testnet, `prd.smk.somnia.host` for
  production/mainnet). An earlier default here,
  `indexer-testnet.somnia.network`, was never a real domain — confirmed
  NXDOMAIN via two independent public DNS resolvers (Cloudflare, Google) — so
  every lock/claim attempt against it was failing at the indexer-read step
  before a signature was ever requested. The `dev.smk.somnia.host` value was
  verified live with a `{ "query": "{ __typename }" }` POST returning
  `{"data":{"__typename":"query_root"}}` before being wired in.
- **SDK surface used**: `SomniaMarkets.loadMarkets()` (→
  `client.listRegistryMarkets()`, live binary series only), `client.getMarket(marketId)`,
  `client.getMarketResolution` (via `exchange.ts#getResolution`), and the raw
  `listLiveBinaryMarkets()`/`getBinaryOrderBook()` the backend proxy calls
  directly for display.
- **`loadMarkets()`'s registry excludes finalized (resolved) binary markets by
  design** — confirmed in the SDK's own source: the underlying
  `listRegistryMarkets()` query filters to `finalized: false` for binary rows
  specifically to keep the registry from being swamped by dead series. A
  market is only claimable *after* it resolves, so by claim time it's almost
  always already dropped from that registry — `exchange.redeem(ref, amount)`
  (which resolves `ref` through it) then throws `"unknown market ref ... call
  loadMarkets() first"` regardless of whether `loadMarkets()` was just called.
  `exchange.ts#claimWinnings` works around this by reading the market
  directly with `client.getMarket(marketId)` (unaffected by finalized status)
  and calling the raw `trader.redeem()` instead — reproduced and fixed against
  a real testnet claim on 2026-09-03, see `docs/LIMITATIONS.md` §1.

### Behavior & semantics
| Aspect | Guarantee |
| :--- | :--- |
| **Response type** | Read-only snapshot; may lag the chain by 1–3 blocks. |
| **Server cache policy** | 5,000 ms TTL server-side cache (`lib/server/dreamdex.ts`) — display-only, never consulted before signing. |
| **Frontend freshness** | `findLiveMarket` calls `loadMarkets()` fresh immediately before every lock — no cached/stale market id is ever signed against. |
| **BinaryMarket field shape** | `asset` (e.g. `"BTC"`), `interval` (e.g. `"15m"`, SDK-derived from on-chain `intervalSec`/`expiry - tradingStart`), `id` (the real `marketId`) — **not** `name`/`symbol`/`strikePrice`, which don't exist on the type. Match on `asset` + `interval` together, not `asset` alone (a market can exist on multiple cadences). |

### Failure modes & handling
| Failure Mode | Exception / Symptom | Handling |
| :--- | :--- | :--- |
| **Indexer down / unreachable (backend)** | HTTP 502, `Failed to load live markets` | Frontend's display fetch (`fetchLiveMarkets`) catches and falls back to a **non-tradable** synthetic window (`isLive: false`) — cosmetic only, never lockable. |
| **Indexer error during a real lock (frontend SDK)** | `IndexerError` from `loadMarkets()`/`createOrder()` | Treated as "nothing was sent" (`isAmbiguousTxError` → `false`) — the read needed to price/send the order never completed, so no pending-lock intent is left dangling. |
| **No live market for the selected pair+interval** | `findLiveMarket` returns `null` | `lockValidation.canLock` is `false` with an explicit reason; `executeLock` also re-checks and throws if the market disappeared between validation and submission. |
| **Empty order book (no resting liquidity on the side being bought)** | `InvalidInputError` from `createOrder`'s market-order pricing (`"the opposite side of the book is empty"`) | Surfaced to the user via `describeExchangeError`; the intent is discarded (not ambiguous — nothing was sent). This is expected behavior on thin testnet liquidity, not a bug. |
| **`Market_by_pk` query hangs/times out entirely** | Observed directly against the indexer on 2026-09-03: `{ __typename }` and `listLiveBinaryMarkets` both responded normally, but `Market_by_pk` (which `client.getMarket`/`getResolution`/claim all depend on) timed out for *every* market id tried, including ones unrelated to any specific test. External indexer-side issue, not something this app controls or can route around — `getResolution`/`claimWinnings` will surface it as an `IndexerError` via `describeExchangeError` ("Somnia indexer is unreachable right now"), which is the correct honest behavior, not a bug to chase here. |

---

## 2. Somnia Shannon Testnet (chain `50312`)

### Chain details
- **Chain ID**: `50312` (`0xc488`)
- **RPC**: `https://dream-rpc.somnia.network` (+ `api.infra.testnet.somnia.network` as an alternate, both HTTP and WS — see `@somnia-chain/markets-sdk/chains`' `somniaShannon` definition, which the frontend uses directly rather than a hand-rolled chain object).
- **Native currency**: `STT` (18 decimals) — gas only.
- **Collateral currency**: a separate ERC-20 at `SOMNIA_TESTNET_ADDRESSES.collateral`. Its real `symbol`/`decimals` are read on-chain once (`somnia.ts#fetchCollateralMeta`, plain `balanceOf`/`decimals`/`symbol` calls — the SDK doesn't re-export its own `getErc20*` helpers publicly, so these are hand-rolled) and used for every lock/balance/payout figure. **Do not assume this is `STT`.**
- **Explorer**: `https://shannon-explorer.somnia.network`

### Three-state transaction model (CONFIRMED / FAILED / UNKNOWN)

Every state-changing call (`lockPosition`, `claimWinnings`, `requestFaucet`)
is modeled as one of three outcomes, not a simple success/fail boolean —
see `exchange.ts#isAmbiguousTxError` and `docs/THREAT_MODEL.md` Threat 2:

1. **CONFIRMED** — the SDK call resolved with a tx hash and decoded fill/receipt.
   State (active lock, wallet balance) is updated from that real result.
2. **FAILED** — the SDK proves nothing was sent: `SignerRequiredError`,
   `InvalidInputError`, `NotConfiguredError`, `ContractRevertError` (a chain-confirmed
   revert), an `IndexerError` while constructing the order, or a wallet
   rejection (`code === 4001`). Any pending-lock intent is safely discarded.
3. **UNKNOWN** — `RpcError` ("the send never got an answer from the node"),
   or any unrecognized error shape (a raw `fetch` failure, etc.). The
   pending-lock intent is **left in place**, not discarded, and reconciled
   against the wallet's real outcome-token balance the next time a signer
   binds (`useSomnix.tsx#reconcilePendingLock`).

---

## 3. Idempotency & Reconciliation

- **Key generated and persisted before broadcast, not after.**
  `exchange.ts#lockWithIntent` (called from `useSomnix.tsx#executeLock`)
  calls `marketService.ts#savePendingLockIntent` — writing
  `{ id, marketId, pair, length, side, amount, createdAt }` to `localStorage`
  — *before* `lockPosition` (which triggers the wallet prompt), not after the
  order resolves. This is the fix for the failure mode the reliability skill
  calls out explicitly: generating the key only after a response comes back
  leaves nothing to check against if the request itself times out. It only
  clears the intent when `isAmbiguousTxError` says the SDK proved nothing was
  sent — an ambiguous failure leaves it in place. See
  `__tests__/exchange.test.ts` for the guard's own regression test.
- **Reconciliation, not just persistence.** A persisted intent alone doesn't
  help unless something later checks it against reality.
  `useSomnix.tsx#reconcilePendingLock` runs whenever a signer (re)binds —
  fresh connect, or reload rehydration — and calls
  `exchange.ts#checkFilledAmount(marketId, side)`, a direct on-chain read of
  the wallet's outcome-token balance for that market. `exchange.ts#reconcileOutcome`
  turns that into one of three verdicts: `'recovered'` (balance > 0 — promote
  the intent into a real recorded lock), `'discarded'` (balance is 0 *and*
  the intent is older than a 30s grace period — a fresh broadcast might
  simply not have mined yet, so a same-block zero-balance read is not treated
  as proof of failure), or `'pending'` (too recent to be conclusive — left
  alone, retried next signer bind).
- **Single lock per window**: `lockValidation` rejects a second lock once
  `activeLock.marketId` matches the current window's market id.

---

## 4. Structured Error Logging

Every catch block on the lock/claim path logs a structured object before
returning a client-facing message (see `useSomnix.tsx#executeLock` /
`#claimPayout`):

```json
{
  "timestamp": "2026-09-02T20:14:00.000Z",
  "idempotencyKey": "lock-1756838400000-a1b2c",
  "marketId": "0x0000000000000000000000000000000000000000000000000000000000001a",
  "side": "green",
  "amount": 10,
  "ambiguous": false,
  "error": "The network rejected this transaction: InsufficientBalance"
}
```

`describeExchangeError` (`exchange.ts`) is what turns the underlying SDK
error into the client-facing message shown in the UI — the structured log
above always carries the raw `error.message`, not the friendlier string.

---

## 5. Backend History Mirror (`POST /api/lock`, `POST /api/claim`)

**Feed order, always**: real on-chain confirmation → frontend calls
`history.ts#reportLock`/`reportClaim` → backend verifies → SQLite. Never the
reverse — the frontend never waits on or branches its own state on this
store; a failure here is logged and swallowed (`history.ts`), because the
on-chain result is already final either way.

| Endpoint | Requires | Server-side check | On failure |
| :--- | :--- | :--- | :--- |
| `POST /api/lock` | `marketId, pair, length, side, amount, filledAmount, fillPrice, hidePriceUntil, txHash` (all real, post-fill values — see `useSomnix.tsx#executeLock`) | `chainVerify.ts#verifyOnChainTx(txHash, walletAddress)`: well-formed hash, receipt exists, `status === "success"`, `receipt.from === walletAddress` | `422` with the specific reason; frontend just logs a warning |
| `POST /api/claim` | `lockId` (the backend's own id from the `/api/lock` response — `UserLock.backendLockId`, not the frontend's local lock id), `filledAmount`, `txHash` | Same `verifyOnChainTx` check, plus the referenced lock must exist (`404` if not) | Same as above; also silently skipped client-side if `backendLockId` was never captured (the earlier lock report failed or hasn't resolved yet) |

**What `verifyOnChainTx` does NOT do**: decode the transaction's logs to
confirm the exact `filledAmount`/`fillPrice` match what actually filled. That
would mean re-implementing the CLOB's order-matching/decode logic
server-side, for a store that authorizes nothing and holds no funds. See
`docs/THREAT_MODEL.md` Threat 7 for the accepted blast radius.

**Claim idempotency**: `POST /api/claim` is safe to retry — if a claim
already exists for `lockId`, the existing record is returned as-is (`200`)
rather than erroring or creating a duplicate.

**Schema**: Turso (libSQL) via `@libsql/client`, configured with
`TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN`; falls back to a local gitignored
`file:local.db` when unset (dev only — doesn't survive a serverless cold
start, see `docs/LIMITATIONS.md` §6). Schema is versioned via `PRAGMA
user_version` (`lib/server/tursoStore.ts`); a version bump runs a destructive
`DROP TABLE` + recreate — acceptable only because this is local dev/testnet
state with nothing worth migrating, not a real production migration path.
The `length` column is named `windowLength` in SQL specifically to avoid
colliding with the libSQL `Row` object's own array-like `.length` property
(a real bug this caught — see `docs/LIMITATIONS.md` §6).
