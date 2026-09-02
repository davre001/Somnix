# SOMNIX — Threat Model

This document outlines the trust boundaries, threat vectors, security guarantees, and mitigations in SOMNIX.

---

## 1. System Overview & Trust Assumptions

```
[ User Browser (Wallet + SOMNIX UI) ]
       │                                │
       │ Signed txs (lock/claim/faucet) │ Display-only reads (pre-connect / watch mode)
       ▼                                ▼
[ Somnia Testnet RPC ]           [ SOMNIX Backend Proxy (port 4000) ]
[ DreamDEX contracts             │
  (binaryModule, settlement,     ▼
   collateral ERC-20) ]     [ DreamDEX Hasura Indexer ]
       ▲
       │ Direct indexer + chain reads/writes
       │ (loadMarkets, createOrder, redeem, faucet, getResolution)
       └────────────────────────────────┘
```

The frontend holds its **own** `@somnia-chain/markets-sdk` exchange instance
(`frontend/src/lib/exchange.ts`) that talks to the DreamDEX indexer and the
Somnia RPC directly — it does not proxy trades through the backend. It has
to: placing an order or redeeming a position requires a signature from the
user's own wallet, which only exists in the browser. The backend proxy is
used only for lightweight, unauthenticated, display-only reads (market list
/ odds preview before a wallet is connected, or in Watch Mode) and the
share-card image renderer.

### Trusted Components
1. **User's Wallet**: MetaMask, Coinbase, Rainbow, OKX, Phantom, or an
   injected EVM provider — the only thing that can produce a valid signature.
2. **Somnia Testnet Consensus & RPC**: Block ordering, transaction validation,
   smart contract execution.
3. **DreamDEX Smart Contracts**: outcome-token minting/trading, settlement,
   and payout redemption (`binaryModule`, `binarySettlement`, the collateral
   ERC-20 — all addresses come from `SOMNIA_TESTNET_ADDRESSES` in the SDK,
   never hardcoded by SOMNIX).

### Untrusted Components
1. **Backend Server (`backend/`)**: Never sees a private key, a signature, or
   a user balance, and has no execution rights. It's a read cache/proxy for
   pre-trade display and an OG image renderer — nothing it returns is used to
   construct or authorize a transaction; `exchange.ts` re-resolves the real
   live market and the real order book directly against the indexer/chain
   right before signing.
2. **External Indexer Latency**: The Hasura indexer can lag the chain. Any
   value that gates a signed action (which market is live, whether it
   resolved, what the wallet's real outcome-token balance is) is re-read
   fresh at the point of use, not cached from an earlier poll.

---

## 2. Threat Analysis & Mitigations

### Threat 1: Malicious or Compromised Backend Proxy
- **Risk**: Backend modifies market responses or injects a malicious contract
  address to trick a user into signing something harmful.
- **Mitigation**:
  - Contract addresses are the SDK's own `SOMNIA_TESTNET_ADDRESSES` constants,
    bundled into the client — the backend never supplies an address used in a
    transaction.
  - Every transaction (`lockPosition`, `claimWinnings`, `requestFaucet`) is
    constructed and signed entirely client-side via the SDK + the user's
    `viem` `walletClient`. The backend is never in that path.
  - The market/side actually traded comes from `findLiveMarket`, a fresh
    direct indexer read at lock time — not the backend's polled display data.

### Threat 2: A signed order or claim vanishes from the app's own record
- **Risk**: The tab closes, or the network drops, between the wallet
  confirming a transaction and the app recording the result. The position is
  real and on-chain, but SOMNIX's UI has no record of it — the user can't see
  or claim it through the app.
- **Mitigation**:
  - A lock intent (`marketId`, `side`, `amount`, an idempotency key) is
    persisted to `localStorage` **before** the wallet prompt
    (`marketService.ts#savePendingLockIntent`), not after the order resolves.
  - The next time a signer binds (fresh connect, or a reload rehydrating an
    existing session), `useSomnix.tsx#reconcilePendingLock` checks the real
    on-chain outcome-token balance for that market (`exchange.ts#checkFilledAmount`)
    and recovers the lock if it actually filled, or discards the intent if it
    didn't.
  - An error is only treated as "nothing was sent" (safe to discard the
    intent) when the SDK proves it — a pre-send validation error, a wallet
    rejection, or a chain-confirmed revert. A timeout or dropped connection
    (`RpcError`, or anything unrecognized) is left pending rather than assumed
    failed (`exchange.ts#isAmbiguousTxError`). See `docs/API_NOTES.md` §3.
  - This is best-effort per-device: see the caveat in `docs/LIMITATIONS.md` §3.

### Threat 3: Double-Spending / Rapid Repeat Submissions
- **Risk**: A user clicks "Lock" multiple times during network latency,
  submitting more than one order for the same window.
- **Mitigation**:
  - The side buttons disable immediately on submit (`submittingSide` state in
    `SideButtons.tsx`) until the attempt resolves.
  - `lockValidation` rejects a second lock once `activeLock.marketId` matches
    the current window's market id.
  - Each lock attempt carries its own idempotency key, persisted before
    broadcast (Threat 2).

### Threat 4: Claiming a losing or unresolved position
- **Risk**: A user (or a manipulated UI state) attempts to redeem a position
  that hasn't actually won, or hasn't resolved yet.
- **Mitigation**:
  - `claimPayout` calls `exchange.ts#getResolution`, a direct on-chain read of
    `winningOutcome`/`voided` on the `BinaryMarket` — never a locally
    computed or cached guess. It refuses to redeem unless the market is
    resolved and the wallet's locked side actually won (or the market
    voided, which redeems either side at par per the protocol's own
    settlement rules).
  - The redeem call itself (`ex.redeem`) is a real on-chain call against the
    `BinarySettlement` contract; a claim for a non-winning position would
    also revert on-chain even if the client-side gate were somehow bypassed.

### Threat 5: Expired Window / Late Execution
- **Risk**: An order is broadcast near a window's expiry and lands after
  trading has effectively closed.
- **Mitigation**:
  - Locking is disabled client-side inside a per-length cutoff window before
    expiry (`10s`–`60s` depending on length).
  - Orders are placed as market orders against the live book at submission
    time — `findLiveMarket` re-resolves the live market fresh immediately
    before signing, rather than trusting a value from an earlier poll.

### Threat 6: Share Card Data Tampering
- **Risk**: A user manipulates the `trade?data=...` URL payload to claim a
  false outcome or win.
- **Mitigation**: Shared trade cards are decorative/social only and grant no
  claim permissions. A payout claim requires the connected wallet to actually
  hold the winning outcome tokens on-chain — the share payload is never read
  by any signing or claim path.

---

## 3. Not defended, be explicit

- **No protection against DreamDEX itself being compromised or misbehaving**
  (a malicious market creator, a compromised oracle). SOMNIX trusts the
  protocol's own contracts and oracle as given; it has no independent
  verification of settlement correctness beyond reading the contract's own
  state.
- **No rate limiting or abuse protection on the backend proxy.** It's a
  read-only cache with no execution rights, so the blast radius of abuse is
  "wasted indexer requests," not fund loss — but it isn't hardened against
  being hammered.
- **No formal review of the wiring in `exchange.ts`/`useSomnix.tsx` has been
  performed** (contract-call construction, error-message content, the
  reconciliation logic above) — see `docs/LIMITATIONS.md` for what's been
  verified vs. not.

## 4. Known weaknesses worth attacking first

1. The reconciliation in Threat 2 is per-device/per-browser — a user who
   never reopens SOMNIX on the same browser after an ambiguous failure will
   never see it recovered in the UI, even though the on-chain position is
   fine.
2. `lockPosition`'s slippage tolerance (3%) is a fixed guess, not tuned
   against real observed book depth/volatility.
3. The full trading path has not been exercised against a live wallet and a
   live order book as of this writing (see `docs/LIMITATIONS.md` §1).
