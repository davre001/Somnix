import { Router } from "express";

const locks = new Map<string, any>();

export const lockRouter = Router();

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

lockRouter.get("/health", (_req, res) => {
  res.json({ ok: true, route: "lock" });
});

lockRouter.post("/", async (req, res) => {
  try {
    const { marketId, pair, length, side, amount, walletAddress } = req.body ?? {};

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

    const lockId = `lock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const lock = {
      id: lockId,
      marketId,
      pair,
      length,
      side,
      amount: Number(normalizedAmount.toFixed(2)),
      walletAddress: walletAddress ?? null,
      lockedAt: Date.now(),
      hidePriceUntil: Date.now() + 60_000,
      status: "locked",
      payout: Number((normalizedAmount * 1.92).toFixed(2)),
      startPrice: 0,
    };

    locks.set(lockId, lock);

    return res.status(201).json({ ok: true, lock });
  } catch (error) {
    console.error("lock create failed", error);
    return res.status(500).json({ error: "Failed to create lock" });
  }
});

lockRouter.get("/:id", async (req, res) => {
  const lock = locks.get(req.params.id);

  if (!lock) {
    return res.status(404).json({ error: "Lock not found" });
  }

  return res.json({ ok: true, lock });
});
