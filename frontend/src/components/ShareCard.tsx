'use client';

import React, { useState } from 'react';
import { Share2, Copy, Check, X } from 'lucide-react';
import { WindowPair, WindowLength, MarketSide } from '@/lib/types';
import { LiquidMetalButton } from '@/components/ui/liquid-metal-button';
import { generateTradeShareUrl } from '@/lib/tradeShare';

interface ShareCardProps {
  pair?: WindowPair;
  length?: WindowLength;
  side?: MarketSide;
  amount?: number;
  startPrice?: number;
  isOpen: boolean;
  onClose: () => void;
}

export function ShareCard({
  pair = 'BTC',
  length = '15m',
  side = 'green',
  amount = 10,
  startPrice = 92450,
  isOpen,
  onClose,
}: ShareCardProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const shareText = `I locked ${side.toUpperCase()} on ${pair} ${length} on SOMNIX (Somnia). Check out my trade here:`;

  const handleCopy = () => {
    const shareUrl = generateTradeShareUrl({
      id: `SX-${Date.now().toString(36).toUpperCase()}`,
      pair,
      length,
      side,
      amount,
      startPrice,
      lockedAt: Date.now(),
      status: 'locked',
    });
    navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isGreen = side === 'green';

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-sm rounded-2xl sm:rounded-3xl bg-[#0e0e13] border border-zinc-800 p-4 sm:p-6 shadow-2xl space-y-4 sm:space-y-5 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 p-1.5 rounded-full bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800 transition-colors active:scale-95"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2">
          <Share2 className="w-4 h-4 text-white" />
          <h3 className="font-bold text-sm text-white">Friend Card</h3>
        </div>

        {/* Visual Share Card Box */}
        <div className="w-full p-5 rounded-2xl bg-gradient-to-br from-black to-zinc-900 border border-zinc-700 shadow-xl space-y-4 text-left">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-white text-black font-black text-xs flex items-center justify-center">
                SX
              </div>
              <span className="font-bold text-sm tracking-tight text-white uppercase">SOMNIX</span>
            </div>
            <span className="text-[10px] font-mono text-zinc-400 uppercase bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
              Somnia Testnet
            </span>
          </div>

          <div className="space-y-1">
            <p className="text-[11px] font-mono text-zinc-400 uppercase">Live Decision</p>
            <p className="text-xl font-black text-white leading-tight">
              I locked{' '}
              <span className={`underline decoration-2 ${isGreen ? 'text-emerald-400 decoration-emerald-400' : 'text-red-400 decoration-red-400'}`}>
                {side.toUpperCase()}
              </span>{' '}
              on {pair} · {length}
            </p>
          </div>

          <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px] font-mono text-zinc-400">
            <span>One guess per window</span>
            <span className="text-white font-bold">No charts</span>
          </div>
        </div>

        {/* Liquid Metal Copy CTA */}
        <LiquidMetalButton
          onClick={handleCopy}
          variant="silver"
          fullWidth
          height={48}
        >
          <div className="flex items-center gap-2 text-xs font-black text-black uppercase tracking-wider">
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Copied Link to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-black" />
                <span>Copy Friend Card</span>
              </>
            )}
          </div>
        </LiquidMetalButton>
      </div>
    </div>
  );
}
