'use client';

import { useState, useCallback, useMemo } from 'react';
import { WindowPair, WindowLength, MarketSide, MarketWindow, UserLock, WalletState, PendingLockIntent } from '../types';
import {
  getMarketWindow,
  loadActiveLock,
  saveActiveLock,
  createLock,
  loadPendingLockIntent,
  clearPendingLockIntent,
  getSessionBudget,
  saveSessionBudget,
  getSessionLockedTotal,
  addToSessionLockedTotal,
  resetSessionLockedTotal,
} from '../marketService';
import { reportLock } from '../history';
import { findLiveMarket, lockPosition, lockWithIntent, checkFilledAmount, reconcileOutcome, getRealStartPrice } from '../exchange';

export interface UseLockParams {
  wallet: WalletState;
  currentMarket: MarketWindow;
  selectedPair: WindowPair;
  selectedLength: WindowLength;
  selectedAmount: number;
  remainingSeconds: number;
  refreshBalance: (address: string) => void;
  setSelectedPair: (p: WindowPair) => void;
  setSelectedLength: (l: WindowLength) => void;
  setSelectedAmount: (a: number) => void;
}

export interface LockCheckItem {
  key: 'market' | 'time' | 'amount' | 'balance' | 'budget' | 'duplicate';
  label: string;
  ok: boolean;
  detail: string;
}

// Dynamic cutoff based on window length — the one threshold both
// `lockValidation` (the actual gate) and `lockChecks` (the display
// breakdown) must agree on, so it only ever lives in one place.
function minCutoffSecondsFor(length: WindowLength): number {
  return length === '1m' ? 10 : length === '3m' ? 20 : length === '5m' ? 30 : 60;
}

/**
 * Owns the active lock, lock validation, and the lock/reconciliation
 * lifecycle — the slice of the former `useSomnix` god hook that places a
 * real on-chain order and never loses track of it. Depends on wallet/market
 * state as inputs rather than owning them, so it can be tested with plain
 * objects instead of a live wallet or market feed.
 */
export function useLock(params: UseLockParams) {
  const {
    wallet,
    currentMarket,
    selectedPair,
    selectedLength,
    selectedAmount,
    remainingSeconds,
    refreshBalance,
    setSelectedPair,
    setSelectedLength,
    setSelectedAmount,
  } = params;

  const [activeLock, setActiveLock] = useState<UserLock | null>(() => loadActiveLock());

  // A user-set cap on total collateral locked this session (the app's own
  // UX guard, not a protocol limit) — "stop the refresh habit" extended past
  // a single window. `null` budget means no cap is enforced.
  const [sessionBudget, setSessionBudgetState] = useState<number | null>(() => getSessionBudget());
  const [sessionLockedTotal, setSessionLockedTotal] = useState<number>(() => getSessionLockedTotal());

  const setSessionBudget = useCallback((amount: number | null) => {
    saveSessionBudget(amount);
    setSessionBudgetState(getSessionBudget());
  }, []);

  const resetSessionTotal = useCallback(() => {
    resetSessionLockedTotal();
    setSessionLockedTotal(0);
  }, []);

  // Lock validation rules
  const lockValidation = useMemo(() => {
    if (!wallet.isConnected && !wallet.isWatchMode) {
      return { canLock: false, reason: 'Connect your wallet on Somnia Testnet' };
    }
    if (wallet.isWatchMode) {
      return { canLock: false, reason: 'In Watch Mode (Connect wallet to lock)' };
    }
    if (!currentMarket.isLive) {
      return { canLock: false, reason: 'No live DreamDEX market for this window right now — try another pair or length' };
    }

    const minCutoffSeconds = minCutoffSecondsFor(selectedLength);
    if (remainingSeconds < minCutoffSeconds) {
      return { canLock: false, reason: `Less than ${minCutoffSeconds}s left in this window. Wait for next.` };
    }
    if (selectedAmount < currentMarket.minAmount) {
      return { canLock: false, reason: `Minimum amount is ${currentMarket.minAmount} ${wallet.currencySymbol}` };
    }
    if (wallet.balance < selectedAmount) {
      return { canLock: false, reason: `Not enough ${wallet.currencySymbol || 'collateral'} balance` };
    }
    if (sessionBudget !== null && sessionLockedTotal + selectedAmount > sessionBudget) {
      return {
        canLock: false,
        reason: `This would exceed your session budget (${sessionLockedTotal}/${sessionBudget} ${wallet.currencySymbol} used)`,
      };
    }
    if (activeLock && activeLock.marketId === currentMarket.id) {
      return { canLock: false, reason: 'You already locked a guess for this window' };
    }

    return { canLock: true };
  }, [wallet, currentMarket, remainingSeconds, selectedAmount, activeLock, selectedLength, sessionBudget, sessionLockedTotal]);

  // Per-check breakdown for a structured pre-lock panel — every check is
  // always evaluated (never short-circuited like lockValidation above), so
  // the UI can show "market live, but too little time left" instead of only
  // ever surfacing the single first-blocking reason. Wallet connection /
  // watch mode isn't a row here: by the time this renders, the wallet is
  // already connected or in watch mode (see SideButtons.tsx), so it's never
  // the thing to show a status for in a per-window checklist.
  const lockChecks = useMemo((): LockCheckItem[] => {
    const minCutoffSeconds = minCutoffSecondsFor(selectedLength);
    const timeOk = remainingSeconds >= minCutoffSeconds;
    const amountOk = selectedAmount >= currentMarket.minAmount;
    const balanceOk = wallet.balance >= selectedAmount;
    const budgetOk = sessionBudget === null || sessionLockedTotal + selectedAmount <= sessionBudget;
    const alreadyLocked = Boolean(activeLock && activeLock.marketId === currentMarket.id);

    return [
      {
        key: 'market',
        label: 'Market',
        ok: currentMarket.isLive,
        detail: currentMarket.isLive ? 'Live on DreamDEX' : 'No live market for this window',
      },
      {
        key: 'time',
        label: 'Time left',
        ok: timeOk,
        detail: timeOk ? `${remainingSeconds}s left` : `Under ${minCutoffSeconds}s left — wait for next window`,
      },
      {
        key: 'amount',
        label: 'Amount',
        ok: amountOk,
        detail: amountOk ? `${selectedAmount} ${wallet.currencySymbol}` : `Minimum is ${currentMarket.minAmount} ${wallet.currencySymbol}`,
      },
      {
        key: 'balance',
        label: 'Balance',
        ok: balanceOk,
        detail: balanceOk ? 'Sufficient' : `Not enough ${wallet.currencySymbol || 'collateral'}`,
      },
      // Only shown once the user has actually set a session budget — no
      // point flashing an always-"ok" badge for a limit nobody opted into.
      ...(sessionBudget !== null
        ? [
            {
              key: 'budget' as const,
              label: 'Session budget',
              ok: budgetOk,
              detail: budgetOk
                ? `${sessionLockedTotal}/${sessionBudget} ${wallet.currencySymbol}`
                : `Would exceed ${sessionBudget} ${wallet.currencySymbol} cap`,
            },
          ]
        : []),
      {
        key: 'duplicate',
        label: 'This window',
        ok: !alreadyLocked,
        detail: alreadyLocked ? 'Already locked' : 'Not locked yet',
      },
    ];
  }, [currentMarket, remainingSeconds, selectedLength, selectedAmount, wallet, activeLock, sessionBudget, sessionLockedTotal]);

  // Recovers a lock whose result was never confirmed to the app (tab closed/crashed
  // between the wallet confirming and executeLock recording it — see PendingLockIntent).
  // Call this once a signer is actually bound; a real chain read is the only way to
  // know whether the order landed, so an inconclusive check leaves the intent in
  // place to retry next time rather than guessing either way.
  const reconcilePendingLock = useCallback(() => {
    const pending = loadPendingLockIntent();
    if (!pending) return;
    checkFilledAmount(pending.marketId, pending.side)
      .then((filled) => {
        const outcome = reconcileOutcome(pending, filled);
        if (outcome === 'recovered') {
          const base = getMarketWindow(pending.pair, pending.length);
          const recovered = createLock(
            { ...base, id: pending.marketId },
            pending.side,
            pending.amount,
            { filled, price: 0, txHash: '' },
            pending.id
          );
          setActiveLock(recovered);
          clearPendingLockIntent();
        } else if (outcome === 'discarded') {
          clearPendingLockIntent();
        }
        // 'pending': too recent to be conclusive — leave it, retry next signer bind.
      })
      .catch((err) => {
        console.warn('[Somnix] Could not reconcile a pending lock yet — will retry:', err);
      });
  }, []);

  const executeLock = useCallback(
    async (side: MarketSide): Promise<UserLock | null> => {
      if (!lockValidation.canLock) return null;

      const market = await findLiveMarket(selectedPair, selectedLength);
      if (!market) {
        throw new Error('No live DreamDEX market for this window right now — try another pair or length.');
      }

      // Persisted BEFORE the wallet prompt: if the tab closes between the wallet
      // confirming and the order resolving below, reconcilePendingLock recovers
      // the real fill from chain instead of the app silently losing track of it.
      // lockWithIntent owns the save/clear-on-provable-failure protocol; see
      // exchange.ts and __tests__/exchange.test.ts for the ordering guarantee.
      const idempotencyKey = `lock-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const intent: PendingLockIntent = {
        id: idempotencyKey,
        marketId: market.id,
        pair: selectedPair,
        length: selectedLength,
        side,
        amount: selectedAmount,
        createdAt: Date.now(),
      };

      let order;
      try {
        order = await lockWithIntent(intent, () => lockPosition(market, side, selectedAmount));
      } catch (err: unknown) {
        console.error('[Somnia Lock Error]', {
          timestamp: new Date().toISOString(),
          idempotencyKey,
          marketId: market.id,
          side,
          amount: selectedAmount,
          error: err instanceof Error ? err.message : String(err),
        });
        throw err;
      }

      // Use the freshly-fetched market's own id + real on-chain expiry — currentMarket's
      // id/endTime come from the app's synthetic clock-aligned window and can drift.
      // Same for startPrice: prefer the market's real, oracle-recorded strike
      // (see exchange.ts#getRealStartPrice) over currentMarket's synthetic
      // placeholder seed — only fall back to the seed if the real one is ever
      // unavailable, rather than leaving the field blank.
      const expiry = Number((market.info as { expiry?: string }).expiry);
      const realStartPrice = getRealStartPrice(market);
      const newLock = createLock(
        {
          ...currentMarket,
          id: market.id,
          endTime: Number.isFinite(expiry) && expiry > 0 ? expiry * 1000 : currentMarket.endTime,
          startPrice: realStartPrice ?? currentMarket.startPrice,
        },
        side,
        selectedAmount,
        { filled: order.filled, price: order.price, txHash: order.hash },
        idempotencyKey
      );
      setActiveLock(newLock);
      setSessionLockedTotal(addToSessionLockedTotal(newLock.amount));

      if (wallet.address) refreshBalance(wallet.address);

      // Best-effort history mirror — the lock already happened on-chain regardless
      // of whether this succeeds; never awaited into the user-facing flow. Once
      // the backend assigns its own id, attach it to the active lock so a later
      // claim can reference it. wallet.address is always set here — locking
      // requires a connected wallet (see lockValidation) — but the server now
      // requires a real address too, so skip the report rather than send a null.
      if (newLock.txHash && wallet.address) {
        reportLock({
          marketId: newLock.marketId,
          pair: newLock.pair,
          length: newLock.length,
          side: newLock.side,
          amount: newLock.amount,
          filledAmount: newLock.payout,
          fillPrice: newLock.price,
          walletAddress: wallet.address,
          hidePriceUntil: newLock.hidePriceUntil,
          txHash: newLock.txHash,
        }).then((backendLockId) => {
          if (!backendLockId) return;
          setActiveLock((current) => {
            if (!current || current.id !== newLock.id) return current;
            const withBackendId = { ...current, backendLockId };
            saveActiveLock(withBackendId);
            return withBackendId;
          });
        });
      }

      return newLock;
    },
    [lockValidation, currentMarket, selectedPair, selectedLength, selectedAmount, wallet.address, refreshBalance]
  );

  const prepareSameAgain = useCallback(() => {
    if (activeLock) {
      setSelectedPair(activeLock.pair);
      setSelectedLength(activeLock.length);
      setSelectedAmount(activeLock.amount);
    }
  }, [activeLock, setSelectedPair, setSelectedLength, setSelectedAmount]);

  const clearLock = useCallback(() => {
    setActiveLock(null);
    saveActiveLock(null);
  }, []);

  return {
    activeLock,
    setActiveLock,
    lockValidation,
    lockChecks,
    sessionBudget,
    setSessionBudget,
    sessionLockedTotal,
    resetSessionTotal,
    executeLock,
    prepareSameAgain,
    clearLock,
    reconcilePendingLock,
  };
}
