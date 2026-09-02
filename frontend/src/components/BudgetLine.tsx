'use client';

import React from 'react';
import { useSomnix } from '@/lib/useSomnix';
import { ShieldCheck, Info } from 'lucide-react';

export function BudgetLine() {
  const { selectedAmount, wallet, currentMarket } = useSomnix();
  const budgetRemaining = Math.max(0, wallet.dailyBudgetTotal - wallet.dailyBudgetSpent);
  // Rough pre-trade estimate from the current book odds — the real payout is set
  // by the price your order actually fills at (see LockPanel once locked).
  const estGreen = currentMarket.greenOdds > 0 ? (selectedAmount / (currentMarket.greenOdds / 100)).toFixed(1) : null;
  const estRed = currentMarket.redOdds > 0 ? (selectedAmount / (currentMarket.redOdds / 100)).toFixed(1) : null;

  return (
    <div className="w-full flex flex-col gap-2 p-3.5 rounded-xl bg-black/50 border border-zinc-800/80 text-xs font-mono">
      {/* Max Loss & Payout Guarantee Line */}
      <div className="flex items-start gap-2 text-zinc-300">
        <ShieldCheck className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
        <p className="leading-snug">
          Max loss: <span className="font-bold text-white">{selectedAmount} {wallet.currencySymbol}</span>.
          {currentMarket.isLive && estGreen && estRed && (
            <>
              {' '}If right, about <span className="font-bold text-emerald-400">+{estGreen}</span> (Green) or{' '}
              <span className="font-bold text-red-400">+{estRed}</span> (Red) {wallet.currencySymbol} back — priced by the live order book.
            </>
          )}
        </p>
      </div>

      <div className="h-px bg-zinc-900 w-full" />

      {/* Daily Budget Tracker */}
      <div className="flex items-center justify-between text-zinc-400">
        <span className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-zinc-500" />
          <span>Today&apos;s budget:</span>
        </span>
        <span className="font-bold text-zinc-200">
          {budgetRemaining.toFixed(0)} / {wallet.dailyBudgetTotal} {wallet.currencySymbol} left
        </span>
      </div>
    </div>
  );
}
