import { defineConfig } from 'vitest/config';

// Root-only coverage runner. Deliberately NOT named `vitest.config.ts` so
// that per-package `vitest run` invocations (driven by `turbo run test`)
// don't climb up and discover it — they keep using vitest defaults and run
// only their own package. This config is opt-in via `--config`:
//
//   pnpm test:coverage
//
// It runs every package's tests in one process so coverage aggregates
// across the whole workspace into a single report.
export default defineConfig({
  test: {
    include: ['packages/*/src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      reportsDirectory: 'coverage',
      include: ['packages/*/src/**/*.ts'],
      exclude: [
        '**/__tests__/**',
        '**/*.test.ts',
        '**/*.d.ts',
        'packages/*/src/index.ts',
        'packages/*/src/types/**',
        'packages/*/src/**/types/**',
        'packages/site/src/templates/**',
      ],
    },
  },
});
