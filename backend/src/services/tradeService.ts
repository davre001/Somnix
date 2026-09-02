import type { MarketLength, MarketPair, MarketSide, TradeSnapshot } from "../types/api.js";

export function buildTradeSnapshot(
  marketId: string,
  pair: MarketPair,
  length: MarketLength,
  side: MarketSide,
  amount: number,
): TradeSnapshot {
  const seed = [...marketId].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const greenOdds = 42 + (seed % 28);
  const redOdds = 100 - greenOdds;
  const startPrice = pair === "BTC" ? 64500 + (seed % 1500) : 3450 + (seed % 500);
  const currentPrice = startPrice + (side === "green" ? 12 : -12) + (amount % 8) * 0.5;

  return {
    marketId,
    pair,
    length,
    side,
    amount,
    startPrice: Number(startPrice.toFixed(2)),
    currentPrice: Number(currentPrice.toFixed(2)),
    greenOdds,
    redOdds,
    payout: Number((amount * 1.92).toFixed(2)),
    isLive: true,
  };
}
