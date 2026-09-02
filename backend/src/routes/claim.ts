import { Router } from "express";

const claims = new Map<string, any>();

export const claimRouter = Router();

claimRouter.get("/health", (_req, res) => {
  res.json({ ok: true, route: "claim" });
});

claimRouter.post("/", async (req, res) => {
  try {
    const { lockId, walletAddress, txHash } = req.body ?? {};

    if (!lockId) {
      return res.status(400).json({ error: "lockId is required" });
    }

    const existingClaim = claims.get(lockId);
    if (existingClaim) {
      return res.json({ ok: true, claim: existingClaim });
    }

    const claim = {
      id: `claim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      lockId,
      walletAddress: walletAddress ?? null,
      status: "claimed",
      payout: 0,
      txHash: txHash ?? `0x${Math.random().toString(16).slice(2, 66)}`,
      claimedAt: Date.now(),
    };

    claims.set(lockId, claim);
    return res.status(201).json({ ok: true, claim });
  } catch (error) {
    console.error("claim failed", error);
    return res.status(500).json({ error: "Failed to claim payout" });
  }
});

claimRouter.get("/:id", async (req, res) => {
  const claim = claims.get(req.params.id);

  if (!claim) {
    return res.status(404).json({ error: "Claim not found" });
  }

  return res.json({ ok: true, claim });
});
