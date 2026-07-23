/**
 * Diagnostic + discovery route for the panel API routing registry.
 * GET /api/panel-routing — full registry + server mount verification hints
 * GET /api/panel-routing/health — lightweight probe of every primary tab endpoint
 */
import { Router } from 'express';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROUTING_PATH = path.join(__dirname, '..', '..', 'shared', 'api-routing.json');

function loadRouting() {
  return JSON.parse(readFileSync(ROUTING_PATH, 'utf8'));
}

router.get('/', (_req, res) => {
  try {
    const routing = loadRouting();
    res.json({
      ok: true,
      version: routing.version,
      tabMarkets: routing.tabMarkets,
      markets: routing.markets,
      aliases: routing.aliases,
      proxyPaths: routing.proxyPaths,
      health: routing.health,
      generatedAt: new Date().toISOString(),
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * Probe each tab market primary endpoint through the local server.
 * Query: ?deep=1 also probes deps (slower).
 */
router.get('/health', async (req, res) => {
  const routing = loadRouting();
  const deep = req.query.deep === '1' || req.query.deep === 'true';
  const base = `http://127.0.0.1:${req.socket.localPort || process.env.PORT || 3001}`;
  const results = [];

  const pathsToProbe = new Set();
  for (const id of routing.tabMarkets) {
    // alerts is federated — no primary HTTP route
    if (id === 'alerts') {
      results.push({ marketId: id, path: null, federated: true, status: 'skip' });
      continue;
    }
    const cfg = routing.markets[id];
    if (!cfg?.primary) {
      results.push({ marketId: id, path: null, status: 'missing-config' });
      continue;
    }
    pathsToProbe.add(cfg.primary);
    if (deep && cfg.deps) cfg.deps.forEach(d => pathsToProbe.add(d));
  }

  for (const apiPath of pathsToProbe) {
    const t0 = Date.now();
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 45000);
      const r = await fetch(`${base}${apiPath}`, { signal: controller.signal });
      clearTimeout(timer);
      const text = await r.text();
      let keys = 0;
      let bytes = text.length;
      try {
        const j = JSON.parse(text);
        keys = j && typeof j === 'object' ? Object.keys(j).filter(k => !k.startsWith('_')).length : 0;
      } catch { /* non-json */ }
      const ok = r.ok && bytes > 50;
      results.push({
        path: apiPath,
        status: r.status,
        ok,
        bytes,
        keys,
        ms: Date.now() - t0,
      });
    } catch (e) {
      results.push({
        path: apiPath,
        status: 0,
        ok: false,
        error: e.message,
        ms: Date.now() - t0,
      });
    }
  }

  const failed = results.filter(r => r.ok === false && r.status !== 'skip');
  res.json({
    ok: failed.length === 0,
    probed: results.length,
    failed: failed.length,
    results,
    checkedAt: new Date().toISOString(),
  });
});

export default router;
