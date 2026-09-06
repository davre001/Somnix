// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import type { UserLock, WalletState } from '@/lib/types';

const mockUseSomnix = vi.hoisted(() => vi.fn());
const mockRouterPush = vi.hoisted(() => vi.fn());

vi.mock('@/lib/useSomnix', () => ({ useSomnix: mockUseSomnix }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mockRouterPush }) }));
vi.mock('@/components/ShareCard', () => ({ ShareCard: () => null }));

import { LockPanel } from '../LockPanel';

const WALLET: WalletState = {
  isConnected: true,
  isWatchMode: false,
  address: '0x1234567890123456789012345678901234567890',
  balance: 100,
  currencySymbol: 'tUSDC',
};

function withLock(overrides: Partial<UserLock> = {}) {
  const activeLock: UserLock = {
    id: 'lock-1',
    marketId: 'BTC-15m-1000',
    pair: 'BTC',
    length: '15m',
    side: 'green',
    amount: 10,
    payout: 9.6,
    price: 0.52,
    lockedAt: Date.now(),
    hidePriceUntil: Date.now() + 5 * 60 * 1000,
    status: 'locked',
    startPrice: 65000,
    ...overrides,
  };
  mockUseSomnix.mockReturnValue({ activeLock, wallet: WALLET });
  return activeLock;
}

beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(navigator, { clipboard: { writeText: vi.fn() } });
});

afterEach(() => {
  cleanup();
});

describe('LockPanel', () => {
  it('redirects home and renders nothing when there is no active lock', () => {
    mockUseSomnix.mockReturnValue({ activeLock: null, wallet: WALLET });
    const { container } = render(<LockPanel />);
    expect(mockRouterPush).toHaveBeenCalledWith('/');
    expect(container.innerHTML).toBe('');
  });

  it('redirects to /reveal when the window has already resolved locally', () => {
    withLock({ hidePriceUntil: Date.now() - 1000 });
    render(<LockPanel />);
    expect(mockRouterPush).toHaveBeenCalledWith('/reveal');
  });

  it('shows the locked side, pair, length, and amount', () => {
    withLock({ pair: 'ETH', length: '1h', side: 'red', amount: 25 });
    render(<LockPanel />);
    expect(screen.getByText(/ETH · 1h/)).toBeTruthy();
    expect(screen.getByText(/Locked RED · 25 tUSDC/)).toBeTruthy();
  });

  it('shows the maximum loss and potential payout, never a fabricated number', () => {
    withLock({ amount: 25, payout: 21.3, price: 0.6 });
    render(<LockPanel />);
    expect(screen.getByText(/Max Loss: 25 tUSDC/)).toBeTruthy();
    expect(screen.getByText(/\+21\.30 tUSDC/)).toBeTruthy();
  });

  it('copies the share link and shows a confirmation on click', async () => {
    withLock();
    render(<LockPanel />);
    const copyButton = screen.getByText('Copy Trade Link').closest('button')!;

    await act(async () => {
      copyButton.click();
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Trade Link Copied!')).toBeTruthy();
  });
});
