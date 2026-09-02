'use client';

import React from 'react';
import { useSomnix } from '@/lib/useSomnix';
import { ShieldCheck, Info } from 'lucide-react';

export function BudgetLine() {
  const { selectedAmount, wallet } = useSomnix();
  const budgetRemaining = Math.max(0, wallet.dailyBudgetTotal - wallet.dailyBudgetSpent);
  const estPayout = (selectedAmount * 1.92).toFixed(1);

  return (
    <div className="w-full flex flex-col gap-2 p-3.5 rounded-xl bg-black/50 border border-zinc-800/80 text-xs font-mono">
      {/* Max Loss & Payout Guarantee Line */}
      <div className="flex items-start gap-2 text-zinc-300">
        <ShieldCheck className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
        <p className="leading-snug">
          Max loss: <span className="font-bold text-white">{selectedAmount} STT</span>. If right, about{' '}
          <span className="font-bold text-white">+{estPayout} STT</span> back per contract.
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
          {budgetRemaining.toFixed(0)} / {wallet.dailyBudgetTotal} STT left
        </span>
      </div>
    </div>
  );
}
