# SOMNIX

**Lock one guess for this hour. Hide the price. See the result when the timer ends.**

SOMNIX is an app on DreamDEX Event Contracts (Somnia).  
You say whether Bitcoin or Ethereum will finish this short window **up or down**. You can only lose what you put in. After you tap, the live price is hidden on purpose — so you stop refreshing the chart.

Built for the Somnia × DreamDEX Event Contracts Hackathon.

---

## What it does

Every 15 minutes or every hour, DreamDEX already runs a simple market:

- **Green (Up)** = the coin finishes at or above the price when the window started
- **Red (Down)** = the coin finishes below that start price

SOMNIX turns that market into a **decision**, not a trading screen.

You:

1. Pick Green or Red and an amount.
2. **Lock** the call. The live price disappears until the window ends.
3. Come back at 0:00. See if you were right.
4. If you won, tap **Claim** to get paid.
5. Optionally take the **same call on the next window**, or send a **friend card** so someone else can join that kind of window.

You never need to read an order book or learn exchange words.

---

## Problem it solves

People already guess “is Bitcoin green this hour?”

Then they do one of two things:

- Keep opening the chart every few seconds, or
- Open a leveraged trade and can lose **more** than they meant to.

The question is small. The habit is loud. Normal trading apps make the habit worse, because they keep showing the price.

**That is the real-life problem:** you cannot put the phone down.

---

## Solution it offers

**Lock & Reveal.**

- One main call per window (you are deciding, not day-trading).
- After you lock, **no live price** until the window is over.
- A hard cap: the most you can lose is the amount you chose.
- **Claim** is part of the flow — winning money does not appear by magic.
- **Same again** on the next window, so you do not have to hunt for a new market.
- **Watch mode** if you are not ready to connect a wallet.
- **Friend card** so a new person can understand the same question in one screen.

DreamDEX does the real market and the real payout rules. We do the experience people will remember.

---

## Pages and their role

Four screens. That is enough.

### 1. Home — “This window”

What you see:

- Coin and length (BTC or ETH, 15 minutes or 1 hour)
- Time left
- What the market thinks (example: 58% Green / 42% Red)
- A warning if Green or Red is already very expensive (example: 75% Green)
- Amount buttons (5 / 10 / 25)
- Two big buttons: Green and Red

**Role:** understand the question and lock a call.

If there is no price or almost no time left, the buttons do not work. The app explains why.

### 2. Locked — “Put the phone down”

What you see:

- Your side and amount
- Countdown
- **No live chart and no live price**
- A line like: “You’re in. Result at 0:00.”

**Role:** this is the product. It stops the refresh habit.

### 3. Reveal + Claim — “What happened”

What you see:

- Start price vs end result (Green or Red)
- You won or you lost
- If you won: **Claim**
- Then: **Same again** on the next window, or skip

**Role:** show the answer, pay winners, move you to the next candle.

### 4. Recents + Share — “How you did”

What you see:

- Last few windows and whether you were right
- **Share a card**: “I locked Green on BTC this hour.”

**Role:** make it feel like a score, and let a friend join without learning DreamDEX.

**Watch mode** uses Home + Recents only. No wallet, no tap, no claim.

---

## Features

**Must have (the distinct product)**

- Lock & Reveal (hide price after you tap)
- One main call per window
- Green / Red in plain language
- Max loss shown before confirm
- Claim after the window settles
- Next window ready (“same again”)
- Only windows that are still open for real

**Makes us different from a basic Green/Red clone**

- Price is hidden on purpose after lock
- Claim is required to cleanly go again (if you won)
- Friend card for a new user
- Watch mode for people who are not ready to trade
- Odds warning when the crowd has already piled onto one side

---

## User workflow

**Someone who will trade**

1. Open the app. Connect a wallet on the test network.
2. Look at this window: time left + Green/Red odds.
3. Pick an amount. Read “max loss = this amount.”
4. Tap Green or Red. Confirm.
5. Land on the Locked screen. Live price is gone.
6. Leave. Come back when the timer ends.
7. See the result. If you won, tap Claim.
8. Choose Same again, share a card, or stop for now.

**Someone who only wants to look**

1. Open the app. Do not connect a wallet.
2. Watch the timer, odds, and last results.

If a tap would fail (closed window, empty market, amount too small, not enough funds), nothing is sent. The app says so in normal words.

---

## How DreamDEX is integrated

Three layers:

1. **You** — Green or Red, and how much.
2. **SOMNIX** — lock screen, claim, next window, friend card.
3. **DreamDEX on Somnia** — the real bets, the real prices, the real win/lose rule.

We do **not** create our own betting system. We use **DreamDEX Event Contracts**.

| What you see    | What DreamDEX is doing                                  |
| --------------- | ------------------------------------------------------- |
| “BTC this hour” | A live Up/Down window for BTC                           |
| Timer           | Official end time of that window                        |
| 58% Green       | Price on the live book (a number between 0 and 1)       |
| You tap Green   | App **buys Up** for you, right now                      |
| You tap Red     | App **buys Down** for you, right now                    |
| Locked call     | You hold a result token for that window                 |
| Window ends     | DreamDEX compares the real end price to the start price |
| Claim           | App turns a winning token back into your funds          |
| Same again      | App finds the **next** window for that coin and length  |

Facts we handle so users do not have to:

- A list can be slightly late. We check the chain again before any tap (“is this window still open?”).
- Tiny amounts can be rejected by the market. We block those.
- When a window dies, a new one starts. We load the new one.
- Winnings sit in a result token until Claim. We do not pretend the wallet updated by itself.

**For builders (SDK)**

- Package: `@somnia-chain/markets-sdk` version **0.28.0 or newer** + `viem`
- List windows: `listLiveBinaryMarkets`
- Confirm open: `getMarketOnchain` (status must be Trading)
- Odds: `fetchOrderBook`
- Tap: `createOrder` with IOC (fill now; do not leave a leftover order sitting)
- “Your call”: outcome token balance
- Claim: finalized windows + redeem
- Next window: load live markets again after expiry

There is no Event Contract “website API” for this. The official SDK talks to Somnia and DreamDEX.

Docs: https://docs.dreamdex.io/developers/event-contracts

---

## What we need for the project to function

**To run a real demo**

1. This app running on a computer or a test website
2. A browser wallet on **Somnia testnet**
3. Test funds (from the hackathon faucet / Telegram)
4. DreamDEX connection details: test network address, indexer, contract addresses from the docs
5. At least one **live** BTC or ETH window that still has a price
6. For Claim in the video: a window that already ended with a win, or time to wait for one

**To use the app as a person**

- The app open
- (For tapping) a wallet and a little test money
- Understanding that you can lose the amount you lock

**Watch mode** needs only the app and a live window. No wallet.

Without test funds or a live window, judges can see the screens, but they will want one real lock and one real Claim.

---

## Full tech stack

**What people use**

- A website that fits a phone screen
- Next.js + TypeScript (the app and pages)
- Four pages: Home, Locked, Reveal + Claim, Recents + Share

**Wallet and network**

- Somnia testnet
- Browser wallet
- `viem` to talk to the network

**DreamDEX**

- `@somnia-chain/markets-sdk` (>= 0.28.0)
- Event Contracts (Up/Down windows)
- DreamDEX indexer to list windows (we still check the chain before a tap)

**What we store in the app**

- “Already locked this window”
- Hide-price state until the timer ends
- Last results for the score list

---

## Architecture

SOMNIX is chain-first and is one Next.js app — no separate backend service.
Wallet actions (buy Up/Down, claim) always happen **client-side**
(`frontend/src/lib/exchange.ts`), because only the user's own wallet can sign
them; a server can never do that part.

`app/api/*` route handlers exist only for the things a browser shouldn't do
alone: reading the DreamDEX indexer without CORS/rate-limit pain (display
only, never consulted before signing), rendering the friend/share card image,
and mirroring a client-confirmed lock/claim into Turso for persisted history.
They hold **no funds, no keys, and no accounts**, and every write is verified
against a real on-chain receipt before being stored
(`lib/server/chainVerify.ts`). Full endpoint-by-endpoint behavior, failure
modes, and the three access paths' trust levels are documented in
[`docs/API_NOTES.md`](docs/API_NOTES.md) — that file, not this section, is the
source of truth for the API surface.

### Verification still happens on-chain, on the client

The indexer proxy is a convenience, not a source of truth. The client always
re-checks on-chain state right before a tap — a slightly stale cached list
from `/api/markets` should never be trusted to authorize a spend.

### Structure

SOMNIX is one Next.js app — `frontend/` — no separate backend service (see
`docs/API_NOTES.md` §0 for why an earlier Express service was folded in):

```text
frontend/
  src/
    app/
      api/                     # Route handlers: markets, card, lock, claim (the history mirror)
      trade/, locked/, reveal/, recents/   # Pages
    components/                # UI
    lib/
      exchange.ts              # Browser SDK client (SomniaMarkets bound to the user's own wallet) — the only piece that moves money
      somnia.ts                # Chain config, collateral token reads
      marketService.ts         # Pending-lock-intent persistence, market fetch/display
      history.ts               # Fire-and-forget POSTs to /api/lock, /api/claim
      server/
        dreamdex.ts             # Server-side indexer read (display proxy only)
        chainVerify.ts          # Verifies a reported tx really confirmed on-chain
        tursoStore.ts           # Turso (libSQL) persistence for the history mirror
  .env.example
```

### Env

See `frontend/.env.example` for the full, current list. In short:
`NEXT_PUBLIC_DREAMDEX_INDEXER_URL` (public, defaults to the real testnet
indexer) is the only client-side value; `TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN`
(server-only) back the history mirror.

The testnet chain and contract addresses aren't env vars — they're imported
straight from `@somnia-chain/markets-sdk` (`somniaShannon`,
`SOMNIA_TESTNET_ADDRESSES`).

---

## How to run

```bash
git clone <this-repo>
cd somnix
pnpm install
cp frontend/.env.example frontend/.env.local   # fill in Turso vars for a persisted history mirror; optional for local dev
pnpm dev                  # http://localhost:3000
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```
