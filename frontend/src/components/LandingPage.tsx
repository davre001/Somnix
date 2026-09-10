'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useSomnix } from '@/lib/useSomnix';
import { LiquidMetalButton } from '@/components/ui/liquid-metal-button';
import { LiveCryptoChart } from '@/components/LiveCryptoChart';
import { PublicIcon } from '@/components/ui/public-icon';
import { SomnixLogo } from '@/components/ui/somnix-logo';
import FAQ1 from '@/components/ui/faq-monocrhome';
import { CinematicFooter } from '@/components/ui/motion-footer';

// ---------------------------------------------------------------------------
// Shared fade-up helper so we don't repeat ourselves
// ---------------------------------------------------------------------------
const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
});

// Nav section anchors
const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Why Somnix', href: '#why-somnix' },
  { label: 'FAQ', href: '#faq' },
  { label: 'Live Markets', href: '#live-markets' },
];

// ---------------------------------------------------------------------------
export function LandingPage() {
  const { wallet, openWalletModal, enterAppInWatchMode, enterApp } = useSomnix();

  return (
    <div className="w-full flex-1 flex flex-col">
      {/* ── Sticky Top Nav ─────────────────────────────────────────────── */}
      <header className="w-full border-b border-white/[0.06] bg-[#050507]/70 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Brand */}
          <SomnixLogo className="shrink-0" />

          {/* Center section links */}
          <nav className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="group relative px-3.5 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-400 hover:text-white transition-colors"
              >
                {link.label}
                <span className="absolute left-3.5 right-3.5 -bottom-0.5 h-px bg-gradient-to-r from-emerald-400 to-red-400 scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-300" />
              </a>
            ))}
          </nav>

          {/* Right — enter app only when already connected (connect lives in hero) */}
          <div className="flex items-center shrink-0">
            {wallet.isConnected && (
              <LiquidMetalButton onClick={enterApp} variant="silver" height={40} width={140}>
                <div className="flex items-center gap-2 text-xs font-black text-black uppercase tracking-wider">
                  <span>Enter App</span>
                  <PublicIcon name="arrow-right" size={14} />
                </div>
              </LiquidMetalButton>
            )}
          </div>
        </div>

        {/* Mobile section links — horizontal scroll row (hidden on md+) */}
        <nav className="md:hidden border-t border-white/[0.06] overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1 px-4 py-2 w-max">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="shrink-0 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 hover:text-white transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>
        </nav>
      </header>

      {/* ── Hero Section (split: text left · live charts right) ─────────── */}
      <main className="flex-1 flex flex-col">
        <section
          id="live-markets"
          className="relative w-full overflow-hidden"
        >
          {/* Teal radial glow — bottom-center bloom like the reference */}
          <motion.div
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.4 }}
            className="pointer-events-none absolute inset-0"
          >
            <div className="absolute left-1/2 top-1/2 -translate-x-1/3 -translate-y-1/4 w-[900px] max-w-[120vw] h-[620px] bg-emerald-500/[0.13] blur-[120px] rounded-full" />
            <div className="absolute right-0 top-10 w-[520px] max-w-[80vw] h-[420px] bg-emerald-400/[0.08] blur-[110px] rounded-full" />
          </motion.div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-20 pb-14 sm:pb-24">
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-12 lg:gap-8 items-center">
              {/* LEFT — eyebrow, two-tone title, body, pill CTA */}
              <div className="flex flex-col items-start text-left">
                {/* Eyebrow */}
                <motion.span
                  {...fadeUp(0)}
                  className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.22em] text-emerald-300/90 mb-5"
                >
                  Live on Somnia · DreamDEX
                </motion.span>

                {/* Main headline — two-tone, word-by-word stagger */}
                <motion.h1
                  className="text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-[0.98] tracking-tight"
                  style={{ letterSpacing: '-0.045em' }}
                  initial="hidden"
                  animate="visible"
                  variants={{
                    hidden: {},
                    visible: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
                  }}
                >
                  {[
                    { text: 'Call', cls: 'text-white' },
                    { text: 'the', cls: 'text-white' },
                    { text: 'candle.', cls: 'text-white' },
                    { text: '​', cls: '', br: true },
                    { text: 'Hide', cls: 'text-white' },
                    { text: 'the', cls: 'text-white' },
                    {
                      text: 'chart.',
                      cls: 'bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-500 bg-clip-text text-transparent',
                    },
                  ].map((w, i) =>
                    w.br ? (
                      <br key={i} />
                    ) : (
                      <motion.span
                        key={i}
                        className={`inline-block ${w.cls}`}
                        variants={{
                          hidden: { opacity: 0, y: 28 },
                          visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
                        }}
                      >
                        {w.text}&nbsp;
                      </motion.span>
                    )
                  )}
                </motion.h1>

                {/* Body copy */}
                <motion.p
                  {...fadeUp(0.5)}
                  className="mt-6 max-w-md text-base sm:text-lg leading-relaxed text-zinc-400"
                >
                  One tap decides it — <span className="text-emerald-300 font-medium">Green</span> or{' '}
                  <span className="text-red-400 font-medium">Red</span> on Bitcoin and Ethereum. Then the
                  price vanishes, so you put the phone down and let the window run.
                </motion.p>

                {/* Pill CTAs */}
                <motion.div
                  {...fadeUp(0.66)}
                  className="mt-8 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4"
                >
                  {wallet.isConnected ? (
                    <button
                      onClick={enterApp}
                      className="group inline-flex items-center gap-2.5 rounded-full bg-white text-black pl-6 pr-5 py-3 text-sm font-bold tracking-tight transition-all duration-200 hover:gap-3.5 hover:shadow-[0_0_30px_rgba(255,255,255,0.25)] active:scale-95"
                    >
                      <span>Launch Trading App</span>
                      <PublicIcon name="arrow-right" size={16} />
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={openWalletModal}
                        className="group inline-flex items-center gap-2.5 rounded-full border border-white/25 bg-white/[0.03] text-white pl-6 pr-5 py-3 text-sm font-bold tracking-tight backdrop-blur-sm transition-all duration-200 hover:border-white/60 hover:bg-white/[0.06] hover:gap-3.5 active:scale-95"
                      >
                        <PublicIcon name="wallet" size={16} />
                        <span>Connect Wallet</span>
                        <PublicIcon name="arrow-right" size={16} className="text-emerald-300" />
                      </button>

                      <button
                        onClick={enterAppInWatchMode}
                        className="group inline-flex items-center gap-2 text-sm font-semibold text-zinc-400 hover:text-white transition-colors py-3 px-2"
                      >
                        <PublicIcon name="eye" size={16} className="text-zinc-500 group-hover:text-zinc-300 transition-colors" />
                        <span>Watch Mode</span>
                      </button>
                    </>
                  )}
                </motion.div>

                {/* Micro-stats row */}
                <motion.div
                  {...fadeUp(0.78)}
                  className="mt-10 flex flex-wrap items-center gap-x-4 gap-y-3 sm:gap-x-8 text-xs font-mono text-zinc-500"
                >
                  <div>
                    <span className="text-white font-bold block text-sm">1m – 1h</span>
                    <span>Windows</span>
                  </div>
                  <div className="h-7 w-px bg-white/10" />
                  <div>
                    <span className="text-white font-bold block text-sm">Hard Cap</span>
                    <span>Max Loss = Stake</span>
                  </div>
                  <div className="h-7 w-px bg-white/10" />
                  <div>
                    <span className="text-white font-bold block text-sm">&lt; 1s</span>
                    <span>Finality</span>
                  </div>
                </motion.div>
              </div>

              {/* RIGHT — layered / overlapping live trading panels */}
              <motion.div
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className="relative"
              >
                {/* Layered on lg+, simple stack on mobile */}
                <div className="lg:relative lg:h-[560px] flex flex-col gap-5 lg:block">
                  {/* Back panel — ETH, offset up-right, tilted */}
                  <motion.div
                    initial={{ opacity: 0, y: 20, rotate: 0 }}
                    animate={{ opacity: 1, y: 0, rotate: 3 }}
                    transition={{ delay: 0.5, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                    whileHover={{ rotate: 1.5, scale: 1.02 }}
                    className="lg:absolute lg:top-0 lg:right-0 lg:w-[78%] lg:z-10 lg:origin-top-right"
                  >
                    <LiveCryptoChart pair="ETH" length="15m" title="Live Session" />
                  </motion.div>

                  {/* Front panel — BTC, lower-left overlap */}
                  <motion.div
                    initial={{ opacity: 0, y: 30, rotate: 0 }}
                    animate={{ opacity: 1, y: 0, rotate: -2 }}
                    transition={{ delay: 0.65, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                    whileHover={{ rotate: 0, scale: 1.02, y: -4 }}
                    className="lg:absolute lg:bottom-0 lg:left-0 lg:w-[80%] lg:z-20 lg:origin-bottom-left"
                  >
                    <LiveCryptoChart pair="BTC" length="15m" title="Live Session" />
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ── Feature Cards (premium bento) ────────────────────────────── */}
        <section id="features" className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-16 sm:pb-20 scroll-mt-20">
          {/* Section header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12 sm:mb-16"
          >
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-3 block">
              Built on DreamDEX · Somnia testnet
            </span>
            <h2 className="text-4xl font-semibold leading-tight md:text-5xl text-emerald-400">
              A calm way to call it
            </h2>
            <p className="mt-3 text-lg sm:text-xl text-neutral-400 max-w-xl mx-auto leading-snug">
              Real on-chain markets, stripped down to one decision. No order book,
              no leverage, no chart to babysit.
            </p>
          </motion.div>

          {/* Bento grid — hero cell + supporting cells */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 auto-rows-[minmax(0,1fr)]">
            {[
              {
                icon: 'eye-off' as const,
                title: 'Zen Lock & Reveal',
                desc: 'The moment you lock, the live price vanishes until the window ends. No ticking chart, no order-book ladder, no refreshing every few seconds — just a countdown to 0:00. This is the product: it breaks the habit that normal trading apps make worse.',
                tint: 'text-emerald-300',
                iconWrap: 'bg-emerald-400/[0.08] border-emerald-400/20',
                blob: 'bg-emerald-500/10',
                span: 'md:col-span-2 md:row-span-2',
                featured: true,
                delay: 0,
              },
              {
                icon: 'shield' as const,
                title: 'Hard Cap on Losses',
                desc: 'You can only lose what you stake. Every lock has a fixed max loss — no leverage, nothing to liquidate.',
                tint: 'text-blue-300',
                iconWrap: 'bg-blue-400/[0.08] border-blue-400/20',
                blob: 'bg-blue-500/10',
                span: '',
                featured: false,
                delay: 0.08,
              },
              {
                icon: 'bolt' as const,
                title: 'Sub-second Finality',
                desc: 'DreamDEX Event Contracts settle on Somnia in under a second — real order-book odds, real payouts.',
                tint: 'text-amber-300',
                iconWrap: 'bg-amber-400/[0.08] border-amber-400/20',
                blob: 'bg-amber-500/10',
                span: '',
                featured: false,
                delay: 0.16,
              },
              {
                icon: 'users' as const,
                title: 'Real Crowd Odds',
                desc: "See what the market thinks — live Green / Red split from the actual order book, with a warning when one side is already pricey.",
                tint: 'text-white',
                iconWrap: 'bg-white/[0.06] border-white/10',
                blob: 'bg-white/[0.05]',
                span: '',
                featured: false,
                delay: 0.24,
              },
              {
                icon: 'trophy' as const,
                title: 'One-tap Claim',
                desc: 'Winnings never appear by magic. When your side wins on-chain, claim ~1.92× in a single tap — then run it back.',
                tint: 'text-emerald-300',
                iconWrap: 'bg-emerald-400/[0.08] border-emerald-400/20',
                blob: 'bg-emerald-500/10',
                span: '',
                featured: false,
                delay: 0.32,
              },
              {
                icon: 'eye' as const,
                title: 'Watch Mode',
                desc: 'Look around with no wallet — live windows, crowd odds and recent results. Connect only when you want to lock a real call.',
                tint: 'text-blue-300',
                iconWrap: 'bg-blue-400/[0.08] border-blue-400/20',
                blob: 'bg-blue-500/10',
                span: 'md:col-span-2',
                featured: false,
                delay: 0.4,
              },
            ].map((card, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ delay: card.delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -6, scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className={`glass-card group relative rounded-2xl sm:rounded-3xl overflow-hidden cursor-default hover:border-white/25 transition-colors duration-300 flex flex-col ${
                  card.featured ? 'p-6 sm:p-8 justify-between' : 'p-5 sm:p-6'
                } ${card.span}`}
              >
                {/* Animated gradient blob */}
                <div
                  className={`absolute -top-10 -right-10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700 ${card.blob} ${
                    card.featured ? 'w-40 h-40' : 'w-24 h-24'
                  }`}
                />
                <div
                  className={`relative rounded-xl flex items-center justify-center border ${card.iconWrap} ${card.tint} group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-300 ${
                    card.featured ? 'w-14 h-14' : 'w-11 h-11'
                  }`}
                >
                  <PublicIcon name={card.icon} size={card.featured ? 26 : 20} />
                </div>
                <div className={card.featured ? 'relative mt-6 sm:mt-auto sm:pt-8' : 'relative'}>
                  <h3
                    className={`font-bold text-white ${
                      card.featured ? 'text-2xl sm:text-3xl' : 'text-sm sm:text-base mt-3'
                    }`}
                    style={card.featured ? { letterSpacing: '-0.02em' } : undefined}
                  >
                    {card.title}
                  </h3>
                  <p
                    className={`text-zinc-400 leading-relaxed mt-2 ${
                      card.featured ? 'text-base sm:text-lg' : 'text-xs'
                    }`}
                  >
                    {card.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── How It Works (alternating zigzag: big icon + content) ────── */}
        <section id="how-it-works" className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 scroll-mt-20">
          {/* Section header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5 }}
            className="text-center mb-14 sm:mb-20"
          >
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-3 block">
              Lock &amp; Reveal · five steps
            </span>
            <h2 className="text-4xl font-semibold leading-tight md:text-5xl text-emerald-400">
              How it works
            </h2>
            <p className="mt-3 text-lg sm:text-xl text-neutral-400 max-w-xl mx-auto leading-snug">
              You are deciding, not day-trading. A few steps, then you walk away.
            </p>
          </motion.div>

          <div className="flex flex-col gap-12 sm:gap-16">
            {[
              {
                step: '01',
                icon: 'target' as const,
                title: 'Pick pair & window',
                desc: 'Choose BTC or ETH and a window from 1 minute to 1 hour. See the odds and your max loss up front — before you ever commit a cent.',
                tint: 'text-white',
                ring: 'border-white/20',
                glow: 'bg-white/[0.06]',
              },
              {
                step: '02',
                icon: 'lock' as const,
                title: 'Lock Green or Red',
                desc: 'Tap once. Your stake buys the real outcome token on-chain, the live price disappears, and Somnix goes zen.',
                tint: 'text-emerald-300',
                ring: 'border-emerald-400/25',
                glow: 'bg-emerald-400/[0.08]',
              },
              {
                step: '03',
                icon: 'eye-off' as const,
                title: 'Put the phone down',
                desc: 'No chart, no order book, no second-guessing. Just a countdown to 0:00. Leave, live your life, and come back.',
                tint: 'text-blue-300',
                ring: 'border-blue-400/25',
                glow: 'bg-blue-400/[0.08]',
              },
              {
                step: '04',
                icon: 'trophy' as const,
                title: 'Reveal & claim',
                desc: 'The DreamDEX oracle settles on-chain. If you called it, claim ~1.92× — then run it back on the next window.',
                tint: 'text-amber-300',
                ring: 'border-amber-400/25',
                glow: 'bg-amber-400/[0.08]',
              },
              {
                step: '05',
                icon: 'share' as const,
                title: 'Share the card',
                desc: 'Send a friend card — "I locked Green on BTC this hour." One screen tells them the question, so they can join the next window without ever learning DreamDEX.',
                tint: 'text-emerald-300',
                ring: 'border-emerald-400/25',
                glow: 'bg-emerald-400/[0.08]',
              },
            ].map((s, i) => {
              const iconRight = i % 2 === 0; // step 1 icon right, step 2 icon left, ...
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-80px' }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  className={`flex flex-col ${
                    iconRight ? 'md:flex-row' : 'md:flex-row-reverse'
                  } items-center gap-6 sm:gap-10`}
                >
                  {/* Content */}
                  <motion.div
                    initial={{ opacity: 0, x: iconRight ? -30 : 30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: '-80px' }}
                    transition={{ delay: 0.15, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                    className={`flex-1 space-y-3 text-center ${iconRight ? 'md:text-left' : 'md:text-right'}`}
                  >
                    <span className="inline-block text-5xl sm:text-6xl font-black font-mono text-white/10 leading-none">
                      {s.step}
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black text-white" style={{ letterSpacing: '-0.03em' }}>
                      {s.title}
                    </h3>
                    <p
                      className={`text-sm text-zinc-400 leading-relaxed max-w-md ${
                        iconRight ? 'md:mr-auto' : 'md:ml-auto'
                      } mx-auto`}
                    >
                      {s.desc}
                    </p>
                  </motion.div>

                  {/* Big interactive icon */}
                  <motion.div
                    whileHover={{ scale: 1.06, rotate: iconRight ? 4 : -4 }}
                    whileTap={{ scale: 0.97 }}
                    className="relative shrink-0"
                  >
                    <div
                      className={`animate-node-pulse w-32 h-32 sm:w-40 sm:h-40 rounded-3xl glass-card ${s.ring} flex items-center justify-center ${s.tint} cursor-pointer`}
                    >
                      <PublicIcon name={s.icon} size={64} />
                    </div>
                    <div className={`absolute inset-0 -z-10 rounded-3xl ${s.glow} blur-2xl scale-110`} />
                  </motion.div>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* ── Glowing Stats Banner ───────────────────────────────────────── */}
        <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="glass-card relative rounded-3xl p-6 sm:p-12 overflow-hidden"
          >
            {/* Ambient glows */}
            <div className="absolute top-0 left-1/4 w-64 h-32 bg-emerald-500/10 blur-3xl rounded-full pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-64 h-32 bg-red-500/10 blur-3xl rounded-full pointer-events-none" />

            <div className="relative grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 text-center">
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
                  whileHover={{ y: -4 }}
                  className="space-y-1 cursor-default"
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
        <section id="why-somnix" className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 scroll-mt-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-3 block">The edge</span>
            <h2 className="text-4xl font-semibold leading-tight md:text-5xl text-emerald-400">
              Why SOMNIX?
            </h2>
            <p className="mt-3 text-lg sm:text-xl text-neutral-400 max-w-xl mx-auto leading-snug">
              The question is small. The habit is loud. Most platforms make the habit
              worse — SOMNIX is built to give your attention back.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {[
              {
                icon: 'eye-off' as const,
                title: 'No charts after lock',
                desc: 'Once you commit, prices vanish. We remove the feed that causes impulsive reactions and second-guessing.',
                tint: 'text-white',
                iconWrap: 'bg-white/[0.06] border-white/12',
              },
              {
                icon: 'shield' as const,
                title: 'Hard cap on losses',
                desc: 'The most you can ever lose on a call is the amount you locked — losing outcome tokens redeem for zero, never more.',
                tint: 'text-blue-300',
                iconWrap: 'bg-blue-400/[0.08] border-blue-400/20',
              },
              {
                icon: 'bolt' as const,
                title: 'Sub-second on-chain payouts',
                desc: "Somnia's high-throughput chain means your winnings land before a traditional blockchain even confirms a block.",
                tint: 'text-emerald-300',
                iconWrap: 'bg-emerald-400/[0.08] border-emerald-400/20',
              },
              {
                icon: 'target' as const,
                title: 'One decision per window',
                desc: "Green or Red. That's the entire interface. No spreads, no leverage, no liquidations. Just one clean call.",
                tint: 'text-red-300',
                iconWrap: 'bg-red-400/[0.08] border-red-400/20',
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ delay: i * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -5, scale: 1.015 }}
                whileTap={{ scale: 0.99 }}
                className="glass-card group p-5 sm:p-6 rounded-2xl flex gap-4 overflow-hidden cursor-default hover:border-white/25 transition-colors duration-300"
              >
                <div
                  className={`relative w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-300 ${item.iconWrap} ${item.tint}`}
                >
                  <PublicIcon name={item.icon} size={20} />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-sm font-bold text-white">{item.title}</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── FAQ (monochrome accordion) ───────────────────────────────── */}
        <section id="faq" className="w-full scroll-mt-20">
          <FAQ1 />
        </section>

      </main>

      {/* ── Cinematic curtain-reveal footer ───────────────────────────── */}
      <CinematicFooter
        isConnected={wallet.isConnected}
        onConnectWallet={openWalletModal}
        onWatchMode={enterAppInWatchMode}
        onLaunchApp={enterApp}
      />
    </div>
  );
}
