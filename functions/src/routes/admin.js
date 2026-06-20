import { Router } from 'express';
import admin from 'firebase-admin';
import { GoogleAuth } from 'google-auth-library';


const router = Router();

const RECAPTCHA_PROJECT_ID = 'kfinance032926';
const RECAPTCHA_SITE_KEY = '6Ldl3yYtAAAAAAmHpuYyoj1qMJyfrvlQFZNjf08f';
const RECAPTCHA_MIN_SCORE = 0.3;
const RECAPTCHA_ALLOWED_HOSTNAMES = new Set(['kevinkicho.github.io', 'localhost', '127.0.0.1']);

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

const RTDB_KEY_INVALID_CHARS = /[.#$/[\]]/g;

function sanitizeForRTDB(value) {
  if (Array.isArray(value)) return value.map(sanitizeForRTDB);
  if (!value || typeof value !== 'object') return value === undefined ? null : value;

  const out = {};
  for (const [rawKey, rawValue] of Object.entries(value)) {
    const key = String(rawKey).replace(RTDB_KEY_INVALID_CHARS, '_');
    out[key] = sanitizeForRTDB(rawValue);
  }
  return out;
}

function deny(res, status = 403, userMessage = 'Admin account required to refresh global data.') {
  return res.status(status).json({ error: userMessage, userMessage });
}

const auth = new GoogleAuth({
  scopes: 'https://www.googleapis.com/auth/cloud-platform',
});

async function verifyRecaptchaEnterprise(req, expectedAction) {
  if (process.env.NODE_ENV !== 'production') {
    return { ok: true, skipped: true, reason: 'dev-mode' };
  }

  const recaptchaToken = req.get('x-recaptcha-token');
  if (!recaptchaToken) {
    return { ok: false, status: 401, error: 'Missing reCAPTCHA token' };
  }

  try {
    const client = await auth.getClient();
    const response = await client.request({
      url: `https://recaptchaenterprise.googleapis.com/v1/projects/${RECAPTCHA_PROJECT_ID}/assessments`,
      method: 'POST',
      data: {
        event: {
          token: recaptchaToken,
          expectedAction,
          siteKey: RECAPTCHA_SITE_KEY,
        },
      },
    });

    const assessment = response.data;
    const props = assessment.tokenProperties || {};
    const risk = assessment.riskAnalysis || {};
    const score = typeof risk.score === 'number' ? risk.score : 0;
    const hostname = props.hostname || '';

    if (!props.valid) {
      console.warn('[admin-functions] invalid reCAPTCHA token:', props.invalidReason || 'unknown');
      return { ok: false, status: 401, error: 'Verification failed' };
    }
    if (props.action !== expectedAction) {
      return { ok: false, status: 401, error: 'Invalid reCAPTCHA action' };
    }
    if (hostname && !RECAPTCHA_ALLOWED_HOSTNAMES.has(hostname)) {
      return { ok: false, status: 401, error: 'Invalid reCAPTCHA hostname' };
    }
    if (score < RECAPTCHA_MIN_SCORE) {
      return { ok: false, status: 403, error: 'reCAPTCHA score too low' };
    }

    return { ok: true, score, hostname, reasons: risk.reasons || [] };
  } catch (e) {
    const errMsg = e.response?.data?.error?.message || e.message || String(e);
    console.error('[admin-functions] reCAPTCHA verification error:', errMsg);
    return { ok: false, status: 502, error: 'reCAPTCHA verification unavailable' };
  }
}

router.post('/refresh-all', async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  let email = null;
  // Dev mode bypass
  if (process.env.NODE_ENV !== 'production' && (!token || token === 'mock-token')) {
    email = 'kevinkicho@gmail.com';
    console.log('[admin-functions] dev mode bypass: authenticated as', email);
  } else {
    if (!token) {
      return deny(res, 401);
    }
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      email = decodedToken.email;
    } catch (err) {
      console.error('[admin-functions] token verification failed:', err.message);
      return deny(res, 401);
    }
  }

  if (email !== 'kevinkicho@gmail.com') {
    return deny(res, 403);
  }

  const recaptcha = await verifyRecaptchaEnterprise(req, 'ADMIN_REFRESH');
  if (!recaptcha.ok) {
    return deny(res, recaptcha.status || 401, 'Admin refresh verification failed. Please sign in again and retry.');
  }

  console.log('[admin-functions] initiating global refresh & RTDB write...');
  const protocol = req.protocol;
  const host = req.get('host');
  const base = `${protocol}://${host}`;

  const now = new Date().toISOString();
  const dateKey = now.substring(0, 10);
  const db = admin.database();

  const reports = [];
  // Process sequentially to prevent concurrent memory spikes in Cloud Run
  for (const { id, path } of SNAPSHOT_MARKETS) {
    try {
      const url = `${base}${path}?refresh=true`;
      console.log(`[admin-functions] fetching ${id} live via ${url}...`);
      const response = await fetch(url, { 
        headers: { 'User-Agent': 'admin-refresher-gcf' },
        signal: AbortSignal.timeout(60000)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      const payload = sanitizeForRTDB({ data, fetchedAt: now, source: 'admin-trigger' });

      // Write snapshot to RTDB
      await db.ref(`marketSnapshots/${id}/history/${dateKey}`).set(payload);
      await db.ref(`marketSnapshots/${id}/latest`).set(payload);

      reports.push({ id, status: 'success' });
    } catch (e) {
      console.error(`[admin-functions] refresh failed for ${id}:`, e.message);
      reports.push({ id, status: 'failed', error: e.message });
    }
  }

  res.json({ success: true, timestamp: now, reports });
});

// GET /api/admin/diagnose — run active diagnostics on all endpoints and save to RTDB
router.get('/diagnose', async (req, res) => {
  const protocol = req.protocol;
  const host = req.get('host');
  const base = `${protocol}://${host}`;
  const now = new Date().toISOString();
  const dateKey = now.substring(0, 10);
  const db = admin.database();

  // Import validation helpers
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
        headers: { 'User-Agent': 'diagnostics-prober-gcf' },
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

  try {
    // Write report to Firebase Realtime Database
    await db.ref(`apiHealthReport/history/${dateKey}`).set(report);
    await db.ref(`apiHealthReport/latest`).set(report);
  } catch (dbErr) {
    console.error('[admin-functions] failed writing diagnostics report to RTDB:', dbErr.message);
  }

  res.json(report);
});

export default router;
