import { Router } from "express";
import { createClaimRecord } from "../services/claimService.js";
import { validateWalletAddress } from "../services/validators.js";
import { sqliteStore } from "../repositories/sqliteStore.js";

export const claimRouter = Router();

claimRouter.get("/health", (_req, res) => {
  res.json({ ok: true, data: { route: "claim" } });
});

claimRouter.post("/", async (req, res) => {
  const { lockId, walletAddress, txHash } = req.body ?? {};

  if (!lockId || typeof lockId !== "string") {
    return res.status(400).json({ ok: false, error: "lockId is required" });
  }

  const normalizedWallet = validateWalletAddress(walletAddress);
  const existingClaim = await sqliteStore.getClaim(lockId);

  if (existingClaim) {
    return res.json({ ok: true, data: existingClaim });
  }

  const lock = await sqliteStore.getLock(lockId);
  const payout = lock?.payout ?? 0;
  const claim = createClaimRecord(lockId, normalizedWallet, payout);

  if (typeof txHash === "string" && txHash.trim().length > 0) {
    claim.txHash = txHash.trim();
  }

  await sqliteStore.saveClaim(claim);
  return res.status(201).json({ ok: true, data: claim });
});

claimRouter.get("/:id", async (req, res) => {
  const claim = await sqliteStore.getClaim(req.params.id);

  if (!claim) {
    return res.status(404).json({ ok: false, error: "Claim not found" });
  }

  return res.json({ ok: true, data: claim });
});
