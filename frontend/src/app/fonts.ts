import localFont from 'next/font/local';

/**
 * Self-hosted fonts via next/font/local — no build-time dependency on
 * fonts.googleapis.com (see globals.css note). Files live in ./fonts.
 *
 * - Inter        → UI, headings, body (the primary typeface)
 * - Instrument   → the hero sub-hook / editorial serif accent
 */
export const inter = localFont({
  src: [
    { path: './fonts/inter-400.woff2', weight: '400', style: 'normal' },
    { path: './fonts/inter-500.woff2', weight: '500', style: 'normal' },
    { path: './fonts/inter-600.woff2', weight: '600', style: 'normal' },
    { path: './fonts/inter-700.woff2', weight: '700', style: 'normal' },
    { path: './fonts/inter-800.woff2', weight: '800', style: 'normal' },
    { path: './fonts/inter-900.woff2', weight: '900', style: 'normal' },
  ],
  variable: '--font-inter',
  display: 'swap',
  fallback: ['system-ui', 'sans-serif'],
});

export const instrumentSerif = localFont({
  src: [
    { path: './fonts/instrument-serif-400.woff2', weight: '400', style: 'normal' },
    { path: './fonts/instrument-serif-400-italic.woff2', weight: '400', style: 'italic' },
  ],
  variable: '--font-instrument',
  display: 'swap',
  fallback: ['Georgia', 'serif'],
});
