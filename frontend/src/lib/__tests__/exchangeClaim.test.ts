import { describe, it, expect, vi, beforeEach } from 'vitest';

const calls: string[] = [];

vi.mock('@somnia-chain/markets-sdk', async () => {
  const actual = await vi.importActual<typeof import('@somnia-chain/markets-sdk')>('@somnia-chain/markets-sdk');

  class MockSomniaMarkets {
    markets = {};
    async loadMarkets() {
      calls.push('loadMarkets');
    }
    async redeem() {
      calls.push('redeem');
      return { hash: '0xredeemed' };
    }
    setSigner() {}
  }

  return { ...actual, SomniaMarkets: MockSomniaMarkets };
});

vi.mock('@somnia-chain/markets-sdk/chains', () => ({ somniaShannon: {} }));

import { claimWinnings } from '../exchange';

describe('claimWinnings — market cache must be loaded before redeem', () => {
  beforeEach(() => {
    calls.length = 0;
  });

  it('calls loadMarkets() before redeem(), so a fresh page load does not hit "unknown market ref"', async () => {
    await claimWinnings('0xmarket', 5);
    expect(calls).toEqual(['loadMarkets', 'redeem']);
  });
});
