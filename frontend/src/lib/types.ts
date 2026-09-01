export type WindowPair = 'BTC' | 'ETH';
export type WindowLength = '15m' | '1h';
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
  lockedAt: number;
  hidePriceUntil: number; // timestamp in ms
  status: 'locked' | 'won' | 'lost' | 'claimed';
  payout: number;
  startPrice: number;
  endPrice?: number;
  txHash?: string;
}

export interface RecentWindow {
  id: string;
  pair: WindowPair;
  length: WindowLength;
  startTime: number;
  endTime: number;
  startPrice: number;
  endPrice: number;
  resultSide: MarketSide;
  userPlayed: boolean;
  userSide?: MarketSide;
  userAmount?: number;
  userResult?: 'right' | 'wrong' | 'skipped';
  claimed?: boolean;
  txHash?: string;
}

export interface WalletState {
  isConnected: boolean;
  isWatchMode: boolean;
  address: string | null;
  balance: number;
  dailyBudgetTotal: number;
  dailyBudgetSpent: number;
}

export interface LockResultReason {
  disabled: boolean;
  reason?: string;
}
