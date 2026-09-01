'use client';

import React from 'react';
import { Timer, AlertTriangle } from 'lucide-react';

interface CountdownProps {
  remainingSeconds: number;
  totalDurationSeconds?: number;
  compact?: boolean;
}

export function Countdown({
  remainingSeconds,
  totalDurationSeconds = 900,
  compact = false,
}: CountdownProps) {
  const mins = Math.floor(remainingSeconds / 60);
  const secs = remainingSeconds % 60;
  const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const warningThreshold = totalDurationSeconds <= 60 ? 10 : totalDurationSeconds <= 180 ? 20 : totalDurationSeconds <= 300 ? 30 : 60;
  const isEndingSoon = remainingSeconds <= warningThreshold;
  const progressPct = Math.max(0, Math.min(100, (remainingSeconds / totalDurationSeconds) * 100));

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 font-mono text-xs text-zinc-400">
        <Timer className={`w-3.5 h-3.5 ${isEndingSoon ? 'text-amber-400 animate-pulse' : 'text-zinc-500'}`} />
        <span className={isEndingSoon ? 'text-amber-400 font-bold' : 'text-zinc-300'}>{formatted}</span>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center justify-center py-4 px-6 rounded-2xl bg-[#0c0c10] border border-zinc-800/80 shadow-md relative overflow-hidden group">
      {/* Background ambient subtle glow */}
      <div
        className={`absolute -top-10 left-1/2 -translate-x-1/2 w-32 h-20 rounded-full blur-3xl pointer-events-none transition-opacity duration-500 ${
          isEndingSoon ? 'bg-amber-500/20 opacity-90' : 'bg-white/5 opacity-60'
        }`}
      />

      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[11px] font-mono tracking-widest text-zinc-400 uppercase">
          Time Remaining in Window
        </span>
        {isEndingSoon && (
          <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-950/60 border border-amber-800/60 px-1.5 py-0.5 rounded animate-pulse">
            <AlertTriangle className="w-3 h-3" /> &lt;{warningThreshold}s
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-2">
        <span
          className={`font-mono text-4xl sm:text-5xl font-black tracking-tight ${
            isEndingSoon ? 'text-amber-400 animate-pulse' : 'text-white'
          }`}
        >
          {formatted}
        </span>
        <span className="text-xs text-zinc-400 font-mono">left</span>
      </div>

      {/* Progress Bar */}
      <div className="w-full mt-3 h-1.5 bg-zinc-800/80 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-1000 ease-linear rounded-full ${
            isEndingSoon ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]' : 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.4)]'
          }`}
          style={{ width: `${progressPct}%` }}
        />
      </div>
    </div>
  );
}
