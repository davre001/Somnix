'use client';

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import {
  WindowPair,
  WindowLength,
  MarketSide,
  MarketWindow,
  UserLock,
  RecentWindow,
  WalletState,
} from './types';
import { useWallet } from './hooks/useWallet';
import { useMarket } from './hooks/useMarket';
import { useLock, type LockCheckItem } from './hooks/useLock';
import { useClaim, type ClaimResult } from './hooks/useClaim';
import { getLossStreak } from './marketService';

interface SomnixContextType {
  wallet: WalletState;
  hasEnteredApp: boolean;
  isViewingLanding: boolean;
  goToLanding: () => void;
  enterApp: () => void;

  isWalletModalOpen: boolean;
  openWalletModal: () => void;
  closeWalletModal: () => void;
  connectWallet: (walletType?: string) => Promise<boolean>;
  disconnectWallet: () => void;
  toggleWatchMode: (val?: boolean) => void;
  enterAppInWatchMode: () => void;
  faucet: () => Promise<{ success: boolean; reason?: string }>;
  isFauceting: boolean;

  selectedPair: WindowPair;
  setSelectedPair: (p: WindowPair) => void;
  selectedLength: WindowLength;
  setSelectedLength: (l: WindowLength) => void;
  selectedAmount: number;
  setSelectedAmount: (a: number) => void;
  liveLengths: WindowLength[] | null;

  currentMarket: MarketWindow;
  activeLock: UserLock | null;
  recents: RecentWindow[];
  /** Consecutive losses right now (see marketService.ts#getLossStreak) — powers the loss-streak cooldown prompt. */
  lossStreak: number;
  recordLoss: (lock: UserLock, resultSide: MarketSide) => void;

  remainingSeconds: number;
  isExpensiveSide: { isExpensive: boolean; side?: MarketSide; pct?: number };
  lockValidation: { canLock: boolean; reason?: string };
  lockChecks: LockCheckItem[];
  sessionBudget: number | null;
  setSessionBudget: (amount: number | null) => void;
  sessionLockedTotal: number;
  resetSessionTotal: () => void;

  executeLock: (side: MarketSide) => Promise<UserLock | null>;
  claimPayout: (lock: UserLock) => Promise<ClaimResult>;
  prepareSameAgain: () => void;
  clearLock: () => void;
}

const SomnixContext = createContext<SomnixContextType | null>(null);

/**
 * Composes the four focused hooks that replaced the former single 730-line
 * `useSomnix` hook — `useWallet` (provider/connection — including the
 * MetaMask/Rabby/Phantom provider-picking and network-add fallback added
 * upstream after this split; see useWallet.ts#pickProvider), `useMarket`
 * (window selection + live feed), `useLock` (lock lifecycle), `useClaim`
 * (claim lifecycle + recents) — behind the same public context shape, so no
 * consuming component needs to change. `reconcileRef`/`enterAppRef` exist
 * only to break the circular dependency between hooks that must be called in
 * a fixed order but need each other's callbacks (see each hook's own file).
 */
export function SomnixProvider({ children }: { children: React.ReactNode }) {
  // Every fresh page load starts on the marketing landing page. Entering the app
  // is always an explicit action — "Connect Wallet" / "Watch Mode" / "Launch app"
  // (which flip this to false). A wallet connection rehydrated from localStorage
  // must NOT silently skip the landing on a return visit, so this defaults to true
  // regardless of the persisted wallet state.
  const [isViewingLanding, setIsViewingLanding] = useState(true);

  const reconcileRef = useRef<() => void>(() => {});
  const enterAppRef = useRef<() => void>(() => {});
  useEffect(() => {
    enterAppRef.current = () => setIsViewingLanding(false);
  });

  const { wallet, refreshBalance, ...walletActions } = useWallet({
    onSignerBound: () => reconcileRef.current(),
    onEnterApp: () => enterAppRef.current(),
  });

  const market = useMarket();

  const { activeLock, setActiveLock, reconcilePendingLock, ...lockActions } = useLock({
    wallet,
    currentMarket: market.currentMarket,
    selectedPair: market.selectedPair,
    selectedLength: market.selectedLength,
    selectedAmount: market.selectedAmount,
    remainingSeconds: market.remainingSeconds,
    refreshBalance,
    setSelectedPair: market.setSelectedPair,
    setSelectedLength: market.setSelectedLength,
    setSelectedAmount: market.setSelectedAmount,
  });
  useEffect(() => {
    reconcileRef.current = reconcilePendingLock;
  });

  const { recents, claimPayout, recordLoss } = useClaim({ wallet, refreshBalance, setActiveLock });
  const lossStreak = getLossStreak(recents);

  const goToLanding = useCallback(() => {
    setIsViewingLanding(true);
  }, []);

  const enterApp = useCallback(() => {
    setIsViewingLanding(false);
  }, []);

  const hasEnteredApp = wallet.isConnected || wallet.isWatchMode;

  return (
    <SomnixContext.Provider
      value={{
        wallet,
        hasEnteredApp,
        isViewingLanding,
        goToLanding,
        enterApp,
        ...walletActions,
        selectedPair: market.selectedPair,
        setSelectedPair: market.setSelectedPair,
        selectedLength: market.selectedLength,
        setSelectedLength: market.setSelectedLength,
        selectedAmount: market.selectedAmount,
        setSelectedAmount: market.setSelectedAmount,
        liveLengths: market.liveLengths,
        currentMarket: market.currentMarket,
        remainingSeconds: market.remainingSeconds,
        isExpensiveSide: market.isExpensiveSide,
        activeLock,
        recents,
        lossStreak,
        recordLoss,
        claimPayout,
        ...lockActions,
      }}
    >
      {children}
    </SomnixContext.Provider>
  );
}

export function useSomnix() {
  const context = useContext(SomnixContext);
  if (!context) {
    throw new Error('useSomnix must be used within a SomnixProvider');
  }
  return context;
}
