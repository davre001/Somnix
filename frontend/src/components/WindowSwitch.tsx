'use client';

import React from 'react';
import { useSomnix } from '@/lib/useSomnix';
import { WindowPair, WindowLength } from '@/lib/types';

export function WindowSwitch() {
  const { selectedPair, setSelectedPair, selectedLength, setSelectedLength } = useSomnix();

  const pairs: WindowPair[] = ['BTC', 'ETH'];
  const lengths: WindowLength[] = ['15m', '1h'];

  return (
    <div className="w-full flex items-center justify-between gap-3 p-1.5 rounded-2xl bg-[#0f0f14] border border-zinc-800/90 shadow-inner">
      {/* Coin Selector */}
      <div className="flex-1 flex p-1 rounded-xl bg-black/60 border border-zinc-800/50">
        {pairs.map((pair) => {
          const isSelected = selectedPair === pair;
          return (
            <button
              key={pair}
              onClick={() => setSelectedPair(pair)}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all duration-200 uppercase tracking-wider flex items-center justify-center gap-1.5 ${
                isSelected
                  ? 'bg-white text-black shadow-md shadow-white/10 scale-[1.02]'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-black' : 'bg-zinc-600'}`} />
              {pair}
            </button>
          );
        })}
      </div>

      <div className="h-6 w-px bg-zinc-800" />

      {/* Duration Selector */}
      <div className="flex-1 flex p-1 rounded-xl bg-black/60 border border-zinc-800/50">
        {lengths.map((len) => {
          const isSelected = selectedLength === len;
          return (
            <button
              key={len}
              onClick={() => setSelectedLength(len)}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all duration-200 uppercase tracking-wider flex items-center justify-center gap-1.5 ${
                isSelected
                  ? 'bg-white text-black shadow-md shadow-white/10 scale-[1.02]'
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
