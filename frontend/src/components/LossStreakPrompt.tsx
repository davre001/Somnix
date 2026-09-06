'use client';

import React from 'react';
import { Coffee } from 'lucide-react';

/**
 * The one feature on the roadmap that works against the app's own short-term
 * interest: after 3 losses in a row, ask — don't force — a pause before the
 * next lock. Soft and dismissible on purpose (see SideButtons.tsx#handleLock):
 * a hard block would just be a rule to route around, and this is meant to be
 * a moment of friction against compulsive re-locking, not a limit imposed on
 * the user.
 */
export function LossStreakPrompt({
  streak,
  onContinue,
  onDismiss,
}: {
  streak: number;
  onContinue: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-800/60 space-y-3">
      <div className="flex items-start gap-2.5">
        <Coffee className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="text-xs font-bold text-amber-200">
            {streak} losses in a row
          </p>
          <p className="text-[11px] font-mono text-amber-400/80">
            No pressure — take a breather, or keep going if you&apos;re good.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={onDismiss}
          className="py-2 rounded-xl text-xs font-bold text-amber-100 bg-amber-900/60 hover:bg-amber-900 border border-amber-800 transition-colors active:scale-[0.98]"
        >
          Take a break
        </button>
        <button
          onClick={onContinue}
          className="py-2 rounded-xl text-xs font-bold text-zinc-300 hover:text-white bg-transparent border border-amber-800/60 hover:border-amber-700 transition-colors active:scale-[0.98]"
        >
          Continue anyway
        </button>
      </div>
    </div>
  );
}
