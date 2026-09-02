import { Router } from "express";

export const tradeRouter = Router();

function parseAmount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return null;
}

function buildMarketSnapshot(marketId: string, pair: string, length: string, side?: string, amount?: number) {
  const seed = [...marketId].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const greenOdds = 42 + (seed % 28);
  const redOdds = 100 - greenOdds;
  const startPrice = pair === "BTC" ? 64500 + (seed % 1500) : 3450 + (seed % 500);
  const currentPrice = startPrice + (side === "green" ? 12 : -12) + (amount ? (amount % 8) * 0.5 : 0);

  return {
    marketId,
    pair,
    length,
    side: side ?? "green",
    amount: amount ?? 10,
    startPrice: Number(startPrice.toFixed(2)),
    currentPrice: Number(currentPrice.toFixed(2)),
    greenOdds,
    redOdds,
    payout: Number(((amount ?? 10) * 1.92).toFixed(2)),
    isLive: true,
  };
}

tradeRouter.get("/health", (_req, res) => {
  res.json({ ok: true, route: "trade" });
});

tradeRouter.post("/", async (req, res) => {
  try {
    const { marketId, pair, length, side, amount } = req.body ?? {};

    if (!marketId || !pair || !length || !side) {
      return res.status(400).json({ error: "marketId, pair, length, and side are required" });
    }

    if (!['BTC', 'ETH'].includes(pair)) {
      return res.status(400).json({ error: "pair must be BTC or ETH" });
    }

    if (!['1m', '3m', '5m', '15m', '1h'].includes(length)) {
      return res.status(400).json({ error: "length is invalid" });
    }

    if (!['green', 'red'].includes(side)) {
      return res.status(400).json({ error: "side must be green or red" });
    }

    const normalizedAmount = parseAmount(amount);
    if (normalizedAmount === null) {
      return res.status(400).json({ error: "amount must be a positive number" });
    }

    const trade = buildMarketSnapshot(marketId, pair, length, side, normalizedAmount);
    return res.status(201).json({ ok: true, trade });
  } catch (error) {
    console.error("trade create failed", error);
    return res.status(500).json({ error: "Failed to create trade" });
  }
});

tradeRouter.get("/:marketId", async (req, res) => {
  const { marketId } = req.params;
  const { pair = "BTC", length = "15m", side = "green", amount = 10 } = req.query as Record<string, string>;

  const trade = buildMarketSnapshot(
    marketId,
    ['BTC', 'ETH'].includes(pair) ? pair : "BTC",
    ['1m', '3m', '5m', '15m', '1h'].includes(length) ? length : "15m",
    ['green', 'red'].includes(side) ? side : "green",
    Number(amount) > 0 ? Number(amount) : 10,
  );

  return res.json({ ok: true, trade });
});
