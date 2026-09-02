import { Router } from "express";
import { buildTradeSnapshot } from "../services/tradeService.js";
import { isValidLength, isValidPair, isValidSide, parsePositiveNumber, parseProbability } from "../services/validators.js";
import { sqliteStore } from "../repositories/sqliteStore.js";

export const tradeRouter = Router();

tradeRouter.get("/health", (_req, res) => {
  res.json({ ok: true, data: { route: "trade" } });
});

tradeRouter.post("/", async (req, res) => {
  const { marketId, pair, length, side, amount, startPrice, currentPrice, greenOdds, redOdds, payout, isLive } = req.body ?? {};

  if (!marketId || typeof marketId !== "string") {
    return res.status(400).json({ ok: false, error: "marketId is required" });
  }

  if (!isValidPair(pair)) {
    return res.status(400).json({ ok: false, error: "pair must be BTC or ETH" });
  }

  if (!isValidLength(length)) {
    return res.status(400).json({ ok: false, error: "length is invalid" });
  }

  if (!isValidSide(side)) {
    return res.status(400).json({ ok: false, error: "side must be green or red" });
  }

  const normalizedAmount = parsePositiveNumber(amount);
  if (normalizedAmount === null) {
    return res.status(400).json({ ok: false, error: "amount must be a positive number" });
  }

  const normalizedStartPrice = parsePositiveNumber(startPrice);
  const normalizedCurrentPrice = parsePositiveNumber(currentPrice);
  const normalizedGreenOdds = parseProbability(greenOdds);
  const normalizedRedOdds = parseProbability(redOdds);
  const normalizedPayout = parsePositiveNumber(payout);
  if (
    normalizedStartPrice === null ||
    normalizedCurrentPrice === null ||
    normalizedGreenOdds === null ||
    normalizedRedOdds === null ||
    normalizedPayout === null ||
    typeof isLive !== "boolean"
  ) {
    return res.status(400).json({ ok: false, error: "Confirmed trade snapshot data is required" });
  }

  if (Math.abs(normalizedGreenOdds + normalizedRedOdds - 100) > 0.01) {
    return res.status(400).json({ ok: false, error: "greenOdds and redOdds must total 100" });
  }

  const trade = buildTradeSnapshot(
    marketId,
    pair,
    length,
    side,
    normalizedAmount,
    normalizedStartPrice,
    normalizedCurrentPrice,
    normalizedGreenOdds,
    normalizedRedOdds,
    normalizedPayout,
    isLive,
  );
  await sqliteStore.saveTrade(trade);

  return res.status(201).json({ ok: true, data: trade });
});

tradeRouter.get("/:marketId", async (req, res) => {
  const { marketId } = req.params;
  const { side = "green", length = "15m" } = req.query as Record<string, string>;
  if (!isValidLength(length) || !isValidSide(side)) {
    return res.status(400).json({ ok: false, error: "Invalid route query parameters" });
  }

  const tradeKey = `${marketId}:${side}:${length}`;
  const trade = await sqliteStore.getTrade(tradeKey);
  if (!trade) {
    return res.status(404).json({ ok: false, error: "Trade snapshot not found" });
  }
  return res.json({ ok: true, data: trade });
});
