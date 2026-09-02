export type MarketPair = "BTC" | "ETH";
export type MarketLength = "1m" | "3m" | "5m" | "15m" | "1h";
export type MarketSide = "green" | "red";

export interface ApiErrorResponse {
  ok: false;
  error: string;
  details?: Record<string, unknown>;
}

export interface ApiSuccessResponse<T> {
  ok: true;
  data: T;
}

export interface MarketTradeRequest {
  marketId: string;
  pair: MarketPair;
  length: MarketLength;
  side: MarketSide;
  amount: number;
  walletAddress?: string;
}

export interface LockRecord {
  id: string;
  marketId: string;
  pair: MarketPair;
  length: MarketLength;
  side: MarketSide;
  amount: number;
  walletAddress: string | null;
  lockedAt: number;
  hidePriceUntil: number;
  status: "locked" | "won" | "lost" | "claimed";
  payout: number;
  startPrice: number;
  endPrice?: number;
  txHash?: string;
}

export interface ClaimRecord {
  id: string;
  lockId: string;
  walletAddress: string | null;
  status: "claimed" | "pending" | "failed";
  payout: number;
  txHash: string;
  claimedAt: number;
}

export interface TradeSnapshot {
  marketId: string;
  pair: MarketPair;
  length: MarketLength;
  side: MarketSide;
  amount: number;
  startPrice: number;
  currentPrice: number;
  greenOdds: number;
  redOdds: number;
  payout: number;
  isLive: boolean;
}
