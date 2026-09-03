import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  getWindowDurationMs,
  getCurrentWindowBounds,
  getMarketWindow,
  createLock,
  fetchLiveMarkets,
  fetchLiveLengths,
} from '../marketService';
import { MarketWindow } from '../types';

describe('Market Service & Window Calculations', () => {
  it('should return correct durations in milliseconds', () => {
    expect(getWindowDurationMs('1m')).toBe(60 * 1000);
    expect(getWindowDurationMs('3m')).toBe(3 * 60 * 1000);
    expect(getWindowDurationMs('5m')).toBe(5 * 60 * 1000);
    expect(getWindowDurationMs('15m')).toBe(15 * 60 * 1000);
    expect(getWindowDurationMs('1h')).toBe(60 * 60 * 1000);
  });

  it('should calculate valid window bounds aligned with clock', () => {
    const bounds = getCurrentWindowBounds('15m');
    expect(bounds.startTime).toBeLessThanOrEqual(bounds.endTime);
    expect(bounds.endTime - bounds.startTime).toBe(15 * 60 * 1000);
    expect(bounds.remainingMs).toBeGreaterThanOrEqual(0);
    expect(bounds.remainingMs).toBeLessThanOrEqual(15 * 60 * 1000);
  });

  it('should generate synthetic (non-tradable) market windows for BTC and ETH', () => {
    const btcMarket = getMarketWindow('BTC', '15m');
    expect(btcMarket.pair).toBe('BTC');
    expect(btcMarket.length).toBe('15m');
    expect(btcMarket.startPrice).toBeGreaterThan(0);
    expect(btcMarket.greenOdds + btcMarket.redOdds).toBe(100);
    // Only fetchLiveMarkets, backed by a real DreamDEX market, may mark a window live.
    expect(btcMarket.isLive).toBe(false);

    const ethMarket = getMarketWindow('ETH', '1h');
    expect(ethMarket.pair).toBe('ETH');
    expect(ethMarket.length).toBe('1h');
    expect(ethMarket.startPrice).toBeGreaterThan(0);
    expect(ethMarket.greenOdds + ethMarket.redOdds).toBe(100);
  });

  it('should record a lock from a real order fill', () => {
    const market: MarketWindow = {
      id: '0xrealmarketid',
      pair: 'BTC',
      length: '15m',
      startTime: 1756756800000,
      endTime: 1756757700000,
      startPrice: 65000,
      currentPrice: 65010,
      greenOdds: 55,
      redOdds: 45,
      isLive: true,
      minAmount: 1,
      maxAmount: 100,
    };

    const lock = createLock(market, 'green', 10, { filled: 9.8, price: 0.51, txHash: '0xabc' }, 'test-lock-123');
    expect(lock.id).toBe('test-lock-123');
    expect(lock.marketId).toBe('0xrealmarketid');
    expect(lock.amount).toBe(10);
    expect(lock.side).toBe('green');
    expect(lock.status).toBe('locked');
    expect(lock.payout).toBe(9.8);
    expect(lock.price).toBe(0.51);
    expect(lock.txHash).toBe('0xabc');
  });
});

describe('fetchLiveMarkets backend matching', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('marks the window live and picks up the real marketId when asset + interval match', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        data: {
          markets: [
            { id: '0xrealmarketid', marketType: 'BINARY', asset: 'BTC', interval: '15m' },
            { id: '0xwrongwindow', marketType: 'BINARY', asset: 'BTC', interval: '1h' },
            { id: '0xotherid', marketType: 'BINARY', asset: 'ETH', interval: '15m' },
          ],
        },
      }),
    }));

    const market = await fetchLiveMarkets('BTC', '15m');
    expect(market.id).toBe('0xrealmarketid');
    expect(market.isLive).toBe(true);
  });

  it('falls back to a non-tradable synthetic window when no market matches both asset and interval', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        data: { markets: [{ id: '0xwrongwindow', asset: 'BTC', interval: '1h' }] },
      }),
    }));

    const market = await fetchLiveMarkets('BTC', '15m');
    const fallback = getMarketWindow('BTC', '15m');
    expect(market.id).toBe(fallback.id);
    expect(market.isLive).toBe(false);
  });
});

describe('fetchLiveLengths', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns only the lengths that have a real market for that pair (e.g. DreamDEX has no 3m cadence)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        data: {
          markets: [
            { id: '0x1', asset: 'BTC', interval: '1m' },
            { id: '0x2', asset: 'BTC', interval: '5m' },
            { id: '0x3', asset: 'BTC', interval: '15m' },
            { id: '0x4', asset: 'BTC', interval: '1h' },
            { id: '0x5', asset: 'BTC', interval: '4h' }, // not one of the app's offered lengths
            { id: '0x6', asset: 'ETH', interval: '3m' }, // wrong asset — must not leak into BTC's set
          ],
        },
      }),
    }));

    const lengths = await fetchLiveLengths('BTC');
    expect(lengths).toEqual(['1m', '5m', '15m', '1h']);
  });

  it('reports nothing live when the fetch fails, rather than guessing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    const lengths = await fetchLiveLengths('BTC');
    expect(lengths).toEqual([]);
  });
});
