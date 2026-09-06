'use client';

import React, { useState } from 'react';
import { useSomnix } from '@/lib/useSomnix';
import { ShieldCheck, RotateCcw } from 'lucide-react';

/**
 * "Stop the refresh habit" extended past a single window: an optional,
 * user-set cap on total collateral locked this session (see
 * lib/hooks/useLock.ts#lockValidation), with a running total so the number
 * is visible before it's a problem, not just enforced silently.
 */
export function SessionBudget() {
  const { sessionBudget, setSessionBudget, sessionLockedTotal, resetSessionTotal, wallet } = useSomnix();
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState('');

  const commit = () => {
    const parsed = Number(input);
    setSessionBudget(input.trim() !== '' && Number.isFinite(parsed) && parsed > 0 ? parsed : null);
    setEditing(false);
    setInput('');
  };

  const pct = sessionBudget ? Math.min(100, Math.round((sessionLockedTotal / sessionBudget) * 100)) : 0;
  const overBudget = sessionBudget !== null && sessionLockedTotal >= sessionBudget;

  return (
    <div className="p-4 rounded-2xl bg-[#0c0c10] border border-zinc-800 space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
          Session Budget
        </span>
        {sessionBudget !== null && (
          <button
            onClick={resetSessionTotal}
            title="Reset this session's locked total (keeps your budget cap)"
            className="text-zinc-500 hover:text-white transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {sessionBudget === null ? (
        editing ? (
          <div className="flex gap-2">
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              autoFocus
              placeholder={`e.g. 50 ${wallet.currencySymbol}`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                if (e.key === 'Escape') {
                  setEditing(false);
                  setInput('');
                }
              }}
              className="flex-1 min-w-0 py-2 px-3 rounded-xl font-mono text-xs bg-[#0f0f14] text-white border border-white focus:outline-none focus:ring-1 focus:ring-white"
            />
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="w-full py-2 rounded-xl font-mono text-xs text-zinc-400 border border-dashed border-zinc-700 hover:border-zinc-500 hover:text-white transition-colors"
          >
            Set a session cap
          </button>
        )
      ) : (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className={overBudget ? 'text-red-400 font-bold' : 'text-white font-bold'}>
              {sessionLockedTotal} / {sessionBudget} {wallet.currencySymbol}
            </span>
            <button onClick={() => setEditing(true)} className="text-zinc-500 hover:text-white text-[11px]">
              Edit
            </button>
          </div>
          <div className="w-full h-1.5 rounded-full bg-zinc-900 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${overBudget ? 'bg-red-500' : 'bg-emerald-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          {editing && (
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              autoFocus
              placeholder={String(sessionBudget)}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                if (e.key === 'Escape') {
                  setEditing(false);
                  setInput('');
                }
              }}
              className="w-full py-2 px-3 rounded-xl font-mono text-xs bg-[#0f0f14] text-white border border-white focus:outline-none focus:ring-1 focus:ring-white"
            />
          )}
        </div>
      )}
    </div>
  );
}
