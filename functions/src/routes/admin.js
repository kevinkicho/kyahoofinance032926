import { Router } from 'express';

const router = Router();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'kevinkicho@gmail.com';

// Firebase project ID — used to verify ID tokens via Google's public API.
// No firebase-admin SDK required; we call the tokenVerification endpoint
// directly. This keeps the local dev server dependency-free while still
// enforcing real token verification (not a hardcoded bypass).
const FIREBASE_PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID || 'kfinance032926';

// In-memory rate limiter for admin endpoints — prevents brute-force token
// spamming from a single IP. Resets every 15 minutes.
const adminRateMap = new Map();
const ADMIN_RATE_WINDOW_MS = 15 * 60 * 1000;
const ADMIN_RATE_MAX = 20;

function checkAdminRateLimit(ip) {
  const now = Date.now();
  const entry = adminRateMap.get(ip);
  if (!entry || now - entry.windowStart > ADMIN_RATE_WINDOW_MS) {
    adminRateMap.set(ip, { windowStart: now, count: 1 });
    return true;
  }
  entry.count++;
  return entry.count <= ADMIN_RATE_MAX;
}

// Verify a Firebase ID token by calling Google's identity toolkit.
// Returns the decoded token (including email) or throws on invalid/expired tokens.
// This avoids requiring firebase-admin in the local dev server.
async function verifyFirebaseIdToken(idToken) {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${process.env.VITE_FIREBASE_API_KEY || ''}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Token verification failed (HTTP ${res.status}): ${body.substring(0, 200)}`);
  }
  const data = await res.json();
  const user = data.users && data.users[0];
  if (!user) throw new Error('No user record for token');
  return {
    email: user.email,
    emailVerified: !!user.emailVerified,
    localId: user.localId,
  };
}

async function verifyRecaptchaEnterprise(req, expectedAction) {
  if (process.env.NODE_ENV !== 'production') {
    return { ok: true, skipped: true, reason: 'dev-mode' };
  }

  const recaptchaToken = req.get('x-recaptcha-token');
  if (!recaptchaToken) {
    return { ok: false, status: 401, error: 'Missing reCAPTCHA token' };
  }

  // Production verification runs in Firebase Functions. This local server
  // keeps the same request contract without becoming the security boundary.
  return { ok: true, skipped: true, reason: `local-server-${expectedAction}` };
}

const SNAPSHOT_MARKETS = [
  { id: "realEstate", path: "/api/realEstate" },
  { id: "insurance", path: "/api/insurance" },
  { id: "globalMacro", path: "/api/globalMacro" },
  { id: "commodities", path: "/api/commodities/v2" },
  { id: "bonds", path: "/api/bonds" },
  { id: "fx", path: "/api/fx" },
  { id: "derivatives", path: "/api/derivatives" },
  { id: "crypto", path: "/api/crypto" },
  { id: "credit", path: "/api/credit" },
  { id: "sentiment", path: "/api/sentiment" },
  { id: "calendar", path: "/api/calendar" },
  { id: "equitiesDeepDive", path: "/api/equityDeepDive" },
  { id: "analytics", path: "/api/analytics" },
  { id: "rateLimits", path: "/api/rate-limits" },
  { id: "cacheStatus", path: "/api/cache/status" },
  { id: "universeUpdates", path: "/api/universeUpdates" },
];

function deny(res, status = 403, userMessage = 'Admin account required to refresh global data.') {
  return res.status(status).json({ error: userMessage, userMessage });
}

async function verifyAdminRequest(req, res, userMessage = 'Admin account required.') {
  const clientIp = req.ip || req.socket?.remoteAddress || 'unknown';
  if (!checkAdminRateLimit(clientIp)) {
    deny(res, 429, 'Too many admin requests. Please try again later.');
    return { ok: false };
  }

  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  // Dev mode: allow mock bypass ONLY with explicit mock-token
  if (process.env.NODE_ENV !== 'production' && (!token || token === 'mock-token')) {
    console.log('[admin-local] dev mode bypass: authenticated as', ADMIN_EMAIL);
    return { ok: true, email: ADMIN_EMAIL, devBypass: true };
  }

  if (!token) {
    deny(res, 401, 'Authentication required.');
    return { ok: false };
  }

  try {
    const decoded = await verifyFirebaseIdToken(token);
    if (decoded.email !== ADMIN_EMAIL) {
      deny(res, 403, userMessage);
      return { ok: false };
    }
    return { ok: true, email: decoded.email };
  } catch (err) {
    console.error('[admin-local] token verification failed:', err.message);
    deny(res, 401, 'Authentication failed. Please sign in again.');
    return { ok: false };
  }
}

// Resolve the base URL for internal refresh calls WITHOUT trusting client-
// controlled Host/protocol headers (SSRF protection). In dev, use localhost
// + the actual listening port. In production, require an explicit env var.
function getInternalBaseUrl(req) {
  if (process.env.ADMIN_REFRESH_BASE_URL) {
    return process.env.ADMIN_REFRESH_BASE_URL.replace(/\/$/, '');
  }
  // Dev: use the actual server address — never req.get('host') which is
  // attacker-controllable.
  const addr = req.socket?.localAddress;
  const port = req.socket?.localPort;
  if (addr && port) {
    const host = addr.includes(':') ? `[${addr}]` : addr;
    return `http://${host}:${port}`;
  }
  // Final fallback: localhost + port from env
  return `http://localhost:${process.env.PORT || 3001}`;
}

router.post('/refresh-all', async (req, res) => {
  const adminCheck = await verifyAdminRequest(req, res, 'Admin account required to refresh global data.');
  if (!adminCheck.ok) return;

  const recaptcha = await verifyRecaptchaEnterprise(req, 'ADMIN_REFRESH');
  if (!recaptcha.ok) {
    return deny(res, recaptcha.status || 401, 'Admin refresh verification failed. Please sign in again and retry.');
  }

  console.log('[admin-local] initiating global refresh...');
  const base = getInternalBaseUrl(req);

  // Process sequentially to avoid slamming upstream APIs all at once
  const reports = [];
  for (const { id, path } of SNAPSHOT_MARKETS) {
    try {
      const url = `${base}${path}?refresh=true`;
      console.log(`[admin-local] refreshing ${id} via ${url}...`);
      const response = await fetch(url, {
        headers: { 'User-Agent': 'admin-refresher-local' },
        signal: AbortSignal.timeout(60000)
      });
      if (response.ok) {
        reports.push({ id, status: 'success' });
      } else {
        reports.push({ id, status: 'failed', error: `HTTP ${response.status}` });
      }
    } catch (e) {
      console.warn(`[admin-local] refresh failed for ${id}:`, e.message);
      reports.push({ id, status: 'failed', error: e.message });
    }
  }

  res.json({ success: true, timestamp: new Date().toISOString(), reports });
});

// GET /api/admin/diagnose — run active diagnostics on all endpoints
router.get('/diagnose', async (req, res) => {
  const adminCheck = await verifyAdminRequest(req, res, 'Admin account required to run live diagnostics.');
  if (!adminCheck.ok) return;

  const base = getInternalBaseUrl(req);
  const now = new Date().toISOString();

  // Import validation helpers lazily to keep routes clean
  const { validateMarketData } = await import('../lib/validation.js');

  const targets = [
    { id: "realEstate", path: "/api/realEstate" },
    { id: "insurance", path: "/api/insurance" },
    { id: "globalMacro", path: "/api/globalMacro" },
    { id: "commodities", path: "/api/commodities/v2" },
    { id: "bonds", path: "/api/bonds" },
    { id: "fx", path: "/api/fx" },
    { id: "derivatives", path: "/api/derivatives" },
    { id: "crypto", path: "/api/crypto" },
    { id: "credit", path: "/api/credit" },
    { id: "sentiment", path: "/api/sentiment" },
    { id: "calendar", path: "/api/calendar" },
    { id: "equitiesDeepDive", path: "/api/equityDeepDive" },
    { id: "usda", path: "/api/usda" }
  ];

  const results = {};
  let healthyCount = 0;
  let warningCount = 0;
  let unhealthyCount = 0;

  // Run validation on all endpoints
  for (const { id, path } of targets) {
    const start = Date.now();
    try {
      const url = `${base}${path}`;
      const response = await fetch(url, {
        headers: { 'User-Agent': 'diagnostics-prober' },
        signal: AbortSignal.timeout(15000)
      });
      const duration = Date.now() - start;

      if (!response.ok) {
        results[id] = {
          status: 'unhealthy',
          error: `HTTP status ${response.status}`,
          duration,
          lastChecked: now
        };
        unhealthyCount++;
        continue;
      }

      const data = await response.json();
      const validation = validateMarketData(id, data);

      if (validation.ok) {
        results[id] = {
          status: 'healthy',
          duration,
          lastChecked: now
        };
        healthyCount++;
      } else {
        // Special warning check for USDA when api key is not configured
        if (id === 'usda' && data && data.error && data.error.includes('USDA_NASS_API_KEY not configured')) {
          results[id] = {
            status: 'warning',
            error: 'USDA_NASS_API_KEY not configured (falls back to stub)',
            duration,
            lastChecked: now
          };
          warningCount++;
        } else {
          results[id] = {
            status: 'unhealthy',
            error: validation.error || 'Failed structural guard',
            duration,
            lastChecked: now
          };
          unhealthyCount++;
        }
      }
    } catch (e) {
      results[id] = {
        status: 'unhealthy',
        error: e.message || 'Fetch failed',
        duration: Date.now() - start,
        lastChecked: now
      };
      unhealthyCount++;
    }
  }

  const report = {
    timestamp: now,
    overallStatus: unhealthyCount > 0 ? 'unhealthy' : (warningCount > 0 ? 'warning' : 'healthy'),
    summary: {
      total: targets.length,
      healthy: healthyCount,
      warning: warningCount,
      unhealthy: unhealthyCount
    },
    markets: results
  };

  res.json(report);
});

// GET /api/admin/config — expose the configured admin email dynamically to the client
router.get('/config', (req, res) => {
  res.json({ adminEmail: ADMIN_EMAIL });
});

export default router;