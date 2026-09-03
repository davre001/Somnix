'use client';

import React, { useState } from 'react';
import { useSomnix } from '@/lib/useSomnix';

export function AmountChips() {
  const { selectedAmount, setSelectedAmount, wallet } = useSomnix();
  const presets = [5, 10, 25];
  const isCustomValue = !presets.includes(selectedAmount);

  const [customMode, setCustomMode] = useState(false);
  const [customInput, setCustomInput] = useState('');

  const commitCustom = () => {
    const parsed = Number(customInput);
    if (customInput.trim() !== '' && Number.isFinite(parsed) && parsed > 0) {
      setSelectedAmount(parsed);
    }
    setCustomMode(false);
    setCustomInput('');
  };

  return (
    <div className="w-full flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">Lock Amount</span>
        <span className="text-xs font-mono font-bold text-white">
          {selectedAmount} {wallet.currencySymbol}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {presets.map((preset) => {
          const isSelected = selectedAmount === preset && !customMode;
          return (
            <button
              key={preset}
              onClick={() => {
                setCustomMode(false);
                setSelectedAmount(preset);
              }}
              className={`min-h-[44px] py-2.5 rounded-xl font-mono text-sm font-bold transition-all duration-150 flex items-center justify-center border active:scale-[0.98] ${
                isSelected
                  ? 'bg-white text-black border-white shadow-lg shadow-white/10 scale-[1.01]'
                  : 'bg-[#0f0f14] text-zinc-300 border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900'
              }`}
            >
              {preset}
            </button>
          );
        })}

        {/* Custom amount: a real numeric entry, not a hidden cycle through fixed values */}
        {customMode ? (
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            autoFocus
            placeholder="Amt"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onBlur={commitCustom}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              if (e.key === 'Escape') {
                setCustomMode(false);
                setCustomInput('');
              }
            }}
            className="min-h-[44px] w-full py-2.5 px-2 rounded-xl font-mono text-sm font-bold text-center bg-[#0f0f14] text-white border border-white focus:outline-none focus:ring-1 focus:ring-white"
          />
        ) : (
          <button
            onClick={() => {
              setCustomMode(true);
              setCustomInput(isCustomValue ? String(selectedAmount) : '');
            }}
            className={`min-h-[44px] py-2.5 rounded-xl font-mono text-xs font-bold transition-all duration-150 flex items-center justify-center border active:scale-[0.98] ${
              isCustomValue
                ? 'bg-white text-black border-white shadow-lg shadow-white/10 scale-[1.01]'
                : 'bg-[#0f0f14] text-zinc-400 border-zinc-800 hover:border-zinc-600 hover:text-white'
            }`}
          >
            {isCustomValue ? `${selectedAmount} ${wallet.currencySymbol}` : 'Custom'}
          </button>
        )}
      </div>
    </div>
  );
}
