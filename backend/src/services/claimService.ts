import type { ClaimRecord } from "../types/api.js";

export function createClaimRecord(lockId: string, walletAddress: string | null, payout: number): ClaimRecord {
  return {
    id: `claim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    lockId,
    walletAddress,
    status: "claimed",
    payout,
    txHash: `0x${Math.random().toString(16).slice(2, 66)}`,
    claimedAt: Date.now(),
  };
}
