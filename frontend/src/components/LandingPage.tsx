'use client';

import React from 'react';
import { useSomnix } from '@/lib/useSomnix';
import { LiquidMetalButton } from '@/components/ui/liquid-metal-button';
import { SqueezeCarousel, type SqueezeSlide } from '@/components/ui/carousel-squeeze';

import {
  Wallet,
  Eye,
  EyeOff,
  ShieldCheck,
  Zap,
  TrendingUp,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

const badge = (text: string, color = 'text-white') => (
  <span className={`text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full border border-white/10 bg-black/40 backdrop-blur-sm ${color}`}>
    {text}
  </span>
);

const somnixSlides: SqueezeSlide[] = [
  {
    id: 'zen',
    title: 'Zero chart stress after you lock.',
    description: 'Live prices vanish the moment you lock. No ticker, no ladder. Put the phone down.',
    overlay: badge('Zen Mode', 'text-emerald-300'),
    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=900&auto=format&fit=crop&q=80',
    imageAlt: 'Serene misty mountain at dawn — calm and distraction-free',
  },
  {
    id: 'hardcap',
    title: 'Hard cap. You can only lose what you choose.',
    description: 'Built-in daily budget stops chasing losses. Set it once, Somnix enforces it.',
    overlay: badge('Hard Cap', 'text-blue-300'),
    image: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=900&auto=format&fit=crop&q=80',
    imageAlt: 'Security lock on dark background',
  },
  {
    id: 'predict',
    title: 'One decision. Green or Red.',
    description: 'Pick whether BTC or ETH finishes up or down in 1m, 3m, 5m, 15m, or 1h windows. Clean.',
    overlay: badge('Simple Call', 'text-white'),
    image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=900&auto=format&fit=crop&q=80',
    imageAlt: 'Cryptocurrency price chart on dark trading terminal',
  },
  {
    id: 'dreamdex',
    title: 'Instant on-chain payout via DreamDEX.',
    description: 'Sub-second Somnia finality. Winnings hit your wallet before the page refreshes.',
    overlay: badge('DreamDEX', 'text-yellow-300'),
    image: 'https://images.unsplash.com/photo-1639762681057-408e52192e55?w=900&auto=format&fit=crop&q=80',
    imageAlt: 'Glowing blockchain network nodes in the dark',
  },
  {
    id: 'watchmode',
    title: 'Explore before you commit.',
    description: 'Watch live rounds, study odds, understand payouts — no wallet required.',
    overlay: badge('Watch Mode', 'text-zinc-300'),
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=900&auto=format&fit=crop&q=80',
    imageAlt: 'Analytics dashboard viewed in a dark environment',
  },
];



export function LandingPage() {
  const { wallet, openWalletModal, enterAppInWatchMode, enterApp } = useSomnix();

  return (
    <div className="w-full flex-1 flex flex-col items-center justify-between">
      {/* Top landing navigation bar */}
      <header className="w-full border-b border-zinc-800/80 bg-[#050507]/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white text-black font-black text-sm flex items-center justify-center tracking-tighter shadow-md">
              SX
            </div>
            <div className="flex items-center gap-2">
              <span className="font-black text-lg tracking-tight text-white uppercase">SOMNIX</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-900 text-zinc-300 font-mono font-medium tracking-wider uppercase border border-zinc-700">
                Somnia Testnet
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {wallet.isConnected ? (
              <LiquidMetalButton
                onClick={enterApp}
                variant="silver"
                height={40}
                width={150}
              >
                <div className="flex items-center gap-2 text-xs font-black text-black uppercase tracking-wider">
                  <span>Enter App</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </LiquidMetalButton>
            ) : (
              <>
                <LiquidMetalButton
                  onClick={enterAppInWatchMode}
                  height={38}
                  width={125}
                  className="hidden sm:inline-block"
                >
                  <div className="flex items-center gap-1.5 text-xs font-mono text-zinc-200">
                    <Eye className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Watch Mode</span>
                  </div>
                </LiquidMetalButton>

                <LiquidMetalButton
                  onClick={openWalletModal}
                  variant="silver"
                  height={40}
                  width={150}
                >
                  <div className="flex items-center gap-2 text-xs font-black text-black uppercase tracking-wider">
                    <Wallet className="w-3.5 h-3.5" />
                    <span>Connect</span>
                  </div>
                </LiquidMetalButton>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Hero Section */}
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14 flex-1 flex flex-col justify-center space-y-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          {/* Left Column */}
          <div className="lg:col-span-7 flex flex-col items-start text-left space-y-6">
            <h1 className="text-5xl sm:text-6xl lg:text-6xl font-black text-white uppercase leading-[1.0]" style={{ letterSpacing: '-0.05em' }}>
              Predict the market. <br />
              <span className="text-emerald-400">Green</span>{' '}
              <span className="text-white">or</span>{' '}
              <span className="text-red-500">Red.</span>{' '}
              <br />
              Zero chart stress.
            </h1>

            <p className="text-base sm:text-lg text-zinc-400 max-w-xl font-normal leading-relaxed">
              Simple crypto event predictions on Somnia. Choose whether Bitcoin or Ethereum finishes{' '}
              <strong className="text-emerald-400 font-bold">Green (Up)</strong> or{' '}
              <strong className="text-red-400 font-bold">Red (Down)</strong>. Lock your call, put your phone down, and claim your winnings when the window ends.
            </p>

            {/* CTAs with Liquid Metal Shader Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto pt-2">
              {wallet.isConnected ? (
                <LiquidMetalButton
                  onClick={enterApp}
                  variant="silver"
                  height={54}
                  width={260}
                >
                  <div className="flex items-center gap-2 text-xs font-black text-black uppercase tracking-wider">
                    <span>Launch Trading App</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </LiquidMetalButton>
              ) : (
                <>
                  <LiquidMetalButton
                    onClick={openWalletModal}
                    variant="silver"
                    height={54}
                    width={250}
                  >
                    <div className="flex items-center gap-2 text-xs font-black text-black uppercase tracking-wider">
                      <Wallet className="w-4 h-4" />
                      <span>Connect Wallet to Trade</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </LiquidMetalButton>

                  <LiquidMetalButton
                    onClick={enterAppInWatchMode}
                    height={54}
                    width={210}
                  >
                    <div className="flex items-center gap-2 text-xs font-bold text-zinc-200 uppercase tracking-wider">
                      <Eye className="w-4 h-4 text-zinc-400" />
                      <span>Explore Watch Mode</span>
                    </div>
                  </LiquidMetalButton>
                </>
              )}
            </div>

            {/* Micro stats banner */}
            <div className="flex items-center gap-6 pt-4 border-t border-zinc-800/80 text-xs font-mono text-zinc-400">
              <div>
                <span className="text-white font-bold block text-sm">1m to 1h</span>
                <span>Window Lengths</span>
              </div>
              <div className="h-6 w-px bg-zinc-800" />
              <div>
                <span className="text-white font-bold block text-sm">Hard Cap</span>
                <span>Max Loss = Stake</span>
              </div>
              <div className="h-6 w-px bg-zinc-800" />
              <div>
                <span className="text-white font-bold block text-sm">&lt; 1s</span>
                <span>Somnia Finality</span>
              </div>
            </div>
          </div>

          {/* Right Column: Squeeze Carousel */}
          <div className="lg:col-span-5 w-full self-stretch flex items-stretch">
            <SqueezeCarousel
              slides={somnixSlides}
              label="Somnix Features"
              height={420}
              radius={12}
              gap={10}
              slatWidth={20}
              slatGap={8}
              duration={900}
              autoplay
              interval={5000}
              hoverGrow
              controls={false}
              accent="#18181b"
              accentForeground="#ffffff"
              className="w-full"
              style={{ "--sq-hero": "70cqi" } as React.CSSProperties}
            />
          </div>
        </div>

        {/* 3 Pillar Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
          <div className="p-6 rounded-3xl bg-[#0c0c10] border border-zinc-800/80 hover:border-zinc-600 transition-all duration-200 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white flex items-center justify-center font-bold border border-zinc-800">
              <EyeOff className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Zen Lock &amp; Reveal</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              No ticking chart or order book ladder after you lock. Put your phone down. We calculate the result at 0:00.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-[#0c0c10] border border-zinc-800/80 hover:border-zinc-600 transition-all duration-200 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white flex items-center justify-center font-bold border border-zinc-800">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Hard Cap &amp; Day Budget</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              You can only lose what you choose. Built-in daily budget cap prevents over-trading and chasing losses.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-[#0c0c10] border border-zinc-800/80 hover:border-zinc-600 transition-all duration-200 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white flex items-center justify-center font-bold border border-zinc-800">
              <Zap className="w-5 h-5 text-emerald-400" />
            </div>
            <h3 className="text-base font-bold text-white">DreamDEX on Somnia</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Direct integration with Somnia Shannon Testnet Event Contracts for instant settlements and fair payout rules.
            </p>
          </div>
        </div>
      </main>

      {/* Rich Multi-Column Modern Footer */}
      <footer className="w-full border-t border-zinc-800/80 bg-[#07070a] pt-14 pb-10 mt-16 text-zinc-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Main Footer Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-10">
            {/* Brand & Mission Column (2 Columns wide) */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white text-black font-black text-sm flex items-center justify-center tracking-tighter shadow-md">
                  SX
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-lg tracking-tight text-white uppercase">SOMNIX</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-900 text-zinc-300 font-mono font-medium tracking-wider uppercase border border-zinc-700">
                    Somnia
                  </span>
                </div>
              </div>

              <p className="text-xs text-zinc-400 max-w-sm leading-relaxed">
                The zero-stress binary market prediction engine built on Somnia Shannon Testnet. 
                Predict Green or Red, lock your call, and let DreamDEX smart contracts handle guaranteed settlement.
              </p>

              <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 w-fit px-3 py-1.5 rounded-full">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Somnia Shannon Testnet · Operational</span>
              </div>
            </div>

            {/* Markets Column */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Prediction Markets
              </h4>
              <ul className="space-y-2 text-xs font-mono">
                <li>
                  <button onClick={enterApp} className="hover:text-white transition-colors text-left">
                    BTC / USD (1m - 1h)
                  </button>
                </li>
                <li>
                  <button onClick={enterApp} className="hover:text-white transition-colors text-left">
                    ETH / USD (1m - 1h)
                  </button>
                </li>
                <li>
                  <button onClick={enterAppInWatchMode} className="hover:text-white transition-colors text-left">
                    Live Watch Mode
                  </button>
                </li>
                <li>
                  <span className="text-zinc-600">SOL / USD (Coming Soon)</span>
                </li>
              </ul>
            </div>

            {/* Network & Ecosystem Column */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Network &amp; DEX
              </h4>
              <ul className="space-y-2 text-xs font-mono">
                <li>
                  <a
                    href="https://shannon-explorer.somnia.network"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors flex items-center gap-1.5"
                  >
                    <span>Shannon Explorer</span>
                  </a>
                </li>
                <li>
                  <a
                    href="https://testnet.somnia.network"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors"
                  >
                    Somnia Testnet Portal
                  </a>
                </li>
                <li>
                  <a
                    href="https://testnet.somnia.network/faucet"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors"
                  >
                    Official STT Faucet
                  </a>
                </li>
                <li>
                  <span className="text-zinc-500">Chain ID: 50312</span>
                </li>
              </ul>
            </div>

            {/* Security & Rules Column */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Discipline &amp; Safety
              </h4>
              <ul className="space-y-2 text-xs font-mono">
                <li>
                  <span className="text-zinc-300">Daily Budget Caps</span>
                </li>
                <li>
                  <span className="text-zinc-300">Hard Cap Loss Guarantee</span>
                </li>
                <li>
                  <span className="text-zinc-300">Zen Lock Timers</span>
                </li>
                <li>
                  <span className="text-zinc-300">~1.92x Binary Multiplier</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Copyright & Disclaimer */}
          <div className="pt-8 border-t border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] font-mono text-zinc-500">
            <div>
              © 2026 SOMNIX. Built for Somnia × DreamDEX Event Contracts.
            </div>
            <div className="text-center sm:text-right text-zinc-500 text-[10px]">
              No financial advice. Smart contracts deployed on Somnia Testnet.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
