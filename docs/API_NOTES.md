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
- **`@somnia-chain/markets-sdk` is pinned to an exact version (`0.28.1`), not
  a caret range.** The `redeem()` registry surprise above was discovered
  against a young, still-fast-moving SDK — a caret range would let a fresh
  `pnpm install` silently pick up a new minor version (and a new behavior
  surprise) with no corresponding code change to explain a CI break. Bump it
  deliberately, re-verify against `docs/LIMITATIONS.md` §1's live-cycle script,
  and update this note.

### 1a. `lockPosition`'s `amount` is a dollar stake, not a token quantity — verified empirically, 2026-09-05/06

**The bug**: `lockPosition` originally called the unified-tier
`exchange.createOrder(symbol, 'market', 'buy', amount, ...)`, passing the
user's typed dollar amount straight through as `amount`. Per the SDK's own
docs ("prices and amounts are human units in the tradable's own terms") and
confirmed against a real testnet order
(`scripts/verify-order-amount-semantics.mjs`), `createOrder`'s `amount` is a
**token quantity**, not collateral: requesting `amount=5` filled exactly 5
outcome tokens and spent **$2.575** real collateral (at a ~0.515 fill
price), not $5. A user who typed "$10" was buying 10 *tokens* (costing
whatever the book's price happened to be), not risking $10 — the UI's "Lock
Amount"/"Max Loss" figures were wrong by the fill price's ratio, silently.

**The fix**: `lockPosition` now sizes the order from the SDK's own
stake-quoting helper instead of hand-converting a dollar amount into a token
count: `client.quoteBinaryStake({ marketId, side, stake: fromHuman(amount,
quoteDecimals) })` walks the real order book and returns a
`{ yesPrice, quantity, escrow }` quote sized so `escrow` never exceeds the
requested stake, then `trader.placeOrder({ pool, side, price: yesPrice,
quantity, orderType: ORDER_TYPE.MARKET })` (raw tier, IOC) executes exactly
that. A `null` quote (thin/empty book) is surfaced as `InvalidInputError`
before anything is sent, not a mis-sized buy.
Covered by `__tests__/exchangeLockPosition.test.ts` (11 tests, mocked SDK) —
including a regression assertion that the quoted stake never exceeds the
requested dollar amount. Live re-verification against a fresh real order (the
same method that found the original bug) is currently blocked by the
`Market`-collection indexer outage in the Failure modes table below — retry
once that clears, using `scripts/verify-lock-position-fix.mjs`.

**A second gap found by `reliability-auditor` review of this fix, also
corrected**: `placeOrder`'s IOC semantics mean the book can thin out entirely
between the `quoteBinaryStake` read and `placeOrder`'s execution, confirming
on-chain with `fills: []`. Returning `{ filled: 0 }` normally from that would
have `lockWithIntent` clear the pending intent as a success and
`useLock.ts#executeLock` record an active lock for a position that doesn't
exist — the user pays gas, holds nothing, and is then blocked from retrying
that window by the single-lock-per-window check. `lockPosition` now throws
`ZeroFillError` in this case (a new class — real tx, but chain-confirmed zero
fill, so `isAmbiguousTxError` treats it as a proven, non-ambiguous failure
just like `InvalidInputError`, safe to discard rather than reconcile). Also:
a `placeOrder` failure after a successful quote now has the quote's
`quantity`/`yesPrice`/`escrow` appended to the error message, so the
structured log in `useLock.ts#executeLock` can tell "failed before pricing"
apart from "priced fine, the raw order call itself failed."

### Behavior & semantics
| Aspect | Guarantee |
| :--- | :--- |
| **Response type** | Read-only snapshot; may lag the chain by 1–3 blocks. |
| **Server cache policy** | 5,000 ms TTL server-side cache (`lib/server/dreamdex.ts`) — display-only, never consulted before signing. |
| **Frontend freshness** | `findLiveMarket` calls `loadMarkets()` fresh immediately before every lock — no cached/stale market id is ever signed against. |
| **BinaryMarket field shape** | `asset` (e.g. `"BTC"`), `interval` (e.g. `"15m"`, SDK-derived from on-chain `intervalSec`/`expiry - tradingStart`), `id` (the real `marketId`) — **not** `name`/`symbol`/`strikePrice`, which don't exist on the type. Match on `asset` + `interval` together, not `asset` alone (a market can exist on multiple cadences). |
| **Oracle numeric price scale — 2 decimals, undocumented** | `BinaryMarket.strike` (raw string) is a real, per-window reference price at **2 decimal places** — e.g. raw `7962895` == `$79,628.95`. Not stated anywhere in the SDK's types or README; verified empirically (`scripts/inspect-oracle-price.mjs`) against real BTC/ETH spot price across 11 samples (5 resolved + 1 live market, both assets) — every one landed within 0.1% of spot at that scale. `client.getMarketResolution(marketId)`'s `openingAnswer`/`closingAnswer` (the would-be real *closing* price) came back `null` on all 11 — this operator/venue's oracle doesn't populate that field for these markets, so there is currently no real settlement/closing price available, only the real opening/strike price. See `docs/LIMITATIONS.md` §5. |

### Failure modes & handling
| Failure Mode | Exception / Symptom | Handling |
| :--- | :--- | :--- |
| **Indexer down / unreachable (backend)** | HTTP 502, `Failed to load live markets` | Frontend's display fetch (`fetchLiveMarkets`) catches and falls back to a **non-tradable** synthetic window (`isLive: false`) — cosmetic only, never lockable. |
| **Indexer error during a real lock (frontend SDK)** | `IndexerError` from `loadMarkets()`/`quoteBinaryStake()` | Treated as "nothing was sent" (`isAmbiguousTxError` → `false`) — the read needed to price/size the order never completed, so no pending-lock intent is left dangling. |
| **No live market for the selected pair+interval** | `findLiveMarket` returns `null` | `lockValidation.canLock` is `false` with an explicit reason; `executeLock` also re-checks and throws if the market disappeared between validation and submission. |
| **Empty order book (no resting liquidity on the side being bought)** | `quoteBinaryStake` returns `null` | Surfaced to the user via `describeExchangeError` as `InvalidInputError` (`"the opposite side of the book is empty, or $X is too small to fill a single lot"`); the intent is discarded (not ambiguous — nothing was sent). This is expected behavior on thin testnet liquidity, not a bug. |
| **`Market_by_pk` query hangs/times out entirely** | Observed directly against the indexer on 2026-09-03: `{ __typename }` and `listLiveBinaryMarkets` both responded normally, but `Market_by_pk` (which `client.getMarket`/`getResolution`/claim all depend on) timed out for *every* market id tried, including ones unrelated to any specific test. External indexer-side issue, not something this app controls or can route around — `getResolution`/`claimWinnings` will surface it as an `IndexerError` via `describeExchangeError` ("Somnia indexer is unreachable right now"), which is the correct honest behavior, not a bug to chase here. |
| **Plain `Market` collection query also hangs/times out (broader than the 2026-09-03 `Market_by_pk` incident)** | Observed directly on 2026-09-06 while re-verifying the `lockPosition` stake-sizing fix (see §1a below): `curl`-ing the raw indexer with the SDK's exact `RegistryMarketsQuery`, a hand-trimmed version of it, and even the bare minimum `{ Market(limit: 5) { id } }` all hung to a `504 upstream request timeout` at the SDK's 30s `GQL_TIMEOUT_MS` bound — while `{ __typename }` and a `Market` type introspection query (`__type(name: "Market")`) both returned instantly. So the GraphQL endpoint itself is up and the schema resolves; only reads of the `Market` table's actual rows hang, regardless of filter/limit/`order_by`. Since `findLiveMarket()` (called from `useLock.ts#executeLock` on every lock attempt) calls this exact query via `ex.loadMarkets()`, **this outage blocks opening any new lock, not just claims** — surfaced correctly as `describeExchangeError`'s `IndexerError` message, but there is currently no retry/backoff around it (see `docs/LIMITATIONS.md` §7). Both this and the registry sweep flip between working (sub-second) and timing out from one process run to the next, sometimes seconds apart — intermittent indexer-side degradation, not a hard outage. |
| **`quoteBinaryStake`'s internal per-market lookup (`MarketByPk`) also fails at high rate** | Same 2026-09-06 session: a scan across all 578 live binary markets returned by the registry, calling `client.quoteBinaryStake` for each (which internally resolves the pool via a `MarketByPk`-named point lookup — the same query family as the 2026-09-03 `Market_by_pk` incident), hit the identical `"indexer MarketByPk failed: The operation was aborted due to timeout"` on **12 consecutive markets** spanning both assets and four different intervals before the scan was stopped — i.e. not one bad market id, a systemic per-market-lookup degradation. One earlier call in the same session *did* succeed (returned a real null-quote for an empty book), confirming the code path itself is correct when the indexer responds; this is purely upstream flakiness. |

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
   binds (`lib/hooks/useLock.ts#reconcilePendingLock`).

---

## 3. Idempotency & Reconciliation

- **Key generated and persisted before broadcast, not after.**
  `exchange.ts#lockWithIntent` (called from `lib/hooks/useLock.ts#executeLock`)
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
  `lib/hooks/useLock.ts#reconcilePendingLock` runs whenever a signer (re)binds —
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
returning a client-facing message (see `lib/hooks/useLock.ts#executeLock` /
`lib/hooks/useClaim.ts#claimPayout`):

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
| `POST /api/lock` | `marketId, pair, length, side, amount, filledAmount, fillPrice, walletAddress, hidePriceUntil, txHash` (all real, post-fill values — see `lib/hooks/useLock.ts#executeLock`) | `validators.ts#validateWalletAddress`: `walletAddress` must be a well-formed `0x` + 40-hex-char address, or the request is rejected before `verifyOnChainTx` ever runs; then `chainVerify.ts#verifyOnChainTx(txHash, walletAddress)`: well-formed hash, receipt exists, `status === "success"`, `receipt.from === walletAddress` (always checked — `walletAddress` is a required parameter, not an optional one) | `400` if `walletAddress` is missing/malformed; `422` with the specific reason if the tx itself doesn't check out; frontend just logs a warning either way |
| `POST /api/claim` | `lockId` (the backend's own id from the `/api/lock` response — `UserLock.backendLockId`, not the frontend's local lock id), `walletAddress`, `filledAmount`, `txHash` | Same `walletAddress` format check + `verifyOnChainTx` check as above, plus the referenced lock must exist (`404` if not) | Same as above; also silently skipped client-side if `backendLockId` was never captured (the earlier lock report failed or hasn't resolved yet) |

**What `verifyOnChainTx` does NOT do**: decode the transaction's logs to
confirm the exact `filledAmount`/`fillPrice` match what actually filled. That
would mean re-implementing the CLOB's order-matching/decode logic
server-side, for a store that authorizes nothing and holds no funds. It DOES
always confirm the tx's real sender matches the reported `walletAddress` —
that check used to be skipped whenever `walletAddress` was absent (it was an
optional parameter); it's now a required one and both `/api/lock`/`/api/claim`
reject a request that doesn't pass a validly-formatted one, before
`verifyOnChainTx` is ever called. See `docs/THREAT_MODEL.md` Threat 7 for the
accepted blast radius (still bounded to the history mirror, never a claim).

**Rate limiting**: both routes are wrapped with `apiRoute(handler, { scope,
limit })` (`lib/server/http.ts` → `lib/server/rateLimit.ts`) — `lock` and
`claim` at 10 requests/minute per caller IP (from `x-forwarded-for`/
`x-real-ip`, best-effort since there's no raw socket address on a Next.js
`Request`), the `GET` read routes (`/api/lock/[id]`, `/api/claim/[id]`,
`/api/claim/[id]/status`) at 20-30/minute. This is in-memory and per-instance,
not a shared/distributed limit — see `docs/LIMITATIONS.md` §6.

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
