/**
 * Optional shared market cache via Google Cloud Storage.
 *
 * When MARKET_CACHE_BUCKET (or GCS_CACHE_BUCKET) is set, daily market JSON is
 * also stored under `market-cache/{market}-{YYYY-MM-DD}.json` and
 * `market-cache/{market}-latest.json` so Cloud Run replicas / new revisions
 * can hydrate without re-stamping FRED.
 *
 * Auth: Application Default Credentials (Cloud Run metadata) or
 * GOOGLE_APPLICATION_CREDENTIALS / FIREBASE_SERVICE_ACCOUNT_JSON.
 * No @google-cloud/storage dependency — uses the JSON API + fetch.
 *
 * When the bucket env is unset, all functions no-op (local disk only).
 */

const PREFIX = 'market-cache';

export function getCacheBucket() {
  return (process.env.MARKET_CACHE_BUCKET || process.env.GCS_CACHE_BUCKET || '').trim();
}

export function isGcsCacheEnabled() {
  return !!getCacheBucket();
}

let cachedToken = null; // { token, exp }

async function getAccessToken() {
  if (cachedToken && cachedToken.exp > Date.now() + 60_000) {
    return cachedToken.token;
  }

  // 1) Inline service account JSON (App Hosting secret)
  const inline = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
    || process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (inline) {
    try {
      const sa = JSON.parse(inline);
      const token = await jwtBearerToken(sa);
      if (token) {
        cachedToken = { token, exp: Date.now() + 50 * 60_000 };
        return token;
      }
    } catch (e) {
      console.warn('[gcsCache] service account JWT failed:', e?.message || e);
    }
  }

  // 2) GCE / Cloud Run metadata server
  try {
    const r = await fetch(
      'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
      {
        headers: { 'Metadata-Flavor': 'Google' },
        signal: AbortSignal.timeout(3000),
      },
    );
    if (r.ok) {
      const j = await r.json();
      if (j.access_token) {
        cachedToken = {
          token: j.access_token,
          exp: Date.now() + ((j.expires_in || 3600) - 120) * 1000,
        };
        return j.access_token;
      }
    }
  } catch {
    /* not on GCP */
  }

  return null;
}

/** Minimal JWT client credentials for storage scope (no google-auth lib). */
async function jwtBearerToken(sa) {
  if (!sa?.client_email || !sa?.private_key) return null;
  const crypto = await import('crypto');
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/devstorage.read_write',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };
  const enc = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const unsigned = `${enc(header)}.${enc(claim)}`;
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(unsigned);
  sign.end();
  const sig = sign.sign(sa.private_key, 'base64url');
  const assertion = `${unsigned}.${sig}`;
  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion,
  });
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(10000),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`token exchange ${r.status}: ${t.slice(0, 200)}`);
  }
  const j = await r.json();
  return j.access_token || null;
}

function objectName(market, dateOrLatest) {
  return `${PREFIX}/${market}-${dateOrLatest}.json`;
}

/**
 * @returns {Promise<object|null>}
 */
export async function gcsReadJson(market, dateOrLatest) {
  const bucket = getCacheBucket();
  if (!bucket) return null;
  try {
    const token = await getAccessToken();
    if (!token) {
      console.warn('[gcsCache] no access token — skip read');
      return null;
    }
    const name = encodeURIComponent(objectName(market, dateOrLatest));
    const url = `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucket)}/o/${name}?alt=media`;
    const r = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(15000),
    });
    if (r.status === 404) return null;
    if (!r.ok) {
      console.warn(`[gcsCache] read ${market} ${dateOrLatest}: HTTP ${r.status}`);
      return null;
    }
    const data = await r.json();
    if (data && typeof data === 'object') {
      data._cacheSource = data._cacheSource || 'gcs';
      data._gcsObject = objectName(market, dateOrLatest);
    }
    return data;
  } catch (e) {
    console.warn(`[gcsCache] read failed ${market}:`, e?.message || e);
    return null;
  }
}

/**
 * @returns {Promise<boolean>}
 */
export async function gcsWriteJson(market, dateStr, data) {
  const bucket = getCacheBucket();
  if (!bucket || !data || typeof data !== 'object') return false;
  try {
    const token = await getAccessToken();
    if (!token) {
      console.warn('[gcsCache] no access token — skip write');
      return false;
    }
    const body = JSON.stringify(data);
    if (body.length < 200) return false;

    const writeOne = async (name) => {
      const url = `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(bucket)}/o?uploadType=media&name=${encodeURIComponent(name)}`;
      const r = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body,
        signal: AbortSignal.timeout(30000),
      });
      if (!r.ok) {
        const t = await r.text().catch(() => '');
        console.warn(`[gcsCache] write ${name}: HTTP ${r.status} ${t.slice(0, 160)}`);
        return false;
      }
      return true;
    };

    const okDay = await writeOne(objectName(market, dateStr));
    // Always refresh latest pointer for cross-instance hydrate
    await writeOne(objectName(market, 'latest'));
    if (okDay) {
      console.log(`[gcsCache] wrote ${market}-${dateStr} (${body.length} bytes)`);
    }
    return okDay;
  } catch (e) {
    console.warn(`[gcsCache] write failed ${market}:`, e?.message || e);
    return false;
  }
}

/**
 * Generic object read/write under market-cache/ prefix (or absolute object path).
 */
export async function gcsReadObject(objectPath) {
  const bucket = getCacheBucket();
  if (!bucket) return null;
  try {
    const token = await getAccessToken();
    if (!token) return null;
    const name = encodeURIComponent(objectPath.startsWith(PREFIX) ? objectPath : `${PREFIX}/${objectPath}`);
    const url = `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucket)}/o/${name}?alt=media`;
    const r = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

export async function gcsWriteObject(objectPath, data) {
  const bucket = getCacheBucket();
  if (!bucket || data == null) return false;
  try {
    const token = await getAccessToken();
    if (!token) return false;
    const name = objectPath.startsWith(PREFIX) ? objectPath : `${PREFIX}/${objectPath}`;
    const url = `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(bucket)}/o?uploadType=media&name=${encodeURIComponent(name)}`;
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(20000),
    });
    return r.ok;
  } catch {
    return false;
  }
}

/**
 * Try today's object, then latest, then previous N calendar days by name.
 * @returns {Promise<{ data: object, fetchedOn: string }|null>}
 */
export async function gcsReadLatest(market, lookbackDays = 7) {
  const today = new Date().toISOString().split('T')[0];
  const candidates = [today, 'latest'];
  for (let i = 1; i <= lookbackDays; i++) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    candidates.push(d.toISOString().split('T')[0]);
  }
  const seen = new Set();
  for (const key of candidates) {
    if (seen.has(key)) continue;
    seen.add(key);
    const data = await gcsReadJson(market, key);
    if (data && typeof data === 'object') {
      const fetchedOn = key === 'latest' ? (data.fetchedOn || data.lastUpdated || today) : key;
      return { data, fetchedOn: String(fetchedOn).slice(0, 10) };
    }
  }
  return null;
}
