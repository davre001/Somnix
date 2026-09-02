'use client';

import React, { useState } from 'react';
import { useSomnix } from '@/lib/useSomnix';
import { UserLock } from '@/lib/types';
import { Loader2, CheckCircle2, AlertCircle, Coins } from 'lucide-react';
import confetti from 'canvas-confetti';

interface ClaimButtonProps {
  lock: UserLock;
  onClaimSuccess?: (txHash?: string) => void;
}

export function ClaimButton({ lock, onClaimSuccess }: ClaimButtonProps) {
  const { claimPayout, wallet } = useSomnix();
  const [status, setStatus] = useState<'idle' | 'claiming' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleClaim = async () => {
    if (status === 'claiming' || status === 'success') return;

    try {
      setStatus('claiming');
      setErrorMsg(null);

      // Trigger celebratory monochrome burst on click
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#ffffff', '#a1a1aa', '#27272a', '#e4e4e7'],
      });

      const res = await claimPayout(lock);

      if (res.success) {
        setStatus('success');
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#ffffff', '#d4d4d8', '#71717a'],
        });
        onClaimSuccess?.(res.txHash);
      } else {
        setStatus('error');
        setErrorMsg(res.reason || 'Claim failed. Please retry.');
      }
    } catch (err: unknown) {
      console.error('Claim error:', err);
      setStatus('error');
      setErrorMsg('Transaction failed. Tap to retry.');
    }
  };

  if (status === 'success' || lock.status === 'claimed') {
    return (
      <div className="w-full flex flex-col items-center gap-2 p-3.5 rounded-2xl bg-zinc-900 border border-zinc-700 text-center animate-in fade-in duration-200">
        <div className="flex items-center gap-2 text-sm font-bold text-white">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Redeemed {lock.payout.toFixed(2)} {wallet.currencySymbol}</span>
        </div>
        <p className="text-[11px] text-zinc-400 font-mono">
          Paid. Budget can be used on the next window.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-2">
      <button
        onClick={handleClaim}
        disabled={status === 'claiming'}
        className="w-full py-4 px-6 rounded-2xl bg-white text-black font-black text-base uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-zinc-100 hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] transition-all duration-200 active:scale-[0.98] disabled:opacity-70 shadow-xl"
      >
        {status === 'claiming' ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin text-black" />
            <span>Confirming on Somnia...</span>
          </>
        ) : (
          <>
            <Coins className="w-5 h-5 text-black" />
            <span>Claim Payout ({lock.payout.toFixed(2)} {wallet.currencySymbol})</span>
          </>
        )}
      </button>

      {status === 'error' && (
        <div className="flex items-center justify-center gap-1.5 text-xs text-red-400 font-mono">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{errorMsg || 'Claim failed. Tap above to try again.'}</span>
        </div>
      )}
    </div>
  );
}
