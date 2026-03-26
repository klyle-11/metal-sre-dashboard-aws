import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    // components render in a simulated browser DOM for react testing library
    environment: 'jsdom',
    // describe, it, expect
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['__tets__/**/*.{test,spec}.{ts,tsx}', 'src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', '.next', '__tests__/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      // finds tests
      include: ['src/**/*.{ts,tsx}'],
      // not e2e tests, thats playwright
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.test.{ts,tsx}',
        'src/**/*.spec.{ts,tsx}',
        'src/app/layout.tsx',
        'src/app/**/page.tsx',
      ],
      // test coverage reqs
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
