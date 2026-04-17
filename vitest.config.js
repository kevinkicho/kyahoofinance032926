import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // vitest 4.x bundles vite 8 which warns about plugin-react's esbuild fallback;
  // suppress until plugin-react drops the fallback
  logLevel: 'error',
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.js'],
    exclude: ['**/node_modules/**', '**/.worktrees/**'],
  },
});
