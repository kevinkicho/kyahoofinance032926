import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'
import { macroApiPlugin } from './vite.macro-plugin.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const APP_VERSION = (() => {
  try { return execSync('git rev-parse --short HEAD', { cwd: __dirname, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); }
  catch { return `local-${Date.now()}`; }
})();


function appVersionPlugin() {
  return {
    name: 'app-version',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify({ version: APP_VERSION, builtAt: new Date().toISOString() }, null, 2),
      });
    },
  };
}

// Read the backend port from .server-port file (written by server/index.js on startup).
// Falls back to 3001 if file doesn't exist yet.
function getBackendPort() {
  const portFile = path.join(__dirname, '.server-port');
  try { return parseInt(fs.readFileSync(portFile, 'utf8'), 10) || 3001; } catch { return 3001; }
}

// Proxy routes are derived from the canonical shared/route-list.json so the
// Vite dev proxy, the Express server, and Firebase Functions all stay in sync.
// See docs/API_ENDPOINTS.md. Additional non-standard mount paths (compatibility
// aliases like /api/commodities/v2) are appended below.
const SHARED_ROUTE_LIST = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'shared', 'route-list.json'), 'utf8')
);
const API_ROUTES = SHARED_ROUTE_LIST.filter(r => r !== 'macro').map(r => `/api/${r}`).concat([
  '/api/summary', '/api/history', '/api/snapshot',
  '/api/cache', '/api/rate-limits', '/api/health',
  // Compatibility aliases — the server mounts these in addition to the
  // canonical paths. Without proxy entries Vite returns index.html and
  // DataProvider blows up on JSON.parse.
  '/api/commodities/v2',
  '/api/treasury/tic', '/api/treasury/auctions', '/api/treasury/dts',
  '/api/treasury', '/api/fed',
  '/api/census-trade', '/api/eia-petroleum',
]);

function buildProxyConfig() {
  const target = `http://localhost:${getBackendPort()}`;
  const proxy = {};
  for (const r of API_ROUTES) proxy[r] = { target, changeOrigin: true };
  return proxy;
}

export default defineConfig({
  base: '/kyahoofinance032926/',
  plugins: [
    react(),
    macroApiPlugin(),
    appVersionPlugin(),
    visualizer({ filename: 'dist/bundle-stats.html', gzipSize: true, brotliSize: true }),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(APP_VERSION),
  },
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-echarts': ['echarts/core', 'echarts-for-react'],
          'vendor-utils': ['html2canvas', 'papaparse'],
        },
        chunkFileNames: 'assets/[name]-[hash].js',
      },
    },
  },
  server: {
    // Pin the port + strictPort so a stale dev server fails loudly rather
    // than silently shifting to 5174+. The previous `port: 0` setup let two
    // concurrent dev runs both "succeed" on different ports, which made
    // browser tests appear to pass against an outdated app — see Playwright
    // troubleshooting note in README.
    port: 5173,
    strictPort: true,
    proxy: buildProxyConfig(),
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups'
    }
  }
})
