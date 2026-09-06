'use client';

import { useState, useCallback, useEffect } from 'react';
import { createWalletClient, custom, type WalletClient } from 'viem';
import { WalletState } from '../types';
import { fetchCollateralBalance, fetchCollateralMeta, somniaTestnet, SOMNIA_CONFIG } from '../somnia';
import { bindExchangeSigner, describeExchangeError, requestFaucet } from '../exchange';

export type Eip1193Provider = {
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

  // Phantom exposes its EVM provider on a dedicated namespace.
  if (walletType === 'phantom' && (win.phantom as Record<string, unknown>)?.ethereum) {
    return (win.phantom as Record<string, unknown>).ethereum as Eip1193Provider;
  }
  if (eth) {
    // Multiple extensions injected: window.ethereum.providers holds them all.
    if (Array.isArray(eth.providers)) {
      if (walletType === 'metamask') {
        // Rabby also sets isMetaMask for compatibility, so exclude it explicitly.
        return (
          eth.providers.find((p) => p.isMetaMask && !(p as { isRabby?: boolean }).isRabby) || eth
        );
      }
      if (walletType === 'rabby') {
        return eth.providers.find((p) => (p as { isRabby?: boolean }).isRabby) || eth;
      }
      if (walletType === 'phantom') {
        return eth.providers.find((p) => (p as { isPhantom?: boolean }).isPhantom) || eth;
      }
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

export interface UseWalletOptions {
  /** Called after a signer successfully (re)binds — connect, or reload rehydration. */
  onSignerBound?: () => void;
  /** Called when the user has just connected or entered watch mode — leaves the landing page. */
  onEnterApp?: () => void;
}

/**
 * Owns wallet connection, provider selection, network switching, balance, and
 * the faucet — the slice of `useSomnix` that talks to the browser's EVM
 * provider. Split out of the former single 730-line hook so it's testable and
 * reasoned about on its own; see `useMarket`, `useLock`, `useClaim` for the rest.
 */
export function useWallet(options: UseWalletOptions = {}) {
  const { onSignerBound, onEnterApp } = options;
  const [wallet, setWallet] = useState<WalletState>(() => getInitialWalletState());
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isFauceting, setIsFauceting] = useState(false);

  const refreshBalance = useCallback((address: string) => {
    fetchCollateralBalance(address).then((realBalance) => {
      if (realBalance !== null) {
        setWallet((w) => ({ ...w, balance: realBalance }));
      }
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
          onSignerBound?.();
        } else {
          dropSession();
        }
      })
      .catch(dropSession);
    // Only on mount — connectWallet()/disconnectWallet() manage the signer for the rest of the session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openWalletModal = useCallback(() => {
    setIsWalletModalOpen(true);
  }, []);

  const closeWalletModal = useCallback(() => {
    setIsWalletModalOpen(false);
  }, []);

  const connectWallet = useCallback(
    async (walletType?: string): Promise<boolean> => {
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
        console.error('Wallet connection error:', e);
        const errObj = e as { code?: number };
        if (errObj?.code === 4001) {
          throw new Error('Connection request was rejected in your wallet.');
        }
        // Never rethrow the raw provider error here — it can be an ugly
        // JSON-RPC/internal message, and this bubbles straight to the UI
        // (WalletModal shows it as-is). Full detail is already in the console.
        throw new Error('Could not connect to your wallet. Please unlock it and try again.');
      }

      if (!chosenAddress) {
        throw new Error('No account was returned by your wallet.');
      }

      bindExchangeSigner(buildWalletClient(provider, chosenAddress));
      const realBalance = await fetchCollateralBalance(chosenAddress);
      onSignerBound?.();

      setWallet((w) => ({
        ...w,
        isConnected: true,
        isWatchMode: false,
        address: chosenAddress!,
        balance: realBalance ?? 0,
      }));
      onEnterApp?.();

      if (typeof window !== 'undefined') {
        localStorage.setItem('somnix_wallet_connected_v1', 'true');
        localStorage.setItem('somnix_wallet_address_v1', chosenAddress);
        localStorage.removeItem('somnix_watch_mode_v1');
      }

      return true;
    },
    [onSignerBound, onEnterApp]
  );

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
    onEnterApp?.();
    if (typeof window !== 'undefined') {
      localStorage.setItem('somnix_watch_mode_v1', 'true');
      localStorage.removeItem('somnix_wallet_connected_v1');
    }
  }, [onEnterApp]);

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

  return {
    wallet,
    isWalletModalOpen,
    openWalletModal,
    closeWalletModal,
    connectWallet,
    disconnectWallet,
    toggleWatchMode,
    enterAppInWatchMode,
    faucet,
    isFauceting,
    refreshBalance,
  };
}
