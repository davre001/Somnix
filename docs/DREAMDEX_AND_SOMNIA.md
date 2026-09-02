# Somnia & DreamDEX Event Contracts: Architecture & Integration Guide

This document provides a comprehensive research summary of **Somnia Blockchain**, **DreamDEX CLOB**, and the official **`@somnia-chain/markets-sdk`**.

---

## 1. Somnia Blockchain Overview

**Somnia** is a high-performance EVM-compatible Layer 1 blockchain optimized for sub-second transaction finality, high throughput (up to 400,000+ TPS), and low-latency on-chain applications (CLOB DEXs, gaming, and real-time social platforms).

### Network Configuration (Shannon Testnet)
| Parameter | Value |
| :--- | :--- |
| **Network Name** | Somnia Shannon Testnet |
| **Chain ID (Decimal)** | `50312` |
| **Chain ID (Hex)** | `0xc488` |
| **Native Token** | Somnia Testnet Token (`STT`) |
| **Decimals** | 18 |
| **HTTP RPC URL** | `https://dream-rpc.somnia.network` |
| **WebSocket RPC URL** | `wss://dream-rpc.somnia.network` |
| **Block Explorer** | `https://shannon-explorer.somnia.network` |
| **Faucet** | Somnia Testnet Faucet / Community Telegram Bot |

---

## 2. DreamDEX & Event Contracts Architecture

**DreamDEX** is a fully on-chain Central Limit Order Book (CLOB) built natively on Somnia. Unlike Automated Market Makers (AMMs), DreamDEX matches limit and market orders directly in smart contracts with central exchange execution speeds.

### Event Contracts (Binary Prediction Markets)
Event Contracts on DreamDEX allow traders to take binary **Up (Green / YES)** or **Down (Red / NO)** positions over fixed time windows (e.g., 1m, 3m, 5m, 15m, 1h).

```
   ┌─────────────────────────────────────────────────────────────┐
   │                  Market Window (15m / 1h)                   │
   │                                                             │
   │  Window Start ─────────────── Trading ────────────── Expiry │
   │  (Opening Oracle Price)                            (Closing)│
   └──────────────┬──────────────────────────────────────┬───────┘
                  │                                      │
                  ▼                                      ▼
           [Buy YES / Green]                    [Oracle Hub Settle]
           [Buy NO  / Red  ]               (Closing Price >= Opening)
                  │                                      │
                  ▼                                      ▼
           Holds Outcome Tokens                   Redeem Payout:
           (1 Token = 1 Payout)            YES Wins: 1.00 / NO Wins: 0
```

### Reference-Mode Up/Down Markets
- **Opening Oracle Answer**: When the window begins, an on-chain oracle posts the starting price (`openingAnswer`).
- **Trading Window**: Traders buy or sell `YES` (Green) or `NO` (Red) outcome tokens. The price of `YES` on the book reflects market-implied odds (e.g., `0.58` = 58% probability), denominated in the market's collateral ERC-20 — **not** native `STT`. See `docs/API_NOTES.md` §2.
- **Closing Oracle Answer**: When the window expires, the oracle posts the closing price (`closingAnswer`).
- **Settlement Rule**:
  - If `closingAnswer >= openingAnswer` $\rightarrow$ **YES (Green)** wins. YES tokens redeem for full payout value ($1.00$ collateral per token), NO tokens redeem for $0$.
  - If `closingAnswer < openingAnswer` $\rightarrow$ **NO (Red)** wins. NO tokens redeem for full payout value, YES tokens redeem for $0$.

---

## 3. `@somnia-chain/markets-sdk` Reference

The official SDK (`@somnia-chain/markets-sdk` v0.28.0+) provides unified TypeScript interfaces for all DreamDEX operations.

### A. Addresses & Initialization
```typescript
import { SomniaMarkets, SOMNIA_TESTNET_ADDRESSES } from "@somnia-chain/markets-sdk";
import { somniaShannon } from "@somnia-chain/markets-sdk/chains";

const exchange = new SomniaMarkets({
  chain: somniaShannon,
  indexerUrl: "https://your-dreamdex-indexer.somnia.network/v1/graphql",
  addresses: SOMNIA_TESTNET_ADDRESSES,
});
```

### B. Indexer Reads & Market Discovery
| Method | Description |
| :--- | :--- |
| `listLiveBinaryMarkets()` | Returns all currently active event contract markets from the indexer. |
| `getMarket(marketId)` | Fetches details for a specific market, including its `poolAddress`. |
| `getBinaryOrderBook(poolAddress)` | Returns current bids and asks for `YES` and `NO` books (`yesBids`, `yesAsks`, `noBids`, `noAsks`). |
| `getMarketResolution(marketId, indexerUrl)` | Returns oracle opening price, closing price, and settlement outcome events. |

### C. Order Placement (`placeOrder`)
Orders are placed against the `BinaryPool` smart contract:
```typescript
// Example: Placing an Immediate-or-Cancel (IOC) Buy Up / Green Order
const result = await trader.placeOrder({
  pool: poolAddress,
  side: "BUY_YES",     // or "BUY_NO" for Red
  type: "IOC",         // Immediate-or-Cancel (fill immediately, do not leave resting order)
  quantity: amount,
  price: maxAcceptablePrice,
});
```

### D. Payout Redemption (`redeem`)
When a window finalizes on-chain:
```typescript
// Example: Redeeming winning outcome tokens
const txResult = await trader.redeem({
  marketId: marketId,
  pool: poolAddress,
});
```

---

## 4. How SOMNIX Uses Somnia & DreamDEX

SOMNIX abstracts the complexity of order books, token tickers, and chart noise into a single deliberate decision:

1. **Odds Normalization**: SOMNIX converts raw `YES` and `NO` book levels into plain probability percentages (`58% Green` / `42% Red`) for display; odds are only shown as real when a live market backs the selected window (`isLive: true`), never fabricated.
2. **Zen State (Price Hiding)**: Once confirmed, SOMNIX hides live chart updates until `0:00` countdown expiry.
3. **Safety Cutoffs**: Prevents locks within the final seconds (`10s` for 1m, `60s` for 15m) to ensure orders do not bridge into the next candle.
4. **Non-Custodial Claim**: Winning tokens are redeemed directly to the user's wallet via Somnia smart contracts, only once `getMarketResolution`/`getMarket` confirms the market actually resolved.

## 5. What SOMNIX's code actually calls

Sections 3.C/3.D above show the SDK's **raw** `trader.placeOrder`/`trader.redeem`
surface for reference. SOMNIX itself doesn't call those directly — it goes
through the SDK's higher-level unified `SomniaMarkets` exchange, in
`frontend/src/lib/exchange.ts`:

- `exchange.createOrder(outcomeSymbol, "market", "buy", amount, undefined, { slippage })`
  for locking (resolves tick/lot alignment, YES/NO book-crossing price, and
  the raw `placeOrder` call internally).
- `exchange.redeem(marketId, amount)` for claiming.
- `exchange.trader.faucet({})` for the testnet collateral faucet.
- `exchange.client.getMarket(marketId)` for resolution checks.

See `docs/API_NOTES.md` for the exact failure modes and idempotency handling
around these calls.
