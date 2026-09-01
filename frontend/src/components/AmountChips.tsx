'use client';

import React from 'react';
import { useSomnix } from '@/lib/useSomnix';

export function AmountChips() {
  const { selectedAmount, setSelectedAmount } = useSomnix();
  const presets = [5, 10, 25];

  return (
    <div className="w-full flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">Lock Amount</span>
        <span className="text-xs font-mono font-bold text-white">
          {selectedAmount} STT
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {presets.map((preset) => {
          const isSelected = selectedAmount === preset;
          return (
            <button
              key={preset}
              onClick={() => setSelectedAmount(preset)}
              className={`py-2.5 rounded-xl font-mono text-sm font-bold transition-all duration-150 flex items-center justify-center border ${
                isSelected
                  ? 'bg-white text-black border-white shadow-lg shadow-white/10 scale-[1.02]'
                  : 'bg-[#0f0f14] text-zinc-300 border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900'
              }`}
            >
              {preset}
            </button>
          );
        })}

        {/* Custom amount trigger / chip */}
        <button
          onClick={() => {
            const next = selectedAmount === 50 ? 5 : selectedAmount === 25 ? 50 : 25;
            setSelectedAmount(next);
          }}
          className={`py-2.5 rounded-xl font-mono text-xs font-bold transition-all duration-150 flex items-center justify-center border ${
            !presets.includes(selectedAmount)
              ? 'bg-white text-black border-white shadow-lg shadow-white/10 scale-[1.02]'
              : 'bg-[#0f0f14] text-zinc-400 border-zinc-800 hover:border-zinc-600 hover:text-white'
          }`}
        >
          {selectedAmount > 25 ? `${selectedAmount} STT` : 'Custom'}
        </button>
      </div>
    </div>
  );
}
