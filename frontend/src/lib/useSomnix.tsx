'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  WindowPair,
  WindowLength,
  MarketSide,
  MarketWindow,
  UserLock,
  RecentWindow,
  WalletState,
} from './types';
import {
  getMarketWindow,
  loadActiveLock,
  saveActiveLock,
  createLock,
  resolveLock,
  getRecentWindows,
  addRecentWindow,
  getCurrentWindowBounds,
} from './marketService';

interface SomnixContextType {
  wallet: WalletState;
  hasEnteredApp: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  toggleWatchMode: (val?: boolean) => void;
  enterAppInWatchMode: () => void;
  faucet: () => void;
  
  selectedPair: WindowPair;
  setSelectedPair: (p: WindowPair) => void;
  selectedLength: WindowLength;
  setSelectedLength: (l: WindowLength) => void;
  selectedAmount: number;
  setSelectedAmount: (a: number) => void;
  
  currentMarket: MarketWindow;
  activeLock: UserLock | null;
  recents: RecentWindow[];
  
  remainingSeconds: number;
  isExpensiveSide: { isExpensive: boolean; side?: MarketSide; pct?: number };
  lockValidation: { canLock: boolean; reason?: string };
  
  executeLock: (side: MarketSide) => Promise<UserLock | null>;
  claimPayout: (lock: UserLock) => Promise<{ success: boolean; txHash?: string }>;
  prepareSameAgain: () => void;
  clearLock: () => void;
}

const SomnixContext = createContext<SomnixContextType | null>(null);

const DEFAULT_WALLET: WalletState = {
  isConnected: false,
  isWatchMode: false,
  address: null,
  balance: 50.0,
  dailyBudgetTotal: 20.0,
  dailyBudgetSpent: 5.0,
};

export function SomnixProvider({ children }: { children: React.ReactNode }) {
  const [wallet, setWallet] = useState<WalletState>(DEFAULT_WALLET);
  const [isMounted, setIsMounted] = useState(false);
  const [selectedPair, setSelectedPair] = useState<WindowPair>('BTC');
  const [selectedLength, setSelectedLength] = useState<WindowLength>('15m');
  const [selectedAmount, setSelectedAmount] = useState<number>(10);
  const [activeLock, setActiveLock] = useState<UserLock | null>(null);
  const [recents, setRecents] = useState<RecentWindow[]>([]);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(900);
  const [tick, setTick] = useState<number>(0);

  // Initialize from storage on client mount
  useEffect(() => {
    setIsMounted(true);
    const savedLock = loadActiveLock();
    setActiveLock(savedLock);

    const savedRecents = getRecentWindows();
    setRecents(savedRecents);

    const savedConnected = localStorage.getItem('somnix_wallet_connected_v1');
    const savedAddress = localStorage.getItem('somnix_wallet_address_v1');
    const savedWatchMode = localStorage.getItem('somnix_watch_mode_v1');

    if (savedConnected === 'true') {
      setWallet({
        isConnected: true,
        isWatchMode: false,
        address: savedAddress || '0x8A92cE1f31F41029c7a52D1b7B5C35a64669f9Db',
        balance: 50.0,
        dailyBudgetTotal: 20.0,
        dailyBudgetSpent: 5.0,
      });
    } else if (savedWatchMode === 'true') {
      setWallet((w) => ({ ...w, isConnected: false, isWatchMode: true }));
    }

    const savedBudget = localStorage.getItem('somnix_daily_budget_v1');
    if (savedBudget) {
      try {
        const parsed = JSON.parse(savedBudget);
        setWallet((w) => ({
          ...w,
          dailyBudgetTotal: parsed.total ?? 20,
          dailyBudgetSpent: parsed.spent ?? 5,
        }));
      } catch {
        // ignore
      }
    }
  }, []);

  // Update timer & clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      const { remainingMs } = getCurrentWindowBounds(selectedLength);
      setRemainingSeconds(Math.floor(remainingMs / 1000));
      setTick((t) => t + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [selectedLength]);

  // Current market window
  const currentMarket = useMemo(() => {
    return getMarketWindow(selectedPair, selectedLength);
  }, [selectedPair, selectedLength, tick]);

  // Check if one side is >= 70%
  const isExpensiveSide = useMemo(() => {
    if (currentMarket.greenOdds >= 70) {
      return { isExpensive: true, side: 'green' as MarketSide, pct: currentMarket.greenOdds };
    }
    if (currentMarket.redOdds >= 70) {
      return { isExpensive: true, side: 'red' as MarketSide, pct: currentMarket.redOdds };
    }
    return { isExpensive: false };
  }, [currentMarket]);

  // Lock validation rules
  const lockValidation = useMemo(() => {
    if (!wallet.isConnected && !wallet.isWatchMode) {
      return { canLock: false, reason: 'Connect your wallet on Somnia Testnet' };
    }
    if (wallet.isWatchMode) {
      return { canLock: false, reason: 'In Watch Mode (Connect wallet to lock)' };
    }
    if (!currentMarket.isLive) {
      return { canLock: false, reason: 'This window is not live yet' };
    }
    if (remainingSeconds < 60) {
      return { canLock: false, reason: 'Less than 60s left in this window. Wait for next.' };
    }
    if (selectedAmount < currentMarket.minAmount) {
      return { canLock: false, reason: `Minimum amount is ${currentMarket.minAmount} STT` };
    }
    if (wallet.balance < selectedAmount) {
      return { canLock: false, reason: 'Not enough STT balance' };
    }
    const budgetRemaining = wallet.dailyBudgetTotal - wallet.dailyBudgetSpent;
    if (selectedAmount > budgetRemaining) {
      return { canLock: false, reason: `Exceeds today's budget (${budgetRemaining} STT left)` };
    }
    if (activeLock && activeLock.marketId === currentMarket.id) {
      return { canLock: false, reason: 'You already locked a guess for this window' };
    }

    return { canLock: true };
  }, [wallet, currentMarket, remainingSeconds, selectedAmount, activeLock]);

  const connectWallet = useCallback(async () => {
    let chosenAddress = '0x8A92cE1f31F41029c7a52D1b7B5C35a64669f9Db';

    // Injected wallet check
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts && accounts[0]) {
          chosenAddress = accounts[0];
        }
      } catch (e) {
        console.warn('Using demo Somnia Testnet wallet');
      }
    }

    setWallet({
      isConnected: true,
      isWatchMode: false,
      address: chosenAddress,
      balance: 50.0,
      dailyBudgetTotal: 20.0,
      dailyBudgetSpent: 5.0,
    });

    if (typeof window !== 'undefined') {
      localStorage.setItem('somnix_wallet_connected_v1', 'true');
      localStorage.setItem('somnix_wallet_address_v1', chosenAddress);
      localStorage.removeItem('somnix_watch_mode_v1');
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    setWallet((w) => ({
      ...w,
      isConnected: false,
      isWatchMode: false,
      address: null,
    }));
    if (typeof window !== 'undefined') {
      localStorage.removeItem('somnix_wallet_connected_v1');
      localStorage.removeItem('somnix_wallet_address_v1');
      localStorage.removeItem('somnix_watch_mode_v1');
    }
  }, []);

  const enterAppInWatchMode = useCallback(() => {
    setWallet({
      isConnected: false,
      isWatchMode: true,
      address: null,
      balance: 0,
      dailyBudgetTotal: 20,
      dailyBudgetSpent: 0,
    });
    if (typeof window !== 'undefined') {
      localStorage.setItem('somnix_watch_mode_v1', 'true');
      localStorage.removeItem('somnix_wallet_connected_v1');
    }
  }, []);

  const toggleWatchMode = useCallback((val?: boolean) => {
    setWallet((prev) => {
      const nextWatch = val !== undefined ? val : !prev.isWatchMode;
      if (nextWatch) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('somnix_watch_mode_v1', 'true');
          localStorage.removeItem('somnix_wallet_connected_v1');
        }
        return { ...prev, isWatchMode: true, isConnected: false, address: null };
      } else {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('somnix_watch_mode_v1');
          localStorage.setItem('somnix_wallet_connected_v1', 'true');
        }
        return { ...prev, isWatchMode: false, isConnected: true, address: '0x8A92cE1f31F41029c7a52D1b7B5C35a64669f9Db' };
      }
    });
  }, []);

  const faucet = useCallback(() => {
    setWallet((prev) => ({
      ...prev,
      balance: prev.balance + 25.0,
      dailyBudgetTotal: prev.dailyBudgetTotal + 20.0,
    }));
  }, []);

  const executeLock = useCallback(
    async (side: MarketSide): Promise<UserLock | null> => {
      if (!lockValidation.canLock) return null;

      const newLock = createLock(currentMarket, side, selectedAmount);
      setActiveLock(newLock);

      setWallet((w) => {
        const updated = {
          ...w,
          balance: Math.max(0, w.balance - selectedAmount),
          dailyBudgetSpent: w.dailyBudgetSpent + selectedAmount,
        };
        if (typeof window !== 'undefined') {
          localStorage.setItem(
            'somnix_daily_budget_v1',
            JSON.stringify({ total: updated.dailyBudgetTotal, spent: updated.dailyBudgetSpent })
          );
        }
        return updated;
      });

      return newLock;
    },
    [lockValidation, currentMarket, selectedAmount]
  );

  const claimPayout = useCallback(
    async (lock: UserLock): Promise<{ success: boolean; txHash?: string }> => {
      await new Promise((resolve) => setTimeout(resolve, 1400));
      const txHash = `0x${Math.random().toString(16).slice(2, 10)}...${Math.random().toString(16).slice(2, 6)}`;

      const payoutAmount = lock.payout || lock.amount * 1.92;
      setWallet((w) => ({
        ...w,
        balance: Number((w.balance + payoutAmount).toFixed(2)),
      }));

      const updatedLock: UserLock = {
        ...lock,
        status: 'claimed',
        txHash,
      };
      setActiveLock(updatedLock);
      saveActiveLock(updatedLock);

      const resolved = resolveLock(lock);
      addRecentWindow({
        id: lock.marketId,
        pair: lock.pair,
        length: lock.length,
        startTime: lock.lockedAt - 900000,
        endTime: lock.hidePriceUntil,
        startPrice: lock.startPrice,
        endPrice: resolved.endPrice,
        resultSide: resolved.resultSide,
        userPlayed: true,
        userSide: lock.side,
        userAmount: lock.amount,
        userResult: resolved.userWon ? 'right' : 'wrong',
        claimed: true,
        txHash,
      });
      setRecents(getRecentWindows());

      return { success: true, txHash };
    },
    []
  );

  const prepareSameAgain = useCallback(() => {
    if (activeLock) {
      setSelectedPair(activeLock.pair);
      setSelectedLength(activeLock.length);
      setSelectedAmount(activeLock.amount);
    }
  }, [activeLock]);

  const clearLock = useCallback(() => {
    setActiveLock(null);
    saveActiveLock(null);
  }, []);

  const hasEnteredApp = wallet.isConnected || wallet.isWatchMode;

  return (
    <SomnixContext.Provider
      value={{
        wallet,
        hasEnteredApp,
        connectWallet,
        disconnectWallet,
        toggleWatchMode,
        enterAppInWatchMode,
        faucet,
        selectedPair,
        setSelectedPair,
        selectedLength,
        setSelectedLength,
        selectedAmount,
        setSelectedAmount,
        currentMarket,
        activeLock,
        recents,
        remainingSeconds,
        isExpensiveSide,
        lockValidation,
        executeLock,
        claimPayout,
        prepareSameAgain,
        clearLock,
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
