'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSomnix } from '@/lib/useSomnix';
import { EyeOff, History, Moon, ArrowRight, Copy, Check, Share2 } from 'lucide-react';
import { generateTradeShareUrl, userLockToSharedTrade } from '@/lib/tradeShare';
import { ShareCard } from '@/components/ShareCard';

export function LockPanel() {
  const router = useRouter();
  const { activeLock, wallet } = useSomnix();
  const [timeLeftMs, setTimeLeftMs] = useState<number>(() =>
    activeLock ? Math.max(0, activeLock.hidePriceUntil - Date.now()) : 0
  );
  const [copied, setCopied] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  useEffect(() => {
    if (!activeLock) {
      router.push('/');
      return;
    }

    if (activeLock.hidePriceUntil <= Date.now()) {
      router.push('/reveal');
      return;
    }

    const interval = setInterval(() => {
      const remaining = Math.max(0, activeLock.hidePriceUntil - Date.now());
      setTimeLeftMs(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        router.push('/reveal');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeLock, router]);

  if (!activeLock) return null;

  const totalSeconds = Math.floor(timeLeftMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const isGreen = activeLock.side === 'green';

  const handleCopyLink = () => {
    const sharedData = userLockToSharedTrade(activeLock);
    const url = generateTradeShareUrl(sharedData);
    if (url) {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center text-center space-y-6 sm:space-y-8 animate-in fade-in zoom-in-95 duration-500 py-4 sm:py-6 px-2 sm:px-0">
      {/* Zen Header Badge */}
      <div className="flex items-center gap-2 px-3.5 sm:px-4 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-800 text-xs font-mono text-zinc-300 shadow-sm">
        <Moon className="w-4 h-4 text-zinc-400 shrink-0" />
        <span className="text-[11px] sm:text-xs">Zen State · Live Price Hidden Until Expiry</span>
      </div>

      {/* Main Lock Confirmation Header */}
      <div className="space-y-2 max-w-xl px-2">
        <h1 className="text-3xl xs:text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white uppercase">
          You&apos;re in
        </h1>
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs sm:text-sm font-mono text-zinc-400">
          <span className="text-white font-bold">{activeLock.pair} · {activeLock.length}</span>
          <span className="hidden xs:inline">•</span>
          <span className={`font-bold px-3 py-1 rounded-lg text-xs uppercase ${
            isGreen
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 shadow-[0_0_15px_rgba(34,197,94,0.3)]'
              : 'bg-red-500/20 text-red-400 border border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.3)]'
          }`}>
            Locked {activeLock.side.toUpperCase()} · {activeLock.amount} {wallet.currencySymbol}
          </span>
        </div>
      </div>

      {/* Breathing Zen Countdown Ring Container */}
      <div className="relative flex items-center justify-center my-4 sm:my-6">
        <div className={`absolute w-64 h-64 sm:w-80 sm:h-80 rounded-full blur-3xl animate-pulse-ring pointer-events-none ${
          isGreen ? 'bg-emerald-500/15' : 'bg-red-500/15'
        }`} />

        <div className="w-56 h-56 xs:w-64 xs:h-64 sm:w-80 sm:h-80 rounded-full bg-[#0d0d12] border-2 border-zinc-800 flex flex-col items-center justify-center relative shadow-[0_0_80px_rgba(0,0,0,0.9)]">
          <div className="absolute inset-2.5 sm:inset-3 rounded-full border border-dashed border-zinc-800 pointer-events-none" />

          <span className="text-[10px] sm:text-xs font-mono tracking-widest text-zinc-500 uppercase mb-1 sm:mb-2">
            Resolves in
          </span>
          <span className="font-mono text-5xl xs:text-6xl sm:text-7xl font-black text-white tracking-tight">
            {formattedTime}
          </span>
          <span className="text-[11px] sm:text-xs font-mono text-zinc-400 mt-2 sm:mt-3 flex items-center gap-1.5 bg-black/60 px-3 py-1 rounded-full border border-zinc-800">
            <EyeOff className="w-3.5 h-3.5" /> No ticking charts
          </span>
        </div>
      </div>

      {/* Reassurance Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 w-full max-w-3xl text-left text-xs font-mono">
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#0c0c10] border border-zinc-800 space-y-1">
          <span className="text-zinc-500 uppercase text-[10px] block">Position</span>
          <span className={`font-bold text-sm ${isGreen ? 'text-emerald-400' : 'text-red-400'}`}>
            {activeLock.pair} {activeLock.side.toUpperCase()} ({activeLock.amount} {wallet.currencySymbol})
          </span>
          <p className="text-zinc-400 text-[11px]">Settles directly at window end.</p>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#0c0c10] border border-zinc-800 space-y-1">
          <span className="text-zinc-500 uppercase text-[10px] block">Protection</span>
          <span className="font-bold text-white text-sm">
            Max Loss: {activeLock.amount} {wallet.currencySymbol}
          </span>
          <p className="text-zinc-400 text-[11px]">Hard cap guaranteed on-chain.</p>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#0c0c10] border border-zinc-800 space-y-1">
          <span className="text-zinc-500 uppercase text-[10px] block">If {activeLock.side.toUpperCase()} Wins</span>
          <span className="font-bold text-emerald-400 text-sm">
            +{activeLock.payout.toFixed(2)} {wallet.currencySymbol}
          </span>
          <p className="text-zinc-400 text-[11px]">Priced by the live order book at entry (~{(activeLock.price * 100).toFixed(0)}%). Ready for claim once resolved.</p>
        </div>
      </div>

      {/* Share / Copy Link CTAs */}
      <div className="w-full max-w-md grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 pt-2">
        <button
          onClick={handleCopyLink}
          className="w-full py-3 px-5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-mono font-bold text-white transition-all flex items-center justify-center gap-2 shadow-sm active:scale-[0.98]"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-400">Trade Link Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 text-zinc-300" />
              <span>Copy Trade Link</span>
            </>
          )}
        </button>

        <button
          onClick={() => setShareModalOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-2xl bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800 text-xs font-mono text-zinc-300 hover:text-white transition-colors active:scale-[0.98]"
        >
          <Share2 className="w-4 h-4 text-zinc-400" />
          <span>Share Card</span>
        </button>
      </div>

      {/* Navigation Buttons */}
      <div className="grid grid-cols-2 gap-3 w-full max-w-md pt-1">
        <Link
          href="/recents"
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800/60 text-xs font-mono text-zinc-400 hover:text-white transition-colors text-center active:scale-[0.98]"
        >
          <History className="w-4 h-4 shrink-0" />
          <span>Past Rounds</span>
        </Link>
        <Link
          href="/"
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800/60 text-xs font-mono text-zinc-400 hover:text-white transition-colors text-center active:scale-[0.98]"
        >
          <span>Dashboard</span>
          <ArrowRight className="w-4 h-4 shrink-0" />
        </Link>
      </div>

      {/* Share Card Modal */}
      <ShareCard
        pair={activeLock.pair}
        length={activeLock.length}
        side={activeLock.side}
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
      />
    </div>
  );
}
