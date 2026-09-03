# Repo instructions for Claude Code

## Mission
SOMNIX is a scalp-style directional prediction game on Somnia testnet, built on
top of DreamDEX binary markets. A user locks a directional call (green/red) on
a BTC or ETH price window by buying the real YES/NO outcome token with real
collateral, then claims it back for collateral once the market resolves and
they won. The one invariant that must never break: **a user's real,
already-signed on-chain action must never become invisible to the app** — no
fill lost to a closed tab, no claim sent for a position that didn't win, no
currency, odds, or payout number shown that isn't backed by a real on-chain or
indexer read.

## Source of truth, in order
1. Behavior you've actually reproduced (a script you ran, a response you
   logged) — not behavior you assume an API has.
2. Current official docs for any third-party service this repo depends on.
3. This repo's own tests and deployed contract source.
4. This file and any PRD/spec doc.
5. Model output / assumptions — lowest priority, must be checked against 1-4
   before shipping.

## Non-negotiable invariants
- A real on-chain fill (`exchange.ts#lockPosition`) is never left unrecorded:
  the lock intent is persisted (`marketService.ts#savePendingLockIntent`)
  *before* the wallet prompt, and reconciled against the wallet's real
  outcome-token balance (`exchange.ts#checkFilledAmount`) the next time a
  signer binds — see `useSomnix.tsx#reconcilePendingLock`.
- A claim (`exchange.ts#claimWinnings`) is never sent unless
  `exchange.ts#getResolution` confirms the market actually resolved on-chain
  and the connected wallet's side actually won (or the market voided).
- An ambiguous transaction outcome (a dropped connection, an RPC timeout) is
  never treated as "it failed" — only a chain-confirmed revert or a
  pre-broadcast validation error clears a pending lock
  (`exchange.ts#isAmbiguousTxError`).
- The UI never shows a currency label, live-market status, or payout figure
  that isn't backed by a real read. `MarketWindow.isLive` defaults to
  `false`; only a matching live DreamDEX market (asset + interval) flips it
  true, and only then can that window be locked.
- The signer bound to the exchange (`exchange.ts#bindExchangeSigner`) is only
  ever a real wallet-derived `walletClient` — never fabricated, and never
  assumed to still be live across a reload without re-verifying via
  `eth_accounts` first.

## Engineering rules
- Before integrating any external API that moves money or state, spend real
  time (or delegate to a subagent) mapping its failure modes: what does a
  timeout mean, is a 2xx synchronous or just "accepted", what's the actual
  idempotency guarantee. Write it down in `docs/API_NOTES.md` before writing
  the client.
- Use pnpm. Commit `pnpm-lock.yaml`. Never mix in a `package-lock.json` or
  `yarn.lock`.
- Keep TypeScript strict. Do not suppress type, lint, or test failures to
  get something green.
- Write or update a failing test before changing behavior, not after.
- Any script that needs a funded wallet, a live API key, or talks to
  mainnet gets a name prefix (`live:`, `deploy:`) so it's never accidentally
  run in CI or by a reviewer cloning the repo cold.
- Don't read `.env*`, keystores, or secret directories. Don't deploy to
  mainnet from an agent session.
- Before writing any access-control, permission, policy-gate, or
  proof/receipt-anchoring logic (on-chain or off-chain), consult the
  `onchain-access-control` skill first.

## Required checks
```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```
All four are wired into `.github/workflows/ci.yml` as separate jobs on every
push and PR — keep it that way; a CI that only runs part of the app's test
suite is not testing the app that ships it. SOMNIX is one Next.js app
(frontend + `app/api/*` route handlers) — there is no separate backend
service; don't reintroduce one without a real reason (see `docs/API_NOTES.md`
§0 for why it was folded in).

## Durable docs
- `docs/API_NOTES.md` — measured behavior of every external API this repo
  depends on for execution (DreamDEX indexer, Somnia RPC).
- `docs/LIMITATIONS.md` — what's explicitly NOT handled yet.
- `docs/THREAT_MODEL.md` — who's trusted, what happens if each key/wallet
  in the system is compromised.
- `docs/DREAMDEX_AND_SOMNIA.md` — protocol/integration reference notes.

Keep all four current with the code, not an earlier version of it.

## Review gates
After implementing a change, before calling it done, run the relevant
subagent:
- reliability/error-handling/retry/logging changes: `reliability-auditor`
- CI, scripts, packaging, repo structure, onboarding changes: `dx-auditor`

A task is not done until its subagent returns PASS.
