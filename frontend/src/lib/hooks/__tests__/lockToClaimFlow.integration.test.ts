// @vitest-environment jsdom
//
// A mocked-SDK integration test for the full lock -> resolve -> claim path —
// the same cycle `scripts/live-cycle.mjs` exercises against a real testnet
// wallet, but running here in CI on every PR against a mocked exchange.ts so
// the flow's own wiring (useLock <-> useClaim, backendLockId handoff,
// recents) isn't only ever proven once, manually, against a live chain.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { MarketWindow, WalletState, RecentWindow } from '../../types';
import { useLock } from '../useLock';
import { useClaim } from '../useClaim';

const mockMarketService = vi.hoisted(() => {
  let recents: RecentWindow[] = [];
  return {
    loadActiveLock: vi.fn(() => null),
    saveActiveLock: vi.fn(),
    createLock: vi.fn(
      (
        market: { id: string; pair: string; length: string; endTime: number; startPrice: number },
        side: string,
        amount: number,
        order: { filled: number; price: number; txHash: string },
        customId?: string
      ) => ({
        id: customId || 'lock-fallback-id',
        marketId: market.id,
        pair: market.pair,
        length: market.length,
        side,
        amount,
        payout: order.filled,
        price: order.price,
        lockedAt: Date.now(),
        hidePriceUntil: market.endTime,
        status: 'locked',
        startPrice: market.startPrice,
        txHash: order.txHash || undefined,
      })
    ),
    getMarketWindow: vi.fn(),
    loadPendingLockIntent: vi.fn(() => null),
    clearPendingLockIntent: vi.fn(),
    getRecentWindows: vi.fn(() => recents),
    addRecentWindow: vi.fn((item: RecentWindow) => {
      recents = [item, ...recents];
    }),
    getSessionBudget: vi.fn((): number | null => null),
    saveSessionBudget: vi.fn(),
    getSessionLockedTotal: vi.fn(() => 0),
    addToSessionLockedTotal: vi.fn((amount: number) => amount),
    resetSessionLockedTotal: vi.fn(),
    __resetRecents: () => {
      recents = [];
    },
  };
});

const mockHistory = vi.hoisted(() => ({
  reportLock: vi.fn(),
  reportClaim: vi.fn(() => Promise.resolve()),
}));

const mockExchange = vi.hoisted(() => ({
  findLiveMarket: vi.fn(),
  lockPosition: vi.fn(),
  lockWithIntent: vi.fn(),
  checkFilledAmount: vi.fn(),
  reconcileOutcome: vi.fn(),
  describeExchangeError: vi.fn(() => 'Something went wrong. Please try again.'),
  getResolution: vi.fn(),
  claimWinnings: vi.fn(),
  getRealStartPrice: vi.fn((): number | null => null),
}));

vi.mock('../../marketService', () => mockMarketService);
vi.mock('../../history', () => mockHistory);
vi.mock('../../exchange', () => mockExchange);

const WALLET: WalletState = {
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

// Composes useLock + useClaim exactly the way SomnixProvider does — the
// production wiring under test, not a reimplementation of it.
function useLockAndClaim(refreshBalance: (address: string) => void) {
  const { setActiveLock, ...lock } = useLock({
    wallet: WALLET,
    currentMarket: LIVE_MARKET,
    selectedPair: LIVE_MARKET.pair,
    selectedLength: LIVE_MARKET.length,
    selectedAmount: 10,
    remainingSeconds: 500,
    refreshBalance,
    setSelectedPair: vi.fn(),
    setSelectedLength: vi.fn(),
    setSelectedAmount: vi.fn(),
  });
  const claim = useClaim({ wallet: WALLET, refreshBalance, setActiveLock });
  return { ...lock, setActiveLock, ...claim };
}

describe('lock -> resolve -> claim (mocked SDK, full cycle)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMarketService.__resetRecents();
    mockMarketService.loadActiveLock.mockReturnValue(null);
  });

  it('locks a real order, attaches the backend id, then claims it once the market resolves as a win', async () => {
    mockExchange.findLiveMarket.mockResolvedValue({ id: LIVE_MARKET.id, info: { expiry: '0' } });
    mockExchange.lockWithIntent.mockImplementation(async (_intent, send) => send());
    mockExchange.lockPosition.mockResolvedValue({ hash: '0xlockhash', filled: 9.6, price: 0.52 });
    mockHistory.reportLock.mockResolvedValue('backend-lock-1');

    const refreshBalance = vi.fn();
    const { result } = renderHook(() => useLockAndClaim(refreshBalance));

    // 1) Lock a real position.
    let locked;
    await act(async () => {
      locked = await result.current.executeLock('green');
    });

    expect(locked).toMatchObject({ marketId: LIVE_MARKET.id, side: 'green', amount: 10, status: 'locked' });
    expect(result.current.activeLock).toMatchObject({ status: 'locked' });
    expect(refreshBalance).toHaveBeenCalledWith(WALLET.address);

    // The backend-id handoff happens in a fire-and-forget .then() — wait for
    // it to land on activeLock rather than assuming it's synchronous.
    await waitFor(() => expect(result.current.activeLock?.backendLockId).toBe('backend-lock-1'));

    // 2) The market resolves — the caller's side won.
    mockExchange.getResolution.mockResolvedValue({ resolved: true, voided: false, winningSide: 'green', endPrice: 66000 });
    mockExchange.claimWinnings.mockResolvedValue({ hash: '0xclaimhash' });

    // 3) Claim against the SAME lock object the lock step produced — this is
    // the real handoff a user's session performs (RevealPanel passes
    // `activeLock` from context straight into `claimPayout`).
    let claimResult;
    await act(async () => {
      claimResult = await result.current.claimPayout(result.current.activeLock!);
    });

    expect(claimResult).toEqual({ success: true, txHash: '0xclaimhash' });
    expect(result.current.activeLock).toMatchObject({ status: 'claimed', txHash: '0xclaimhash' });
    expect(refreshBalance).toHaveBeenCalledWith(WALLET.address);

    // The claim was reported against the SAME backend lock id the lock step
    // received — proves the id actually flows end-to-end, not just that each
    // half works in isolation.
    expect(mockHistory.reportClaim).toHaveBeenCalledWith(
      expect.objectContaining({ lockId: 'backend-lock-1', walletAddress: WALLET.address, txHash: '0xclaimhash' })
    );

    // Recents reflects the real resolved outcome, not a guess made at lock time.
    expect(result.current.recents).toEqual([
      expect.objectContaining({ id: LIVE_MARKET.id, resultSide: 'green', userResult: 'right', claimed: true }),
    ]);
  });

  it('never redeems when the market resolves against the locked side', async () => {
    mockExchange.findLiveMarket.mockResolvedValue({ id: LIVE_MARKET.id, info: { expiry: '0' } });
    mockExchange.lockWithIntent.mockImplementation(async (_intent, send) => send());
    mockExchange.lockPosition.mockResolvedValue({ hash: '0xlockhash', filled: 9.6, price: 0.52 });
    mockHistory.reportLock.mockResolvedValue('backend-lock-2');

    const refreshBalance = vi.fn();
    const { result } = renderHook(() => useLockAndClaim(refreshBalance));

    let locked;
    await act(async () => {
      locked = await result.current.executeLock('green');
    });
    expect(locked).toMatchObject({ side: 'green' });

    mockExchange.getResolution.mockResolvedValue({ resolved: true, voided: false, winningSide: 'red' });

    let claimResult;
    await act(async () => {
      claimResult = await result.current.claimPayout(result.current.activeLock!);
    });

    expect(claimResult).toEqual({ success: false, reason: 'This window resolved against your call — nothing to claim.' });
    expect(mockExchange.claimWinnings).not.toHaveBeenCalled();
    expect(result.current.activeLock).toMatchObject({ status: 'locked' }); // never promoted to claimed
    expect(mockHistory.reportClaim).not.toHaveBeenCalled();
  });
});
