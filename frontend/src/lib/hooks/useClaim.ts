'use client';

import { useState, useCallback, type Dispatch, type SetStateAction } from 'react';
import { UserLock, RecentWindow, WalletState, MarketSide } from '../types';
import { getRecentWindows, addRecentWindow, saveActiveLock } from '../marketService';
import { reportClaim } from '../history';
import { describeExchangeError, getResolution, claimWinnings } from '../exchange';

export interface ClaimResult {
  success: boolean;
  txHash?: string;
  reason?: string;
}

export interface UseClaimParams {
  wallet: WalletState;
  refreshBalance: (address: string) => void;
  setActiveLock: Dispatch<SetStateAction<UserLock | null>>;
}

/**
 * Owns claim history (recents) and the claim lifecycle — the slice of the
 * former `useSomnix` god hook that redeems a winning position. Never redeems
 * without a fresh on-chain resolution read; see `exchange.ts#getResolution`.
 */
export function useClaim(params: UseClaimParams) {
  const { wallet, refreshBalance, setActiveLock } = params;
  const [recents, setRecents] = useState<RecentWindow[]>(() => getRecentWindows());

  const claimPayout = useCallback(
    async (lock: UserLock): Promise<ClaimResult> => {
      try {
        const resolution = await getResolution(lock.marketId);
        if (!resolution.resolved) {
          return { success: false, reason: 'This window has not resolved on-chain yet — try again shortly.' };
        }
        // A void market redeems every outcome token at par — proceed regardless of side.
        // Otherwise only the winning side's tokens are worth anything.
        if (!resolution.voided && resolution.winningSide !== lock.side) {
          return { success: false, reason: 'This window resolved against your call — nothing to claim.' };
        }

        const redeemed = await claimWinnings(lock.marketId, lock.payout);

        const updatedLock: UserLock = { ...lock, status: 'claimed', txHash: redeemed.hash };
        setActiveLock(updatedLock);
        saveActiveLock(updatedLock);

        addRecentWindow({
          id: lock.marketId,
          pair: lock.pair,
          length: lock.length,
          startTime: lock.lockedAt,
          endTime: lock.hidePriceUntil,
          startPrice: lock.startPrice,
          resultSide: resolution.voided ? lock.side : resolution.winningSide!,
          userPlayed: true,
          userSide: lock.side,
          userAmount: lock.amount,
          userPayout: lock.payout,
          userResult: resolution.voided ? 'void' : 'right',
          claimed: true,
          txHash: redeemed.hash,
        });
        setRecents(getRecentWindows());
        if (wallet.address) refreshBalance(wallet.address);

        // Best-effort history mirror — only meaningful if the lock itself was
        // successfully reported earlier (see useLock#executeLock); nothing to
        // attach a claim to on the backend otherwise. wallet.address is always
        // set by the time a real claim succeeds, but the server requires a
        // real address too, so skip the report rather than send a null.
        if (lock.backendLockId && wallet.address) {
          void reportClaim({
            lockId: lock.backendLockId,
            walletAddress: wallet.address,
            filledAmount: lock.payout,
            txHash: redeemed.hash,
          });
        }

        return { success: true, txHash: redeemed.hash };
      } catch (err: unknown) {
        console.error('[Somnia Claim Error]', {
          timestamp: new Date().toISOString(),
          lockId: lock.id,
          marketId: lock.marketId,
          error: err instanceof Error ? err.message : String(err),
        });
        return { success: false, reason: describeExchangeError(err) };
      }
    },
    [wallet.address, refreshBalance, setActiveLock]
  );

  // A loss never went through claimPayout above (there's nothing to redeem),
  // so it previously left zero trace in `recents` — the loss-streak cooldown
  // (see marketService.ts#getLossStreak) and RecentsList's win-rate stat both
  // need real loss entries to exist, not just wins/voids. Called once from
  // RevealPanel the moment a resolved, non-voided window turns out lost.
  const recordLoss = useCallback((lock: UserLock, resultSide: MarketSide) => {
    addRecentWindow({
      id: lock.marketId,
      pair: lock.pair,
      length: lock.length,
      startTime: lock.lockedAt,
      endTime: lock.hidePriceUntil,
      startPrice: lock.startPrice,
      resultSide,
      userPlayed: true,
      userSide: lock.side,
      userAmount: lock.amount,
      userResult: 'wrong',
      claimed: false,
    });
    setRecents(getRecentWindows());
  }, []);

  return { recents, claimPayout, recordLoss };
}
