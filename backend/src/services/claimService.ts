import type { ClaimRecord } from "../types/api.js";

export function createClaimRecord(
  lockId: string,
  walletAddress: string | null,
  payout: number,
  txHash: string,
): ClaimRecord {
  return {
    id: `claim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    lockId,
    walletAddress,
    status: "pending",
    payout,
    txHash,
    claimedAt: Date.now(),
  };
}
