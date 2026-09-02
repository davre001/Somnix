import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Only run vitest-style tests; app.test.ts and sqliteStore.test.ts
    // use node:test and are run separately via the build+node pipeline.
    include: ['src/lib/__tests__/**/*.test.ts'],
  },
});
