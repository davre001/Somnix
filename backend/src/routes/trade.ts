import { Router } from "express";
import { buildTradeSnapshot } from "../services/tradeService.js";
import { isValidLength, isValidPair, isValidSide, parsePositiveNumber } from "../services/validators.js";
import { memoryStore } from "../repositories/memoryStore.js";

export const tradeRouter = Router();

tradeRouter.get("/health", (_req, res) => {
  res.json({ ok: true, data: { route: "trade" } });
});

tradeRouter.post("/", async (req, res) => {
  const { marketId, pair, length, side, amount } = req.body ?? {};

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

  const trade = buildTradeSnapshot(marketId, pair, length, side, normalizedAmount);
  memoryStore.getTrades().set(`${marketId}:${side}:${length}`, trade);

  return res.status(201).json({ ok: true, data: trade });
});

tradeRouter.get("/:marketId", async (req, res) => {
  const { marketId } = req.params;
  const { pair = "BTC", length = "15m", side = "green", amount = 10 } = req.query as Record<string, string>;

  if (!isValidPair(pair) || !isValidLength(length) || !isValidSide(side)) {
    return res.status(400).json({ ok: false, error: "Invalid route query parameters" });
  }

  const normalizedAmount = parsePositiveNumber(amount);
  if (normalizedAmount === null) {
    return res.status(400).json({ ok: false, error: "amount must be a positive number" });
  }

  const trade = buildTradeSnapshot(marketId, pair, length, side, normalizedAmount);
  return res.json({ ok: true, data: trade });
});
