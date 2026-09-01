'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSomnix } from '@/lib/useSomnix';
import { MarketSide } from '@/lib/types';
import { LiquidMetalButton } from '@/components/ui/liquid-metal-button';
import { ArrowUpRight, ArrowDownRight, Loader2 } from 'lucide-react';

export function SideButtons() {
  const router = useRouter();
  const { lockValidation, executeLock, wallet } = useSomnix();
  const [submittingSide, setSubmittingSide] = useState<MarketSide | null>(null);

  const handleLock = async (side: MarketSide) => {
    if (!lockValidation.canLock || submittingSide) return;

    try {
      setSubmittingSide(side);
      const lock = await executeLock(side);
      if (lock) {
        setTimeout(() => {
          router.push('/locked');
        }, 300);
      }
    } catch (err) {
      console.error('Failed to lock position:', err);
    } finally {
      setSubmittingSide(null);
    }
  };

  if (wallet.isWatchMode) {
    return (
      <div className="w-full p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 text-center space-y-2">
        <p className="text-xs text-zinc-300">You are exploring in <span className="text-white font-bold">Watch Mode</span>.</p>
        <p className="text-[11px] text-zinc-500">Connect wallet to lock calls on Somnia Testnet.</p>
      </div>
    );
  }

  const isDisabled = !lockValidation.canLock;

  return (
    <div className="w-full grid grid-cols-2 gap-4 pt-1">
      {/* Green Button with 3D Liquid Metal Shader */}
      <LiquidMetalButton
        onClick={() => handleLock('green')}
        variant="green"
        disabled={isDisabled || submittingSide !== null}
        fullWidth
        height={68}
      >
        <div className="flex flex-col items-center justify-center py-1">
          <div className="flex items-center gap-1.5 text-white">
            <span className="font-black text-xl sm:text-2xl tracking-tight uppercase">Green</span>
            {submittingSide === 'green' ? (
              <Loader2 className="w-5 h-5 animate-spin text-white" />
            ) : (
              <ArrowUpRight className="w-5 h-5 text-white" />
            )}
          </div>
          <span className="text-[11px] font-mono font-bold text-emerald-200 uppercase">Finish Up</span>
        </div>
      </LiquidMetalButton>

      {/* Red Button with 3D Liquid Metal Shader */}
      <LiquidMetalButton
        onClick={() => handleLock('red')}
        variant="red"
        disabled={isDisabled || submittingSide !== null}
        fullWidth
        height={68}
      >
        <div className="flex flex-col items-center justify-center py-1">
          <div className="flex items-center gap-1.5 text-white">
            <span className="font-black text-xl sm:text-2xl tracking-tight uppercase">Red</span>
            {submittingSide === 'red' ? (
              <Loader2 className="w-5 h-5 animate-spin text-white" />
            ) : (
              <ArrowDownRight className="w-5 h-5 text-white" />
            )}
          </div>
          <span className="text-[11px] font-mono font-bold text-red-200 uppercase">Finish Down</span>
        </div>
      </LiquidMetalButton>
    </div>
  );
}
