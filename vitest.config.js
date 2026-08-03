import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  // vitest 4.x bundles vite 8 which warns about plugin-react's esbuild fallback;
  // suppress until plugin-react drops the fallback
  logLevel: 'error',
  test: {
    root: __dirname,
    environment: 'jsdom',
    globals: true,
    setupFiles: [path.resolve(__dirname, './src/__tests__/setup.js')],
    exclude: ['**/node_modules/**', '**/.worktrees/**', '**/.swarm/**', 'tests/**', '**/drafts/**', '**/__tests__/drafts/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      // Global floor; raise critical modules via targeted coverage reports over time.
      thresholds: {
        statements: 42,
        branches: 40,
        functions: 42,
        lines: 42,
      },
      exclude: ['**/node_modules/**', '**/.worktrees/**', 'tests/**', 'server/__tests__/**', 'src/__tests__/**'],
    },
  },
});
