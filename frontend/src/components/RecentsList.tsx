'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useSomnix } from '@/lib/useSomnix';
import { RecentWindow } from '@/lib/types';
import { ShareCard } from './ShareCard';
import { LiquidMetalButton } from '@/components/ui/liquid-metal-button';
import { generateTradeShareUrl, recentWindowToSharedTrade } from '@/lib/tradeShare';
import {
  TrendingUp,
  TrendingDown,
  Share2,
  Check,
  X,
  Filter,
  Copy,
  ExternalLink,
} from 'lucide-react';

export function RecentsList() {
  const { recents } = useSomnix();
  const [filterPair, setFilterPair] = useState<string>('ALL');
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedForShare, setSelectedForShare] = useState<RecentWindow | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredRecents = useMemo(() => {
    if (filterPair === 'ALL') return recents;
    return recents.filter((r) => r.pair === filterPair);
  }, [recents, filterPair]);

  const stats = useMemo(() => {
    const playedRounds = recents.filter((r) => r.userPlayed);
    const wins = playedRounds.filter((r) => r.userResult === 'right').length;
    const winRate = playedRounds.length > 0 ? Math.round((wins / playedRounds.length) * 100) : 0;
    const totalVolume = playedRounds.reduce((acc, r) => acc + (r.userAmount || 0), 0);
    return { total: recents.length, played: playedRounds.length, wins, winRate, totalVolume };
  }, [recents]);

  const handleOpenShare = (item?: RecentWindow) => {
    setSelectedForShare(item || recents[0] || null);
    setShareModalOpen(true);
  };

  const handleCopyRecentLink = (item: RecentWindow, e: React.MouseEvent) => {
    e.stopPropagation();
    const shared = recentWindowToSharedTrade(item);
    const url = generateTradeShareUrl(shared);
    if (url) {
      navigator.clipboard.writeText(url);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-300">
      {/* Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-[#0c0c10] border border-zinc-800 space-y-1">
          <span className="text-[10px] font-mono text-zinc-500 uppercase block">Total Rounds</span>
          <div className="text-2xl font-black font-mono text-white">{stats.total}</div>
          <span className="text-[11px] font-mono text-zinc-400">1m to 1h Somnia Markets</span>
        </div>

        <div className="p-5 rounded-2xl bg-[#0c0c10] border border-zinc-800 space-y-1">
          <span className="text-[10px] font-mono text-zinc-500 uppercase block">Your Calls</span>
          <div className="text-2xl font-black font-mono text-white">{stats.played}</div>
          <span className="text-[11px] font-mono text-zinc-400">{stats.wins} right calls</span>
        </div>

        <div className="p-5 rounded-2xl bg-[#0c0c10] border border-zinc-800 space-y-1">
          <span className="text-[10px] font-mono text-zinc-500 uppercase block">Win Accuracy</span>
          <div className="text-2xl font-black font-mono text-emerald-400">{stats.winRate}%</div>
          <span className="text-[11px] font-mono text-zinc-400">On-chain resolved</span>
        </div>

        <div className="p-5 rounded-2xl bg-[#0c0c10] border border-zinc-800 space-y-1">
          <span className="text-[10px] font-mono text-zinc-500 uppercase block">Volume Locked</span>
          <div className="text-2xl font-black font-mono text-white">{stats.totalVolume} STT</div>
          <span className="text-[11px] font-mono text-zinc-400">Discipline capped</span>
        </div>
      </div>

      {/* Filter and Share Trigger Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#0e0e13] border border-zinc-800">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-zinc-500 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </span>
          {['ALL', 'BTC', 'ETH'].map((p) => (
            <button
              key={p}
              onClick={() => setFilterPair(p)}
              className={`px-3 py-1.5 rounded-full text-xs font-mono font-bold transition-all ${
                filterPair === p
                  ? 'bg-white text-black shadow-sm'
                  : 'bg-black/60 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        <LiquidMetalButton
          onClick={() => handleOpenShare()}
          variant="silver"
          height={40}
          width={180}
        >
          <div className="flex items-center gap-2 text-xs font-black text-black uppercase tracking-wider">
            <Share2 className="w-3.5 h-3.5" />
            <span>Generate Card</span>
          </div>
        </LiquidMetalButton>
      </div>

      {/* Recents Cards Grid */}
      <div className="space-y-3">
        {filteredRecents.map((item) => {
          const isGreenResult = item.resultSide === 'green';
          const played = item.userPlayed;
          const wasRight = item.userResult === 'right';
          const isUserGreen = item.userSide === 'green';
          const isCopied = copiedId === item.id;

          return (
            <div
              key={item.id}
              className="w-full p-4 sm:p-5 rounded-2xl bg-[#0c0c10] border border-zinc-800/80 hover:border-zinc-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 shadow-sm ${
                    isGreenResult
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-red-500/20 text-red-400 border border-red-500/40'
                  }`}
                >
                  {isGreenResult ? (
                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-red-400" />
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <span className="font-bold text-sm text-white">
                      {item.pair} · {item.length}
                    </span>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${
                        isGreenResult
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                          : 'bg-red-500/20 text-red-400 border-red-500/40'
                      }`}
                    >
                      Finished {item.resultSide.toUpperCase()} ({isGreenResult ? 'Up' : 'Down'})
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-mono text-zinc-400">
                    <span>Start: ${item.startPrice.toLocaleString()}</span>
                    <span>→</span>
                    <span className={`font-semibold ${isGreenResult ? 'text-emerald-400' : 'text-red-400'}`}>
                      End: ${item.endPrice.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-800/80">
                <div className="text-left sm:text-right space-y-0.5 mr-2">
                  {played ? (
                    <>
                      <div className="flex items-center sm:justify-end gap-1.5">
                        <span
                          className={`text-xs font-mono font-bold flex items-center gap-1 ${
                            wasRight ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {wasRight ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <X className="w-3.5 h-3.5 text-red-400" />}
                          {wasRight ? 'Right Call' : 'Wrong Call'}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-zinc-400 block">
                        Locked <strong className={isUserGreen ? 'text-emerald-400' : 'text-red-400'}>{item.userSide?.toUpperCase()}</strong> ({item.userAmount} STT)
                      </span>
                    </>
                  ) : (
                    <span className="text-xs font-mono text-zinc-600">
                      Skipped (Watched)
                    </span>
                  )}
                </div>

                <button
                  onClick={(e) => handleCopyRecentLink(item, e)}
                  className="flex items-center gap-1.5 py-2 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-mono text-zinc-300 hover:text-white transition-colors"
                  title="Copy trade link"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400 font-bold">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => handleOpenShare(item)}
                  className="p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition-colors"
                  title="Open Share Card"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <ShareCard
        pair={selectedForShare?.pair || 'BTC'}
        length={selectedForShare?.length || '15m'}
        side={selectedForShare?.userSide || selectedForShare?.resultSide || 'green'}
        amount={selectedForShare?.userAmount || 10}
        startPrice={selectedForShare?.startPrice || 92450}
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
      />
    </div>
  );
}
