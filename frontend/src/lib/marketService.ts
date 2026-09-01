import { MarketWindow, UserLock, RecentWindow, WindowPair, WindowLength, MarketSide } from './types';

const STORAGE_KEYS = {
  ACTIVE_LOCK: 'somnix_active_lock_v1',
  LOCK_HISTORY: 'somnix_lock_history_v1',
  RECENT_WINDOWS: 'somnix_recent_windows_v1',
  DAILY_BUDGET: 'somnix_daily_budget_v1',
  WATCH_MODE: 'somnix_watch_mode_v1',
};

// Base market prices
const BASE_PRICES: Record<WindowPair, number> = {
  BTC: 64820.50,
  ETH: 3485.20,
};

/**
 * Calculates current synchronized window bounds based on real clock time
 */
export function getCurrentWindowBounds(length: WindowLength): { startTime: number; endTime: number; remainingMs: number } {
  const now = Date.now();
  const windowDurationMs = length === '15m' ? 15 * 60 * 1000 : 60 * 60 * 1000;
  
  const startTime = Math.floor(now / windowDurationMs) * windowDurationMs;
  const endTime = startTime + windowDurationMs;
  const remainingMs = Math.max(0, endTime - now);

  return { startTime, endTime, remainingMs };
}

/**
 * Generates market window object for pair and length
 */
export function getMarketWindow(pair: WindowPair, length: WindowLength): MarketWindow {
  const { startTime, endTime } = getCurrentWindowBounds(length);
  const id = `${pair}-${length}-${startTime}`;
  
  // Deterministic seed based on window id for consistent realistic odds
  const seed = (startTime / 1000) % 100;
  const baseGreen = 45 + Math.floor((seed * 37) % 32); // between 45% and 77%
  const greenOdds = Math.min(82, Math.max(28, baseGreen));
  const redOdds = 100 - greenOdds;

  const basePrice = BASE_PRICES[pair];
  const priceVariation = ((seed % 10) - 5) * (pair === 'BTC' ? 35 : 3.5);
  const startPrice = Number((basePrice + priceVariation).toFixed(2));
  const currentPrice = Number((startPrice + ((Date.now() % 10000) / 1000 - 5) * (pair === 'BTC' ? 12 : 1.2)).toFixed(2));

  return {
    id,
    pair,
    length,
    startTime,
    endTime,
    startPrice,
    currentPrice,
    greenOdds,
    redOdds,
    isLive: true,
    minAmount: 1,
    maxAmount: 100,
  };
}

/**
 * Load active lock from localStorage
 */
export function loadActiveLock(): UserLock | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ACTIVE_LOCK);
    if (!raw) return null;
    const lock: UserLock = JSON.parse(raw);
    return lock;
  } catch (err) {
    console.error('Failed to load active lock:', err);
    return null;
  }
}

/**
 * Save active lock to localStorage
 */
export function saveActiveLock(lock: UserLock | null): void {
  if (typeof window === 'undefined') return;
  if (!lock) {
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_LOCK);
  } else {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_LOCK, JSON.stringify(lock));
  }
}

/**
 * Create a new lock on a market window
 */
export function createLock(
  market: MarketWindow,
  side: MarketSide,
  amount: number
): UserLock {
  const lock: UserLock = {
    id: `lock-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    marketId: market.id,
    pair: market.pair,
    length: market.length,
    side,
    amount,
    lockedAt: Date.now(),
    hidePriceUntil: market.endTime,
    status: 'locked',
    payout: Number((amount * 1.92).toFixed(2)), // Standard binary payout ~1.92x
    startPrice: market.startPrice,
  };

  saveActiveLock(lock);
  return lock;
}

/**
 * Resolves a locked window when it reaches 0:00
 */
export function resolveLock(lock: UserLock): { resultSide: MarketSide; userWon: boolean; endPrice: number } {
  // Deterministic result based on market ID hash so it remains consistent
  let hash = 0;
  for (let i = 0; i < lock.marketId.length; i++) {
    hash = (hash << 5) - hash + lock.marketId.charCodeAt(i);
    hash |= 0;
  }
  
  const isUp = Math.abs(hash) % 2 === 0;
  const resultSide: MarketSide = isUp ? 'green' : 'red';
  const userWon = lock.side === resultSide;
  
  const priceDelta = (isUp ? 1 : -1) * (lock.pair === 'BTC' ? 42.50 : 4.80);
  const endPrice = Number((lock.startPrice + priceDelta).toFixed(2));

  return { resultSide, userWon, endPrice };
}

/**
 * Initial sample recents data if none in storage
 */
export function getRecentWindows(): RecentWindow[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RECENT_WINDOWS);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }

  // Pre-seed realistic past windows
  const now = Date.now();
  const fifteenMin = 15 * 60 * 1000;
  const initialRecents: RecentWindow[] = [
    {
      id: `BTC-15m-${now - fifteenMin}`,
      pair: 'BTC',
      length: '15m',
      startTime: now - (fifteenMin * 2),
      endTime: now - fifteenMin,
      startPrice: 64790.00,
      endPrice: 64845.20,
      resultSide: 'green',
      userPlayed: true,
      userSide: 'green',
      userAmount: 10,
      userResult: 'right',
      claimed: true,
      txHash: '0x7f2a...91b4',
    },
    {
      id: `ETH-15m-${now - fifteenMin}`,
      pair: 'ETH',
      length: '15m',
      startTime: now - (fifteenMin * 2),
      endTime: now - fifteenMin,
      startPrice: 3492.10,
      endPrice: 3481.50,
      resultSide: 'red',
      userPlayed: false,
      userResult: 'skipped',
    },
    {
      id: `BTC-1h-${now - fifteenMin * 4}`,
      pair: 'BTC',
      length: '1h',
      startTime: now - (fifteenMin * 8),
      endTime: now - (fifteenMin * 4),
      startPrice: 64510.00,
      endPrice: 64780.00,
      resultSide: 'green',
      userPlayed: true,
      userSide: 'green',
      userAmount: 25,
      userResult: 'right',
      claimed: true,
      txHash: '0x3c11...884d',
    },
    {
      id: `BTC-15m-${now - fifteenMin * 3}`,
      pair: 'BTC',
      length: '15m',
      startTime: now - (fifteenMin * 4),
      endTime: now - (fifteenMin * 3),
      startPrice: 64850.00,
      endPrice: 64810.00,
      resultSide: 'red',
      userPlayed: true,
      userSide: 'green',
      userAmount: 5,
      userResult: 'wrong',
      claimed: false,
    },
    {
      id: `ETH-1h-${now - fifteenMin * 5}`,
      pair: 'ETH',
      length: '1h',
      startTime: now - (fifteenMin * 9),
      endTime: now - (fifteenMin * 5),
      startPrice: 3510.40,
      endPrice: 3495.00,
      resultSide: 'red',
      userPlayed: false,
      userResult: 'skipped',
    },
  ];

  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.RECENT_WINDOWS, JSON.stringify(initialRecents));
  }
  return initialRecents;
}

export function addRecentWindow(recent: RecentWindow): void {
  if (typeof window === 'undefined') return;
  const current = getRecentWindows();
  const updated = [recent, ...current.filter((r) => r.id !== recent.id)].slice(0, 15);
  localStorage.setItem(STORAGE_KEYS.RECENT_WINDOWS, JSON.stringify(updated));
}
