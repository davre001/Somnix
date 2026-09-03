import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      // Real Next.js build tooling intercepts this specially; plain vitest
      // just executes it, and the real package throws unconditionally.
      'server-only': path.resolve(__dirname, 'src/test/emptyShim.ts'),
    },
  },
});
