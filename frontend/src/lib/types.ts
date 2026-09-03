export type WindowPair = 'BTC' | 'ETH';
export type WindowLength = '1m' | '3m' | '5m' | '15m' | '1h';
export type MarketSide = 'green' | 'red';

export interface MarketWindow {
  id: string;
  pair: WindowPair;
  length: WindowLength;
  startTime: number;
  endTime: number;
  startPrice: number;
  currentPrice: number;
  greenOdds: number; // e.g., 58
  redOdds: number;   // e.g., 42
  isLive: boolean;
  minAmount: number;
  maxAmount: number;
}

export interface UserLock {
  id: string;
  marketId: string;
  pair: WindowPair;
  length: WindowLength;
  side: MarketSide;
  amount: number;
  /** Outcome tokens actually acquired by the fill — redeemable 1:1 for collateral if `side` wins, 0 otherwise. */
  payout: number;
  /** Average price paid per outcome token (0-1 probability), from the real order fill. */
  price: number;
  lockedAt: number;
  hidePriceUntil: number; // timestamp in ms
  status: 'locked' | 'won' | 'lost' | 'claimed';
  startPrice: number;
  txHash?: string;
  /** The backend history mirror's own id for this lock, once reported — see history.ts. */
  backendLockId?: string;
}

export interface RecentWindow {
  id: string;
  pair: WindowPair;
  length: WindowLength;
  startTime: number;
  endTime: number;
  startPrice: number;
  endPrice?: number;
  resultSide: MarketSide;
  userPlayed: boolean;
  userSide?: MarketSide;
  userAmount?: number;
  /** Outcome tokens redeemed (real filled amount), when the user claimed. */
  userPayout?: number;
  userResult?: 'right' | 'wrong' | 'skipped' | 'void';
  claimed?: boolean;
  txHash?: string;
}

export interface WalletState {
  isConnected: boolean;
  isWatchMode: boolean;
  address: string | null;
  balance: number;
  /** Collateral token symbol (e.g. "USDso"), resolved on-chain once known. */
  currencySymbol: string;
}

export interface LockResultReason {
  disabled: boolean;
  reason?: string;
}

/**
 * Persisted BEFORE a lock order is sent to the wallet — so a tab close/crash
 * between the wallet confirming and the app recording the fill isn't a silently
 * lost position. See useSomnix#reconcilePendingLock.
 */
export interface PendingLockIntent {
  id: string;
  marketId: string;
  pair: WindowPair;
  length: WindowLength;
  side: MarketSide;
  amount: number;
  createdAt: number;
}
