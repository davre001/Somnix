import { Router } from "express";
import { createClaimRecord } from "../services/claimService.js";
import { isValidClaimStatus, validateWalletAddress } from "../services/validators.js";
import { sqliteStore } from "../repositories/sqliteStore.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

export const claimRouter = Router();

claimRouter.get("/health", (_req, res) => {
  res.json({ ok: true, data: { route: "claim" } });
});

claimRouter.post("/", asyncHandler(async (req, res) => {
  const { lockId, walletAddress, txHash } = req.body ?? {};

  if (!lockId || typeof lockId !== "string") {
    return res.status(400).json({ ok: false, error: "lockId is required" });
  }

  if (typeof txHash !== "string" || txHash.trim().length === 0) {
    return res.status(400).json({ ok: false, error: "txHash is required" });
  }

  const normalizedWallet = validateWalletAddress(walletAddress);
  const existingClaim = await sqliteStore.getClaim(lockId);

  if (existingClaim) {
    return res.json({ ok: true, data: existingClaim });
  }

  const lock = await sqliteStore.getLock(lockId);
  if (!lock) {
    return res.status(404).json({ ok: false, error: "Lock not found" });
  }

  const claim = createClaimRecord(lockId, normalizedWallet, lock.payout, txHash.trim());
  await sqliteStore.saveClaim(claim);
  return res.status(201).json({ ok: true, data: claim });
}));

claimRouter.patch("/:lockId/status", asyncHandler(async (req, res) => {
  const { status } = req.body ?? {};
  if (!isValidClaimStatus(status)) {
    return res.status(400).json({ ok: false, error: "status must be pending, claimed, or failed" });
  }

  const existingClaim = await sqliteStore.getClaim(req.params.lockId);
  if (!existingClaim) {
    return res.status(404).json({ ok: false, error: "Claim not found" });
  }

  if (existingClaim.status !== "pending" && existingClaim.status !== status) {
    return res.status(409).json({ ok: false, error: "Claim has already been finalized" });
  }

  const claim = await sqliteStore.updateClaimStatus(req.params.lockId, status);
  return res.json({ ok: true, data: claim });
}));

claimRouter.get("/:id", asyncHandler(async (req, res) => {
  const claim = await sqliteStore.getClaim(req.params.id);

  if (!claim) {
    return res.status(404).json({ ok: false, error: "Claim not found" });
  }

  return res.json({ ok: true, data: claim });
}));
