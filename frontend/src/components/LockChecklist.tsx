'use client';

import React from 'react';
import { Check, X } from 'lucide-react';
import { useSomnix } from '@/lib/useSomnix';

/**
 * Structured pre-lock panel — surfaces every `lockChecks` row (market status,
 * time left, size, balance, duplicate-lock) at once, instead of only the
 * single first-blocking reason a disabled button + tooltip could show.
 */
export function LockChecklist() {
  const { lockChecks } = useSomnix();

  return (
    <div className="w-full grid grid-cols-2 sm:grid-cols-5 gap-2">
      {lockChecks.map((check) => (
        <div
          key={check.key}
          className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl border text-[11px] font-mono ${
            check.ok
              ? 'border-emerald-800/50 bg-emerald-950/30 text-emerald-300'
              : 'border-red-800/50 bg-red-950/30 text-red-300'
          }`}
        >
          {check.ok ? <Check className="w-3.5 h-3.5 shrink-0" /> : <X className="w-3.5 h-3.5 shrink-0" />}
          <div className="min-w-0">
            <div className="uppercase text-[9px] tracking-wide text-zinc-500">{check.label}</div>
            <div className="truncate">{check.detail}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
