# Frontend implementation

Somcall is a small Next.js app. Four screens. DreamDEX does the market. The UI does lock, hide, reveal, and claim.

This file is for whoever builds the interface.

---

## Goal of the UI

A new user should understand the product without knowing what an Event Contract is.

Home asks: **this window, green or red?**  
After a tap the live price disappears.  
When the timer ends they see the result and claim.

---

## Stack

- Next.js (App Router) + TypeScript
- Tailwind (or any simple CSS)
- Wallet connect on Somnia testnet
- React Query (or SWR) for market data
- `@somnia-chain/markets-sdk` + `viem` behind `lib/` — **pages do not call the SDK directly**

Mobile width first. Demo on a laptop in a narrow column is fine.

---

## Routes

| Route | Screen | Who uses it |
| --- | --- | --- |
| `/` | Home | Everyone |
| `/locked` | Locked | After a successful tap |
| `/reveal` | Reveal + Claim | After expiry |
| `/recents` | Recents + Share | Optional, linked from header |

Watch mode = Home + Recents with no wallet. Hide tap and claim.

---

## Shared chrome

Top bar:

- Name: Somcall
- Network: Somnia testnet
- Connect wallet / address
- Day budget left (if wallet connected)

Do not put a chart in the header.

---

## Screen 1 — Home `/`

### Shows

- Pair + length: `BTC · 15m` or `ETH · 1h` (simple switch)
- Countdown to window end
- Odds only: `Green 58%` / `Red 42%`
- If one side is ≥ 70%: *“This side is already expensive.”*
- Amount chips: `5` / `10` / `25` + selected amount
- One line: `Max loss: 10. If right, about 10 back per contract.`
- Budget: `Today left: 15 / 20`
- Buttons: **Green** and **Red**

### Hidden

- Order book ladder
- Token symbols
- Live ticking price **after** they have a lock for this window (send them to `/locked`)

### Button rules

Disable Green/Red and show one reason when:

- No wallet (unless watch mode — then hide buttons)
- Window not live
- Less than ~60 seconds left
- No odds (empty book)
- Amount below market minimum
- Not enough balance
- Day budget would be exceeded
- They already locked this window

### On success

Save lock in local state (and `localStorage`):

- `marketId`
- side (`green` | `red`)
- amount
- lockedAt
- hidePriceUntil = window expiry

Navigate to `/locked`.

---

## Screen 2 — Locked `/locked`

This screen **is** the product.

### Shows

- `You’re in`
- Side + amount: `Green · 10`
- Countdown only
- Copy: `Price is hidden until this window ends.`
- Link: Recents

### Must not show

- Live price
- Chart
- Odds updating
- Another Green/Red button for this same window

If they refresh, still hide price until expiry.

When countdown hits 0, go to `/reveal`.

If there is no lock in storage, send them Home.

---

## Screen 3 — Reveal + Claim `/reveal`

### Shows

- Window label
- Result: Green or Red (plain language)
- `You won` or `You lost`
- If won and unclaimed: **Claim**
- After claim or loss: **Same again** and **Home**

### Claim button

- Loading while the tx runs
- Success: `Paid. Budget can be used on the next window.`
- Error: short human sentence, retry

Same again = Home already pointed at the next window, same side + amount preselected. User still confirms.

---

## Screen 4 — Recents `/recents`

List last 5–10 windows:

- Time / pair
- Result colour
- Your side if you played
- Right / wrong / skipped
- Claimed or not

Top: share card button  
`I locked Green on BTC 15m` + link to Home with pair preselected  
Do not put keys or amounts on the public card if you want to stay simple.

---

## Components

Keep these dumb. Data comes from hooks.

```text
components/
  TopBar.tsx
  WindowSwitch.tsx      # BTC/ETH · 15m/1h
  Countdown.tsx
  OddsBar.tsx           # two percentages
  AmountChips.tsx
  SideButtons.tsx       # Green / Red
  BudgetLine.tsx
  LockPanel.tsx
  RevealPanel.tsx
  ClaimButton.tsx
  RecentsList.tsx
  ShareCard.tsx
  ReasonText.tsx        # why a button is off