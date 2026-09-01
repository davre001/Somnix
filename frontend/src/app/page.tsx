'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TopBar } from '@/components/TopBar';
import { WindowSwitch } from '@/components/WindowSwitch';
import { Countdown } from '@/components/Countdown';
import { OddsBar } from '@/components/OddsBar';
import { AmountChips } from '@/components/AmountChips';
import { BudgetLine } from '@/components/BudgetLine';
import { SideButtons } from '@/components/SideButtons';
import { ReasonText } from '@/components/ReasonText';
import { LandingPage } from '@/components/LandingPage';
import { ShareCard } from '@/components/ShareCard';
import { useSomnix } from '@/lib/useSomnix';
import {
  Shield,
  History,
  Share2,
  TrendingUp,
  TrendingDown,
  Info,
  Clock,
  Zap,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const {
    hasEnteredApp,
    currentMarket,
    remainingSeconds,
    lockValidation,
    activeLock,
    wallet,
    recents,
  } = useSomnix();

  const [shareModalOpen, setShareModalOpen] = useState(false);

  // If user already has an active lock that hasn't expired, route them to /locked
  useEffect(() => {
    if (activeLock && activeLock.status === 'locked') {
      if (Date.now() < activeLock.hidePriceUntil) {
        router.push('/locked');
      } else {
        router.push('/reveal');
      }
    }
  }, [activeLock, router]);

  // If user has not connected their wallet and is not in watch mode, show the Landing Page
  if (!hasEnteredApp) {
    return (
      <div className="w-full min-h-screen flex flex-col bg-transparent">
        <LandingPage />
      </div>
    );
  }

  const budgetLeft = Math.max(0, wallet.dailyBudgetTotal - wallet.dailyBudgetSpent);
  const budgetPct = Math.min(100, (wallet.dailyBudgetSpent / wallet.dailyBudgetTotal) * 100);

  return (
    <div className="w-full min-h-screen flex flex-col bg-transparent">
      {/* Top Full-Width Navigation Bar */}
      <TopBar />

      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 flex-1">
        {/* Page Title & Breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white uppercase flex items-center gap-2.5">
              <span>This Window</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-300 font-mono">
                {currentMarket.pair} · {currentMarket.length}
              </span>
            </h1>
            <p className="text-xs font-mono text-zinc-400 mt-0.5">
              Lock your call for this round. Live prices disappear after confirmation.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShareModalOpen(true)}
              className="flex items-center gap-1.5 py-2 px-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-mono text-zinc-300 hover:text-white transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share Card</span>
            </button>
            <Link
              href="/recents"
              className="flex items-center gap-1.5 py-2 px-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-mono text-zinc-300 hover:text-white transition-colors"
            >
              <History className="w-3.5 h-3.5" />
              <span>Round History</span>
            </Link>
          </div>
        </div>

        {/* 2-Column Responsive Dashboard Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Main Action Stage (8 Columns) */}
          <div className="lg:col-span-8 space-y-4">
            {/* Pair & Length Switcher */}
            <WindowSwitch />

            {/* Countdown to Window End */}
            <Countdown
              remainingSeconds={remainingSeconds}
              totalDurationSeconds={currentMarket.length === '15m' ? 900 : 3600}
            />

            {/* Odds Indicator Bar with 70% threshold warning */}
            <OddsBar
              greenOdds={currentMarket.greenOdds}
              redOdds={currentMarket.redOdds}
            />

            {/* Amount Selector Chips */}
            <div className="p-4 rounded-2xl bg-[#0c0c10] border border-zinc-800/80 space-y-3">
              <AmountChips />
              <BudgetLine />
            </div>

            {/* Reason notice if buttons are disabled */}
            {!lockValidation.canLock && (
              <ReasonText reason={lockValidation.reason} />
            )}

            {/* Green & Red Decision Buttons */}
            <SideButtons />
          </div>

          {/* Right Sidebar Information Panels (4 Columns) */}
          <div className="lg:col-span-4 space-y-4">
            {/* Day Budget Tracker Card */}
            {wallet.isConnected && (
              <div className="p-5 rounded-2xl bg-[#0c0c10] border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-white" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Daily Discipline Budget
                    </h3>
                  </div>
                  <span className="text-xs font-mono font-bold text-white">
                    {budgetLeft.toFixed(0)} STT left
                  </span>
                </div>

                <p className="text-[11px] text-zinc-400 leading-snug">
                  SOMNIX sets a hard cap so you never over-trade. Winnings refresh your budget on claim.
                </p>

                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                    <span>Spent: {wallet.dailyBudgetSpent.toFixed(0)} STT</span>
                    <span>Max: {wallet.dailyBudgetTotal} STT</span>
                  </div>
                  <div className="w-full h-2 bg-black rounded-full overflow-hidden border border-zinc-800">
                    <div
                      className="h-full bg-white rounded-full transition-all duration-300"
                      style={{ width: `${budgetPct}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Market Info Summary */}
            <div className="p-5 rounded-2xl bg-[#0c0c10] border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-zinc-400" />
                  Market Facts
                </span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full">
                  Trading Live
                </span>
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between text-zinc-400">
                  <span>Start Price:</span>
                  <span className="text-white font-bold">${currentMarket.startPrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Settlement:</span>
                  <span className="text-zinc-200">DreamDEX Oracle</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Payout Rule:</span>
                  <span className="text-zinc-200">~1.92x Binary</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Post-Lock Price:</span>
                  <span className="text-emerald-400 font-bold">Hidden</span>
                </div>
              </div>
            </div>

            {/* Mini Recent Rounds Feed Preview */}
            <div className="p-5 rounded-2xl bg-[#0c0c10] border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-zinc-400" />
                  Recent Rounds
                </span>
                <Link
                  href="/recents"
                  className="text-[11px] font-mono text-zinc-400 hover:text-white flex items-center gap-1"
                >
                  <span>View all</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="space-y-2">
                {recents.slice(0, 3).map((item) => {
                  const isGreen = item.resultSide === 'green';
                  return (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-xl bg-black/60 border border-zinc-800/80 flex items-center justify-between text-xs font-mono"
                    >
                      <div className="flex items-center gap-2">
                        {isGreen ? (
                          <TrendingUp className="w-3.5 h-3.5 text-white" />
                        ) : (
                          <TrendingDown className="w-3.5 h-3.5 text-zinc-400" />
                        )}
                        <span className="text-white font-bold">{item.pair} {item.length}</span>
                      </div>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        isGreen ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-300'
                      }`}>
                        {item.resultSide.toUpperCase()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Share Card Modal */}
      <ShareCard
        pair={currentMarket.pair}
        length={currentMarket.length}
        side="green"
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
      />
    </div>
  );
}
