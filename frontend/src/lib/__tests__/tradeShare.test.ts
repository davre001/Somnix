import { describe, it, expect } from 'vitest';
import {
  generateTradeShareUrl,
  decodeTradeShareUrl,
  userLockToSharedTrade,
  SharedTradeData,
} from '../tradeShare';
import { UserLock } from '../types';

describe('Trade Sharing & Serialization', () => {
  it('should convert UserLock to SharedTradeData accurately', () => {
    const lock: UserLock = {
      id: 'lock-test-1',
      marketId: 'BTC-15m-1756756800000',
      pair: 'BTC',
      length: '15m',
      side: 'green',
      amount: 10,
      lockedAt: 1756756810000,
      hidePriceUntil: 1756757700000,
      status: 'locked',
      payout: 19.2,
      price: 0.52,
      startPrice: 65000,
    };

    const shared = userLockToSharedTrade(lock);
    expect(shared.id).toBe('lock-test-1');
    expect(shared.pair).toBe('BTC');
    expect(shared.side).toBe('green');
    expect(shared.amount).toBe(10);
    expect(shared.status).toBe('locked');
  });

  it('should decode serialized trade query parameters correctly', () => {
    const tradeData: SharedTradeData = {
      id: 'SX-ABC',
      pair: 'ETH',
      length: '1h',
      side: 'red',
      amount: 25,
      startPrice: 3500,
      lockedAt: 1756750000000,
      status: 'locked',
    };

    const payload = {
      id: tradeData.id,
      p: tradeData.pair,
      l: tradeData.length,
      s: tradeData.side,
      a: tradeData.amount,
      sp: tradeData.startPrice,
      la: tradeData.lockedAt,
      st: tradeData.status,
    };

    const encoded = Buffer.from(encodeURIComponent(JSON.stringify(payload))).toString('base64');
    const searchParams = new URLSearchParams(`data=${encoded}`);
    const decoded = decodeTradeShareUrl(searchParams);

    expect(decoded).not.toBeNull();
    expect(decoded?.pair).toBe('ETH');
    expect(decoded?.length).toBe('1h');
    expect(decoded?.side).toBe('red');
    expect(decoded?.amount).toBe(25);
    expect(decoded?.startPrice).toBe(3500);
  });

  it('should generate valid share URL string with fallback', () => {
    const tradeData: SharedTradeData = {
      id: 'SX-XYZ',
      pair: 'BTC',
      length: '15m',
      side: 'green',
      amount: 10,
      startPrice: 65000,
      lockedAt: 1756750000000,
      status: 'locked',
    };
    const url = generateTradeShareUrl(tradeData);
    expect(typeof url).toBe('string');
  });
});
