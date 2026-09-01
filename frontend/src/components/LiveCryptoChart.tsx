'use client';

import React, { useState } from 'react';
import { WindowPair, WindowLength } from '@/lib/types';
import { cn } from '@/lib/utils';

interface LiveCryptoChartProps {
  pair: WindowPair;
  length?: WindowLength;
  height?: number | string;
  className?: string;
  title?: string;
}

export function LiveCryptoChart({
  pair,
  length = '15m',
  height = 460,
  className = '',
  title,
}: LiveCryptoChartProps) {
  const [isLoading, setIsLoading] = useState(true);

  // Map length to TradingView interval string
  const getIntervalString = (len: WindowLength): string => {
    switch (len) {
      case '1m':
        return '1';
      case '3m':
        return '3';
      case '5m':
        return '5';
      case '15m':
        return '15';
      case '1h':
        return '60';
      default:
        return '15';
    }
  };

  const symbol = pair === 'BTC' ? 'BINANCE:BTCUSDT' : 'BINANCE:ETHUSDT';
  const interval = getIntervalString(length);

  const iframeSrc = `https://s.tradingview.com/widgetembed/?frameElementId=tradingview_chart&symbol=${encodeURIComponent(
    symbol
  )}&interval=${interval}&hidesidetoolbar=1&hidetoptoolbar=1&symboledit=0&saveimage=0&toolbarbg=07070a&theme=dark&style=1&timezone=Etc%2FUTC&locale=en&hideideas=1&hidevolume=1`;

  return (
    <div
      className={cn(
        'w-full rounded-3xl bg-[#07070a] border border-zinc-800 p-3 sm:p-4 flex flex-col shadow-2xl overflow-hidden',
        className
      )}
    >
      {/* Minimalist Top Indicator Header */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 px-1.5 sm:px-2 pb-2.5 mb-1 border-b border-zinc-800/60">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-black text-white text-xs tracking-wider uppercase font-mono">
            {pair === 'BTC' ? 'BTC / USDT' : 'ETH / USDT'} · LIVE CHART
          </span>
        </div>

        <span className="text-[10px] sm:text-[11px] font-mono text-zinc-500 uppercase">
          {title || `${length.toUpperCase()} Candlesticks`}
        </span>
      </div>

      {/* Pure Uncluttered Responsive Chart Container */}
      <div
        className="w-full h-[320px] sm:h-[440px] rounded-2xl overflow-hidden relative bg-[#07070a]"
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#07070a] z-10">
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-mono text-zinc-500">Loading {pair} live chart...</span>
            </div>
          </div>
        )}

        <iframe
          key={`${symbol}-${interval}`}
          src={iframeSrc}
          className="w-full h-full border-0"
          title={`TradingView Chart ${pair}`}
          allowTransparency
          scrolling="no"
          onLoad={() => setIsLoading(false)}
        />
      </div>
    </div>
  );
}
