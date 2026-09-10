'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { decodeTradeShareUrl } from '@/lib/tradeShare';
import { useSomnix } from '@/lib/useSomnix';
import { LiquidMetalButton } from '@/components/ui/liquid-metal-button';
import {
  TrendingUp,
  TrendingDown,
  Copy,
  Check,
  Shield,
  Clock,
  Zap,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Sparkles,
} from 'lucide-react';

function TradeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { wallet } = useSomnix();
  const trade = useMemo(() => decodeTradeShareUrl(searchParams), [searchParams]);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!trade || !trade.hidePriceUntil) return;

    const checkTime = () => {
      const remaining = trade.hidePriceUntil! - Date.now();
      if (remaining <= 0) {
        setIsExpired(true);
        setTimeLeft('00:00');
      } else {
        const totalSeconds = Math.floor(remaining / 1000);
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        setTimeLeft(`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
      }
    };

    checkTime();
    const interval = setInterval(checkTime, 1000);
    return () => clearInterval(interval);
  }, [trade]);

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  if (!trade) {
    return (
      <div className="w-full max-w-lg mx-auto text-center py-20 space-y-4">
        <p className="text-zinc-400 font-mono text-sm">Loading trade details...</p>
      </div>
    );
  }

  const isGreen = trade.side === 'green';
  const isResolved = trade.status === 'won' || trade.status === 'lost' || trade.status === 'claimed' || (trade.endPrice !== undefined) || isExpired;
  const isWon = trade.userWon ?? (trade.status === 'won' || trade.status === 'claimed' || (trade.resultSide ? trade.resultSide === trade.side : false));
  const isLive = !isResolved && !isExpired && trade.status === 'locked';

  const formattedDate = new Date(trade.lockedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-between pb-12">
      {/* Top Bar Header */}
      <header className="w-full border-b border-zinc-800/80 bg-[#050507]/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white text-black font-black text-sm flex items-center justify-center tracking-tighter shadow-md">
              SX
            </div>
            <span className="font-black text-lg tracking-tight text-white uppercase">SOMNIX</span>
          </Link>

          <div className="flex items-center gap-3">
            <LiquidMetalButton
              onClick={() => router.push(`/?pair=${trade.pair}&len=${trade.length}`)}
              variant="silver"
              height={40}
              width={160}
            >
              <div className="flex items-center gap-2 text-xs font-black text-black uppercase tracking-wider">
                <span>Enter Somnix</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </LiquidMetalButton>
          </div>
        </div>
      </header>

      {/* Main Trade Information Container */}
      <main className="w-full max-w-3xl mx-auto px-3.5 sm:px-6 py-6 sm:py-10 flex-1 flex flex-col items-center space-y-6 sm:space-y-8 animate-in fade-in zoom-in-95 duration-400">
        
        {/* Trade Status Pill Header */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {isLive ? (
            <div className="flex items-center gap-2 px-3.5 sm:px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/40 text-xs font-mono text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="font-bold uppercase tracking-wider">Live Active Trade</span>
              <span className="text-zinc-500">·</span>
              <span>Resolves in {timeLeft || '00:00'}</span>
            </div>
          ) : isWon ? (
            <div className="flex items-center gap-2 px-3.5 sm:px-4 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/50 text-xs font-mono text-emerald-400 shadow-[0_0_20px_rgba(34,197,94,0.2)]">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="font-bold uppercase tracking-wider">Trade Settled · Won</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3.5 sm:px-4 py-1.5 rounded-full bg-red-500/15 border border-red-500/50 text-xs font-mono text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
              <XCircle className="w-4 h-4 text-red-400" />
              <span className="font-bold uppercase tracking-wider">Trade Settled · Finished Opposite</span>
            </div>
          )}

          <div className="px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-400">
            {trade.pair} {trade.length} Window
          </div>
        </div>

        {/* Big Trade Card */}
        <div className="w-full rounded-2xl sm:rounded-3xl bg-[#0c0c10] border border-zinc-800 p-4 sm:p-8 space-y-5 sm:space-y-6 shadow-2xl relative overflow-hidden">
          {/* Subtle glowing ambient backdrop */}
          <div
            className={`absolute top-0 right-0 w-80 h-80 rounded-full blur-[100px] pointer-events-none opacity-20 ${
              isGreen ? 'bg-emerald-500' : 'bg-red-500'
            }`}
          />

          {/* Trade Main Call Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 sm:pb-6 border-b border-zinc-800/80 relative">
            <div>
              <span className="text-[10px] sm:text-[11px] font-mono uppercase text-zinc-500 tracking-wider block mb-1">
                Trader&apos;s Position
              </span>
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-bold shadow-lg ${
                    isGreen
                      ? 'bg-emerald-500 text-black'
                      : 'bg-red-600 text-white'
                  }`}
                >
                  {isGreen ? (
                    <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
                  ) : (
                    <TrendingDown className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
                  )}
                </div>
                <div>
                  <h2 className="text-xl xs:text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
                    {trade.pair} ·{' '}
                    <span className={isGreen ? 'text-emerald-400' : 'text-red-500'}>
                      {trade.side.toUpperCase()} ({isGreen ? 'UP' : 'DOWN'})
                    </span>
                  </h2>
                  <p className="text-[11px] sm:text-xs font-mono text-zinc-400">
                    Locked on {formattedDate}
                  </p>
                </div>
              </div>
            </div>

            {/* Stake Box */}
            <div className="text-left sm:text-right bg-zinc-900/80 sm:bg-transparent p-3 sm:p-0 rounded-xl border sm:border-0 border-zinc-800">
              <span className="text-[10px] sm:text-[11px] font-mono uppercase text-zinc-500 tracking-wider block">
                Stake Amount
              </span>
              <span className="text-xl sm:text-2xl font-black text-white font-mono">
                {trade.amount} {wallet.currencySymbol}
              </span>
              {trade.payout !== undefined && (
                <span className="text-[11px] font-mono text-emerald-400 block">
                  If right: +{trade.payout.toFixed(2)} {wallet.currencySymbol}
                </span>
              )}
            </div>
          </div>

          {/* Price Reference & Settlement Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 relative">
            <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-black/60 border border-zinc-800/80 space-y-1">
              <span className="text-[10px] sm:text-[11px] font-mono text-zinc-500 uppercase tracking-wider block">
                Start Reference Price
              </span>
              <span className="font-bold text-base sm:text-xl text-white font-mono">
                ${trade.startPrice.toLocaleString()}
              </span>
              <p className="text-[10px] sm:text-[11px] font-mono text-zinc-400">
                Baseline price recorded at round lock
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-black/60 border border-zinc-800/80 space-y-1">
              <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider block">
                Settlement Outcome
              </span>
              {trade.endPrice ? (
                <>
                  <span
                    className={`font-bold text-lg sm:text-xl font-mono ${
                      trade.resultSide === 'green' ? 'text-emerald-400' : 'text-red-500'
                    }`}
                  >
                    ${trade.endPrice.toLocaleString()} (
                    {trade.resultSide?.toUpperCase() || (trade.endPrice >= trade.startPrice ? 'GREEN' : 'RED')})
                  </span>
                  <p className="text-[11px] font-mono text-zinc-400">
                    Settled at window expiry
                  </p>
                </>
              ) : isLive ? (
                <>
                  <span className="font-bold text-lg sm:text-xl text-zinc-300 font-mono flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-400" />
                    <span>In Zen Mode ({timeLeft})</span>
                  </span>
                  <p className="text-[11px] font-mono text-zinc-400">
                    Live prices hidden until 0:00
                  </p>
                </>
              ) : (
                <>
                  <span className="font-bold text-lg sm:text-xl text-zinc-400 font-mono">
                    Settled
                  </span>
                  <p className="text-[11px] font-mono text-zinc-400">
                    Calculated on-chain
                  </p>
                </>
              )}
            </div>
          </div>

          {/* On-Chain & Security Guarantees */}
          <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800 text-xs font-mono space-y-2 text-zinc-400">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-zinc-300">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>Hard Cap Protection</span>
              </span>
              <span className="text-white font-bold">Max Loss = {trade.amount} {wallet.currencySymbol}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-zinc-300">
                <Zap className="w-3.5 h-3.5 text-yellow-400" />
                <span>Settlement Engine</span>
              </span>
              <span className="text-white">DreamDEX Event Contracts</span>
            </div>
            {trade.txHash && (
              <div className="flex items-center justify-between pt-1 border-t border-zinc-800/80">
                <span className="text-zinc-400">Transaction</span>
                <span className="text-emerald-400 font-bold">{trade.txHash}</span>
              </div>
            )}
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
            <button
              onClick={handleCopyLink}
              className="flex-1 py-3.5 px-5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-mono font-bold text-white transition-all flex items-center justify-center gap-2 shadow-sm"
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

            <LiquidMetalButton
              onClick={() => router.push(`/?pair=${trade.pair}&len=${trade.length}`)}
              variant="green"
              height={48}
              fullWidth
              className="flex-1"
            >
              <div className="flex items-center justify-center gap-2 text-xs font-black text-white uppercase tracking-wider whitespace-nowrap">
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>Predict This Round</span>
              </div>
            </LiquidMetalButton>
          </div>
        </div>

        {/* What is Somnix Explainer Box for New Visitors */}
        <div className="w-full p-6 rounded-3xl bg-[#09090c] border border-zinc-800/80 text-left space-y-3">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <span>What is Somnix?</span>
          </h3>
          <p className="text-xs text-zinc-400 font-mono leading-relaxed">
            Somnix is a zero-stress crypto prediction platform on Somnia. Choose whether Bitcoin or Ethereum finishes{' '}
            <strong className="text-emerald-400">Green (Up)</strong> or{' '}
            <strong className="text-red-400">Red (Down)</strong> during 1m, 3m, 5m, 15m, or 1h windows. No liquidation risk, no ticking charts after lock, and instant payouts via DreamDEX.
          </p>
          <div className="pt-1 flex items-center gap-4">
            <Link
              href="/"
              className="text-xs font-mono font-bold text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1"
            >
              <span>Explore live markets</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-zinc-800/80 py-6 text-center text-xs font-mono text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>SOMNIX · Built for Somnia × DreamDEX Event Contracts</span>
          <span>Somnia Shannon Testnet · Chain ID: 50312</span>
        </div>
      </footer>
    </div>
  );
}

export default function TradePage() {
  return (
    <Suspense fallback={<div className="w-full py-20 text-center text-zinc-500 font-mono text-xs">Loading trade...</div>}>
      <TradeContent />
    </Suspense>
  );
}
