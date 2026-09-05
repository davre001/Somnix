import React, { useState, useMemo } from 'react';
import { useSomnix } from '@/lib/useSomnix';
import { PublicIcon } from '@/components/ui/public-icon';

interface WalletOption {
  id: string;
  name: string;
  description: string;
  badge?: string;
  isPopular?: boolean;
  getProvider?: () => unknown;
  icon: React.ReactNode;
  downloadUrl: string;
}

function getInstalledWallets(): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  const win = window as unknown as Record<string, unknown>;
  const eth = win.ethereum as Record<string, unknown> | undefined;
  const providers = (eth?.providers as Array<Record<string, unknown>>) || [];
  return {
    metamask: Boolean(
      (eth?.isMetaMask && !(eth as Record<string, unknown>)?.isRabby) ||
        providers.some((p) => p?.isMetaMask && !p?.isRabby)
    ),
    rabby: Boolean(eth?.isRabby || providers.some((p) => p?.isRabby)),
    phantom: Boolean(
      (win.phantom as Record<string, unknown>)?.ethereum ||
        eth?.isPhantom ||
        providers.some((p) => p?.isPhantom)
    ),
  };
}

export function WalletModal() {
  const { isWalletModalOpen, closeWalletModal, connectWallet, enterAppInWatchMode } = useSomnix();
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const installedWallets = useMemo(() => getInstalledWallets(), []);

  if (!isWalletModalOpen) return null;

  const WALLETS: WalletOption[] = [
    {
      id: 'metamask',
      name: 'MetaMask',
      description: '',
      isPopular: true,
      downloadUrl: 'https://metamask.io/download/',
      icon: (
        <div className="w-10 h-10 rounded-xl bg-[#e2761b]/10 border border-[#e2761b]/30 flex items-center justify-center overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/wallet-metamask.png" alt="" aria-hidden className="w-7 h-7 object-contain" />
        </div>
      ),
    },
    {
      id: 'rabby',
      name: 'Rabby Wallet',
      description: '',
      downloadUrl: 'https://rabby.io/',
      icon: (
        <div className="w-10 h-10 rounded-xl bg-[#7084ff]/10 border border-[#7084ff]/30 flex items-center justify-center overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/wallet-rabby.png" alt="" aria-hidden className="w-7 h-7 object-contain" />
        </div>
      ),
    },
    {
      id: 'phantom',
      name: 'Phantom',
      description: '',
      downloadUrl: 'https://phantom.app/',
      icon: (
        <div className="w-10 h-10 rounded-xl bg-[#ab9ff2]/10 border border-[#ab9ff2]/30 flex items-center justify-center overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/wallet-phantom.png" alt="" aria-hidden className="w-8 h-8 object-contain rounded-lg" />
        </div>
      ),
    },
  ];

  const handleSelectWallet = async (wallet: WalletOption) => {
    try {
      setConnectingId(wallet.id);
      setErrorMessage(null);

      const success = await connectWallet(wallet.id);
      if (success) {
        closeWalletModal();
      }
    } catch (err: unknown) {
      console.error('Wallet connection error:', err);
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Failed to connect. Please unlock your wallet and approve the connection.'
      );
    } finally {
      setConnectingId(null);
    }
  };

  const handleWatchMode = () => {
    enterAppInWatchMode();
    closeWalletModal();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div
        onClick={closeWalletModal}
        className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-lg max-h-[92vh] flex flex-col rounded-2xl sm:rounded-3xl bg-[#0b0b10] border border-zinc-800 p-4 sm:p-7 shadow-[0_20px_60px_rgba(0,0,0,0.9)] z-10 space-y-4 sm:space-y-5 animate-in zoom-in-95 duration-200 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
          <div>
            <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-tight">
              Connect Wallet
            </h3>
          </div>
          <button
            onClick={closeWalletModal}
            aria-label="Close wallet dialog"
            className="p-1.5 sm:p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors active:scale-95"
          >
            <PublicIcon name="x" size={20} />
          </button>
        </div>

        {/* Network Notice */}
        <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-zinc-300 text-[11px] sm:text-xs">
            <PublicIcon name="shield" size={16} className="text-emerald-400" />
            <span>Network: <strong className="text-white">Somnia Shannon Testnet</strong> (50312)</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
            STT
          </span>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-red-950/40 border border-red-800/60 text-xs text-red-300 flex items-center gap-2">
            <PublicIcon name="alert-circle" size={16} className="text-red-400" />
            <span className="line-clamp-2">{errorMessage}</span>
          </div>
        )}

        {/* Wallet Options List */}
        <div className="space-y-2 max-h-[280px] sm:max-h-[340px] overflow-y-auto pr-1">
          {WALLETS.map((wallet) => {
            const isInstalled = installedWallets[wallet.id] ?? false;
            const isConnecting = connectingId === wallet.id;

            return (
              <button
                key={wallet.id}
                onClick={() => handleSelectWallet(wallet)}
                disabled={connectingId !== null}
                className="w-full p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-[#121218] hover:bg-[#181822] border border-zinc-800 hover:border-zinc-700 transition-all duration-150 flex items-center justify-between group text-left active:scale-[0.99] disabled:opacity-60"
              >
                <div className="flex items-center gap-3 sm:gap-3.5">
                  {wallet.icon}
                  <div>
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <span className="font-bold text-white text-xs sm:text-sm group-hover:text-emerald-300 transition-colors">
                        {wallet.name}
                      </span>
                      {wallet.isPopular && (
                        <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 font-bold border border-zinc-700">
                          Popular
                        </span>
                      )}
                      {wallet.badge && (
                        <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 font-bold border border-zinc-700">
                          {wallet.badge}
                        </span>
                      )}
                      {isInstalled && (
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/80">
                          Detected
                        </span>
                      )}
                    </div>
                    {wallet.description && (
                      <p className="text-[10px] sm:text-[11px] text-zinc-400 font-mono">
                        {wallet.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isConnecting ? (
                    <span className="w-5 h-5 rounded-full border-2 border-emerald-400/30 border-t-emerald-400 animate-spin" />
                  ) : (
                    <div className="w-7 h-7 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 group-hover:border-zinc-600 group-hover:text-white transition-colors">
                      <PublicIcon name="arrow-right" size={14} />
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer info & Watch Mode fallback */}
        <div className="pt-2 border-t border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-3 text-xs">
          <button
            onClick={handleWatchMode}
            className="text-zinc-400 hover:text-white transition-colors font-mono underline underline-offset-4 text-[11px] sm:text-xs"
          >
            Explore in Watch Mode (Read-Only)
          </button>

          <a
            href="https://testnet.somnia.network/"
            target="_blank"
            rel="noreferrer"
            className="text-zinc-400 hover:text-emerald-400 transition-colors font-mono flex items-center gap-1 text-[11px] sm:text-xs"
          >
            <span>Get Somnia Testnet STT</span>
            <PublicIcon name="external-link" size={12} />
          </a>
        </div>
      </div>
    </div>
  );
}
