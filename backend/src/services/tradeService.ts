import type { MarketLength, MarketPair, MarketSide, TradeSnapshot } from "../types/api.js";

export function buildTradeSnapshot(
  marketId: string,
  pair: MarketPair,
  length: MarketLength,
  side: MarketSide,
  amount: number,
  startPrice: number,
  currentPrice: number,
  greenOdds: number,
  redOdds: number,
  payout: number,
  isLive: boolean,
): TradeSnapshot {
  return {
    marketId,
    pair,
    length,
    side,
    amount,
    startPrice: Number(startPrice.toFixed(2)),
    currentPrice: Number(currentPrice.toFixed(2)),
    greenOdds: Number(greenOdds.toFixed(2)),
    redOdds: Number(redOdds.toFixed(2)),
    payout: Number(payout.toFixed(2)),
    isLive,
  };
}
