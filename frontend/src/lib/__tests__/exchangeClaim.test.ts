import { describe, it, expect, vi, beforeEach } from 'vitest';

const redeemCalls: unknown[] = [];
let mockMarket: Record<string, unknown> | null = null;

vi.mock('@somnia-chain/markets-sdk', async () => {
  const actual = await vi.importActual<typeof import('@somnia-chain/markets-sdk')>('@somnia-chain/markets-sdk');

  class MockSomniaMarkets {
    client = {
      getMarket: async (_id: string) => mockMarket,
    };
    trader = {
      redeem: async (params: unknown) => {
        redeemCalls.push(params);
        return { hash: '0xredeemed' };
      },
    };
    setSigner() {}
  }

  return { ...actual, SomniaMarkets: MockSomniaMarkets };
});

vi.mock('@somnia-chain/markets-sdk/chains', () => ({ somniaShannon: {} }));

import { claimWinnings } from '../exchange';

describe('claimWinnings — bypasses the SDK registry (excludes finalized markets), reads by id and redeems raw', () => {
  beforeEach(() => {
    redeemCalls.length = 0;
    mockMarket = null;
  });

  it('redeems a won market using the market address + winning outcome from a direct getMarket read', async () => {
    mockMarket = {
      marketType: 'BINARY',
      marketId: '0xmarket',
      marketAddress: '0xpooladdr',
      winningOutcome: 0,
      voided: false,
      baseDecimals: 6,
    };

    const res = await claimWinnings('0xmarket', 5);

    expect(res.hash).toBe('0xredeemed');
    expect(redeemCalls).toEqual([
      {
        marketId: '0xmarket',
        market: '0xpooladdr',
        outcomeIdx: 0,
        amount: BigInt(5_000_000), // fromHuman(5, 6 decimals)
      },
    ]);
  });

  it('redeems a voided market with outcomeIdx omitted (module derives it from payoutNumerators)', async () => {
    mockMarket = {
      marketType: 'BINARY',
      marketId: '0xmarket',
      marketAddress: '0xpooladdr',
      winningOutcome: null,
      voided: true,
      baseDecimals: 6,
    };

    await claimWinnings('0xmarket', 5);

    expect(redeemCalls[0]).toMatchObject({ outcomeIdx: undefined });
  });

  it('refuses to claim a market that has not resolved yet', async () => {
    mockMarket = {
      marketType: 'BINARY',
      marketId: '0xmarket',
      marketAddress: '0xpooladdr',
      winningOutcome: null,
      voided: false,
      baseDecimals: 6,
    };

    await expect(claimWinnings('0xmarket', 5)).rejects.toThrow('has not resolved');
    expect(redeemCalls).toEqual([]);
  });

  it('refuses to claim an unknown market', async () => {
    mockMarket = null;

    await expect(claimWinnings('0xghost', 5)).rejects.toThrow('Unknown or non-binary market');
    expect(redeemCalls).toEqual([]);
  });
});
