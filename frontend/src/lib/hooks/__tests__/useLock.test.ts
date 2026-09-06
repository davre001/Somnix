// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { MarketWindow, WalletState, UserLock } from '../../types';

const mockMarketService = vi.hoisted(() => ({
  loadActiveLock: vi.fn((): UserLock | null => null),
  saveActiveLock: vi.fn(),
  createLock: vi.fn(),
  getMarketWindow: vi.fn(),
  loadPendingLockIntent: vi.fn(() => null),
  clearPendingLockIntent: vi.fn(),
  getSessionBudget: vi.fn((): number | null => null),
  saveSessionBudget: vi.fn(),
  getSessionLockedTotal: vi.fn(() => 0),
  addToSessionLockedTotal: vi.fn((amount: number) => amount),
  resetSessionLockedTotal: vi.fn(),
}));

const mockHistory = vi.hoisted(() => ({
  reportLock: vi.fn(() => Promise.resolve(null)),
}));

const mockExchange = vi.hoisted(() => ({
  findLiveMarket: vi.fn(),
  lockPosition: vi.fn(),
  lockWithIntent: vi.fn(),
  checkFilledAmount: vi.fn(),
  reconcileOutcome: vi.fn(),
  getRealStartPrice: vi.fn((): number | null => null),
}));

vi.mock('../../marketService', () => mockMarketService);
vi.mock('../../history', () => mockHistory);
vi.mock('../../exchange', () => mockExchange);

import { useLock } from '../useLock';

const CONNECTED_WALLET: WalletState = {
  isConnected: true,
  isWatchMode: false,
  address: '0x1234567890123456789012345678901234567890',
  balance: 100,
  currencySymbol: 'tUSDC',
};

const LIVE_MARKET: MarketWindow = {
  id: 'BTC-15m-1000',
  pair: 'BTC',
  length: '15m',
  startTime: 0,
  endTime: 900_000,
  startPrice: 65000,
  currentPrice: 65000,
  greenOdds: 55,
  redOdds: 45,
  isLive: true,
  minAmount: 1,
  maxAmount: 100,
};

function baseParams(overrides: Partial<Parameters<typeof useLock>[0]> = {}) {
  return {
    wallet: CONNECTED_WALLET,
    currentMarket: LIVE_MARKET,
    selectedPair: 'BTC' as const,
    selectedLength: '15m' as const,
    selectedAmount: 10,
    remainingSeconds: 500,
    refreshBalance: vi.fn(),
    setSelectedPair: vi.fn(),
    setSelectedLength: vi.fn(),
    setSelectedAmount: vi.fn(),
    ...overrides,
  };
}

describe('useLock — lockValidation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMarketService.loadActiveLock.mockReturnValue(null);
  });

  it('blocks locking when the wallet is neither connected nor in watch mode', () => {
    const { result } = renderHook(() =>
      useLock(baseParams({ wallet: { ...CONNECTED_WALLET, isConnected: false, address: null } }))
    );
    expect(result.current.lockValidation.canLock).toBe(false);
    expect(result.current.lockValidation.reason).toMatch(/Connect your wallet/);
  });

  it('blocks locking in watch mode', () => {
    const { result } = renderHook(() =>
      useLock(baseParams({ wallet: { ...CONNECTED_WALLET, isConnected: false, isWatchMode: true, address: null } }))
    );
    expect(result.current.lockValidation.canLock).toBe(false);
    expect(result.current.lockValidation.reason).toMatch(/Watch Mode/);
  });

  it('blocks locking when there is no live market', () => {
    const { result } = renderHook(() =>
      useLock(baseParams({ currentMarket: { ...LIVE_MARKET, isLive: false } }))
    );
    expect(result.current.lockValidation.canLock).toBe(false);
    expect(result.current.lockValidation.reason).toMatch(/No live DreamDEX market/);
  });

  it('blocks locking with insufficient balance', () => {
    const { result } = renderHook(() =>
      useLock(baseParams({ wallet: { ...CONNECTED_WALLET, balance: 1 }, selectedAmount: 10 }))
    );
    expect(result.current.lockValidation.canLock).toBe(false);
    expect(result.current.lockValidation.reason).toMatch(/Not enough/);
  });

  it('blocks a second lock on the same market', () => {
    const { result } = renderHook(() =>
      useLock(
        baseParams({
          currentMarket: LIVE_MARKET,
        })
      )
    );
    // Simulate an existing active lock for this same market by re-rendering
    // with the hook's own state already set — easiest via executeLock below,
    // but here we assert the pure validation path directly using a fresh hook
    // whose loadActiveLock seed returns a matching lock.
    mockMarketService.loadActiveLock.mockReturnValue({ marketId: LIVE_MARKET.id } as UserLock);
    const { result: result2 } = renderHook(() => useLock(baseParams()));
    expect(result2.current.lockValidation.canLock).toBe(false);
    expect(result2.current.lockValidation.reason).toMatch(/already locked/);
    void result; // unused first render, kept for clarity of the "no prior lock" contrast above
  });

  it('allows locking when every condition is satisfied', () => {
    const { result } = renderHook(() => useLock(baseParams()));
    expect(result.current.lockValidation).toEqual({ canLock: true });
  });
});

describe('useLock — lockChecks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMarketService.loadActiveLock.mockReturnValue(null);
  });

  it('reports every check as ok when everything is satisfied', () => {
    const { result } = renderHook(() => useLock(baseParams()));
    expect(result.current.lockChecks).toEqual([
      expect.objectContaining({ key: 'market', ok: true }),
      expect.objectContaining({ key: 'time', ok: true }),
      expect.objectContaining({ key: 'amount', ok: true }),
      expect.objectContaining({ key: 'balance', ok: true }),
      expect.objectContaining({ key: 'duplicate', ok: true }),
    ]);
  });

  it('flags only the market check when the market is not live, leaving the rest ok', () => {
    const { result } = renderHook(() => useLock(baseParams({ currentMarket: { ...LIVE_MARKET, isLive: false } })));
    const byKey = Object.fromEntries(result.current.lockChecks.map((c) => [c.key, c]));
    expect(byKey.market.ok).toBe(false);
    expect(byKey.time.ok).toBe(true);
    expect(byKey.amount.ok).toBe(true);
    expect(byKey.balance.ok).toBe(true);
    expect(byKey.duplicate.ok).toBe(true);
  });

  it('flags only the time check when too little time remains', () => {
    const { result } = renderHook(() => useLock(baseParams({ remainingSeconds: 5 })));
    const byKey = Object.fromEntries(result.current.lockChecks.map((c) => [c.key, c]));
    expect(byKey.time.ok).toBe(false);
    expect(byKey.time.detail).toMatch(/Under 60s left/);
    expect(byKey.market.ok).toBe(true);
  });

  it('flags only the amount check when below the market minimum', () => {
    const { result } = renderHook(() => useLock(baseParams({ selectedAmount: 0.5 })));
    const byKey = Object.fromEntries(result.current.lockChecks.map((c) => [c.key, c]));
    expect(byKey.amount.ok).toBe(false);
    expect(byKey.amount.detail).toMatch(/Minimum is/);
  });

  it('flags only the balance check when the wallet balance is too low', () => {
    const { result } = renderHook(() => useLock(baseParams({ wallet: { ...CONNECTED_WALLET, balance: 1 } })));
    const byKey = Object.fromEntries(result.current.lockChecks.map((c) => [c.key, c]));
    expect(byKey.balance.ok).toBe(false);
    expect(byKey.amount.ok).toBe(true); // amount itself is still >= minAmount
  });

  it('flags only the duplicate check when this window is already locked', () => {
    mockMarketService.loadActiveLock.mockReturnValue({ marketId: LIVE_MARKET.id } as UserLock);
    const { result } = renderHook(() => useLock(baseParams()));
    const byKey = Object.fromEntries(result.current.lockChecks.map((c) => [c.key, c]));
    expect(byKey.duplicate.ok).toBe(false);
    expect(byKey.duplicate.detail).toMatch(/Already locked/);
    expect(byKey.market.ok).toBe(true);
  });
});

describe('useLock — executeLock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMarketService.loadActiveLock.mockReturnValue(null);
  });

  it('does nothing and returns null when lockValidation forbids it', async () => {
    const { result } = renderHook(() =>
      useLock(baseParams({ currentMarket: { ...LIVE_MARKET, isLive: false } }))
    );

    let outcome: UserLock | null | undefined;
    await act(async () => {
      outcome = await result.current.executeLock('green');
    });

    expect(outcome).toBeNull();
    expect(mockExchange.findLiveMarket).not.toHaveBeenCalled();
  });

  it('places a real order via lockWithIntent and records the resulting lock', async () => {
    mockExchange.findLiveMarket.mockResolvedValue({ id: LIVE_MARKET.id, info: { expiry: '0' } });
    mockExchange.lockWithIntent.mockImplementation(async (_intent, send) => send());
    mockExchange.lockPosition.mockResolvedValue({ hash: '0xabc', filled: 9.6, price: 0.52 });
    const recordedLock: UserLock = {
      id: 'lock-1',
      marketId: LIVE_MARKET.id,
      pair: 'BTC',
      length: '15m',
      side: 'green',
      amount: 10,
      payout: 9.6,
      price: 0.52,
      lockedAt: Date.now(),
      hidePriceUntil: LIVE_MARKET.endTime,
      status: 'locked',
      startPrice: LIVE_MARKET.startPrice,
      txHash: '0xabc',
    };
    mockMarketService.createLock.mockReturnValue(recordedLock);
    const refreshBalance = vi.fn();

    const { result } = renderHook(() => useLock(baseParams({ refreshBalance })));

    let outcome: UserLock | null | undefined;
    await act(async () => {
      outcome = await result.current.executeLock('green');
    });

    expect(outcome).toEqual(recordedLock);
    expect(result.current.activeLock).toEqual(recordedLock);
    expect(mockExchange.lockWithIntent).toHaveBeenCalledTimes(1);
    expect(refreshBalance).toHaveBeenCalledWith(CONNECTED_WALLET.address);
    expect(mockHistory.reportLock).toHaveBeenCalledWith(
      expect.objectContaining({ marketId: LIVE_MARKET.id, side: 'green', walletAddress: CONNECTED_WALLET.address })
    );
  });

  it('propagates a real error from lockWithIntent instead of swallowing it', async () => {
    mockExchange.findLiveMarket.mockResolvedValue({ id: LIVE_MARKET.id, info: { expiry: '0' } });
    mockExchange.lockWithIntent.mockRejectedValue(new Error('slippage exceeded'));

    const { result } = renderHook(() => useLock(baseParams()));

    await expect(
      act(async () => {
        await result.current.executeLock('green');
      })
    ).rejects.toThrow('slippage exceeded');
  });

  it('records the market\'s real oracle start price when available, not the synthetic seed', async () => {
    mockExchange.findLiveMarket.mockResolvedValue({ id: LIVE_MARKET.id, info: { expiry: '0' } });
    mockExchange.lockWithIntent.mockImplementation(async (_intent, send) => send());
    mockExchange.lockPosition.mockResolvedValue({ hash: '0xabc', filled: 9.6, price: 0.52 });
    mockExchange.getRealStartPrice.mockReturnValue(79628.95);
    mockMarketService.createLock.mockImplementation((market) => ({ ...market, startPrice: market.startPrice }));

    const { result } = renderHook(() => useLock(baseParams({ currentMarket: { ...LIVE_MARKET, startPrice: 65000 } })));

    await act(async () => {
      await result.current.executeLock('green');
    });

    expect(mockMarketService.createLock).toHaveBeenCalledWith(
      expect.objectContaining({ startPrice: 79628.95 }),
      'green',
      10,
      expect.anything(),
      expect.anything()
    );
  });

  it('falls back to the synthetic seed price when the real oracle price is unavailable', async () => {
    mockExchange.findLiveMarket.mockResolvedValue({ id: LIVE_MARKET.id, info: { expiry: '0' } });
    mockExchange.lockWithIntent.mockImplementation(async (_intent, send) => send());
    mockExchange.lockPosition.mockResolvedValue({ hash: '0xabc', filled: 9.6, price: 0.52 });
    mockExchange.getRealStartPrice.mockReturnValue(null);
    mockMarketService.createLock.mockImplementation((market) => ({ ...market, startPrice: market.startPrice }));

    const { result } = renderHook(() => useLock(baseParams({ currentMarket: { ...LIVE_MARKET, startPrice: 65000 } })));

    await act(async () => {
      await result.current.executeLock('green');
    });

    expect(mockMarketService.createLock).toHaveBeenCalledWith(
      expect.objectContaining({ startPrice: 65000 }),
      'green',
      10,
      expect.anything(),
      expect.anything()
    );
  });
});

describe('useLock — prepareSameAgain / clearLock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('prepareSameAgain copies the active lock selection back into the market inputs', () => {
    const activeLock: UserLock = {
      id: 'lock-1',
      marketId: LIVE_MARKET.id,
      pair: 'ETH',
      length: '1h',
      side: 'red',
      amount: 25,
      payout: 20,
      price: 0.8,
      lockedAt: Date.now(),
      hidePriceUntil: Date.now() + 1000,
      status: 'claimed',
      startPrice: 3000,
    };
    mockMarketService.loadActiveLock.mockReturnValue(activeLock);
    const setSelectedPair = vi.fn();
    const setSelectedLength = vi.fn();
    const setSelectedAmount = vi.fn();

    const { result } = renderHook(() =>
      useLock(baseParams({ setSelectedPair, setSelectedLength, setSelectedAmount }))
    );

    act(() => {
      result.current.prepareSameAgain();
    });

    expect(setSelectedPair).toHaveBeenCalledWith('ETH');
    expect(setSelectedLength).toHaveBeenCalledWith('1h');
    expect(setSelectedAmount).toHaveBeenCalledWith(25);
  });

  it('clearLock resets the active lock and persists the clear', () => {
    mockMarketService.loadActiveLock.mockReturnValue(null);
    const { result } = renderHook(() => useLock(baseParams()));

    act(() => {
      result.current.clearLock();
    });

    expect(result.current.activeLock).toBeNull();
    expect(mockMarketService.saveActiveLock).toHaveBeenCalledWith(null);
  });
});

describe('useLock — session budget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMarketService.loadActiveLock.mockReturnValue(null);
    mockMarketService.getSessionBudget.mockReturnValue(null);
    mockMarketService.getSessionLockedTotal.mockReturnValue(0);
  });

  it('has no budget row in lockChecks and allows locking when no cap is set', () => {
    const { result } = renderHook(() => useLock(baseParams()));
    expect(result.current.lockChecks.find((c) => c.key === 'budget')).toBeUndefined();
    expect(result.current.lockValidation.canLock).toBe(true);
  });

  it('blocks locking once the amount would push the session total past the cap', () => {
    mockMarketService.getSessionBudget.mockReturnValue(15);
    mockMarketService.getSessionLockedTotal.mockReturnValue(10);
    const { result } = renderHook(() => useLock(baseParams({ selectedAmount: 10 })));

    expect(result.current.lockValidation.canLock).toBe(false);
    expect(result.current.lockValidation.reason).toMatch(/exceed your session budget/);

    const budgetCheck = result.current.lockChecks.find((c) => c.key === 'budget');
    expect(budgetCheck?.ok).toBe(false);
    expect(budgetCheck?.detail).toMatch(/Would exceed 15/);
  });

  it('allows locking exactly up to the cap, not just under it', () => {
    mockMarketService.getSessionBudget.mockReturnValue(20);
    mockMarketService.getSessionLockedTotal.mockReturnValue(10);
    const { result } = renderHook(() => useLock(baseParams({ selectedAmount: 10 })));
    expect(result.current.lockValidation.canLock).toBe(true);
  });

  it('records a successful lock against the running session total', async () => {
    mockExchange.findLiveMarket.mockResolvedValue({ id: LIVE_MARKET.id, info: { expiry: '0' } });
    mockExchange.lockWithIntent.mockImplementation(async (_intent, send) => send());
    mockExchange.lockPosition.mockResolvedValue({ hash: '0xabc', filled: 9.6, price: 0.52 });
    mockMarketService.createLock.mockReturnValue({
      id: 'lock-1',
      marketId: LIVE_MARKET.id,
      pair: 'BTC',
      length: '15m',
      side: 'green',
      amount: 10,
      payout: 9.6,
      price: 0.52,
      lockedAt: Date.now(),
      hidePriceUntil: LIVE_MARKET.endTime,
      status: 'locked',
      startPrice: LIVE_MARKET.startPrice,
      txHash: '0xabc',
    });
    mockMarketService.getSessionLockedTotal.mockReturnValue(0);
    mockMarketService.addToSessionLockedTotal.mockImplementation((amount: number) => amount);

    const { result } = renderHook(() => useLock(baseParams({ selectedAmount: 10 })));

    await act(async () => {
      await result.current.executeLock('green');
    });

    expect(mockMarketService.addToSessionLockedTotal).toHaveBeenCalledWith(10);
    expect(result.current.sessionLockedTotal).toBe(10);
  });

  it('setSessionBudget persists the cap and updates state', () => {
    mockMarketService.getSessionBudget.mockReturnValueOnce(null).mockReturnValue(75);
    const { result } = renderHook(() => useLock(baseParams()));

    act(() => {
      result.current.setSessionBudget(75);
    });

    expect(mockMarketService.saveSessionBudget).toHaveBeenCalledWith(75);
    expect(result.current.sessionBudget).toBe(75);
  });

  it('resetSessionTotal zeroes the total without touching the budget', () => {
    mockMarketService.getSessionBudget.mockReturnValue(50);
    mockMarketService.getSessionLockedTotal.mockReturnValue(30);
    const { result } = renderHook(() => useLock(baseParams()));

    act(() => {
      result.current.resetSessionTotal();
    });

    expect(mockMarketService.resetSessionLockedTotal).toHaveBeenCalledTimes(1);
    expect(result.current.sessionLockedTotal).toBe(0);
    expect(result.current.sessionBudget).toBe(50);
  });
});
