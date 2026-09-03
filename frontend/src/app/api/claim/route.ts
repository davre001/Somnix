import { createClaimRecord } from '@/lib/server/claimService';
import { parsePositiveNumber, validateWalletAddress } from '@/lib/server/validators';
import { verifyOnChainTx } from '@/lib/server/chainVerify';
import { getClaim, getLock, saveClaim, saveLock } from '@/lib/server/tursoStore';
import { apiOk, apiError, apiRoute, readJsonBody } from '@/lib/server/http';
import type { ClaimRequest } from '@/lib/apiTypes';

export const POST = apiRoute(async (req) => {
  const body = await readJsonBody<Partial<ClaimRequest>>(req);
  const { lockId, walletAddress, filledAmount, txHash } = body;

  if (!lockId || typeof lockId !== 'string') {
    return apiError(400, 'lockId is required');
  }

  const normalizedFilledAmount = parsePositiveNumber(filledAmount);
  if (normalizedFilledAmount === null) {
    return apiError(400, 'filledAmount must be a positive number (the amount actually redeemed)');
  }

  if (typeof txHash !== 'string' || txHash.trim().length === 0) {
    return apiError(400, 'txHash is required');
  }

  const normalizedWallet = validateWalletAddress(walletAddress);
  const normalizedTxHash = txHash.trim();
  const existingClaim = await getClaim(lockId);

  if (existingClaim) {
    return apiOk(existingClaim);
  }

  const lock = await getLock(lockId);
  if (!lock) {
    return apiError(404, 'Lock not found');
  }

  const verification = await verifyOnChainTx(normalizedTxHash, normalizedWallet);
  if (!verification.ok) {
    return apiError(422, `Could not verify txHash on-chain: ${verification.reason}`);
  }

  const claim = createClaimRecord(lockId, normalizedWallet, normalizedFilledAmount, normalizedTxHash);
  await saveClaim(claim);
  await saveLock({ ...lock, status: 'claimed' });

  return apiOk(claim, 201);
});
