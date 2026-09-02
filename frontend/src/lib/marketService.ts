import { MarketWindow, UserLock, RecentWindow, WindowPair, WindowLength, MarketSide, PendingLockIntent } from './types';

const STORAGE_KEYS = {
  ACTIVE_LOCK: 'somnix_active_lock_v1',
  LOCK_HISTORY: 'somnix_lock_history_v1',
  RECENT_WINDOWS: 'somnix_recent_windows_v1',
  DAILY_BUDGET: 'somnix_daily_budget_v1',
  WATCH_MODE: 'somnix_watch_mode_v1',
  PENDING_LOCK: 'somnix_pending_lock_v1',
};

// Base fallback market prices
const BASE_PRICES: Record<WindowPair, number> = {
  BTC: 64820.50,
  ETH: 3485.20,
};

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

/**
 * Returns duration in milliseconds for a window length
 */
export function getWindowDurationMs(length: WindowLength): number {
  switch (length) {
    case '1m': return 1 * 60 * 1000;
    case '3m': return 3 * 60 * 1000;
    case '5m': return 5 * 60 * 1000;
    case '15m': return 15 * 60 * 1000;
    case '1h': return 60 * 60 * 1000;
    default: return 15 * 60 * 1000;
  }
}

/**
 * Calculates current synchronized window bounds based on real clock time
 */
export function getCurrentWindowBounds(length: WindowLength): { startTime: number; endTime: number; remainingMs: number } {
  const now = Date.now();
  const windowDurationMs = getWindowDurationMs(length);
  
  const startTime = Math.floor(now / windowDurationMs) * windowDurationMs;
  const endTime = startTime + windowDurationMs;
  const remainingMs = Math.max(0, endTime - now);

  return { startTime, endTime, remainingMs };
}

/**
 * Generates fallback/synchronous market window object for pair and length
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
    // Overwritten by fetchLiveMarkets — this synthetic window has no real market behind it yet.
    isLive: false,
    minAmount: 1,
    maxAmount: 100,
  };
}

/**
 * Checks the backend proxy for a real, currently-tradable DreamDEX market for this
 * exact pair + window length. Returns the synthetic window (isLive: false) when none
 * is live right now — this pair/length simply isn't tradable at this moment.
 */
export async function fetchLiveMarkets(pair: WindowPair, length: WindowLength): Promise<MarketWindow> {
  const fallback = getMarketWindow(pair, length);
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(`${BACKEND_URL}/api/markets`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data.markets && Array.isArray(data.markets) && data.markets.length > 0) {
        // Backend proxies DreamDEX `BinaryMarket` rows: asset is the underlying
        // symbol (e.g. "BTC"), interval is the series cadence label ("1m".."24h"),
        // id is the real marketId used by the orderbook route.
        const matched = data.markets.find(
          (m: { id?: string; asset?: string; interval?: string | null }) =>
            m.asset === pair && m.interval === length
        );
        if (matched?.id) {
          return {
            ...fallback,
            id: matched.id,
            isLive: true,
          };
        }
      }
    }
  } catch {
    // Graceful offline fallback
  }

  return fallback;
}

/**
 * Attempts to fetch live orderbook odds from backend proxy
 */
export async function fetchLiveOdds(marketId: string): Promise<{ greenOdds: number; redOdds: number } | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(`${BACKEND_URL}/api/markets/${encodeURIComponent(marketId)}/orderbook`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data.orderBook) {
        const yesBids = data.orderBook.yesBids || [];
        const noBids = data.orderBook.noBids || [];

        if (yesBids.length > 0 && noBids.length > 0) {
          const yesPrice = parseFloat(yesBids[0].price);
          const noPrice = parseFloat(noBids[0].price);
          const total = yesPrice + noPrice;
          if (total > 0) {
            const greenOdds = Math.round((yesPrice / total) * 100);
            return { greenOdds, redOdds: 100 - greenOdds };
          }
        }
      }
    }
  } catch {
    // Offline fallback
  }

  return null;
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
 * Persists intent to place a lock BEFORE the order is sent to the wallet — the
 * idempotency-key-before-broadcast rule. If the app never comes back (tab closed,
 * crash) between the wallet confirming and the order resolving, this is what lets
 * a reload recover a real fill the app would otherwise have no record of.
 */
export function savePendingLockIntent(intent: PendingLockIntent): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.PENDING_LOCK, JSON.stringify(intent));
}

export function loadPendingLockIntent(): PendingLockIntent | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PENDING_LOCK);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearPendingLockIntent(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEYS.PENDING_LOCK);
}

/**
 * Records a lock the user just placed via a real on-chain order (see exchange.ts#lockPosition).
 */
export function createLock(
  market: MarketWindow,
  side: MarketSide,
  amount: number,
  order: { filled: number; price: number; txHash: string },
  customId?: string
): UserLock {
  const lockId = customId || `lock-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const lock: UserLock = {
    id: lockId,
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
  };

  // Persist immediately before transaction broadcast
  saveActiveLock(lock);
  return lock;
}

/**
 * User's recent windows, most recent first. Empty until they claim or settle their first lock.
 */
export function getRecentWindows(): RecentWindow[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RECENT_WINDOWS);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  return [];
}

export function addRecentWindow(recent: RecentWindow): void {
  if (typeof window === 'undefined') return;
  const current = getRecentWindows();
  const updated = [recent, ...current.filter((r) => r.id !== recent.id)].slice(0, 15);
  localStorage.setItem(STORAGE_KEYS.RECENT_WINDOWS, JSON.stringify(updated));
}
