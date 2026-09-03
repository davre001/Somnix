import type { Metadata, Viewport } from 'next';
import '@fontsource/source-code-pro/400.css';
import '@fontsource/source-code-pro/500.css';
import '@fontsource/source-code-pro/600.css';
import '@fontsource/source-code-pro/700.css';
import './globals.css';
import { SomnixProvider } from '@/lib/useSomnix';
import { ParticleWave } from '@/components/ui/particle-wave';

export const metadata: Metadata = {
  title: 'SOMNIX · Somnia Event Contracts',
  description: 'Simple crypto event predictions on Somnia. Pick Green or Red with zero chart stress.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#050507',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark antialiased">
      <head>
        {/* Speeds up the first TradingView chart load (components/LiveCryptoChart.tsx) */}
        <link rel="preconnect" href="https://s.tradingview.com" />
        <link rel="dns-prefetch" href="https://s.tradingview.com" />
      </head>
      <body className="min-h-screen w-full bg-[#050507] text-zinc-100 flex flex-col font-sans selection:bg-white selection:text-black relative overflow-x-hidden">
        {/* Three.js 3D Undulating Particle Wave Background (30% opacity) */}
        <ParticleWave className="opacity-30" />

        <SomnixProvider>
          <div className="w-full min-h-screen flex flex-col relative z-10">
            {children}
          </div>
        </SomnixProvider>
      </body>
    </html>
  );
}
