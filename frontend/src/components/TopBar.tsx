'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSomnix } from '@/lib/useSomnix';
import { shortenAddress } from '@/lib/somnia';
import { LiquidMetalButton } from '@/components/ui/liquid-metal-button';
import { MenuToggleIcon } from '@/components/ui/menu-toggle-icon';
import { useScroll } from '@/components/ui/use-scroll';
import { cn } from '@/lib/utils';
import {
  Wallet,
  Eye,
  History,
  PlusCircle,
  ChevronDown,
  Check,
  Shield,
  Zap,
} from 'lucide-react';

export function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const {
    wallet,
    openWalletModal,
    disconnectWallet,
    toggleWatchMode,
    faucet,
    currentMarket,
    goToLanding,
    enterApp,
    isViewingLanding,
  } = useSomnix();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [faucetSuccess, setFaucetSuccess] = useState(false);
  const scrolled = useScroll(15);

  const budgetLeft = Math.max(0, wallet.dailyBudgetTotal - wallet.dailyBudgetSpent);

  const handleFaucet = () => {
    faucet();
    setFaucetSuccess(true);
    setTimeout(() => setFaucetSuccess(false), 1800);
  };

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  return (
    <header
      className={cn(
        'sticky top-0 z-50 mx-auto w-full border-b border-transparent transition-all duration-300 ease-out',
        {
          'bg-[#050507]/90 supports-[backdrop-filter]:bg-[#050507]/60 border-zinc-800 backdrop-blur-xl md:top-3 md:max-w-6xl md:rounded-2xl md:border md:shadow-[0_10px_35px_rgba(0,0,0,0.7)]':
            scrolled && !mobileMenuOpen,
          'bg-[#050507] border-zinc-800': !scrolled && !mobileMenuOpen,
          'bg-[#050507]': mobileMenuOpen,
        }
      )}
    >
      <div
        className={cn(
          'w-full mx-auto px-4 sm:px-6 h-16 flex items-center justify-between transition-all duration-300 ease-out',
          {
            'h-14 md:px-5': scrolled,
          }
        )}
      >
        {/* Brand / Logo & Navigation */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => {
              goToLanding();
              router.push('/');
            }}
            className="flex items-center gap-2.5 group cursor-pointer text-left focus:outline-none"
            aria-label="Return to Somnix Landing Page"
          >
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center font-black text-black text-sm tracking-tighter shadow-md transition-transform duration-200 group-hover:scale-105">
              SX
            </div>
            <div className="flex items-center gap-2">
              <span className="font-black tracking-tight text-white text-lg leading-none uppercase">
                SOMNIX
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-900 text-zinc-300 font-mono font-semibold tracking-wider uppercase border border-zinc-700">
                Somnia
              </span>
            </div>
          </button>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-2 pl-4 border-l border-zinc-800">
            <button
              onClick={() => {
                enterApp();
                router.push('/');
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold font-mono uppercase tracking-wider transition-colors ${
                pathname === '/' && !isViewingLanding
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              This Window
            </button>
            <Link
              href="/recents"
              onClick={() => enterApp()}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold font-mono uppercase tracking-wider transition-colors flex items-center gap-1.5 ${
                pathname === '/recents'
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Past Windows</span>
            </Link>
          </nav>
        </div>

        {/* Right side Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Day budget indicator (if connected on desktop) */}
          {wallet.isConnected && (
            <div className="hidden lg:flex items-center gap-1.5 py-1 px-3 rounded-full bg-[#0c0c10] border border-zinc-800 text-xs font-mono">
              <Shield className="w-3.5 h-3.5 text-zinc-400" />
              <span className="text-zinc-400">Budget:</span>
              <span className="font-bold text-white">
                {budgetLeft.toFixed(0)}/{wallet.dailyBudgetTotal} STT
              </span>
            </div>
          )}

          {/* Faucet Liquid Metal button on desktop/tablet */}
          {wallet.isConnected && (
            <div className="hidden sm:block">
              <LiquidMetalButton
                onClick={handleFaucet}
                height={36}
                width={105}
                className="scale-90 origin-right"
              >
                <div className="flex items-center gap-1 text-xs font-mono text-white">
                  {faucetSuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400 font-bold">+25 STT</span>
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-3.5 h-3.5 text-zinc-300" />
                      <span>+Faucet</span>
                    </>
                  )}
                </div>
              </LiquidMetalButton>
            </div>
          )}

          {/* Desktop Wallet / Watch Mode Dropdown Button */}
          <div className="relative hidden sm:block">
            {wallet.isConnected ? (
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 py-2 px-3.5 rounded-full bg-zinc-900 border border-zinc-700 hover:border-zinc-500 transition-all text-xs font-mono font-bold text-white shadow-sm"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>{shortenAddress(wallet.address)}</span>
                <ChevronDown className="w-3 h-3 text-zinc-400" />
              </button>
            ) : wallet.isWatchMode ? (
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 py-2 px-3.5 rounded-full bg-zinc-900 border border-zinc-700 hover:border-zinc-500 transition-all text-xs font-mono text-zinc-300"
              >
                <Eye className="w-3.5 h-3.5 text-zinc-400" />
                <span>Watch Mode</span>
                <ChevronDown className="w-3 h-3 text-zinc-500" />
              </button>
            ) : (
              <LiquidMetalButton
                onClick={openWalletModal}
                variant="silver"
                height={38}
                width={140}
              >
                <div className="flex items-center gap-2 text-xs font-black text-black uppercase tracking-wider">
                  <Wallet className="w-3.5 h-3.5 text-black" />
                  <span>Connect</span>
                </div>
              </LiquidMetalButton>
            )}

            {/* Wallet Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-[#0e0e13] border border-zinc-800 shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-2.5 border-b border-zinc-800 mb-3">
                  <span className="text-xs font-mono uppercase text-zinc-400">
                    Somnia Shannon Testnet
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">Chain 50312</span>
                </div>

                {wallet.isConnected && (
                  <>
                    <div className="mb-3 space-y-2">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-zinc-400">Wallet Balance</span>
                        <span className="font-bold text-white">{wallet.balance.toFixed(2)} STT</span>
                      </div>
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-zinc-400">Daily Budget Left</span>
                        <span className="text-zinc-200">
                          {budgetLeft.toFixed(0)} / {wallet.dailyBudgetTotal} STT
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={handleFaucet}
                      className="w-full flex items-center justify-center gap-2 py-2.5 mb-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs text-white border border-zinc-700/80 transition-colors font-mono"
                    >
                      {faucetSuccess ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400 font-bold">+25 STT Added!</span>
                        </>
                      ) : (
                        <>
                          <PlusCircle className="w-3.5 h-3.5 text-zinc-300" />
                          <span>Get Testnet STT (Faucet)</span>
                        </>
                      )}
                    </button>
                  </>
                )}

                <button
                  onClick={() => {
                    toggleWatchMode();
                    setDropdownOpen(false);
                  }}
                  className="w-full flex items-center justify-between py-2 px-2.5 rounded-xl text-xs text-zinc-300 hover:bg-zinc-900 hover:text-white transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Eye className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{wallet.isWatchMode ? 'Connect Wallet' : 'Switch to Watch Mode'}</span>
                  </span>
                </button>

                {wallet.isConnected ? (
                  <button
                    onClick={() => {
                      disconnectWallet();
                      setDropdownOpen(false);
                    }}
                    className="w-full text-left py-2 px-2.5 rounded-xl text-xs text-red-400 hover:bg-zinc-900 transition-colors mt-1"
                  >
                    Disconnect Wallet
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      openWalletModal();
                      setDropdownOpen(false);
                    }}
                    className="w-full py-2.5 rounded-xl bg-white text-black font-bold text-xs hover:bg-zinc-200 transition-colors mt-2"
                  >
                    Connect Wallet
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Mobile Quick Status Pill (visible on small screens) */}
          <div className="flex sm:hidden items-center gap-1.5">
            {wallet.isConnected ? (
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="flex items-center gap-1.5 py-1.5 px-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-zinc-200 active:scale-95 transition-transform"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-bold">{wallet.balance.toFixed(0)} STT</span>
              </button>
            ) : wallet.isWatchMode ? (
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="flex items-center gap-1 py-1.5 px-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-[10px] font-mono text-zinc-400"
              >
                <Eye className="w-3 h-3 text-zinc-400" />
                <span>Watch</span>
              </button>
            ) : (
              <button
                onClick={openWalletModal}
                className="py-1.5 px-3 rounded-xl bg-white text-black font-black text-xs uppercase tracking-tight shadow-sm active:scale-95 transition-transform"
              >
                Connect
              </button>
            )}
          </div>

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white transition-colors active:scale-95"
            aria-label="Toggle Navigation Menu"
          >
            <MenuToggleIcon open={mobileMenuOpen} className="w-5 h-5" duration={300} />
          </button>
        </div>
      </div>

      {/* Mobile Slide-Down Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed top-16 right-0 bottom-0 left-0 z-50 bg-[#050507]/98 backdrop-blur-2xl flex flex-col justify-between p-5 border-t border-zinc-800 md:hidden animate-in fade-in zoom-in-95 duration-200 overflow-y-auto">
          <div className="space-y-4">
            <div className="space-y-2">
              <button
                onClick={() => {
                  enterApp();
                  router.push('/');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-sm font-bold uppercase font-mono transition-colors ${
                  pathname === '/' && !isViewingLanding
                    ? 'bg-zinc-800 text-white border border-zinc-700'
                    : 'bg-zinc-900/60 text-zinc-400 hover:text-white border border-zinc-800/60'
                }`}
              >
                <span>This Window</span>
                <span className="text-xs text-zinc-500 font-normal">Live</span>
              </button>
              <Link
                href="/recents"
                onClick={() => {
                  enterApp();
                  setMobileMenuOpen(false);
                }}
                className={`flex items-center justify-between p-3.5 rounded-2xl text-sm font-bold uppercase font-mono transition-colors ${
                  pathname === '/recents'
                    ? 'bg-zinc-800 text-white border border-zinc-700'
                    : 'bg-zinc-900/60 text-zinc-400 hover:text-white border border-zinc-800/60'
                }`}
              >
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4" />
                  <span>Past Windows</span>
                </div>
                <span className="text-xs text-zinc-500 font-normal">History</span>
              </Link>
            </div>

            {/* Mobile Market & Budget Overview Card */}
            <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-3 text-xs font-mono">
              <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
                <span className="text-zinc-400">Current Market</span>
                <span className="font-bold text-white bg-black/60 px-2 py-0.5 rounded border border-zinc-800">
                  {currentMarket.pair} · {currentMarket.length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-emerald-400 font-bold">
                  Green {currentMarket.greenOdds}%
                </span>
                <span className="text-red-400 font-bold">
                  Red {currentMarket.redOdds}%
                </span>
              </div>

              {wallet.isConnected && (
                <div className="pt-2 border-t border-zinc-800/80 space-y-1">
                  <div className="flex justify-between text-[11px] text-zinc-400">
                    <span>Daily Budget Left</span>
                    <span className="text-white font-bold">
                      {budgetLeft.toFixed(0)} / {wallet.dailyBudgetTotal} STT
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-black rounded-full overflow-hidden border border-zinc-800">
                    <div
                      className="h-full bg-white rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(
                          100,
                          (wallet.dailyBudgetSpent / wallet.dailyBudgetTotal) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-zinc-800">
            {wallet.isConnected ? (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs font-mono text-zinc-400 px-1">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{shortenAddress(wallet.address)}</span>
                  </div>
                  <span className="text-white font-bold font-mono">{wallet.balance.toFixed(2)} STT</span>
                </div>

                <button
                  onClick={handleFaucet}
                  className="w-full py-3 rounded-2xl bg-zinc-900 border border-zinc-700 text-white font-mono text-xs flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                >
                  {faucetSuccess ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400 font-bold">+25 STT Added!</span>
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-4 h-4 text-zinc-300" />
                      <span>Get 25 STT (Testnet Faucet)</span>
                    </>
                  )}
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      toggleWatchMode();
                      setMobileMenuOpen(false);
                    }}
                    className="py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono text-xs font-bold"
                  >
                    Watch Mode
                  </button>

                  <button
                    onClick={() => {
                      disconnectWallet();
                      setMobileMenuOpen(false);
                    }}
                    className="py-2.5 rounded-xl bg-red-950/60 border border-red-800/80 text-red-400 font-mono text-xs font-bold"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <LiquidMetalButton
                  onClick={() => {
                    openWalletModal();
                    setMobileMenuOpen(false);
                  }}
                  variant="silver"
                  fullWidth
                  height={48}
                >
                  <div className="flex items-center gap-2 text-xs font-black text-black uppercase tracking-wider">
                    <Wallet className="w-4 h-4" />
                    <span>Connect Wallet</span>
                  </div>
                </LiquidMetalButton>

                <button
                  onClick={() => {
                    toggleWatchMode();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-3 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-300 font-bold text-xs uppercase tracking-wider"
                >
                  {wallet.isWatchMode ? 'Exit Watch Mode' : 'Explore in Watch Mode'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
