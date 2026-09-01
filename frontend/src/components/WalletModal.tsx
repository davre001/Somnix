'use client';

import React, { useState, useEffect } from 'react';
import { useSomnix } from '@/lib/useSomnix';
import { SOMNIA_CONFIG } from '@/lib/somnia';
import { X, Check, Loader2, ExternalLink, ShieldCheck, AlertCircle, Sparkles } from 'lucide-react';

interface WalletOption {
  id: string;
  name: string;
  description: string;
  badge?: string;
  isPopular?: boolean;
  getProvider?: () => any;
  icon: React.ReactNode;
  downloadUrl: string;
}

export function WalletModal() {
  const { isWalletModalOpen, closeWalletModal, connectWallet, enterAppInWatchMode } = useSomnix();
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [installedWallets, setInstalledWallets] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const eth = (window as any).ethereum;
    setInstalledWallets({
      metamask: Boolean(eth?.isMetaMask || (window as any).ethereum?.providers?.some((p: any) => p.isMetaMask)),
      coinbase: Boolean((window as any).coinbaseWalletExtension || eth?.isCoinbaseWallet),
      rainbow: Boolean(eth?.isRainbow),
      trust: Boolean((window as any).trustwallet || eth?.isTrust),
      okx: Boolean((window as any).okxwallet),
      phantom: Boolean((window as any).phantom?.ethereum || eth?.isPhantom),
      injected: Boolean(eth),
    });
  }, [isWalletModalOpen]);

  if (!isWalletModalOpen) return null;

  const WALLETS: WalletOption[] = [
    {
      id: 'metamask',
      name: 'MetaMask',
      description: 'The most popular EVM crypto wallet',
      isPopular: true,
      downloadUrl: 'https://metamask.io/download/',
      icon: (
        <div className="w-10 h-10 rounded-xl bg-[#e2761b]/10 border border-[#e2761b]/30 flex items-center justify-center">
          <svg viewBox="0 0 32 32" className="w-6 h-6" fill="none">
            <path d="M28.02 5.07l-10.42 7.7-1.6-3.83 8.35-4.8 3.67.93z" fill="#E17726" stroke="#E17726" strokeWidth="0.25"/>
            <path d="M3.98 5.07l10.33 7.78 1.69-3.91-8.35-4.8-3.67.93z" fill="#E27625" stroke="#E27625" strokeWidth="0.25"/>
            <path d="M24.08 21.84l-2.73 4.19 5.86 1.62 1.69-5.73-4.82-.08z" fill="#E27625" stroke="#E27625" strokeWidth="0.25"/>
            <path d="M7.92 21.84l2.73 4.19-5.86 1.62-1.69-5.73 4.82-.08z" fill="#E27625" stroke="#E27625" strokeWidth="0.25"/>
            <path d="M10.41 14.1l-2.49 3.75 5.82.26-.22-6.26-3.11 2.25z" fill="#E27625" stroke="#E27625" strokeWidth="0.25"/>
            <path d="M21.59 14.1l2.49 3.75-5.82.26.22-6.26 3.11 2.25z" fill="#E27625" stroke="#E27625" strokeWidth="0.25"/>
            <path d="M10.65 26.03l3.66-1.78-3.15-2.45-.51 4.23z" fill="#D5BFB2" stroke="#D5BFB2" strokeWidth="0.25"/>
            <path d="M21.35 26.03l-3.66-1.78 3.15-2.45.51 4.23z" fill="#D5BFB2" stroke="#D5BFB2" strokeWidth="0.25"/>
            <path d="M14.31 24.25l-3.56-1.73.49-4.22 3.07 5.95z" fill="#233447" stroke="#233447" strokeWidth="0.25"/>
            <path d="M17.69 24.25l3.56-1.73-.49-4.22-3.07 5.95z" fill="#233447" stroke="#233447" strokeWidth="0.25"/>
            <path d="M17.77 17.85l.13-6.26 3.69 2.51-3.82 3.75z" fill="#CC6228" stroke="#CC6228" strokeWidth="0.25"/>
            <path d="M14.23 17.85l-.13-6.26-3.69 2.51 3.82 3.75z" fill="#CC6228" stroke="#CC6228" strokeWidth="0.25"/>
            <path d="M16 19.8l-1.69-1.95h3.38L16 19.8z" fill="#E27525" stroke="#E27525" strokeWidth="0.25"/>
          </svg>
        </div>
      ),
    },
    {
      id: 'coinbase',
      name: 'Coinbase Wallet',
      description: 'Smart contract wallet by Coinbase',
      downloadUrl: 'https://www.coinbase.com/wallet',
      icon: (
        <div className="w-10 h-10 rounded-xl bg-[#0052ff]/10 border border-[#0052ff]/30 flex items-center justify-center">
          <svg viewBox="0 0 32 32" className="w-6 h-6" fill="none">
            <rect width="32" height="32" rx="16" fill="#0052FF"/>
            <circle cx="16" cy="16" r="10" fill="white"/>
            <rect x="13" y="13" width="6" height="6" rx="1.5" fill="#0052FF"/>
          </svg>
        </div>
      ),
    },
    {
      id: 'rainbow',
      name: 'Rainbow',
      description: 'Fun, secure and colorful Ethereum wallet',
      downloadUrl: 'https://rainbow.me/',
      icon: (
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-500/20 via-purple-500/20 to-red-500/20 border border-zinc-700 flex items-center justify-center">
          <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#0019FF] via-[#00D1FF] to-[#FF007A] flex items-center justify-center shadow-inner" />
        </div>
      ),
    },
    {
      id: 'trust',
      name: 'Trust Wallet',
      description: 'Leading multi-chain self-custody wallet',
      downloadUrl: 'https://trustwallet.com/',
      icon: (
        <div className="w-10 h-10 rounded-xl bg-[#0500FF]/10 border border-[#0500FF]/30 flex items-center justify-center">
          <svg viewBox="0 0 32 32" className="w-6 h-6" fill="none">
            <path d="M16 4L6 8V16C6 22.5 10.3 28.5 16 30C21.7 28.5 26 22.5 26 16V8L16 4Z" fill="#0500FF"/>
            <path d="M16 7L8 10.2V16C8 21.2 11.4 26 16 27.2C20.6 26 24 21.2 24 16V10.2L16 7Z" fill="white"/>
          </svg>
        </div>
      ),
    },
    {
      id: 'okx',
      name: 'OKX Wallet',
      description: 'Universal Web3 portal and crypto wallet',
      downloadUrl: 'https://www.okx.com/web3',
      icon: (
        <div className="w-10 h-10 rounded-xl bg-white/10 border border-zinc-700 flex items-center justify-center">
          <div className="w-6 h-6 bg-white rounded flex items-center justify-center text-black font-black text-[10px] tracking-tighter">
            OKX
          </div>
        </div>
      ),
    },
    {
      id: 'phantom',
      name: 'Phantom (EVM)',
      description: 'Supports Ethereum & EVM networks',
      downloadUrl: 'https://phantom.app/',
      icon: (
        <div className="w-10 h-10 rounded-xl bg-[#ab9ff2]/10 border border-[#ab9ff2]/30 flex items-center justify-center">
          <svg viewBox="0 0 32 32" className="w-6 h-6" fill="none">
            <circle cx="16" cy="16" r="14" fill="#AB9FF2"/>
            <circle cx="12" cy="14" r="2" fill="white"/>
            <circle cx="20" cy="14" r="2" fill="white"/>
          </svg>
        </div>
      ),
    },
    {
      id: 'injected',
      name: 'Browser Injected Wallet',
      badge: 'Universal',
      description: 'Connect with any installed EVM extension',
      downloadUrl: 'https://metamask.io/',
      icon: (
        <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300">
          <Sparkles className="w-5 h-5 text-white" />
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
    } catch (err: any) {
      console.error('Wallet connection error:', err);
      setErrorMessage(err?.message || 'Failed to connect. Please unlock your wallet and approve the connection.');
    } finally {
      setConnectingId(null);
    }
  };

  const handleWatchMode = () => {
    enterAppInWatchMode();
    closeWalletModal();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={closeWalletModal}
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-lg rounded-3xl bg-[#0b0b10] border border-zinc-800 p-6 sm:p-7 shadow-[0_20px_60px_rgba(0,0,0,0.9)] z-10 space-y-6 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
          <div>
            <h3 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
              <span>Connect EVM Wallet</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 font-mono font-bold border border-emerald-800/60">
                Somnia Ready
              </span>
            </h3>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Choose your preferred Web3 provider to start trading
            </p>
          </div>
          <button
            onClick={closeWalletModal}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Network Notice */}
        <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-zinc-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Target Network: <strong className="text-white">Somnia Shannon Testnet</strong> (50312)</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
            STT
          </span>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-red-950/40 border border-red-800/60 text-xs text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span className="line-clamp-2">{errorMessage}</span>
          </div>
        )}

        {/* Wallet Options List */}
        <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
          {WALLETS.map((wallet) => {
            const isInstalled = installedWallets[wallet.id] ?? false;
            const isConnecting = connectingId === wallet.id;

            return (
              <button
                key={wallet.id}
                onClick={() => handleSelectWallet(wallet)}
                disabled={connectingId !== null}
                className="w-full p-3.5 rounded-2xl bg-[#121218] hover:bg-[#181822] border border-zinc-800 hover:border-zinc-700 transition-all duration-150 flex items-center justify-between group text-left active:scale-[0.99] disabled:opacity-60"
              >
                <div className="flex items-center gap-3.5">
                  {wallet.icon}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm group-hover:text-emerald-300 transition-colors">
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
                    <p className="text-[11px] text-zinc-400 font-mono">
                      {wallet.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isConnecting ? (
                    <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
                  ) : (
                    <div className="w-7 h-7 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center group-hover:border-zinc-600 transition-colors">
                      <ExternalLink className="w-3.5 h-3.5 text-zinc-400 group-hover:text-white" />
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer info & Watch Mode fallback */}
        <div className="pt-2 border-t border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <button
            onClick={handleWatchMode}
            className="text-zinc-400 hover:text-white transition-colors font-mono underline underline-offset-4"
          >
            Explore in Watch Mode (Read-Only)
          </button>

          <a
            href="https://testnet.somnia.network/"
            target="_blank"
            rel="noreferrer"
            className="text-zinc-400 hover:text-emerald-400 transition-colors font-mono flex items-center gap-1"
          >
            <span>Get Somnia Testnet STT</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
