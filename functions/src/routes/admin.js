import { Router } from 'express';
import admin from 'firebase-admin';

const router = Router();

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
