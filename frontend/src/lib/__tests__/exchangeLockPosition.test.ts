import { describe, it, expect, vi, beforeEach } from 'vitest';

// Regression coverage for the bug found 2026-09-05: the unified
// `exchange.createOrder(symbol, 'market', 'buy', amount, ...)` treats `amount`
// as a TOKEN QUANTITY, not collateral to spend — confirmed against a real
// testnet order (see scripts/verify-order-amount-semantics.mjs: amount=5
// spent $2.575, not $5). lockPosition now uses client.quoteBinaryStake +
// trader.placeOrder instead, so these tests pin down that the real collateral
// spent matches the requested dollar amount, not a token count.
//
// BigInt literals (`5n`) need ES2020 — this repo's tsconfig targets ES2017
// (see git history: "Fix build failure: BigInt literals need ES2020") — so
// every raw value below uses the `BigInt(...)` constructor instead.

let quoteBinaryStakeCalls: unknown[] = [];
let placeOrderCalls: unknown[] = [];
let quoteBinaryStakeReturn: unknown = null;
let placeOrderReturn: unknown = null;

vi.mock('@somnia-chain/markets-sdk', async () => {
  const actual = await vi.importActual<typeof import('@somnia-chain/markets-sdk')>('@somnia-chain/markets-sdk');

  class MockSomniaMarkets {
    client = {
      quoteBinaryStake: async (params: unknown) => {
        quoteBinaryStakeCalls.push(params);
        return quoteBinaryStakeReturn;
      },
    };
    trader = {
      placeOrder: async (params: unknown) => {
        placeOrderCalls.push(params);
        return placeOrderReturn;
      },
    };
    setSigner() {}
  }

  return { ...actual, SomniaMarkets: MockSomniaMarkets };
});

vi.mock('@somnia-chain/markets-sdk/chains', () => ({ somniaShannon: {} }));

import { lockPosition, ZeroFillError, isAmbiguousTxError, describeExchangeError } from '../exchange';
import type { UnifiedMarket } from '@somnia-chain/markets-sdk';

const BINARY_INFO = {
  marketType: 'BINARY' as const,
  id: '0xmarketid',
  poolAddress: '0xpooladdress',
  quoteDecimals: 6,
  baseDecimals: 6,
};

function unifiedMarket(overrides: Partial<typeof BINARY_INFO> = {}): UnifiedMarket {
  return { symbol: 'BTC-95000-31DEC26/USDC#YES', info: { ...BINARY_INFO, ...overrides } } as unknown as UnifiedMarket;
}

beforeEach(() => {
  quoteBinaryStakeCalls = [];
  placeOrderCalls = [];
  quoteBinaryStakeReturn = null;
  placeOrderReturn = null;
});

describe('lockPosition — stake-based sizing (not a naive token-quantity buy)', () => {
  it("quotes the stake in raw collateral units, scaled by the market's real quoteDecimals", async () => {
    quoteBinaryStakeReturn = {
      side: 'BUY_YES',
      yesPrice: BigInt(520_000),
      limitPrice: BigInt(520_000),
      quantity: BigInt(19_230_000),
      escrow: BigInt(10_000_000),
    };
    placeOrderReturn = {
      hash: '0xhash',
      fills: [{ quantityFilled: BigInt(19_230_000), fillPrice: BigInt(520_000) }],
    };

    await lockPosition(unifiedMarket(), 'green', 10);

    expect(quoteBinaryStakeCalls).toEqual([{ marketId: '0xmarketid', side: 'BUY_YES', stake: BigInt(10_000_000) }]);
  });

  it("places the order using the quote's pool/side/price/quantity as a market (IOC) order", async () => {
    quoteBinaryStakeReturn = {
      side: 'BUY_YES',
      yesPrice: BigInt(520_000),
      limitPrice: BigInt(520_000),
      quantity: BigInt(19_230_000),
      escrow: BigInt(10_000_000),
    };
    placeOrderReturn = { hash: '0xhash', fills: [{ quantityFilled: BigInt(19_230_000), fillPrice: BigInt(520_000) }] };

    await lockPosition(unifiedMarket(), 'green', 10);

    expect(placeOrderCalls).toEqual([
      { pool: '0xpooladdress', side: 'BUY_YES', price: BigInt(520_000), quantity: BigInt(19_230_000), orderType: 2 },
    ]);
  });

  it("reports the real filled quantity and average YES price from the decoded fills, in the traded side's own terms (green = YES terms)", async () => {
    quoteBinaryStakeReturn = {
      side: 'BUY_YES',
      yesPrice: BigInt(520_000),
      limitPrice: BigInt(520_000),
      quantity: BigInt(19_230_000),
      escrow: BigInt(10_000_000),
    };
    placeOrderReturn = { hash: '0xhash', fills: [{ quantityFilled: BigInt(19_230_000), fillPrice: BigInt(515_000) }] };

    const result = await lockPosition(unifiedMarket(), 'green', 10);

    expect(result.hash).toBe('0xhash');
    expect(result.filled).toBeCloseTo(19.23, 5);
    expect(result.price).toBeCloseTo(0.515, 5);
  });

  it('converts the YES-terms fill price to NO terms for a red (BUY_NO) lock', async () => {
    quoteBinaryStakeReturn = {
      side: 'BUY_NO',
      yesPrice: BigInt(480_000),
      limitPrice: BigInt(520_000),
      quantity: BigInt(20_000_000),
      escrow: BigInt(10_000_000),
    };
    placeOrderReturn = { hash: '0xhash', fills: [{ quantityFilled: BigInt(20_000_000), fillPrice: BigInt(480_000) }] };

    const result = await lockPosition(unifiedMarket(), 'red', 10);

    // fillPrice is always YES terms (0.48) -> NO terms is 1 - 0.48 = 0.52
    expect(result.price).toBeCloseTo(0.52, 5);
  });

  it('volume-weights the price across multiple fills at different levels', async () => {
    quoteBinaryStakeReturn = {
      side: 'BUY_YES',
      yesPrice: BigInt(530_000),
      limitPrice: BigInt(530_000),
      quantity: BigInt(20_000_000),
      escrow: BigInt(10_600_000),
    };
    placeOrderReturn = {
      hash: '0xhash',
      fills: [
        { quantityFilled: BigInt(10_000_000), fillPrice: BigInt(500_000) },
        { quantityFilled: BigInt(10_000_000), fillPrice: BigInt(520_000) },
      ],
    };

    const result = await lockPosition(unifiedMarket(), 'green', 10.6);

    expect(result.filled).toBeCloseTo(20, 5);
    expect(result.price).toBeCloseTo(0.51, 5); // (10*0.5 + 10*0.52) / 20
  });

  it('never spends more than the requested dollar amount, unlike the old token-quantity behavior', async () => {
    // Regression check for the actual bug: requesting $10 must size a STAKE,
    // never a literal "10 tokens" buy that could cost far more or less than $10.
    quoteBinaryStakeReturn = {
      side: 'BUY_YES',
      yesPrice: BigInt(520_000),
      limitPrice: BigInt(520_000),
      quantity: BigInt(19_230_000),
      escrow: BigInt(10_000_000),
    };
    placeOrderReturn = { hash: '0xhash', fills: [{ quantityFilled: BigInt(19_230_000), fillPrice: BigInt(520_000) }] };

    await lockPosition(unifiedMarket(), 'green', 10);

    const call = quoteBinaryStakeCalls[0] as { stake: bigint };
    expect(call.stake).toBe(BigInt(10_000_000)); // fromHuman(10, 6 decimals) — a stake, not a "buy 10 tokens" request
  });

  it('throws a friendly-message-compatible error when the book cannot fill the stake', async () => {
    quoteBinaryStakeReturn = null;

    await expect(lockPosition(unifiedMarket(), 'green', 10)).rejects.toThrow(/opposite side of the book is empty/);
    expect(placeOrderCalls).toEqual([]);
  });

  it('throws for a non-binary market rather than silently misinterpreting it', async () => {
    const spotMarket = { symbol: 'SOMI/USDC', info: { marketType: 'SPOT' } } as unknown as UnifiedMarket;
    await expect(lockPosition(spotMarket, 'green', 10)).rejects.toThrow('not a binary market');
  });

  it('throws ZeroFillError, not a silent { filled: 0 } success, when a confirmed IOC order crosses nothing', async () => {
    // Regression for a real gap found in review: the book can thin between
    // quoteBinaryStake and placeOrder, so placeOrder can confirm on-chain
    // with fills: []. Returning { filled: 0 } normally would make
    // lockWithIntent clear the pending intent as if it succeeded, and
    // useLock.ts would record an active lock for a position that doesn't
    // exist — paid gas, zero exposure, and the window gets locked out from
    // a retry. This must throw instead, so the intent is discarded as a
    // proven failure.
    quoteBinaryStakeReturn = {
      side: 'BUY_YES',
      yesPrice: BigInt(520_000),
      limitPrice: BigInt(520_000),
      quantity: BigInt(19_230_000),
      escrow: BigInt(10_000_000),
    };
    placeOrderReturn = { hash: '0xhash', fills: [] };

    await expect(lockPosition(unifiedMarket(), 'green', 10)).rejects.toThrow(ZeroFillError);
  });

  it('classifies ZeroFillError as non-ambiguous (safe to discard), with a friendly retry message', async () => {
    quoteBinaryStakeReturn = {
      side: 'BUY_YES',
      yesPrice: BigInt(520_000),
      limitPrice: BigInt(520_000),
      quantity: BigInt(19_230_000),
      escrow: BigInt(10_000_000),
    };
    placeOrderReturn = { hash: '0xhash', fills: [] };

    try {
      await lockPosition(unifiedMarket(), 'green', 10);
      throw new Error('expected lockPosition to throw');
    } catch (err) {
      expect(isAmbiguousTxError(err)).toBe(false);
      expect(describeExchangeError(err)).toMatch(/market moved/i);
    }
  });

  it("attaches the successful quote's sizing to a placeOrder failure, so a log can tell the two steps apart", async () => {
    quoteBinaryStakeReturn = {
      side: 'BUY_YES',
      yesPrice: BigInt(520_000),
      limitPrice: BigInt(520_000),
      quantity: BigInt(19_230_000),
      escrow: BigInt(10_000_000),
    };
    placeOrderReturn = Promise.reject(new Error('network hiccup'));

    await expect(lockPosition(unifiedMarket(), 'green', 10)).rejects.toThrow(/quantity=19230000/);
  });
});
