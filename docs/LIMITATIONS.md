# SOMNIX — Limitations

This document lists the deliberate engineering trade-offs, constraints, and known limitations of SOMNIX, stated plainly rather than left for a reviewer to find.

---

## 1. Environment & Network Scope
- **Somnia Shannon Testnet Only**: SOMNIX is configured for Somnia Testnet (`chainId: 50312`). It is not deployed on mainnet.
- **Native STT vs. collateral are different assets**: `STT` is the native gas token (used for network fees and shown as-is in wallet/network UI). The DreamDEX binary markets settle in a separate ERC-20 collateral token, whose real `symbol`/`decimals` are read on-chain once (`somnia.ts#fetchCollateralMeta`) and used for every lock amount, balance, and payout figure in the app. Don't assume it's `STT` — check what the app actually resolves it to at runtime.
- **Never verified end-to-end against a live indexer from a dev sandbox.** The trading path (`exchange.ts`) is implemented per the SDK's documented API surface, and typechecks/lints/unit-tests/builds clean, but was not exercised against a live wallet + live order book as of this writing. Run a full lock → resolve → claim cycle on testnet before treating it as verified.

## 2. Market Windows, Pairs & Real Liquidity
- **Supported Pairs**: BTC and ETH.
- **Window lengths offered**: `1m`, `3m`, `5m`, `15m`, `1h`. All five are real, tradable cadences as far as the code is concerned — nothing is hardcoded to disable a length. Whether a given pair+length is *actually* tradable at any moment depends entirely on whether DreamDEX (or an operator) currently has a live `BinaryMarket` on that exact cadence; the app has no market-creation authority of its own.
- **Honest liquidity gating, not a fallback**: `marketService.ts#getMarketWindow` returns `isLive: false` by default. Only `fetchLiveMarkets` finding a real DreamDEX market for the exact pair+interval flips a window to `isLive: true`, and only then does `lockValidation` allow locking it. When no live market exists for a selection, the UI disables locking with an explicit reason ("No live DreamDEX market for this window right now") — it never silently falls back to a synthetic/simulated market to make locking possible.
- **A "lock" is a real market order against a real order book.** If the opposite side of the book has no resting liquidity, the order will fail (`InvalidInputError` from the SDK) rather than fill against nothing. This is expected, correct behavior on a thin testnet book, not a bug — but it means "which windows are actually lockable right now" is an operational fact about DreamDEX liquidity, not something this repo controls.
- **Cutoff Times**: A lock cannot be submitted in the final moments of a window (`10s` for 1m, `20s` for 3m, `30s` for 5m, `60s` for 15m/1h) to avoid a transaction landing after the window closes.

## 3. Account & Custody Model
- **Non-Custodial**: SOMNIX holds zero user funds and zero private keys — nothing server-side can move, freeze, or gate a user's position. A local state (active lock, pending-lock intent, recents) lives in the user's browser `localStorage`, and a separate Turso (libSQL) table, written from this app's own `app/api/*` route handlers (non-authoritative), mirrors lock/claim *history* after the fact — see §6.
- **Browser-specific, but reconciled against the chain, not just trusted.** If a tab closes between the wallet confirming a lock and the app recording it, the position isn't silently lost: a pending-lock intent is persisted *before* the wallet prompt (`marketService.ts#savePendingLockIntent`) and reconciled against the wallet's real outcome-token balance the next time a signer binds (`useSomnix.tsx#reconcilePendingLock`, `exchange.ts#checkFilledAmount`). This is best-effort, not a guarantee: reconciliation only runs on this device, in this browser, the next time the same wallet connects here. If a user never reopens the app on this browser/device, the reconciliation never runs, though the funds/position themselves are unaffected on-chain — only the app's UI record of them would be missing.
- **A void market redeems either side at par.** `claimPayout` doesn't gate a claim on "did my side win" when the market voided — it proceeds regardless of predicted side, matching the protocol's void-redemption semantics.

## 4. Single Lock Per Window
- **UX constraint, not a protocol one**: the app allows only one lock per `marketId` at a time (checked client-side in `lockValidation`), to keep the "one deliberate call per window" experience. This is enforced in the UI only.

## 5. Display-only gaps
- The reference "Start Price" figures shown outside the live TradingView chart (which is real market data) come from a local placeholder generator (`marketService.ts#getMarketWindow`'s synthetic price seed) — cosmetic only, never used to determine a win/loss or a payout. Settlement is entirely determined by the real on-chain `winningOutcome` (`exchange.ts#getResolution`).

## 6. Server history mirror — a record, not a source of truth
- `POST /api/lock`/`/api/claim` (Turso-backed) only ever gets fed real, already-confirmed data — never a pre-trade estimate — and the reported `txHash` is checked against the real chain (`lib/server/chainVerify.ts`) before it's persisted. See `docs/API_NOTES.md` §5 and `docs/THREAT_MODEL.md` Threat 7.
- **What it doesn't do**: verify the exact `filledAmount`/`fillPrice` reported alongside a valid `txHash` — that would require decoding the CLOB fill server-side, which is disproportionate for a store that authorizes nothing. A user's actual position and any claim are always decided by the real chain, never by this table.
- **No resolution outcome is persisted.** `LockRecord` deliberately has no `resultSide`/`won`/`lost` field — RevealPanel and RecentsList always derive the outcome from a live `getResolution` chain read rather than trusting a second, potentially-stale copy. A cross-device "recents" view built on this store would need its own live resolution lookup per item, same as RevealPanel does today — it doesn't get one for free from the server.
- **Cross-device history is opt-in-by-connection, not automatic.** The mirror only has what was successfully reported from *some* browser session for that wallet; a device that was offline when a lock/claim happened, or whose report failed, has nothing to show until/unless another session reports it.
- **No rate limiting** on either server surface (display proxy or history mirror) — see `docs/THREAT_MODEL.md` §3.
- **Turso must actually be configured for this to survive a real deploy.** Without `TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN` set, `lib/server/tursoStore.ts` falls back to a local `file:local.db` — fine for `pnpm dev`, but a serverless deploy has no durable local disk, so every cold start would start that fallback db over empty. This has not been exercised against a real Turso database as of this writing — same caveat as §1's live-trading-path gap.
- **The libSQL `Row` object is array-like** — a column read back by a name that collides with a real `Array`/`Row` property (e.g. `length`) silently returns the wrong thing instead of erroring. `lib/server/tursoStore.ts` works around this for the one field that collided (`windowLength` in SQL, still `length` in the TS `LockRecord` type) — caught by `tursoStore.test.ts`, not by inspection. Worth remembering before adding another column.
