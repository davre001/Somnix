'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { EyeOff, ShieldCheck, Zap, TrendingUp, Clock, Wallet } from 'lucide-react';

interface FeatureCard {
  id: number;
  icon: React.ElementType;
  tag: string;
  title: string;
  description: string;
  accent: string;
  iconColor: string;
  tagColor: string;
}

const CARDS: FeatureCard[] = [
  {
    id: 1,
    icon: EyeOff,
    tag: 'ZEN MODE',
    title: 'Zero Chart Stress',
    description:
      'After you lock your call, live prices vanish. No ticking chart, no order book ladder. Put the phone down and breathe.',
    accent: 'from-emerald-500/10 to-transparent',
    iconColor: 'text-emerald-400',
    tagColor: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5',
  },
  {
    id: 2,
    icon: ShieldCheck,
    tag: 'HARD CAP',
    title: 'Hard Cap on Losses',
    description:
      'You can only lose what you choose. Every lock has a fixed max loss — the amount you put in, never more.',
    accent: 'from-blue-500/10 to-transparent',
    iconColor: 'text-blue-400',
    tagColor: 'text-blue-400 border-blue-500/30 bg-blue-500/5',
  },
  {
    id: 3,
    icon: TrendingUp,
    tag: 'SIMPLE CALL',
    title: "Green or Red. That's It.",
    description:
      'Pick whether Bitcoin or Ethereum finishes up (Green) or down (Red) in the current 15m or 1h window. One decision. Clean.',
    accent: 'from-white/5 to-transparent',
    iconColor: 'text-white',
    tagColor: 'text-zinc-300 border-zinc-600/40 bg-zinc-800/30',
  },
  {
    id: 4,
    icon: Zap,
    tag: 'DREAMDEX',
    title: 'Instant On-Chain Payout',
    description:
      'Powered by DreamDEX on Somnia. Fair settlement at 0:00 with sub-second finality. Winnings land in your wallet instantly.',
    accent: 'from-yellow-500/10 to-transparent',
    iconColor: 'text-yellow-400',
    tagColor: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/5',
  },
  {
    id: 5,
    icon: Clock,
    tag: 'WINDOWS',
    title: '15m & 1h Rounds',
    description:
      'Short bursts or longer conviction plays. Choose your window length, lock your call, and let Somnia settle it at close.',
    accent: 'from-purple-500/10 to-transparent',
    iconColor: 'text-purple-400',
    tagColor: 'text-purple-400 border-purple-500/30 bg-purple-500/5',
  },
  {
    id: 6,
    icon: Wallet,
    tag: 'WATCH MODE',
    title: 'Explore Before You Trade',
    description:
      "Enter Watch Mode without connecting a wallet. See live rounds, study odds, and only commit when you're ready.",
    accent: 'from-zinc-400/10 to-transparent',
    iconColor: 'text-zinc-300',
    tagColor: 'text-zinc-300 border-zinc-600/40 bg-zinc-800/30',
  },
];

function getStackStyles(offset: number, total: number) {
  const maxVisible = 4;
  if (offset >= maxVisible) return { display: 'none' as const };

  const scale = 1 - offset * 0.055;
  const translateY = offset * 14;
  const translateZ = -offset * 40;
  const opacity = 1 - offset * 0.18;
  const blur = offset * 0.6;

  return {
    transform: `translateY(${translateY}px) scale(${scale}) translateZ(${translateZ}px)`,
    opacity,
    filter: blur > 0 ? `blur(${blur}px)` : undefined,
    zIndex: total - offset,
  };
}

export function FeatureCardDeck() {
  const [order, setOrder] = useState<number[]>(CARDS.map((_, i) => i));
  const [isAnimating, setIsAnimating] = useState(false);
  const [flyOut, setFlyOut] = useState(false);

  const advance = useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);
    setFlyOut(true);

    setTimeout(() => {
      setOrder((prev) => {
        const next = [...prev];
        const first = next.shift()!;
        next.push(first);
        return next;
      });
      setFlyOut(false);
      setTimeout(() => setIsAnimating(false), 350);
    }, 380);
  }, [isAnimating]);

  useEffect(() => {
    const t = setInterval(advance, 3200);
    return () => clearInterval(t);
  }, [advance]);

  return (
    <div
      className="relative w-full flex flex-col items-center select-none"
      style={{ perspective: '900px' }}
    >
      {/* Dot indicators */}
      <div className="flex items-center gap-1.5 mb-5">
        {CARDS.map((_, i) => (
          <div
            key={i}
            className="transition-all duration-500 rounded-full"
            style={{
              width: order[0] === i ? '20px' : '5px',
              height: '5px',
              background: order[0] === i ? '#fff' : '#3f3f46',
            }}
          />
        ))}
      </div>

      {/* Card stack */}
      <div
        className="relative w-full cursor-pointer"
        style={{ height: '300px', transformStyle: 'preserve-3d' }}
        onClick={advance}
      >
        {order.map((cardIdx, stackPos) => {
          const card = CARDS[cardIdx];
          const Icon = card.icon;
          const isFront = stackPos === 0;
          const styles = getStackStyles(stackPos, order.length);

          return (
            <div
              key={card.id}
              className="absolute inset-0 transition-all duration-[380ms] ease-[cubic-bezier(0.34,1.56,0.64,1)]"
              style={{
                ...styles,
                ...(isFront && flyOut
                  ? {
                      transform: 'translateY(-120%) scale(0.92) rotate(-6deg)',
                      opacity: 0,
                      transition: 'all 380ms cubic-bezier(0.4,0,0.2,1)',
                    }
                  : {}),
              }}
            >
              <div
                className="w-full h-full rounded-2xl border border-zinc-800/80 p-6 flex flex-col justify-between shadow-[0_8px_40px_rgba(0,0,0,0.6)] overflow-hidden relative"
                style={{ background: '#0d0d12' }}
              >
                {/* Gradient wash */}
                <div
                  className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${card.accent} pointer-events-none`}
                />

                <div className="relative z-10 flex flex-col gap-4">
                  {/* Tag + Icon */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${card.tagColor}`}
                    >
                      {card.tag}
                    </span>
                    <div
                      className={`w-9 h-9 rounded-xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-center ${card.iconColor}`}
                    >
                      <Icon size={16} />
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-black text-white uppercase tracking-tight leading-tight">
                    {card.title}
                  </h3>

                  {/* Description */}
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    {card.description}
                  </p>
                </div>

                {/* Progress bar */}
                <div className="relative z-10 mt-4">
                  <div className="w-full h-px bg-zinc-800/80 rounded-full overflow-hidden">
                    {isFront && !flyOut && (
                      <div
                        className="h-full bg-white/30 rounded-full"
                        style={{ animation: 'card-progress 3.2s linear forwards' }}
                      />
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider">
                      Tap to advance
                    </span>
                    <span className="text-[10px] font-mono text-zinc-600">
                      {order[0] + 1} / {CARDS.length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes card-progress {
          from { width: 0%; }
          to   { width: 100%; }
        }
      `}</style>
    </div>
  );
}
