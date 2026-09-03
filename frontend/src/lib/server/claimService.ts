import 'server-only';
import type { ClaimRecord } from '../apiTypes';

export function createClaimRecord(
  lockId: string,
  walletAddress: string | null,
  filledAmount: number,
  txHash: string,
): ClaimRecord {
  return {
    id: `claim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    lockId,
    walletAddress,
    // The caller only reports a claim after claimWinnings() has already
    // confirmed it on-chain, so there's nothing left to await — it's claimed now.
    status: 'claimed',
    filledAmount,
    txHash,
    claimedAt: Date.now(),
  };
}
