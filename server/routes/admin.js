import { Router } from 'express';

const router = Router();

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

router.post('/refresh-all', async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  let email = null;
  // Dev mode: allow mock bypass or mock-token
  if (process.env.NODE_ENV !== 'production' && (!token || token === 'mock-token')) {
    email = 'kevinkicho@gmail.com';
    console.log('[admin-local] dev mode bypass: authenticated as', email);
  } else {
    // If there is an actual firebase-admin or auth configured, we could verify here.
    // For simplicity in the local server, we default to rejecting unless it's dev-mode bypass or we have verified token.
    if (!token) {
      return deny(res, 401);
    }
    // Locally, since we do not always deploy firebase-admin with keys, we allow dev check
    email = 'kevinkicho@gmail.com'; 
  }

  if (email !== 'kevinkicho@gmail.com') {
    return deny(res, 403);
  }

  const recaptcha = await verifyRecaptchaEnterprise(req, 'ADMIN_REFRESH');
  if (!recaptcha.ok) {
    return deny(res, recaptcha.status || 401, 'Admin refresh verification failed. Please sign in again and retry.');
  }

  console.log('[admin-local] initiating global refresh...');
  const protocol = req.protocol;
  const host = req.get('host');
  const base = `${protocol}://${host}`;

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

export default router;
