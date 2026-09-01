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
- A **day budget** so you cannot keep tapping until the money is gone.  
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
- How much of **today’s budget** is left  
- Two big buttons: Green and Red  

**Role:** understand the question and lock a call.

If there is no price, almost no time left, or the budget is used up, the buttons do not work. The app explains why.

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
- Day budget used  
- **Share a card**: “I locked Green on BTC this hour.”  

**Role:** make it feel like a score, and let a friend join without learning DreamDEX.

**Watch mode** uses Home + Recents only. No wallet, no tap, no claim.

---

## Features

**Must have (the distinct product)**

- Lock & Reveal (hide price after you tap)  
- One main call per window  
- Day budget  
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
2. Set or accept a day budget.  
3. Look at this window: time left + Green/Red odds.  
4. Pick an amount. Read “max loss = this amount.”  
5. Tap Green or Red. Confirm.  
6. Land on the Locked screen. Live price is gone.  
7. Leave. Come back when the timer ends.  
8. See the result. If you won, tap Claim.  
9. Choose Same again, share a card, or stop for the day.

**Someone who only wants to look**

1. Open the app. Do not connect a wallet.  
2. Watch the timer, odds, and last results.

If a tap would fail (closed window, empty market, amount too small, not enough funds), nothing is sent. The app says so in normal words.

---

## How DreamDEX is integrated

Three layers:

1. **You** — Green or Red, and how much.  
2. **SOMNIX** — lock screen, budget, claim, next window, friend card.  
3. **DreamDEX on Somnia** — the real bets, the real prices, the real win/lose rule.

We do **not** create our own betting system. We use **DreamDEX Event Contracts**.

| What you see | What DreamDEX is doing |
| --- | --- |
| “BTC this hour” | A live Up/Down window for BTC |
| Timer | Official end time of that window |
| 58% Green | Price on the live book (a number between 0 and 1) |
| You tap Green | App **buys Up** for you, right now |
| You tap Red | App **buys Down** for you, right now |
| Locked call | You hold a result token for that window |
| Window ends | DreamDEX compares the real end price to the start price |
| Claim | App turns a winning token back into your funds |
| Same again | App finds the **next** window for that coin and length |

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

- Day budget and “already locked this window”  
- Hide-price state until the timer ends  
- Last results for the score list  
- Friend-card link (window + side, not your private keys)    

---

## Backend architecture

SOMNIX is chain-first. Wallet actions (buy Up/Down, claim) always happen **client-side**, because only the user's own wallet can sign them — a server can never do that part.

The backend exists for the few things a browser should not do alone: talking to the DreamDEX indexer without CORS/rate-limit pain, keeping contract/network config out of client bundles, and rendering the friend/share card image. It holds **no funds, no keys, and no accounts**.

### What it is

- A plain Express + TypeScript app, self-contained in `backend/` — its own `package.json`, `tsconfig.json`, `node_modules`, `.env.local`. No framework beyond Express, no database.
- Run it with `cd backend && npm install && npm run dev`. It doesn't share a package.json or node_modules with the repo root or with the frontend — the frontend will be an equally self-contained `frontend/` once it exists, `cd`'d into the same way.
- Runs on **port 4000** (`npm run dev` / `npm run start`), so port 3000 stays free for the frontend.
- Everything a route returns is public, cacheable data. Nothing it does requires a signature.

### Responsibilities

| Route | Does | Why not just call DreamDEX from the browser |
| --- | --- | --- |
| `GET /api/markets` | Calls the SDK client's `listLiveBinaryMarkets()` against the DreamDEX indexer, short server-side cache (a few seconds) | Cuts duplicate client calls, avoids hammering the indexer, one place to normalize the response |
| `GET /api/markets/:id/orderbook` | Resolves the market's pool address (`client.getMarket`) then reads `client.getBinaryOrderBook(pool)` for the odds bar | Same as above — short-lived cache, one shape for the UI |
| `GET /api/card/:marketId/:side` | Renders the friend/share card PNG (coin, window, side) as an SVG template rasterized with `sharp` | Social platforms fetch OG images server-side; a client-only page can't serve that |

Explicitly **not** here: creating orders, claiming, or anything touching a wallet — those stay in `lib/` on the client, same as `frontend_implementation.md` describes. Day budget, lock state, and recents also stay client-side (`localStorage`) — this is a hackathon build with no accounts, so there's nothing to key server storage on.

There's no `/api/config` route: `@somnia-chain/markets-sdk` ships the testnet chain definition (`somniaShannon`, from `@somnia-chain/markets-sdk/chains`) and the protocol's contract addresses (`SOMNIA_TESTNET_ADDRESSES`) as public constants. Both frontend and backend import them directly from the package — nothing deployment-specific to route through a server.

There's no `/docs` route either — no API-docs UI is served right now. `dreamdex.ts` and `env.ts` are unchanged from before; only the HTTP layer around them changed.

### Verification still happens on-chain, on the client

The indexer proxy is a convenience, not a source of truth. Per the integration section above, the client always re-checks `getMarketOnchain` (status must be `Trading`) right before a tap — a slightly stale cached list from `/api/markets` should never be trusted to authorize a spend.

### Structure

Everything backend-specific — config included — lives inside `backend/`. The repo root only holds project-wide docs (this file, `LICENSE`, `frontend_implementation.md`) and, later, a sibling `frontend/`:

```text
backend/
  src/
    index.ts                   # Express app, mounts the routers, listens on PORT (default 4000)
    routes/
      markets.ts                # GET /api/markets, GET /api/markets/:id/orderbook
      card.ts                   # GET /api/card/:marketId/:side
    lib/
      dreamdex.ts               # SomniaMarkets client (indexerUrl + testnet chain/addresses) + short TTL cache
      env.ts                    # typed server env (indexer URL, optional admin secret)
  package.json                  # scripts: dev (tsx watch), build (tsc), start (node dist/index.js)
  tsconfig.json                 # compiles src/**/*.ts -> dist/
  .env.local                    # gitignored; DREAMDEX_INDEXER_URL etc.
  .env.example
```

### Env

Server-only values (never exposed to a future client) live in `backend/.env.local`:

```bash
DREAMDEX_INDEXER_URL=
# Optional: Hasura role/admin-secret for privileged server-only indexer reads.
DREAMDEX_INDEXER_ADMIN_SECRET=
```

`backend/src/index.ts` loads it explicitly via `dotenv` (`dotenv.config({ path: path.resolve(process.cwd(), ".env.local") })`), resolved from `process.cwd()` — which is `backend/` as long as `npm run dev`/`start` are launched from inside it, same as `npm install`.

The testnet chain and contract addresses aren't env vars — they're imported straight from `@somnia-chain/markets-sdk` (`somniaShannon`, `SOMNIA_TESTNET_ADDRESSES`).

---

## How to run

Backend:

```bash
git clone <this-repo>
cd somnix/backend
cp .env.example .env.local   # then fill in DREAMDEX_INDEXER_URL
npm install
npm run dev                  # http://localhost:4000
```

Frontend: not built yet — will get its own `frontend/` folder, `package.json`, and `npm install`/`npm run dev`, run the same way from inside `frontend/`, on port 3000.
