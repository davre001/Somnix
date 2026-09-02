import { Router } from "express";
import { createLockRecord } from "../services/lockService.js";
import { parsePositiveNumber, isValidLength, isValidPair, isValidSide, validateWalletAddress } from "../services/validators.js";
import { memoryStore } from "../repositories/memoryStore.js";

export const lockRouter = Router();

lockRouter.get("/health", (_req, res) => {
  res.json({ ok: true, data: { route: "lock" } });
});

lockRouter.post("/", async (req, res) => {
  const { marketId, pair, length, side, amount, walletAddress } = req.body ?? {};

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

  const normalizedWallet = validateWalletAddress(walletAddress);
  const lock = createLockRecord(marketId, pair, length, side, normalizedAmount, normalizedWallet);
  memoryStore.getLocks().set(lock.id, lock);

  return res.status(201).json({ ok: true, data: lock });
});

lockRouter.get("/:id", async (req, res) => {
  const lock = memoryStore.getLocks().get(req.params.id);

  if (!lock) {
    return res.status(404).json({ ok: false, error: "Lock not found" });
  }

  return res.json({ ok: true, data: lock });
});
