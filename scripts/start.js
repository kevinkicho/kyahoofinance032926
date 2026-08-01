import { spawn } from 'child_process';
import { readFile, unlink, writeFile } from 'fs/promises';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import http from 'http';

const isWin = process.platform === 'win32';
const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT_FILE = resolve(__dirname, '..', '.server-port');
const MAX_WAIT_MS = 15000;
const POLL_MS = 200;
const DEFAULT_PORT = Number(process.env.PORT || 3001);

const shell = isWin ? true : false;

function probeHealth(port) {
  return new Promise((resolveProbe) => {
    const req = http.get(
      { host: '127.0.0.1', port, path: '/api/health', timeout: 1500 },
      (res) => {
        res.resume();
        resolveProbe(res.statusCode >= 200 && res.statusCode < 500);
      },
    );
    req.on('error', () => resolveProbe(false));
    req.on('timeout', () => {
      req.destroy();
      resolveProbe(false);
    });
  });
}

async function waitForPortFile(timeoutMs = MAX_WAIT_MS) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const content = await readFile(PORT_FILE, 'utf8');
      const port = parseInt(content, 10);
      if (port > 0) return port;
    } catch { /* not yet */ }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
  return null;
}

// Clean stale port file only if nothing healthy is listening there.
try {
  const prev = parseInt(await readFile(PORT_FILE, 'utf8'), 10);
  if (prev > 0 && (await probeHealth(prev))) {
    console.log(`[start] Reusing healthy API already on port ${prev}`);
    await writeFile(PORT_FILE, String(prev), 'utf8');
  } else {
    try { await unlink(PORT_FILE); } catch { /* ok */ }
  }
} catch {
  try { await unlink(PORT_FILE); } catch { /* ok */ }
}

let backendPort = null;
let server = null;

// Prefer existing healthy process on default port (common after crashed start.js).
if (await probeHealth(DEFAULT_PORT)) {
  backendPort = DEFAULT_PORT;
  await writeFile(PORT_FILE, String(backendPort), 'utf8');
  console.log(`[start] Detected healthy Express already on ${backendPort} — not spawning a second one`);
} else {
  const backendEnv = {
    ...process.env,
    PORT: String(DEFAULT_PORT),
  };
  console.log(`[start] Starting Express API (PORT=${backendEnv.PORT})…`);
  server = spawn('node', [resolve(__dirname, '..', 'server', 'index.js')], {
    stdio: 'inherit',
    env: backendEnv,
    shell,
  });

  backendPort = await waitForPortFile();
  if (!backendPort) {
    // Server may have failed with EADDRINUSE but another instance is healthy now
    if (await probeHealth(DEFAULT_PORT)) {
      backendPort = DEFAULT_PORT;
      await writeFile(PORT_FILE, String(backendPort), 'utf8');
      console.log(`[start] Recovered: API is healthy on ${backendPort}`);
    } else {
      console.error('[start] Timed out waiting for server to write .server-port');
      console.error('[start] Tip: free the port (`npx kill-port 3001`) or stop the other node process, then retry.');
      if (server) server.kill();
      process.exit(1);
    }
  }
}

console.log(`[start] Backend is on port ${backendPort}, starting Vite...`);

const vite = spawn('npx', ['vite'], {
  stdio: 'inherit',
  env: { ...process.env },
  shell,
});

const cleanup = (signal) => {
  if (server) server.kill(signal);
  vite.kill(signal);
  process.exit(0);
};
process.on('SIGINT', () => cleanup('SIGINT'));
process.on('SIGTERM', () => cleanup('SIGTERM'));

vite.on('exit', (code) => {
  if (server) server.kill();
  process.exit(code || 0);
});
if (server) {
  server.on('exit', (code) => {
    if (code && code !== 0) {
      console.error(`[start] Backend exited with code ${code}`);
      vite.kill();
      process.exit(code);
    }
  });
}
