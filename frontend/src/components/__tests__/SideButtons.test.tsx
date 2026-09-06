// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import type { WalletState } from '@/lib/types';

const mockUseSomnix = vi.hoisted(() => vi.fn());
const mockRouterPush = vi.hoisted(() => vi.fn());
const mockExecuteLock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/useSomnix', () => ({ useSomnix: mockUseSomnix }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mockRouterPush }) }));
vi.mock('@/lib/exchange', () => ({ describeExchangeError: () => 'Something went wrong. Please try again.' }));
vi.mock('@/components/ui/liquid-metal-button', () => ({
  LiquidMetalButton: ({
    children,
    onClick,
    disabled,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

import { SideButtons } from '../SideButtons';

const WALLET: WalletState = {
  isConnected: true,
  isWatchMode: false,
  address: '0x1234567890123456789012345678901234567890',
  balance: 100,
  currencySymbol: 'tUSDC',
};

function mockContext(lossStreak: number) {
  mockUseSomnix.mockReturnValue({
    lockValidation: { canLock: true },
    executeLock: mockExecuteLock,
    wallet: WALLET,
    openWalletModal: vi.fn(),
    lossStreak,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockExecuteLock.mockResolvedValue({ id: 'lock-1' });
});

afterEach(() => {
  cleanup();
});

describe('SideButtons — loss-streak cooldown', () => {
  it('locks immediately, no prompt, when the loss streak is under the threshold', async () => {
    mockContext(2);
    render(<SideButtons />);

    await act(async () => {
      screen.getByText('Green').closest('button')!.click();
    });

    expect(screen.queryByText(/losses in a row/)).toBeNull();
    expect(mockExecuteLock).toHaveBeenCalledWith('green');
  });

  it('shows a dismissible prompt instead of locking once the streak hits 3, and does not lock yet', async () => {
    mockContext(3);
    render(<SideButtons />);

    act(() => {
      screen.getByText('Red').closest('button')!.click();
    });

    expect(screen.getByText('3 losses in a row')).toBeTruthy();
    expect(mockExecuteLock).not.toHaveBeenCalled();
  });

  it('"Take a break" dismisses the prompt without locking', async () => {
    mockContext(3);
    render(<SideButtons />);

    act(() => {
      screen.getByText('Green').closest('button')!.click();
    });
    act(() => {
      screen.getByText('Take a break').click();
    });

    expect(screen.queryByText(/losses in a row/)).toBeNull();
    expect(mockExecuteLock).not.toHaveBeenCalled();
  });

  it('"Continue anyway" proceeds with the originally-clicked side, and does not re-prompt for the same streak', async () => {
    mockContext(3);
    render(<SideButtons />);

    act(() => {
      screen.getByText('Red').closest('button')!.click();
    });
    await act(async () => {
      screen.getByText('Continue anyway').click();
    });

    expect(mockExecuteLock).toHaveBeenCalledWith('red');
    expect(mockExecuteLock).toHaveBeenCalledTimes(1);

    // Same streak (3) again — already acknowledged, so it locks straight away this time.
    await act(async () => {
      screen.getByText('Green').closest('button')!.click();
    });
    expect(mockExecuteLock).toHaveBeenCalledWith('green');
    expect(mockExecuteLock).toHaveBeenCalledTimes(2);
  });

  it('re-prompts once the streak grows past what was already acknowledged', async () => {
    mockContext(3);
    const { rerender } = render(<SideButtons />);

    act(() => {
      screen.getByText('Red').closest('button')!.click();
    });
    await act(async () => {
      screen.getByText('Continue anyway').click();
    });
    expect(screen.queryByText(/losses in a row/)).toBeNull();

    // Another loss extends the streak to 4 — a fresh, not-yet-acknowledged streak.
    mockContext(4);
    rerender(<SideButtons />);

    act(() => {
      screen.getByText('Green').closest('button')!.click();
    });
    expect(screen.getByText('4 losses in a row')).toBeTruthy();
    expect(mockExecuteLock).toHaveBeenCalledTimes(1); // still just the earlier red lock — green hasn't fired yet
  });
});
