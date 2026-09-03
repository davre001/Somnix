'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { WindowPair, WindowLength } from '@/lib/types';
import { cn } from '@/lib/utils';

interface TradingViewChartApi {
  setSymbol(symbol: string, callback?: () => void): void;
  setResolution(resolution: string, callback?: () => void): void;
}

interface TradingViewWidgetInstance {
  onChartReady(callback: () => void): void;
  chart(): TradingViewChartApi;
  remove(): void;
}

interface TradingViewWidgetOptions {
  container_id: string;
  autosize?: boolean;
  symbol: string;
  interval: string;
  timezone?: string;
  theme?: string;
  style?: string;
  locale?: string;
  toolbar_bg?: string;
  hide_side_toolbar?: boolean;
  hide_top_toolbar?: boolean;
  allow_symbol_change?: boolean;
  save_image?: boolean;
  hide_volume?: boolean;
  hideideas?: boolean;
}

declare global {
  interface Window {
    TradingView?: {
      widget: new (options: TradingViewWidgetOptions) => TradingViewWidgetInstance;
    };
  }
}

let tvScriptPromise: Promise<void> | null = null;

/** Loads TradingView's embeddable widget script once and reuses it across every chart instance. */
function loadTradingViewScript(): Promise<void> {
  if (window.TradingView) return Promise.resolve();
  if (!tvScriptPromise) {
    tvScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://s3.tradingview.com/tv.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        tvScriptPromise = null;
        reject(new Error('Failed to load TradingView widget script'));
      };
      document.head.appendChild(script);
    });
  }
  return tvScriptPromise;
}

interface LiveCryptoChartProps {
  pair: WindowPair;
  length?: WindowLength;
  className?: string;
  title?: string;
}

export function LiveCryptoChart({
  pair,
  length = '15m',
  className = '',
  title,
}: LiveCryptoChartProps) {
  const [isLoading, setIsLoading] = useState(true);
  const widgetRef = useRef<TradingViewWidgetInstance | null>(null);
  const isFirstUpdate = useRef(true);
  const reactId = useId().replace(/[^a-zA-Z0-9]/g, '');
  const containerId = `tv-chart-${reactId}`;

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

  // Create the widget exactly once per mount.
  useEffect(() => {
    let cancelled = false;

    loadTradingViewScript()
      .then(() => {
        if (cancelled || !window.TradingView) return;
        const widget = new window.TradingView.widget({
          container_id: containerId,
          autosize: true,
          symbol,
          interval,
          timezone: 'Etc/UTC',
          theme: 'dark',
          style: '1',
          locale: 'en',
          toolbar_bg: '#07070a',
          hide_side_toolbar: true,
          hide_top_toolbar: true,
          allow_symbol_change: false,
          save_image: false,
          hide_volume: true,
          hideideas: true,
        });
        widgetRef.current = widget;
        widget.onChartReady(() => {
          if (!cancelled) setIsLoading(false);
        });
      })
      .catch(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
      widgetRef.current?.remove();
      widgetRef.current = null;
    };
    // Intentionally runs once — pair/length switches update the existing widget in
    // place (see below) instead of tearing down and reloading the whole iframe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerId]);

  // Update the live widget in place when pair/length changes, instead of remounting it.
  useEffect(() => {
    if (isFirstUpdate.current) {
      isFirstUpdate.current = false;
      return;
    }
    const widget = widgetRef.current;
    if (!widget) return;
    widget.onChartReady(() => {
      const chart = widget.chart();
      chart.setSymbol(symbol, () => {
        chart.setResolution(interval);
      });
    });
  }, [symbol, interval]);

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

        <div id={containerId} className="w-full h-full" />
      </div>
    </div>
  );
}
