# SOMNIX — live demo run-of-show

**Thesis in one line:** SOMNIX doesn't help you trade better — it hides the
price the second you commit, so you stop refreshing the chart and just wait
for the answer.

Target: 2-3 minutes, then Q&A. Lead with feeling, escalate to proof, close on
the thesis. Every claim on screen should be live, not a screenshot, unless the
contingency plan below has kicked in.

---

## Pre-flight (before you walk up)

- [ ] Live app open at [somnix-iota.vercel.app](https://somnix-iota.vercel.app)
      in one tab; `localhost:3000` (via `pnpm dev`) open in a second tab as a
      fallback if the live deploy is slow.
- [ ] Wallet connected on Somnia Shannon testnet, funded with STT (gas) and
      tUSDC (collateral) — check both balances before you walk up, not during.
- [ ] Confirm at least one BTC or ETH window is currently live (check the
      length picker — if 1m/5m/1h all show enabled, you're set).
- [ ] A terminal tab ready, large font, with
      `node frontend/scripts/verify-order-amount-semantics.mjs` visible in
      history (don't run it live — see Act 2) — or just have the README's
      "Tested against reality" section open in a second monitor/tab as backup.
- [ ] Reset any state the demo depends on: no stale `activeLock` sitting in
      `localStorage` from a previous rehearsal (clear site data if needed, or
      let the current window resolve first).
- [ ] Decide the one moment you want the room watching closely — the reveal
      screen resolving, or the real balance changing after claim — and plan a
      beat of silence around it. Don't talk over your own best moment.

## Cold open — the problem (0:00–0:20)

> "You already know if Bitcoin's green this hour — you've thought it. The
> problem is what happens next: you either keep refreshing the chart every few
> seconds, or you open a leveraged trade and lose more than you meant to."

## Act 1 — the feel (0:20–1:15)

- Pick BTC (or ETH), pick a live window length, pick an amount.
- Point out the pre-lock checklist ticking through market/time/balance —
  narrate that this is a real read of the live order book, not a static UI.
- Tap Green or Red. Narrate: "that just sent a real signed transaction — I'm
  buying the actual outcome token on-chain, right now, priced by whatever the
  book is offering this second."
- Land on the Locked screen. Say it plainly: "No chart. No price. That's not
  missing functionality — that's the product. I can't refresh what isn't
  there."

## Act 2 — the proof (1:15–2:15)

This is where you show what a screenshot can't fake — pick **one**, don't try
all three live unless you have time to spare:

- **Best if a window is already close to resolving:** cut to a previously
  locked position on the Reveal screen, claim it live, and watch the wallet
  balance move by the *real* order-book price — not a flat "get your money
  back" number. Say out loud: "if this paid out exactly what I put in, that'd
  mean the price never mattered. It doesn't — watch the balance."
- **If nothing's close to resolving:** open the block explorer to the real tx
  hash from a lock you placed earlier in the demo. Say: "that's not a mockup
  — that's a real transaction on Somnia Shannon testnet, right now."
- **If you want to show engineering rigor instead of a live trade:** open the
  README's "Tested against reality" section and read the real captured
  numbers — a $5 request that only spent $2.92 in the *unfixed* SDK path, a
  real tx hash that resolves on-chain. Say: "we didn't just assume this was
  right — we reproduced it against a funded wallet, found it was wrong, and
  fixed it. That script's still in the repo — anyone can re-run it."

## Close — the thesis + the ask (2:15–end)

> "So: SOMNIX hides the price so you stop watching it. Everything you just
> saw is live right now at somnix-iota.vercel.app. Thank you."

Land it, stop talking, take questions. Don't keep selling after the ask.

---

## If something breaks (write this before you need it)

- **Network/wifi flaky:** Pivot straight to the "Tested against reality"
  section of the README on a second tab — it's real, already-captured
  evidence (a real tx hash, real balance numbers) that needs no live network
  call to show. Say: "this doesn't need live wifi to be real — here's the
  actual transaction."
- **Live app won't load:** Switch to the `localhost:3000` fallback tab
  (`pnpm dev`, pre-started before you walked up) — same code, same testnet,
  no dependency on Vercel being reachable.
- **A command misbehaves / a lock fails to place:** Skip straight to a
  pre-locked window's Reveal screen (lock one manually 10-15 minutes before
  your slot, on a longer window like 1h, as insurance) — claim that one
  instead of trying to place a fresh lock live.
- **Everything dies:** Screen-share the Shannon explorer directly at a real
  tx hash from the README's evidence section
  (`0x4fa81241cc1eeabd71d9d3a661d8aeeae882a5e2b95fbca3bc41456fbaf182bf`) —
  proves a real transaction happened without the app running at all.
