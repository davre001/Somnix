'use client';

import React from 'react';
import { useSomnix } from '@/lib/useSomnix';
import { WindowPair, WindowLength } from '@/lib/types';

export function WindowSwitch() {
  const { selectedPair, setSelectedPair, selectedLength, setSelectedLength, liveLengths } = useSomnix();

  const pairs: WindowPair[] = ['BTC', 'ETH'];
  const lengths: WindowLength[] = ['1m', '3m', '5m', '15m', '1h'];

  return (
    <div className="w-full flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-2.5 p-1.5 rounded-2xl bg-[#0f0f14] border border-zinc-800/90 shadow-inner">
      {/* Coin Selector */}
      <div className="flex sm:w-48 p-1 rounded-xl bg-black/60 border border-zinc-800/50">
        {pairs.map((pair) => {
          const isSelected = selectedPair === pair;
          return (
            <button
              key={pair}
              type="button"
              onClick={() => setSelectedPair(pair)}
              className={`flex-1 py-2.5 sm:py-2 rounded-lg text-xs font-bold transition-all duration-150 uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-[0.98] ${
                isSelected
                  ? 'bg-white text-black shadow-md shadow-white/10 scale-[1.01]'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-black' : 'bg-zinc-600'}`} />
              {pair}
            </button>
          );
        })}
      </div>

      <div className="hidden sm:block h-6 w-px bg-zinc-800" />

      {/* Duration Selector */}
      <div className="flex-1 flex p-1 rounded-xl bg-black/60 border border-zinc-800/50 gap-1 overflow-x-auto scrollbar-none">
        {lengths.map((len) => {
          const isSelected = selectedLength === len;
          // While liveLengths hasn't loaded yet (null), don't disable anything — avoids
          // a flash of every length looking dead before the first fetch lands.
          const isDisabled = liveLengths !== null && !liveLengths.includes(len);
          return (
            <button
              key={len}
              type="button"
              onClick={() => !isDisabled && setSelectedLength(len)}
              disabled={isDisabled}
              title={isDisabled ? 'No live DreamDEX market for this window right now' : undefined}
              aria-disabled={isDisabled}
              className={`flex-1 min-w-[42px] py-2.5 sm:py-2 px-1 rounded-lg text-xs font-mono font-bold transition-all duration-150 uppercase tracking-wider flex items-center justify-center active:scale-[0.98] ${
                isDisabled
                  ? 'text-zinc-600 opacity-40 cursor-not-allowed'
                  : isSelected
                    ? 'bg-white text-black shadow-md shadow-white/10 scale-[1.01]'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
              }`}
            >
              <span>{len}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
