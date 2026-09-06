// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { WalletState, UserLock } from '../../types';

const mockMarketService = vi.hoisted(() => ({
  getRecentWindows: vi.fn(() => []),
  addRecentWindow: vi.fn(),
  saveActiveLock: vi.fn(),
}));

const mockHistory = vi.hoisted(() => ({
  reportClaim: vi.fn(() => Promise.resolve()),
}));

const mockExchange = vi.hoisted(() => ({
  describeExchangeError: vi.fn(() => 'Something went wrong. Please try again.'),
  getResolution: vi.fn(),
  claimWinnings: vi.fn(),
}));

vi.mock('../../marketService', () => mockMarketService);
vi.mock('../../history', () => mockHistory);
vi.mock('../../exchange', () => mockExchange);

import { useClaim } from '../useClaim';

const CONNECTED_WALLET: WalletState = {
  isConnected: true,
  isWatchMode: false,
  address: '0x1234567890123456789012345678901234567890',
  balance: 100,
  currencySymbol: 'tUSDC',
};

const LOCK: UserLock = {
  id: 'lock-1',
  marketId: 'BTC-15m-1000',
  pair: 'BTC',
  length: '15m',
  side: 'green',
  amount: 10,
  payout: 9.6,
  price: 0.52,
  lockedAt: Date.now(),
  hidePriceUntil: Date.now(),
  status: 'locked',
  startPrice: 65000,
  backendLockId: 'backend-lock-1',
};

function setup(walletOverrides: Partial<WalletState> = {}) {
  const refreshBalance = vi.fn();
  const setActiveLock = vi.fn();
  const { result } = renderHook(() =>
    useClaim({ wallet: { ...CONNECTED_WALLET, ...walletOverrides }, refreshBalance, setActiveLock })
  );
  return { result, refreshBalance, setActiveLock };
}

describe('useClaim — claimPayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMarketService.getRecentWindows.mockReturnValue([]);
  });

  it('refuses to claim an unresolved market without ever calling redeem', async () => {
    mockExchange.getResolution.mockResolvedValue({ resolved: false, voided: false });
    const { result, setActiveLock } = setup();

    let outcome;
    await act(async () => {
      outcome = await result.current.claimPayout(LOCK);
    });

    expect(outcome).toEqual({ success: false, reason: 'This window has not resolved on-chain yet — try again shortly.' });
    expect(mockExchange.claimWinnings).not.toHaveBeenCalled();
    expect(setActiveLock).not.toHaveBeenCalled();
  });

  it('refuses to claim a losing position without ever calling redeem', async () => {
    mockExchange.getResolution.mockResolvedValue({ resolved: true, voided: false, winningSide: 'red' });
    const { result } = setup();

    let outcome;
    await act(async () => {
      outcome = await result.current.claimPayout(LOCK); // LOCK.side === 'green'
    });

    expect(outcome).toEqual({ success: false, reason: 'This window resolved against your call — nothing to claim.' });
    expect(mockExchange.claimWinnings).not.toHaveBeenCalled();
  });

  it('redeems a winning position, updates the lock, records recents, and reports the claim', async () => {
    mockExchange.getResolution.mockResolvedValue({ resolved: true, voided: false, winningSide: 'green' });
    mockExchange.claimWinnings.mockResolvedValue({ hash: '0xclaimhash' });
    const { result, refreshBalance, setActiveLock } = setup();

    let outcome;
    await act(async () => {
      outcome = await result.current.claimPayout(LOCK);
    });

    expect(outcome).toEqual({ success: true, txHash: '0xclaimhash' });
    expect(setActiveLock).toHaveBeenCalledWith(expect.objectContaining({ status: 'claimed', txHash: '0xclaimhash' }));
    expect(mockMarketService.saveActiveLock).toHaveBeenCalledWith(expect.objectContaining({ status: 'claimed' }));
    expect(mockMarketService.addRecentWindow).toHaveBeenCalledWith(
      expect.objectContaining({ resultSide: 'green', userResult: 'right', claimed: true })
    );
    expect(refreshBalance).toHaveBeenCalledWith(CONNECTED_WALLET.address);
    expect(mockHistory.reportClaim).toHaveBeenCalledWith(
      expect.objectContaining({ lockId: 'backend-lock-1', walletAddress: CONNECTED_WALLET.address, txHash: '0xclaimhash' })
    );
  });

  it('redeems a voided market at par regardless of predicted side', async () => {
    mockExchange.getResolution.mockResolvedValue({ resolved: true, voided: true });
    mockExchange.claimWinnings.mockResolvedValue({ hash: '0xvoidhash' });
    const { result } = setup();

    let outcome;
    await act(async () => {
      outcome = await result.current.claimPayout(LOCK);
    });

    expect(outcome).toEqual({ success: true, txHash: '0xvoidhash' });
    expect(mockMarketService.addRecentWindow).toHaveBeenCalledWith(
      expect.objectContaining({ userResult: 'void', resultSide: LOCK.side })
    );
  });

  it('never reports history when the lock was never confirmed to the backend', async () => {
    mockExchange.getResolution.mockResolvedValue({ resolved: true, voided: false, winningSide: 'green' });
    mockExchange.claimWinnings.mockResolvedValue({ hash: '0xclaimhash' });
    const { result } = setup();

    await act(async () => {
      await result.current.claimPayout({ ...LOCK, backendLockId: undefined });
    });

    expect(mockHistory.reportClaim).not.toHaveBeenCalled();
  });

  it('never reports history when the wallet address is missing', async () => {
    mockExchange.getResolution.mockResolvedValue({ resolved: true, voided: false, winningSide: 'green' });
    mockExchange.claimWinnings.mockResolvedValue({ hash: '0xclaimhash' });
    const { result } = setup({ address: null });

    await act(async () => {
      await result.current.claimPayout(LOCK);
    });

    expect(mockHistory.reportClaim).not.toHaveBeenCalled();
  });

  it('turns a redeem failure into a friendly error instead of throwing', async () => {
    mockExchange.getResolution.mockResolvedValue({ resolved: true, voided: false, winningSide: 'green' });
    mockExchange.claimWinnings.mockRejectedValue(new Error('reverted'));
    mockExchange.describeExchangeError.mockReturnValue('The network rejected this transaction. Please try again.');
    const { result, setActiveLock } = setup();

    let outcome;
    await act(async () => {
      outcome = await result.current.claimPayout(LOCK);
    });

    expect(outcome).toEqual({ success: false, reason: 'The network rejected this transaction. Please try again.' });
    expect(setActiveLock).not.toHaveBeenCalled();
  });
});

describe('useClaim — recordLoss', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMarketService.getRecentWindows.mockReturnValue([]);
  });

  it('records a loss as a real recents entry, since a loss never goes through claimPayout', () => {
    const { result } = setup();

    act(() => {
      result.current.recordLoss(LOCK, 'red');
    });

    expect(mockMarketService.addRecentWindow).toHaveBeenCalledWith(
      expect.objectContaining({
        id: LOCK.marketId,
        resultSide: 'red',
        userPlayed: true,
        userSide: 'green',
        userAmount: LOCK.amount,
        userResult: 'wrong',
        claimed: false,
      })
    );
  });
});
