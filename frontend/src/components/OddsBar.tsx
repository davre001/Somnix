'use client';

import React from 'react';
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

interface OddsBarProps {
  greenOdds: number;
  redOdds: number;
}

export function OddsBar({ greenOdds, redOdds }: OddsBarProps) {
  const isGreenExpensive = greenOdds >= 70;
  const isRedExpensive = redOdds >= 70;

  return (
    <div className="w-full flex flex-col gap-2.5 sm:gap-3 p-3.5 sm:p-5 rounded-2xl bg-[#0c0c10] border border-zinc-800/80 shadow-md">
      {/* Header labels with explicit colors */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
          <span className="text-xs font-bold text-emerald-400 tracking-wide flex items-center gap-1">
            Green <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          </span>
          <span className="font-mono text-sm sm:text-base font-black text-emerald-400">{greenOdds}%</span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="font-mono text-sm sm:text-base font-black text-red-400">{redOdds}%</span>
          <span className="text-xs font-bold text-red-400 tracking-wide flex items-center gap-1">
            Red <TrendingDown className="w-3.5 h-3.5 text-red-400" />
          </span>
          <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
        </div>
      </div>

      {/* Vibrant Split Bar */}
      <div className="w-full h-3.5 sm:h-4 bg-black rounded-lg overflow-hidden flex p-0.5 border border-zinc-800">
        <div
          className="h-full bg-emerald-500 rounded-l transition-all duration-700 ease-out shadow-[0_0_12px_rgba(34,197,94,0.6)]"
          style={{ width: `${greenOdds}%` }}
        />
        <div
          className="h-full bg-red-500 rounded-r transition-all duration-700 ease-out shadow-[0_0_12px_rgba(239,68,68,0.6)]"
          style={{ width: `${redOdds}%` }}
        />
      </div>

      {/* Expensive side warning if >= 70% */}
      {isGreenExpensive && (
        <div className="flex items-center gap-2 py-2 px-3 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs font-mono animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-[11px] sm:text-xs leading-snug">
            Green is at <strong className="text-emerald-400 font-bold">{greenOdds}%</strong>.{' '}
            <span className="text-emerald-200 font-semibold">This side is already expensive.</span>
          </span>
        </div>
      )}

      {isRedExpensive && (
        <div className="flex items-center gap-2 py-2 px-3 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs font-mono animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span className="text-[11px] sm:text-xs leading-snug">
            Red is at <strong className="text-red-400 font-bold">{redOdds}%</strong>.{' '}
            <span className="text-red-200 font-semibold">This side is already expensive.</span>
          </span>
        </div>
      )}
    </div>
  );
}
