import { Router } from 'express';
import admin from 'firebase-admin';

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

async function getGoogleAccessToken() {
  const res = await fetch(
    'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
    { headers: { 'Metadata-Flavor': 'Google' } }
  );
  if (!res.ok) throw new Error(`metadata token HTTP ${res.status}`);
  const data = await res.json();
  if (!data?.access_token) throw new Error('metadata token missing access_token');
  return data.access_token;
}

async function verifyRecaptchaEnterprise(req, expectedAction) {
  if (process.env.NODE_ENV !== 'production') {
    return { ok: true, skipped: true, reason: 'dev-mode' };
  }

  const recaptchaToken = req.get('x-recaptcha-token');
  if (!recaptchaToken) {
    return { ok: false, status: 401, error: 'Missing reCAPTCHA token' };
  }

  try {
    const accessToken = await getGoogleAccessToken();
    const response = await fetch(
      `https://recaptchaenterprise.googleapis.com/v1/projects/${RECAPTCHA_PROJECT_ID}/assessments`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event: {
            token: recaptchaToken,
            expectedAction,
            siteKey: RECAPTCHA_SITE_KEY,
          },
        }),
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      console.error('[admin-functions] reCAPTCHA assessment failed:', response.status, text.slice(0, 300));
      return { ok: false, status: 502, error: 'reCAPTCHA assessment failed' };
    }

    const assessment = await response.json();
    const props = assessment.tokenProperties || {};
    const risk = assessment.riskAnalysis || {};
    const score = typeof risk.score === 'number' ? risk.score : 0;
    const hostname = props.hostname || '';

    if (!props.valid) {
      return { ok: false, status: 401, error: `Invalid reCAPTCHA token: ${props.invalidReason || 'unknown'}` };
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
    console.error('[admin-functions] reCAPTCHA verification error:', e.message || e);
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
      return res.status(401).json({ error: 'Unauthorized: Missing token' });
    }
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      email = decodedToken.email;
    } catch (err) {
      console.error('[admin-functions] token verification failed:', err.message);
      return res.status(401).json({ error: 'Unauthorized: Invalid token: ' + err.message });
    }
  }

  if (email !== 'kevinkicho@gmail.com') {
    return res.status(403).json({ error: 'Forbidden: Admin access only' });
  }

  const recaptcha = await verifyRecaptchaEnterprise(req, 'ADMIN_REFRESH');
  if (!recaptcha.ok) {
    return res.status(recaptcha.status || 401).json({ error: recaptcha.error || 'reCAPTCHA verification failed' });
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

      const payload = { data, fetchedAt: now, source: 'admin-trigger' };

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

export default router;
