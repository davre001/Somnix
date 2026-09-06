// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import type { RecentWindow, WalletState } from '@/lib/types';

const mockUseSomnix = vi.hoisted(() => vi.fn());

vi.mock('@/lib/useSomnix', () => ({ useSomnix: mockUseSomnix }));
vi.mock('@/components/ShareCard', () => ({ ShareCard: () => null }));

import { RecentsList } from '../RecentsList';

const WALLET: WalletState = {
  isConnected: true,
  isWatchMode: false,
  address: '0x1234567890123456789012345678901234567890',
  balance: 100,
  currencySymbol: 'tUSDC',
};

function withRecents(recents: RecentWindow[]) {
  mockUseSomnix.mockReturnValue({ recents, wallet: WALLET });
}

const PLAYED_ROUND: RecentWindow = {
  id: 'recent-1',
  pair: 'BTC',
  length: '15m',
  startTime: Date.now() - 20 * 60 * 1000,
  endTime: Date.now() - 5 * 60 * 1000,
  startPrice: 65000,
  endPrice: 65500,
  resultSide: 'green',
  userPlayed: true,
  userSide: 'green',
  userAmount: 10,
  userPayout: 18.87,
  userResult: 'right',
  claimed: true,
  txHash: '0xabc',
};

afterEach(() => {
  cleanup();
});

describe('RecentsList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('labels a played round\'s locked amount as self-reported, since the backend never re-checks the exact fill numbers', () => {
    withRecents([PLAYED_ROUND]);
    render(<RecentsList />);

    const label = screen.getByText('self-reported');
    expect(label).toBeTruthy();
    expect(label.title).toMatch(/never affects your real payout/i);
  });

  it('does not show a self-reported label for a skipped (watched) round — there is no self-reported number to caveat', () => {
    withRecents([{ ...PLAYED_ROUND, userPlayed: false, userSide: undefined, userAmount: undefined }]);
    render(<RecentsList />);

    expect(screen.queryByText('self-reported')).toBeNull();
    expect(screen.getByText('Skipped (Watched)')).toBeTruthy();
  });
});
