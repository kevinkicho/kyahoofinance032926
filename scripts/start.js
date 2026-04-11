import { spawn } from 'child_process';
import { readFile, unlink } from 'fs/promises';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const isWin = process.platform === 'win32';
const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT_FILE = resolve(__dirname, '..', '.server-port');
const MAX_WAIT_MS = 10000;
const POLL_MS = 200;

const shell = isWin ? true : false;

// Clean up stale port file from previous runs
try { await unlink(PORT_FILE); } catch {}

// Start the backend server
const server = spawn('node', [resolve(__dirname, '..', 'server', 'index.js')], {
  stdio: 'inherit',
  env: { ...process.env },
  shell,
});

// Wait for the server to write .server-port
const start = Date.now();
let backendPort = null;
while (Date.now() - start < MAX_WAIT_MS) {
  try {
    const content = await readFile(PORT_FILE, 'utf8');
    backendPort = parseInt(content, 10);
    if (backendPort > 0) break;
  } catch { /* file not written yet */ }
  await new Promise(r => setTimeout(r, POLL_MS));
}

if (!backendPort) {
  console.error('[start] Timed out waiting for server to write .server-port');
  server.kill();
  process.exit(1);
}

console.log(`[start] Backend is on port ${backendPort}, starting Vite...`);

// Start Vite dev server (it will read .server-port for proxy config)
const vite = spawn('npx', ['vite'], {
  stdio: 'inherit',
  env: { ...process.env },
  shell,
});

// Forward exit signals
const cleanup = (signal) => {
  server.kill(signal);
  vite.kill(signal);
  try { unlink(PORT_FILE); } catch {}
  process.exit(0);
};
process.on('SIGINT', () => cleanup('SIGINT'));
process.on('SIGTERM', () => cleanup('SIGTERM'));

vite.on('exit', (code) => {
  server.kill();
  try { unlink(PORT_FILE); } catch {}
  process.exit(code || 0);
});
server.on('exit', (code) => {
  if (code && code !== 0) {
    console.error(`[start] Backend exited with code ${code}`);
    vite.kill();
    process.exit(code);
  }
});