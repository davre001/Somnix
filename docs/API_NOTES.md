# API Notes: DreamDEX & Somnia Integration

Measured/documented behavior of every external dependency SOMNIX's execution
path relies on. Two separate access paths exist — keep them distinct, they
have different trust levels (see `docs/THREAT_MODEL.md` §1):

- **Backend proxy** (`backend/src/routes/markets.ts`, `backend/src/lib/dreamdex.ts`):
  unauthenticated, read-only, used for pre-trade display (market list, odds
  preview) before a wallet is connected or in Watch Mode. Never touches a
  signature or a transaction.
- **Frontend SDK client** (`frontend/src/lib/exchange.ts`): a `SomniaMarkets`
  instance bound to the user's own `viem` `walletClient`. Everything that
  moves money — locking, claiming, the faucet, resolution checks — goes
  through this, talking directly to the DreamDEX indexer and the Somnia RPC.

---

## 1. DreamDEX Indexer (Hasura GraphQL)

- **Endpoint**: `NEXT_PUBLIC_DREAMDEX_INDEXER_URL` (frontend, defaults to
  `https://indexer-testnet.somnia.network/v1/graphql`) / `DREAMDEX_INDEXER_URL`
  (backend, same default).
- **SDK surface used**: `SomniaMarkets.loadMarkets()` (→
  `client.listRegistryMarkets()`, live binary series only), `client.getMarket(marketId)`,
  `client.getMarketResolution` (via `exchange.ts#getResolution`), and the raw
  `listLiveBinaryMarkets()`/`getBinaryOrderBook()` the backend proxy calls
  directly for display.

### Behavior & semantics
| Aspect | Guarantee |
| :--- | :--- |
| **Response type** | Read-only snapshot; may lag the chain by 1–3 blocks. |
| **Backend cache policy** | 5,000 ms TTL server-side cache (`backend/src/lib/dreamdex.ts`) — display-only, never consulted before signing. |
| **Frontend freshness** | `findLiveMarket` calls `loadMarkets()` fresh immediately before every lock — no cached/stale market id is ever signed against. |
| **BinaryMarket field shape** | `asset` (e.g. `"BTC"`), `interval` (e.g. `"15m"`, SDK-derived from on-chain `intervalSec`/`expiry - tradingStart`), `id` (the real `marketId`) — **not** `name`/`symbol`/`strikePrice`, which don't exist on the type. Match on `asset` + `interval` together, not `asset` alone (a market can exist on multiple cadences). |

### Failure modes & handling
| Failure Mode | Exception / Symptom | Handling |
| :--- | :--- | :--- |
| **Indexer down / unreachable (backend)** | HTTP 502, `Failed to load live markets` | Frontend's display fetch (`fetchLiveMarkets`) catches and falls back to a **non-tradable** synthetic window (`isLive: false`) — cosmetic only, never lockable. |
| **Indexer error during a real lock (frontend SDK)** | `IndexerError` from `loadMarkets()`/`createOrder()` | Treated as "nothing was sent" (`isAmbiguousTxError` → `false`) — the read needed to price/send the order never completed, so no pending-lock intent is left dangling. |
| **No live market for the selected pair+interval** | `findLiveMarket` returns `null` | `lockValidation.canLock` is `false` with an explicit reason; `executeLock` also re-checks and throws if the market disappeared between validation and submission. |
| **Empty order book (no resting liquidity on the side being bought)** | `InvalidInputError` from `createOrder`'s market-order pricing (`"the opposite side of the book is empty"`) | Surfaced to the user via `describeExchangeError`; the intent is discarded (not ambiguous — nothing was sent). This is expected behavior on thin testnet liquidity, not a bug. |

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

- **Key generated and persisted before broadcast, not after.** `executeLock`
  builds an idempotency key and calls `marketService.ts#savePendingLockIntent`
  — writing `{ id, marketId, pair, length, side, amount, createdAt }` to
  `localStorage` — *before* `lockPosition` (which triggers the wallet prompt),
  not after the order resolves. This is the fix for the failure mode the
  reliability skill calls out explicitly: generating the key only after a
  response comes back leaves nothing to check against if the request itself
  times out.
- **Reconciliation, not just persistence.** A persisted intent alone doesn't
  help unless something later checks it against reality.
  `useSomnix.tsx#reconcilePendingLock` runs whenever a signer (re)binds —
  fresh connect, or reload rehydration — and calls
  `exchange.ts#checkFilledAmount(marketId, side)`, a direct on-chain read of
  the wallet's outcome-token balance for that market, to decide whether to
  promote the intent into a real recorded lock or discard it.
- **Single lock per window**: `lockValidation` rejects a second lock once
  `activeLock.marketId` matches the current window's market id.
- **Budget guardrail**: `wallet.dailyBudgetSpent`, tracked in
  `localStorage`'s `somnix_daily_budget_v1`, is a client-side UX cap only —
  not a protocol-enforced limit.

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
