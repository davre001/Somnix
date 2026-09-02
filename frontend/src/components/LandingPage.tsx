'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useSomnix } from '@/lib/useSomnix';
import { LiquidMetalButton } from '@/components/ui/liquid-metal-button';
import { HeroMarquee } from '@/components/ui/hero-marquee';

import {
  Wallet,
  Eye,
  EyeOff,
  ShieldCheck,
  Zap,
  ArrowRight,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Shared fade-up helper so we don't repeat ourselves
// ---------------------------------------------------------------------------
const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
});

// ---------------------------------------------------------------------------
// Marquee images  (crypto / finance / tech aesthetic from Unsplash)
// ---------------------------------------------------------------------------
const MARQUEE_IMAGES = [
  {
    src: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&auto=format&fit=crop&q=80',
    alt: 'Crypto trading chart on dark terminal',
  },
  {
    src: 'https://images.unsplash.com/photo-1639762681057-408e52192e55?w=600&auto=format&fit=crop&q=80',
    alt: 'Blockchain glowing network nodes',
  },
  {
    src: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=600&auto=format&fit=crop&q=80',
    alt: 'Security lock on dark background',
  },
  {
    src: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&auto=format&fit=crop&q=80',
    alt: 'Analytics dashboard in dark environment',
  },
  {
    src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&auto=format&fit=crop&q=80',
    alt: 'Serene misty mountain at dawn',
  },
  {
    src: 'https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=600&auto=format&fit=crop&q=80',
    alt: 'Ethereum coin glowing on dark surface',
  },
  {
    src: 'https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=600&auto=format&fit=crop&q=80',
    alt: 'Bitcoin coin close-up',
  },
  {
    src: 'https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=600&auto=format&fit=crop&q=80',
    alt: 'DeFi digital finance abstract',
  },
  {
    src: 'https://images.unsplash.com/photo-1607798748738-b15c40d33d57?w=600&auto=format&fit=crop&q=80',
    alt: 'Data streams in dark tunnel',
  },
  {
    src: 'https://images.unsplash.com/photo-1535223289827-42f1e9919769?w=600&auto=format&fit=crop&q=80',
    alt: 'Futuristic digital network',
  },
];

// ---------------------------------------------------------------------------
export function LandingPage() {
  const { wallet, openWalletModal, enterAppInWatchMode, enterApp } = useSomnix();

  return (
    <div className="w-full flex-1 flex flex-col">
      {/* ── Sticky Top Nav ─────────────────────────────────────────────── */}
      <header className="w-full border-b border-zinc-800/80 bg-[#050507]/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white text-black font-black text-sm flex items-center justify-center tracking-tighter shadow-md">
              SX
            </div>
            <span className="font-black text-lg tracking-tight text-white uppercase">SOMNIX</span>
          </div>

          <div className="flex items-center gap-3">
            {wallet.isConnected ? (
              <LiquidMetalButton onClick={enterApp} variant="silver" height={40} width={150}>
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

                <LiquidMetalButton onClick={openWalletModal} variant="silver" height={40} width={150}>
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

      {/* ── Hero Section ───────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col">
        {/* Text + CTAs block */}
        <section className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-8 sm:pb-12 text-center flex flex-col items-center">

          {/* Main headline – word-by-word stagger */}
          <motion.h1
            className="text-4xl xs:text-5xl sm:text-6xl lg:text-7xl font-black text-white uppercase leading-[1.02]"
            style={{ letterSpacing: '-0.05em' }}
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.07, delayChildren: 0 } },
            }}
          >
            {[
              { text: 'Predict', cls: 'text-white' },
              { text: 'the', cls: 'text-white' },
              { text: 'market.', cls: 'text-white' },
              { text: '\u200B', cls: '', br: true },
              { text: 'Green', cls: 'text-emerald-400' },
              { text: 'or', cls: 'text-white' },
              { text: 'Red.', cls: 'text-red-500' },
              { text: '\u200B', cls: '', br: true },
              { text: 'Zero', cls: 'text-white' },
              { text: 'chart', cls: 'text-white' },
              { text: 'stress.', cls: 'text-white' },
            ].map((w, i) =>
              w.br ? (
                <br key={i} className="hidden sm:block" />
              ) : (
                <motion.span
                  key={i}
                  className={`inline-block ${w.cls}`}
                  variants={{
                    hidden: { opacity: 0, y: 28 },
                    visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
                  }}
                >
                  {w.text}&nbsp;
                </motion.span>
              )
            )}
          </motion.h1>

          {/* Description */}
          <motion.p
            {...fadeUp(0.55)}
            className="mt-5 max-w-xl text-sm sm:text-base text-zinc-400 font-normal leading-relaxed"
            style={{ letterSpacing: '-0.01em', wordSpacing: '-0.04em' }}
          >
            Simple crypto event predictions on Somnia. Choose whether Bitcoin or Ethereum finishes{' '}
            <strong className="text-emerald-400 font-bold">Green (Up)</strong> or{' '}
            <strong className="text-red-400 font-bold">Red (Down)</strong>. Lock your call, put your
            phone down, and claim your winnings when the window ends.
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            {...fadeUp(0.7)}
            className="mt-7 flex flex-col sm:flex-row items-center gap-3 sm:gap-4"
          >
            {wallet.isConnected ? (
              <LiquidMetalButton onClick={enterApp} variant="silver" height={50} width={280}>
                <div className="flex items-center justify-center gap-2 text-xs font-black text-black uppercase tracking-wider px-4">
                  <span>Launch Trading App</span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </div>
              </LiquidMetalButton>
            ) : (
              <>
                <LiquidMetalButton onClick={openWalletModal} variant="silver" height={50} width={290}>
                  <div className="flex items-center justify-center gap-2 text-xs font-black text-black uppercase tracking-wider px-4">
                    <Wallet className="w-4 h-4 shrink-0" />
                    <span>Connect Wallet to Trade</span>
                    <ArrowRight className="w-4 h-4 shrink-0" />
                  </div>
                </LiquidMetalButton>

                <LiquidMetalButton onClick={enterAppInWatchMode} height={50} width={220}>
                  <div className="flex items-center justify-center gap-2 text-xs font-bold text-zinc-200 uppercase tracking-wider px-4">
                    <Eye className="w-4 h-4 text-zinc-400 shrink-0" />
                    <span>Explore Watch Mode</span>
                  </div>
                </LiquidMetalButton>
              </>
            )}
          </motion.div>

          {/* Micro-stats row */}
          <motion.div
            {...fadeUp(0.85)}
            className="mt-8 flex items-center justify-center gap-5 sm:gap-10 text-xs font-mono text-zinc-500"
          >
            <div className="text-center">
              <span className="text-white font-bold block text-sm">1m – 1h</span>
              <span>Windows</span>
            </div>
            <div className="h-6 w-px bg-zinc-800" />
            <div className="text-center">
              <span className="text-white font-bold block text-sm">Hard Cap</span>
              <span>Max Loss = Stake</span>
            </div>
            <div className="h-6 w-px bg-zinc-800" />
            <div className="text-center">
              <span className="text-white font-bold block text-sm">&lt; 1s</span>
              <span>Finality</span>
            </div>
          </motion.div>
        </section>

        {/* ── Animated Marquee strip ──────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55, duration: 0.8 }}
          className="w-full pb-2"
        >
          <HeroMarquee images={MARQUEE_IMAGES} />
        </motion.div>

        {/* ── Feature Cards (animated, glowing) ────────────────────────── */}
        <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-16 sm:pb-20">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
            {[
              {
                icon: <EyeOff className="w-5 h-5" />,
                title: 'Zen Lock & Reveal',
                desc: 'No ticking chart or order book ladder after you lock. Put your phone down. We calculate the result at 0:00.',
                glow: 'group-hover:shadow-[0_0_40px_rgba(255,255,255,0.05)]',
                iconBg: 'bg-zinc-900 border-zinc-700',
                delay: 0,
              },
              {
                icon: <ShieldCheck className="w-5 h-5" />,
                title: 'Hard Cap & Day Budget',
                desc: 'You can only lose what you choose. Built-in daily budget cap prevents over-trading and chasing losses.',
                glow: 'group-hover:shadow-[0_0_40px_rgba(59,130,246,0.08)]',
                iconBg: 'bg-blue-950/60 border-blue-800/40',
                delay: 0.1,
              },
              {
                icon: <Zap className="w-5 h-5 text-emerald-400" />,
                title: 'DreamDEX on Somnia',
                desc: 'Direct integration with Somnia Event Contracts for sub-second finality and fair guaranteed payouts.',
                glow: 'group-hover:shadow-[0_0_40px_rgba(52,211,153,0.1)]',
                iconBg: 'bg-emerald-950/60 border-emerald-800/40',
                delay: 0.2,
              },
            ].map((card, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ delay: card.delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className={`group relative p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-[#0c0c10] border border-zinc-800/80 hover:border-zinc-600/60 transition-all duration-300 space-y-3 overflow-hidden ${card.glow}`}
              >
                {/* Subtle animated gradient blob */}
                <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-white/[0.02] blur-2xl group-hover:scale-150 transition-transform duration-700" />
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold border ${card.iconBg}`}>
                  {card.icon}
                </div>
                <h3 className="text-sm sm:text-base font-bold text-white">{card.title}</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">{card.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── How It Works ──────────────────────────────────────────────── */}
        <section className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          {/* Section header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-3 block">Three steps</span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white uppercase" style={{ letterSpacing: '-0.04em' }}>
              How it works
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 relative">
            {/* Connector line on desktop */}
            <div className="hidden sm:block absolute top-8 left-[16.5%] right-[16.5%] h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />

            {[
              {
                step: '01',
                title: 'Pick your pair & window',
                desc: 'Choose BTC or ETH. Set a time window from 1 minute up to 1 hour. No more decisions after that.',
                color: 'text-white',
                ring: 'ring-zinc-700',
              },
              {
                step: '02',
                title: 'Lock Green or Red',
                desc: 'Tap once. Your stake locks, the live price disappears. Somnix goes zen — no charts, no anxiety.',
                color: 'text-emerald-400',
                ring: 'ring-emerald-800/60',
              },
              {
                step: '03',
                title: 'Claim your winnings',
                desc: 'When the window closes the DreamDEX oracle settles. Winners get ~1.92x, on-chain in under a second.',
                color: 'text-red-400',
                ring: 'ring-red-800/60',
              },
            ].map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ delay: i * 0.15, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col items-center text-center gap-4"
              >
                <div className={`w-16 h-16 rounded-2xl bg-[#0c0c10] border border-zinc-800 ring-1 ${s.ring} flex items-center justify-center shadow-lg relative`}>
                  <span className={`text-2xl font-black font-mono ${s.color}`}>{s.step}</span>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-white">{s.title}</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed max-w-[220px] mx-auto">{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── Glowing Stats Banner ───────────────────────────────────────── */}
        <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="relative rounded-3xl bg-[#0c0c10] border border-zinc-800/80 p-8 sm:p-12 overflow-hidden"
          >
            {/* Ambient glows */}
            <div className="absolute top-0 left-1/4 w-64 h-32 bg-emerald-500/10 blur-3xl rounded-full pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-64 h-32 bg-red-500/10 blur-3xl rounded-full pointer-events-none" />

            <div className="relative grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {[
                { val: '< 1s', label: 'Settlement Time', color: 'text-emerald-400' },
                { val: '~1.92×', label: 'Win Multiplier', color: 'text-white' },
                { val: '50312', label: 'Chain ID', color: 'text-zinc-300' },
                { val: '5', label: 'Window Lengths', color: 'text-white' },
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.4 }}
                  className="space-y-1"
                >
                  <div className={`text-3xl sm:text-4xl font-black font-mono ${stat.color}`} style={{ letterSpacing: '-0.04em' }}>
                    {stat.val}
                  </div>
                  <div className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* ── Why SOMNIX ────────────────────────────────────────────────── */}
        <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-3 block">The edge</span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white uppercase" style={{ letterSpacing: '-0.04em' }}>
              Why SOMNIX?
            </h2>
            <p className="mt-3 text-sm text-zinc-400 max-w-lg mx-auto leading-relaxed">
              Most prediction platforms fight for your attention. SOMNIX is designed to give it back.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {[
              {
                icon: <EyeOff className="w-5 h-5 text-white" />,
                title: 'No charts after lock',
                desc: 'Once you commit, prices vanish. We remove the feed that causes impulsive reactions and second-guessing.',
                glow: 'hover:border-white/20 hover:shadow-[0_0_30px_rgba(255,255,255,0.04)]',
              },
              {
                icon: <ShieldCheck className="w-5 h-5 text-blue-400" />,
                title: 'Hard cap on losses',
                desc: 'Set a daily budget once. Somnix enforces it on-chain — you literally cannot overspend, even if you want to.',
                glow: 'hover:border-blue-800/40 hover:shadow-[0_0_30px_rgba(59,130,246,0.06)]',
              },
              {
                icon: <Zap className="w-5 h-5 text-emerald-400" />,
                title: 'Sub-second on-chain payouts',
                desc: 'Somnia\'s 50,000 TPS throughput means your winnings land before a traditional blockchain even confirms.',
                glow: 'hover:border-emerald-800/40 hover:shadow-[0_0_30px_rgba(52,211,153,0.08)]',
              },
              {
                icon: <ArrowRight className="w-5 h-5 text-red-400" />,
                title: 'One decision per window',
                desc: 'Green or Red. That\'s the entire interface. No spreads, no leverage, no liquidations. Just one clean call.',
                glow: 'hover:border-red-800/40 hover:shadow-[0_0_30px_rgba(239,68,68,0.06)]',
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ delay: i * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className={`group relative p-5 sm:p-6 rounded-2xl bg-[#0c0c10] border border-zinc-800/60 transition-all duration-300 flex gap-4 overflow-hidden ${item.glow}`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />
                <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                  {item.icon}
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-sm font-bold text-white">{item.title}</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── Glowing CTA Banner ────────────────────────────────────────── */}
        <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="relative rounded-3xl bg-[#0c0c10] border border-zinc-800 overflow-hidden p-10 sm:p-16 text-center"
          >
            {/* Big ambient glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[200px] bg-emerald-500/8 blur-[80px] rounded-full pointer-events-none" />
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />

            <div className="relative space-y-5">
              <motion.div
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                className="inline-flex items-center gap-2 text-[11px] font-mono font-semibold uppercase tracking-widest text-emerald-400 bg-emerald-950/50 border border-emerald-800/50 px-3 py-1 rounded-full"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Live on Somnia
              </motion.div>

              <h2
                className="text-3xl sm:text-4xl lg:text-5xl font-black text-white uppercase"
                style={{ letterSpacing: '-0.05em' }}
              >
                Ready to make{' '}
                <span className="text-emerald-400">your call?</span>
              </h2>
              <p className="text-sm text-zinc-400 max-w-md mx-auto leading-relaxed">
                Connect your wallet, set your daily budget, and lock your first Green or Red in under 30 seconds.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <LiquidMetalButton onClick={openWalletModal} variant="silver" height={52} width={270}>
                  <div className="flex items-center justify-center gap-2 text-xs font-black text-black uppercase tracking-wider px-4">
                    <Wallet className="w-4 h-4 shrink-0" />
                    <span>Connect Wallet to Trade</span>
                    <ArrowRight className="w-4 h-4 shrink-0" />
                  </div>
                </LiquidMetalButton>
                <LiquidMetalButton onClick={enterAppInWatchMode} height={52} width={200}>
                  <div className="flex items-center justify-center gap-2 text-xs font-bold text-zinc-200 uppercase tracking-wider px-4">
                    <Eye className="w-4 h-4 text-zinc-400 shrink-0" />
                    <span>Watch Mode</span>
                  </div>
                </LiquidMetalButton>
              </div>
            </div>
          </motion.div>
        </section>
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="w-full border-t border-zinc-800/80 bg-[#07070a] pt-14 pb-10 text-zinc-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-10">
            {/* Brand column */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white text-black font-black text-sm flex items-center justify-center tracking-tighter shadow-md">
                  SX
                </div>
                <span className="font-black text-lg tracking-tight text-white uppercase">SOMNIX</span>
              </div>
              <p className="text-xs text-zinc-400 max-w-sm leading-relaxed">
                The zero-stress binary market prediction engine built on Somnia Shannon Testnet. Predict
                Green or Red, lock your call, and let DreamDEX smart contracts handle guaranteed settlement.
              </p>
              <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 w-fit px-3 py-1.5 rounded-full">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Somnia Shannon Testnet · Operational</span>
              </div>
            </div>

            {/* Markets column */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Prediction Markets</h4>
              <ul className="space-y-2 text-xs font-mono">
                <li><button onClick={enterApp} className="hover:text-white transition-colors text-left">BTC / USD (1m - 1h)</button></li>
                <li><button onClick={enterApp} className="hover:text-white transition-colors text-left">ETH / USD (1m - 1h)</button></li>
                <li><button onClick={enterAppInWatchMode} className="hover:text-white transition-colors text-left">Live Watch Mode</button></li>
                <li><span className="text-zinc-600">SOL / USD (Coming Soon)</span></li>
              </ul>
            </div>

            {/* Network column */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Network &amp; DEX</h4>
              <ul className="space-y-2 text-xs font-mono">
                <li>
                  <a href="https://shannon-explorer.somnia.network" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Shannon Explorer</a>
                </li>
                <li>
                  <a href="https://testnet.somnia.network" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Somnia Testnet Portal</a>
                </li>
                <li>
                  <a href="https://testnet.somnia.network/faucet" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Official STT Faucet</a>
                </li>
                <li><span className="text-zinc-500">Chain ID: 50312</span></li>
              </ul>
            </div>

            {/* Safety column */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Discipline &amp; Safety</h4>
              <ul className="space-y-2 text-xs font-mono">
                <li><span className="text-zinc-300">Daily Budget Caps</span></li>
                <li><span className="text-zinc-300">Hard Cap Loss Guarantee</span></li>
                <li><span className="text-zinc-300">Zen Lock Timers</span></li>
                <li><span className="text-zinc-300">~1.92x Binary Multiplier</span></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] font-mono text-zinc-500">
            <div>© 2026 SOMNIX. Built for Somnia × DreamDEX Event Contracts.</div>
            <div className="text-center sm:text-right text-zinc-500 text-[10px]">
              No financial advice. Smart contracts deployed on Somnia Testnet.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}


