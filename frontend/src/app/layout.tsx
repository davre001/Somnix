import type { Metadata, Viewport } from 'next';
import { Source_Code_Pro } from 'next/font/google';
import './globals.css';
import { SomnixProvider } from '@/lib/useSomnix';
import { ParticleWave } from '@/components/ui/particle-wave';

const sourceCodePro = Source_Code_Pro({
  variable: '--font-source-code-pro',
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

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
    <html lang="en" className={`${sourceCodePro.variable} dark antialiased`}>
      <head>
        {/* Speeds up the first TradingView widget load (lib/components/LiveCryptoChart.tsx) */}
        <link rel="preconnect" href="https://s3.tradingview.com" />
        <link rel="dns-prefetch" href="https://s3.tradingview.com" />
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
