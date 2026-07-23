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

// Read the backend port from .server-port (written by server/index.js).
// Re-read on every proxy hop so starting the API after Vite still works,
// and so a stale port file from a dead process does not stick forever.
function getBackendPort() {
  const portFile = path.join(__dirname, '.server-port');
  try {
    const n = parseInt(fs.readFileSync(portFile, 'utf8'), 10);
    if (n > 0) return n;
  } catch { /* missing file */ }
  return parseInt(process.env.PORT || process.env.VITE_API_PORT || '3001', 10) || 3001;
}

function getBackendTarget() {
  return `http://127.0.0.1:${getBackendPort()}`;
}

// Single /api proxy with dynamic target. Prefer one catch-all over dozens of
// per-route entries so new routes work without vite config churn.
// See shared/api-routing.json for the canonical route inventory.
function buildProxyConfig() {
  return {
    '/api': {
      // Initial target (http-proxy requires a string); `router` overrides per request.
      target: getBackendTarget(),
      changeOrigin: true,
      // Re-resolve backend port for every request (server may start after Vite).
      router: () => getBackendTarget(),
      configure: (proxy) => {
        proxy.on('error', (err, _req, res) => {
          const port = getBackendPort();
          console.error(
            `[vite proxy] API backend unreachable at http://127.0.0.1:${port} (${err.code || err.message}).\n` +
            `  → Start the Express server:  npm run server\n` +
            `  → Or run both together:      npm run dev   (starts API + Vite)`
          );
          if (res && !res.headersSent) {
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              error: 'API backend not running',
              hint: 'Run `npm run server` in another terminal, or use `npm run dev` which starts both.',
              target: getBackendTarget(),
            }));
          }
        });
      },
    },
  };
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
