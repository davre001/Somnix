'use client';

import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ReasonTextProps {
  reason?: string;
}

export function ReasonText({ reason }: ReasonTextProps) {
  if (!reason) return null;

  return (
    <div className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-zinc-900/90 border border-zinc-800 text-zinc-300 text-xs font-mono text-center animate-in fade-in zoom-in-95 duration-150">
      <AlertCircle className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
      <span>{reason}</span>
    </div>
  );
}
