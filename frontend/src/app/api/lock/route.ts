import { createLockRecord } from '@/lib/server/lockService';
import { isValidLength, isValidPair, isValidSide, parsePositiveNumber, validateWalletAddress } from '@/lib/server/validators';
import { verifyOnChainTx } from '@/lib/server/chainVerify';
import { saveLock } from '@/lib/server/tursoStore';
import { apiOk, apiError, apiRoute, readJsonBody } from '@/lib/server/http';
import type { LockRequest } from '@/lib/apiTypes';

export const POST = apiRoute(async (req) => {
  const body = await readJsonBody<Partial<LockRequest>>(req);
  const { marketId, pair, length, side, amount, filledAmount, fillPrice, walletAddress, hidePriceUntil, txHash } = body;

  if (!marketId || typeof marketId !== 'string') {
    return apiError(400, 'marketId is required');
  }
  if (!isValidPair(pair)) {
    return apiError(400, 'pair must be BTC or ETH');
  }
  if (!isValidLength(length)) {
    return apiError(400, 'length is invalid');
  }
  if (!isValidSide(side)) {
    return apiError(400, 'side must be green or red');
  }

  const normalizedAmount = parsePositiveNumber(amount);
  if (normalizedAmount === null) {
    return apiError(400, 'amount must be a positive number');
  }

  const normalizedFilledAmount = parsePositiveNumber(filledAmount);
  if (normalizedFilledAmount === null) {
    return apiError(400, "filledAmount must be a positive number (the order's real fill)");
  }

  const normalizedFillPrice = parsePositiveNumber(fillPrice);
  if (normalizedFillPrice === null) {
    return apiError(400, "fillPrice must be a positive number (the order's real fill price)");
  }

  const normalizedExpiry = parsePositiveNumber(hidePriceUntil);
  if (normalizedExpiry === null) {
    return apiError(400, 'hidePriceUntil must be a positive timestamp');
  }

  if (typeof txHash !== 'string' || txHash.trim().length === 0) {
    return apiError(400, 'txHash is required');
  }

  const normalizedWallet = validateWalletAddress(walletAddress);
  const normalizedTxHash = txHash.trim();

  const verification = await verifyOnChainTx(normalizedTxHash, normalizedWallet);
  if (!verification.ok) {
    return apiError(422, `Could not verify txHash on-chain: ${verification.reason}`);
  }

  const lock = createLockRecord(
    marketId,
    pair,
    length,
    side,
    normalizedAmount,
    normalizedFilledAmount,
    normalizedFillPrice,
    normalizedWallet,
    normalizedExpiry,
    normalizedTxHash,
  );
  await saveLock(lock);

  return apiOk(lock, 201);
});
