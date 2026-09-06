// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import type { UserLock, WalletState } from '@/lib/types';

const mockUseSomnix = vi.hoisted(() => vi.fn());
const mockRouterPush = vi.hoisted(() => vi.fn());
const mockGetResolution = vi.hoisted(() => vi.fn());
const mockConfetti = vi.hoisted(() => vi.fn());

vi.mock('@/lib/useSomnix', () => ({ useSomnix: mockUseSomnix }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mockRouterPush }) }));
vi.mock('@/lib/exchange', () => ({ getResolution: mockGetResolution }));
vi.mock('canvas-confetti', () => ({ default: mockConfetti }));
vi.mock('@/components/ShareCard', () => ({ ShareCard: () => null }));
vi.mock('@/components/ui/liquid-metal-button', () => ({
  LiquidMetalButton: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));
vi.mock('../ClaimButton', () => ({ ClaimButton: () => <div data-testid="claim-button" /> }));

import { RevealPanel } from '../RevealPanel';

const WALLET: WalletState = {
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
};

const prepareSameAgain = vi.fn();
const clearLock = vi.fn();
const recordLoss = vi.fn();

function mockContext(activeLock: UserLock | null, recents: { id: string }[] = []) {
  mockUseSomnix.mockReturnValue({ activeLock, wallet: WALLET, recents, recordLoss, prepareSameAgain, clearLock });
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe('RevealPanel', () => {
  it('shows a fallback when there is no active window', () => {
    mockContext(null);
    render(<RevealPanel />);
    expect(screen.getByText('No active window to reveal.')).toBeTruthy();
  });

  it('shows a waiting state while the oracle has not settled on-chain yet', async () => {
    mockContext(LOCK);
    mockGetResolution.mockResolvedValue({ resolved: false, voided: false });
    render(<RevealPanel />);
    await waitFor(() => expect(screen.getByText('Waiting on DreamDEX')).toBeTruthy());
    expect(screen.queryByTestId('claim-button')).toBeNull();
  });

  it('announces a win, fires confetti, and offers the claim button', async () => {
    mockContext(LOCK); // LOCK.side === 'green'
    mockGetResolution.mockResolvedValue({ resolved: true, voided: false, winningSide: 'green', endPrice: 66000 });
    render(<RevealPanel />);
    await waitFor(() => expect(screen.getByText('You won')).toBeTruthy());
    expect(mockConfetti).toHaveBeenCalled();
    expect(screen.getByTestId('claim-button')).toBeTruthy();
  });

  it('announces a loss and does not offer the claim button', async () => {
    mockContext(LOCK); // LOCK.side === 'green'
    mockGetResolution.mockResolvedValue({ resolved: true, voided: false, winningSide: 'red', endPrice: 64000 });
    render(<RevealPanel />);
    await waitFor(() => expect(screen.getByText('You lost')).toBeTruthy());
    expect(mockConfetti).not.toHaveBeenCalled();
    expect(screen.queryByTestId('claim-button')).toBeNull();
  });

  it('announces a void market and still offers the claim (refund) button', async () => {
    mockContext(LOCK);
    mockGetResolution.mockResolvedValue({ resolved: true, voided: true });
    render(<RevealPanel />);
    await waitFor(() => expect(screen.getByText('Market voided')).toBeTruthy());
    expect(screen.getByTestId('claim-button')).toBeTruthy();
  });

  it('records a loss exactly once (a claim never happens for a loss, so this is the only place it gets tracked)', async () => {
    mockContext(LOCK); // LOCK.side === 'green', recents starts empty
    mockGetResolution.mockResolvedValue({ resolved: true, voided: false, winningSide: 'red' });
    render(<RevealPanel />);
    await waitFor(() => expect(screen.getByText('You lost')).toBeTruthy());
    await waitFor(() => expect(recordLoss).toHaveBeenCalledTimes(1));
    expect(recordLoss).toHaveBeenCalledWith(LOCK, 'red');
  });

  it('does not record a loss again once recents already has this window (idempotent across the 8s resolution poll)', async () => {
    mockContext(LOCK, [{ id: LOCK.marketId }]);
    mockGetResolution.mockResolvedValue({ resolved: true, voided: false, winningSide: 'red' });
    render(<RevealPanel />);
    await waitFor(() => expect(screen.getByText('You lost')).toBeTruthy());
    expect(recordLoss).not.toHaveBeenCalled();
  });

  it('never records a loss for a win or a void', async () => {
    mockContext(LOCK);
    mockGetResolution.mockResolvedValue({ resolved: true, voided: false, winningSide: 'green' });
    render(<RevealPanel />);
    await waitFor(() => expect(screen.getByText('You won')).toBeTruthy());
    expect(recordLoss).not.toHaveBeenCalled();

    cleanup();
    vi.clearAllMocks();
    mockContext(LOCK, []);
    mockGetResolution.mockResolvedValue({ resolved: true, voided: true });
    render(<RevealPanel />);
    await waitFor(() => expect(screen.getByText('Market voided')).toBeTruthy());
    expect(recordLoss).not.toHaveBeenCalled();
  });

  it('"Same Again" prepares the next lock and returns to the dashboard', async () => {
    mockContext(LOCK);
    mockGetResolution.mockResolvedValue({ resolved: true, voided: false, winningSide: 'red' });
    render(<RevealPanel />);
    await waitFor(() => expect(screen.getByText('You lost')).toBeTruthy());

    screen.getByText('Same Again').click();

    expect(prepareSameAgain).toHaveBeenCalledTimes(1);
    expect(clearLock).toHaveBeenCalledTimes(1);
    expect(mockRouterPush).toHaveBeenCalledWith('/');
  });
});
