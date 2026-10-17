import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/unit/**/*.{test,spec}.ts', 'tests/golden/**/*.{test,spec}.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve('./src'),
    },
  },
});
