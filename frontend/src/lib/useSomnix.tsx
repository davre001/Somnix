'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { createWalletClient, custom, type WalletClient } from 'viem';
import {
  WindowPair,
  WindowLength,
  MarketSide,
  MarketWindow,
  UserLock,
  RecentWindow,
  WalletState,
  PendingLockIntent,
} from './types';
import {
  getMarketWindow,
  fetchLiveMarkets,
  fetchLiveLengths,
  fetchLiveOdds,
  loadActiveLock,
  saveActiveLock,
  createLock,
  getRecentWindows,
  addRecentWindow,
  getCurrentWindowBounds,
  loadPendingLockIntent,
  clearPendingLockIntent,
} from './marketService';
import { fetchCollateralBalance, fetchCollateralMeta, somniaTestnet, SOMNIA_CONFIG } from './somnia';
import { reportLock, reportClaim } from './history';
import {
  bindExchangeSigner,
  describeExchangeError,
  findLiveMarket,
  lockPosition,
  lockWithIntent,
  getResolution,
  claimWinnings,
  requestFaucet,
  checkFilledAmount,
  reconcileOutcome,
} from './exchange';

interface ClaimResult {
  success: boolean;
  txHash?: string;
  reason?: string;
}

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

  remainingSeconds: number;
  isExpensiveSide: { isExpensive: boolean; side?: MarketSide; pct?: number };
  lockValidation: { canLock: boolean; reason?: string };

  executeLock: (side: MarketSide) => Promise<UserLock | null>;
  claimPayout: (lock: UserLock) => Promise<ClaimResult>;
  prepareSameAgain: () => void;
  clearLock: () => void;
}

const SomnixContext = createContext<SomnixContextType | null>(null);

type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  isMetaMask?: boolean;
  isCoinbaseWallet?: boolean;
  isRainbow?: boolean;
  isTrust?: boolean;
  isPhantom?: boolean;
};

const DEFAULT_WALLET: WalletState = {
  isConnected: false,
  isWatchMode: false,
  address: null,
  balance: 0,
  currencySymbol: '',
};

function getInitialWalletState(): WalletState {
  if (typeof window === 'undefined') return DEFAULT_WALLET;
  try {
    const savedConnected = localStorage.getItem('somnix_wallet_connected_v1');
    const savedAddress = localStorage.getItem('somnix_wallet_address_v1');
    const savedWatchMode = localStorage.getItem('somnix_watch_mode_v1');

    if (savedConnected === 'true' && savedAddress) {
      return { ...DEFAULT_WALLET, isConnected: true, address: savedAddress };
    } else if (savedWatchMode === 'true') {
      return { ...DEFAULT_WALLET, isWatchMode: true };
    }
  } catch {
    // fallback
  }
  return DEFAULT_WALLET;
}

function pickProvider(walletType?: string): Eip1193Provider | null {
  if (typeof window === 'undefined') return null;
  const win = window as unknown as Record<string, unknown>;
  const eth = win.ethereum as (Eip1193Provider & { providers?: Eip1193Provider[] }) | undefined;

  if (walletType === 'coinbase' && win.coinbaseWalletExtension) {
    return win.coinbaseWalletExtension as Eip1193Provider;
  }
  if (walletType === 'okx' && win.okxwallet) {
    return win.okxwallet as Eip1193Provider;
  }
  if (walletType === 'phantom' && (win.phantom as Record<string, unknown>)?.ethereum) {
    return (win.phantom as Record<string, unknown>).ethereum as Eip1193Provider;
  }
  if (walletType === 'trust' && win.trustwallet) {
    return win.trustwallet as Eip1193Provider;
  }
  if (eth) {
    if (Array.isArray(eth.providers)) {
      if (walletType === 'metamask') return eth.providers.find((p) => p.isMetaMask) || eth;
      if (walletType === 'coinbase') return eth.providers.find((p) => p.isCoinbaseWallet) || eth;
      return eth;
    }
    return eth;
  }
  return null;
}

async function requestSomniaNetwork(provider: Eip1193Provider | null | undefined) {
  if (!provider?.request) return;
  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: SOMNIA_CONFIG.chainHexId }],
    });
  } catch (switchError: unknown) {
    const errObj = switchError as { code?: number; data?: { originalError?: { code?: number } } };
    if (errObj?.code === 4902 || errObj?.data?.originalError?.code === 4902) {
      try {
        await provider.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: SOMNIA_CONFIG.chainHexId,
              chainName: SOMNIA_CONFIG.chainName,
              nativeCurrency: {
                name: 'Somnia Testnet Token',
                symbol: SOMNIA_CONFIG.symbol,
                decimals: 18,
              },
              rpcUrls: [SOMNIA_CONFIG.rpcUrl],
              blockExplorerUrls: [SOMNIA_CONFIG.explorerUrl],
            },
          ],
        });
      } catch (addError) {
        console.warn('Could not auto-add Somnia Testnet:', addError);
      }
    }
  }
}

function buildWalletClient(provider: Eip1193Provider, address: string): WalletClient {
  return createWalletClient({
    chain: somniaTestnet,
    transport: custom(provider as unknown as { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> }),
    account: address as `0x${string}`,
  });
}

export function SomnixProvider({ children }: { children: React.ReactNode }) {
  const [wallet, setWallet] = useState<WalletState>(() => getInitialWalletState());
  const [isViewingLanding, setIsViewingLanding] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isFauceting, setIsFauceting] = useState(false);
  const [selectedPair, setSelectedPair] = useState<WindowPair>('BTC');
  const [selectedLength, setSelectedLength] = useState<WindowLength>('15m');
  const [selectedAmount, setSelectedAmount] = useState<number>(10);
  const [activeLock, setActiveLock] = useState<UserLock | null>(() => loadActiveLock());
  const [recents, setRecents] = useState<RecentWindow[]>(() => getRecentWindows());
  const [remainingSeconds, setRemainingSeconds] = useState<number>(() => {
    const { remainingMs } = getCurrentWindowBounds('15m');
    return Math.floor(remainingMs / 1000);
  });
  const [marketOverride, setMarketOverride] = useState<Partial<MarketWindow> | null>(null);
  // null = not checked yet (don't disable anything while loading, to avoid a flash of
  // every length looking dead before the first fetch lands).
  const [liveLengths, setLiveLengths] = useState<WindowLength[] | null>(null);

  const refreshBalance = useCallback((address: string) => {
    fetchCollateralBalance(address).then((realBalance) => {
      if (realBalance !== null) {
        setWallet((w) => ({ ...w, balance: realBalance }));
      }
    });
  }, []);

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

  // Resolve the collateral token's real symbol once — needed regardless of connection state.
  useEffect(() => {
    fetchCollateralMeta()
      .then((meta) => setWallet((w) => ({ ...w, currencySymbol: meta.symbol })))
      .catch((err) => console.warn('[Somnix] Failed to resolve collateral token metadata:', err));
  }, []);

  // Rehydrate the signer after a page reload: a persisted "connected" flag has no
  // live walletClient bound to the exchange yet, so silently re-derive one (no
  // popup — eth_accounts only) or fall back to disconnected if it's gone.
  useEffect(() => {
    if (!wallet.isConnected || !wallet.address) return;
    const savedAddress = wallet.address;
    const provider = pickProvider();
    const dropSession = () => setWallet((w) => ({ ...w, isConnected: false, address: null }));

    Promise.resolve()
      .then(() => {
        if (!provider) throw new Error('No provider');
        return provider.request({ method: 'eth_accounts' });
      })
      .then((accounts) => {
        const found = (accounts as string[])?.[0];
        if (found && found.toLowerCase() === savedAddress.toLowerCase()) {
          bindExchangeSigner(buildWalletClient(provider!, found));
          refreshBalance(found);
          reconcilePendingLock();
        } else {
          dropSession();
        }
      })
      .catch(dropSession);
    // Only on mount — connectWallet()/disconnectWallet() manage the signer for the rest of the session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update timer & clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      const { remainingMs } = getCurrentWindowBounds(selectedLength);
      setRemainingSeconds(Math.floor(remainingMs / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [selectedLength]);

  // Asynchronously poll backend / indexer for market & odds updates
  useEffect(() => {
    let isCancelled = false;
    async function loadLiveFeed() {
      const live = await fetchLiveMarkets(selectedPair, selectedLength);
      if (!isCancelled && live) {
        setMarketOverride({ id: live.id, isLive: live.isLive });
        if (live.isLive) {
          const odds = await fetchLiveOdds(live.id);
          if (!isCancelled && odds) {
            setMarketOverride((prev) => ({ ...prev, greenOdds: odds.greenOdds, redOdds: odds.redOdds }));
          }
        }
      }
    }
    loadLiveFeed();
    const interval = setInterval(loadLiveFeed, 10000);
    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [selectedPair, selectedLength]);

  // Which lengths have a real live DreamDEX market for the selected pair — lets the
  // length selector disable one (e.g. a cadence DreamDEX doesn't currently run) instead
  // of letting someone pick a window that can never go live.
  useEffect(() => {
    let isCancelled = false;
    async function loadLiveLengths() {
      const lens = await fetchLiveLengths(selectedPair);
      if (!isCancelled) setLiveLengths(lens);
    }
    loadLiveLengths();
    const interval = setInterval(loadLiveLengths, 10000);
    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [selectedPair]);

  // Current market window
  const currentMarket = useMemo(() => {
    const base = getMarketWindow(selectedPair, selectedLength);
    if (marketOverride) {
      return {
        ...base,
        id: marketOverride.id ?? base.id,
        isLive: marketOverride.isLive ?? base.isLive,
        greenOdds: marketOverride.greenOdds ?? base.greenOdds,
        redOdds: marketOverride.redOdds ?? base.redOdds,
      };
    }
    return base;
  }, [selectedPair, selectedLength, marketOverride]);

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
      return { canLock: false, reason: 'No live DreamDEX market for this window right now — try another pair or length' };
    }

    // Dynamic cutoff based on window length
    const minCutoffSeconds = selectedLength === '1m' ? 10 : selectedLength === '3m' ? 20 : selectedLength === '5m' ? 30 : 60;
    if (remainingSeconds < minCutoffSeconds) {
      return { canLock: false, reason: `Less than ${minCutoffSeconds}s left in this window. Wait for next.` };
    }
    if (selectedAmount < currentMarket.minAmount) {
      return { canLock: false, reason: `Minimum amount is ${currentMarket.minAmount} ${wallet.currencySymbol}` };
    }
    if (wallet.balance < selectedAmount) {
      return { canLock: false, reason: `Not enough ${wallet.currencySymbol || 'collateral'} balance` };
    }
    if (activeLock && activeLock.marketId === currentMarket.id) {
      return { canLock: false, reason: 'You already locked a guess for this window' };
    }

    return { canLock: true };
  }, [wallet, currentMarket, remainingSeconds, selectedAmount, activeLock, selectedLength]);

  const openWalletModal = useCallback(() => {
    setIsWalletModalOpen(true);
  }, []);

  const closeWalletModal = useCallback(() => {
    setIsWalletModalOpen(false);
  }, []);

  const goToLanding = useCallback(() => {
    setIsViewingLanding(true);
  }, []);

  const enterApp = useCallback(() => {
    setIsViewingLanding(false);
  }, []);

  const connectWallet = useCallback(async (walletType?: string): Promise<boolean> => {
    const provider = pickProvider(walletType);
    if (!provider) {
      throw new Error('No EVM wallet extension found. Install one and try again.');
    }

    let chosenAddress: string | undefined;
    try {
      const accounts = (await provider.request({ method: 'eth_requestAccounts' })) as string[];
      chosenAddress = accounts?.[0];
      await requestSomniaNetwork(provider);
    } catch (e: unknown) {
      const errObj = e as { code?: number };
      if (errObj?.code === 4001) {
        throw new Error('Connection request was rejected in your wallet.');
      }
      throw e instanceof Error ? e : new Error('Failed to connect wallet.');
    }

    if (!chosenAddress) {
      throw new Error('No account was returned by your wallet.');
    }

    bindExchangeSigner(buildWalletClient(provider, chosenAddress));
    const realBalance = await fetchCollateralBalance(chosenAddress);
    reconcilePendingLock();

    setWallet((w) => ({
      ...w,
      isConnected: true,
      isWatchMode: false,
      address: chosenAddress!,
      balance: realBalance ?? 0,
    }));
    setIsViewingLanding(false);

    if (typeof window !== 'undefined') {
      localStorage.setItem('somnix_wallet_connected_v1', 'true');
      localStorage.setItem('somnix_wallet_address_v1', chosenAddress);
      localStorage.removeItem('somnix_watch_mode_v1');
    }

    return true;
  }, [reconcilePendingLock]);

  const disconnectWallet = useCallback(() => {
    bindExchangeSigner(undefined);
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
    bindExchangeSigner(undefined);
    setWallet((w) => ({ ...w, isConnected: false, isWatchMode: true, address: null, balance: 0 }));
    setIsViewingLanding(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('somnix_watch_mode_v1', 'true');
      localStorage.removeItem('somnix_wallet_connected_v1');
    }
  }, []);

  // Only handles ENTERING watch mode. Leaving it is a real connect — see WalletModal / TopBar,
  // which open the wallet modal instead of calling this with `false`.
  const toggleWatchMode = useCallback((val?: boolean) => {
    const nextWatch = val !== undefined ? val : true;
    if (!nextWatch) return;
    bindExchangeSigner(undefined);
    setWallet((prev) => ({ ...prev, isWatchMode: true, isConnected: false, address: null }));
    if (typeof window !== 'undefined') {
      localStorage.setItem('somnix_watch_mode_v1', 'true');
      localStorage.removeItem('somnix_wallet_connected_v1');
    }
  }, []);

  const faucet = useCallback(async (): Promise<{ success: boolean; reason?: string }> => {
    if (!wallet.isConnected || !wallet.address) {
      return { success: false, reason: 'Connect your wallet first.' };
    }
    setIsFauceting(true);
    try {
      await requestFaucet();
      refreshBalance(wallet.address);
      return { success: true };
    } catch (err: unknown) {
      console.error('[Somnix Faucet Error]', err);
      return { success: false, reason: describeExchangeError(err) };
    } finally {
      setIsFauceting(false);
    }
  }, [wallet.isConnected, wallet.address, refreshBalance]);

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
      const expiry = Number((market.info as { expiry?: string }).expiry);
      const newLock = createLock(
        { ...currentMarket, id: market.id, endTime: Number.isFinite(expiry) && expiry > 0 ? expiry * 1000 : currentMarket.endTime },
        side,
        selectedAmount,
        { filled: order.filled, price: order.price, txHash: order.hash },
        idempotencyKey
      );
      setActiveLock(newLock);

      if (wallet.address) refreshBalance(wallet.address);

      // Best-effort history mirror — the lock already happened on-chain regardless
      // of whether this succeeds; never awaited into the user-facing flow. Once
      // the backend assigns its own id, attach it to the active lock so a later
      // claim can reference it.
      if (newLock.txHash) {
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
        // successfully reported earlier (see executeLock); nothing to attach
        // a claim to on the backend otherwise.
        if (lock.backendLockId) {
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
    [wallet.address, refreshBalance]
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
        isViewingLanding,
        goToLanding,
        enterApp,
        isWalletModalOpen,
        openWalletModal,
        closeWalletModal,
        connectWallet,
        disconnectWallet,
        toggleWatchMode,
        enterAppInWatchMode,
        faucet,
        isFauceting,
        selectedPair,
        setSelectedPair,
        selectedLength,
        setSelectedLength,
        selectedAmount,
        setSelectedAmount,
        liveLengths,
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
