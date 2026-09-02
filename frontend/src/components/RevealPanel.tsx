'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSomnix } from '@/lib/useSomnix';
import { resolveLock } from '@/lib/marketService';
import { ClaimButton } from './ClaimButton';
import { LiquidMetalButton } from '@/components/ui/liquid-metal-button';
import { TrendingUp, TrendingDown, ArrowRight, RotateCw, Trophy, Frown, Copy, Check, Share2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { generateTradeShareUrl, userLockToSharedTrade } from '@/lib/tradeShare';
import { ShareCard } from '@/components/ShareCard';

export function RevealPanel() {
  const router = useRouter();
  const { activeLock, prepareSameAgain, clearLock } = useSomnix();
  const [claimedTx, setClaimedTx] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  const resolution = activeLock ? resolveLock(activeLock) : null;
  const userWon = resolution?.userWon ?? false;
  const resultSide = resolution?.resultSide ?? 'green';

  useEffect(() => {
    if (userWon) {
      confetti({
        particleCount: 90,
        spread: 85,
        origin: { y: 0.5 },
        colors: ['#22c55e', '#ffffff', '#10b981', '#34d399'],
      });
    }
  }, [userWon]);

  if (!activeLock || !resolution) {
    return (
      <div className="w-full text-center py-16 space-y-4">
        <p className="text-zinc-400 font-mono text-sm">No active window to reveal.</p>
        <LiquidMetalButton
          onClick={() => router.push('/')}
          variant="silver"
          height={46}
          width={220}
        >
          <span className="text-xs font-bold uppercase text-black">Go to Live Dashboard</span>
        </LiquidMetalButton>
      </div>
    );
  }

  const handleCopyLink = () => {
    const sharedData = userLockToSharedTrade(
      activeLock,
      resolution.endPrice,
      userWon,
      resultSide
    );
    const url = generateTradeShareUrl(sharedData);
    if (url) {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleSameAgain = () => {
    prepareSameAgain();
    clearLock();
    router.push('/');
  };

  const handleHome = () => {
    clearLock();
    router.push('/');
  };

  const isGreenResult = resultSide === 'green';
  const isUserGreen = activeLock.side === 'green';

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center text-center space-y-6 sm:space-y-8 animate-in fade-in zoom-in-95 duration-400 py-4 sm:py-6 px-2 sm:px-0">
      {/* Window Tag */}
      <div className="px-3.5 sm:px-4 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-400">
        Window Expired · {activeLock.pair} {activeLock.length}
      </div>

      {/* Outcome Announcement */}
      <div className="space-y-2.5 sm:space-y-3">
        <div className="flex items-center justify-center gap-2">
          {userWon ? (
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-3xl bg-emerald-500 text-white flex items-center justify-center shadow-[0_0_40px_rgba(34,197,94,0.5)] animate-bounce">
              <Trophy className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>
          ) : (
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-3xl bg-red-950/80 border border-red-800 text-red-400 flex items-center justify-center shadow-[0_0_25px_rgba(239,68,68,0.3)]">
              <Frown className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>
          )}
        </div>

        <h1 className="text-3xl xs:text-4xl sm:text-5xl font-black tracking-tight uppercase text-white">
          {userWon ? 'You won' : 'You lost'}
        </h1>

        <p className="text-xs sm:text-sm font-mono text-zinc-400">
          Your call was{' '}
          <span className={`font-bold uppercase ${isUserGreen ? 'text-emerald-400' : 'text-red-400'}`}>
            {activeLock.side} ({activeLock.amount} STT)
          </span>
        </p>
      </div>

      {/* Result Breakdown Card */}
      <div className="w-full p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-[#0c0c10] border border-zinc-800 space-y-3.5 sm:space-y-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-1 text-xs font-mono pb-2.5 sm:pb-3 border-b border-zinc-800">
          <span className="text-zinc-400">Window Outcome:</span>
          <div className={`flex items-center gap-1.5 font-bold uppercase ${isGreenResult ? 'text-emerald-400' : 'text-red-400'}`}>
            {isGreenResult ? (
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-400" />
            )}
            <span>Finished {resultSide.toUpperCase()} ({isGreenResult ? 'Up' : 'Down'})</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:gap-4 text-left text-xs font-mono">
          <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-black/60 border border-zinc-800/80">
            <span className="text-[10px] sm:text-[11px] text-zinc-500 uppercase block mb-0.5 sm:mb-1">Start Price</span>
            <span className="font-bold text-zinc-200 text-sm xs:text-base sm:text-lg font-mono">${activeLock.startPrice.toLocaleString()}</span>
          </div>
          <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-black/60 border border-zinc-800/80">
            <span className="text-[10px] sm:text-[11px] text-zinc-500 uppercase block mb-0.5 sm:mb-1">Settlement Price</span>
            <span className={`font-bold text-sm xs:text-base sm:text-lg font-mono ${isGreenResult ? 'text-emerald-400' : 'text-red-400'}`}>
              ${resolution.endPrice.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Payout / Claim Section */}
      {userWon && (
        <div className="w-full">
          <ClaimButton
            lock={activeLock}
            onClaimSuccess={(tx) => setClaimedTx(tx || null)}
          />
        </div>
      )}

      {/* Share / Copy Link Row */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 pt-1">
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
          className="w-full py-3 px-5 rounded-2xl bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800 text-xs font-mono text-zinc-300 hover:text-white transition-colors flex items-center justify-center gap-2 active:scale-[0.98]"
        >
          <Share2 className="w-4 h-4 text-zinc-400" />
          <span>Share Friend Card</span>
        </button>
      </div>

      {/* Action Buttons with Liquid Metal Shader */}
      <div className="w-full grid grid-cols-2 gap-2.5 sm:gap-4 pt-1">
        <LiquidMetalButton
          onClick={handleSameAgain}
          variant="green"
          fullWidth
          height={50}
        >
          <div className="flex items-center gap-2 text-xs font-black text-white uppercase tracking-wider">
            <RotateCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Same Again</span>
          </div>
        </LiquidMetalButton>

        <LiquidMetalButton
          onClick={handleHome}
          fullWidth
          height={50}
        >
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-200 uppercase tracking-wider">
            <span>Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
        </LiquidMetalButton>
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
