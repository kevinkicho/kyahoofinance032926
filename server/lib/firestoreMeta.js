/**
 * Firestore hub cache index — organized docs, not bulk market JSON.
 *
 * ## Document layout (wise use of available data)
 *
 * ```
 * marketMeta/{marketId}              // pointer + freshness + GCS path
 * marketDigest/{marketId}            // small KPI digest (extracted from payload)
 * dailyRollup/{YYYY-MM-DD}           // map: marketId → { ok, bytes, keys, fetchedOn }
 * fieldInventory/{marketId}          // which top-level keys were filled (hollow radar)
 * ```
 *
 * Bulk history stays on **disk + GCS**. Firestore only holds:
 * - indexes (what is current, where is the blob)
 * - digests (instant KPI / progressive paint hints)
 * - daily rollups (ops: “what warmed today?”)
 *
 * Enable: FIRESTORE_MARKET_META=true | auto on Cloud Run (K_SERVICE)
 * Disable: FIRESTORE_MARKET_META=0
 */

import { extractMarketDigest, fieldPresence } from './marketDigest.js';

const COL_META = 'marketMeta';
const COL_DIGEST = 'marketDigest';
const COL_ROLLUP = 'dailyRollup';
const COL_FIELDS = 'fieldInventory';

export function getGcpProjectId() {
  return (
    process.env.GOOGLE_CLOUD_PROJECT
    || process.env.GCLOUD_PROJECT
    || process.env.GCP_PROJECT
    || process.env.FIREBASE_PROJECT_ID
    || ''
  ).trim() || 'kfinance032926';
}

export function isFirestoreMetaEnabled() {
  const flag = String(process.env.FIRESTORE_MARKET_META || '').trim().toLowerCase();
  if (flag === '0' || flag === 'false' || flag === 'off') return false;
  if (flag === '1' || flag === 'true' || flag === 'on') return true;
  if (process.env.K_SERVICE || process.env.K_REVISION) return true;
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return !!getGcpProjectId();
  }
  return false;
}

let cachedToken = null;

async function getAccessToken() {
  if (cachedToken && cachedToken.exp > Date.now() + 60_000) {
    return cachedToken.token;
  }

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
      console.warn('[firestoreMeta] JWT failed:', e?.message || e);
    }
  }

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
  } catch { /* not on GCP */ }

  return null;
}

async function jwtBearerToken(sa) {
  if (!sa?.client_email || !sa?.private_key) return null;
  const crypto = await import('crypto');
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/datastore',
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
  if (!r.ok) return null;
  const j = await r.json();
  return j.access_token || null;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

/** Encode JS value → Firestore REST value (scalars + shallow maps + string JSON). */
function firestoreValue(v) {
  if (v == null) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number' && Number.isFinite(v)) {
    if (Number.isInteger(v) && Math.abs(v) < 1e15) return { integerValue: String(v) };
    return { doubleValue: v };
  }
  if (typeof v === 'string') return { stringValue: v };
  // Nested objects / arrays: store as JSON string (queryable as whole field, cheap)
  try {
    return { stringValue: JSON.stringify(v) };
  } catch {
    return { stringValue: String(v) };
  }
}

function encodeDocument(fields) {
  const out = {};
  for (const [k, v] of Object.entries(fields)) {
    out[k] = firestoreValue(v);
  }
  return { fields: out };
}

function decodeDocument(doc) {
  if (!doc?.fields) return null;
  const out = {};
  for (const [k, cell] of Object.entries(doc.fields)) {
    if (cell.stringValue != null) {
      const s = cell.stringValue;
      if ((s.startsWith('{') || s.startsWith('[')) && (k.includes('digest') || k.includes('Json') || k === 'markets' || k === 'hollow' || k === 'filledKeys')) {
        try { out[k] = JSON.parse(s); continue; } catch { /* keep string */ }
      }
      out[k] = s;
    } else if (cell.integerValue != null) out[k] = Number(cell.integerValue);
    else if (cell.doubleValue != null) out[k] = cell.doubleValue;
    else if (cell.booleanValue != null) out[k] = cell.booleanValue;
    else if (cell.nullValue !== undefined) out[k] = null;
  }
  return out;
}

function docUrl(project, collection, docId) {
  return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(project)}/databases/(default)/documents/${collection}/${encodeURIComponent(docId)}`;
}

async function patchDoc(collection, docId, fields) {
  const project = getGcpProjectId();
  const token = await getAccessToken();
  if (!token || !project) return false;
  const r = await fetch(docUrl(project, collection, docId), {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(encodeDocument(fields)),
    signal: AbortSignal.timeout(12000),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    console.warn(`[firestoreMeta] PATCH ${collection}/${docId}: HTTP ${r.status} ${t.slice(0, 140)}`);
    return false;
  }
  return true;
}

async function getDoc(collection, docId) {
  const project = getGcpProjectId();
  const token = await getAccessToken();
  if (!token || !project) return null;
  const r = await fetch(docUrl(project, collection, docId), {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(8000),
  });
  if (r.status === 404 || !r.ok) return null;
  return decodeDocument(await r.json());
}

async function listCollection(collection, pageSize = 100) {
  const project = getGcpProjectId();
  const token = await getAccessToken();
  if (!token || !project) return {};
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(project)}/databases/(default)/documents/${collection}?pageSize=${pageSize}`;
  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(12000),
  });
  if (!r.ok) return {};
  const j = await r.json();
  const out = {};
  for (const doc of j.documents || []) {
    const id = String(doc.name || '').split('/').pop();
    const fields = decodeDocument(doc);
    if (id && fields) out[id] = fields;
  }
  return out;
}

/**
 * Build meta pointer fields (no bulk body).
 */
export function buildMarketMetaFields(marketId, data, opts = {}) {
  const fetchedOn = data?.fetchedOn || data?.fetchedAt || opts.fetchedOn || todayStr();
  const day = String(fetchedOn).slice(0, 10);
  const today = todayStr();
  const keys = data && typeof data === 'object'
    ? Object.keys(data).filter((k) => !k.startsWith('_'))
    : [];
  let bytes = 0;
  try {
    bytes = opts.bytes != null ? opts.bytes : JSON.stringify(data || {}).length;
  } catch {
    bytes = 0;
  }
  const bucket = (process.env.MARKET_CACHE_BUCKET || process.env.GCS_CACHE_BUCKET || '').trim();
  const presence = fieldPresence(data);
  return {
    marketId: String(marketId),
    fetchedOn: day,
    isCurrent: day === today,
    isLive: data?.isLive === true,
    keyCount: keys.length,
    fieldsFilled: presence.filled,
    fieldsTotal: presence.total,
    bytes,
    gcsPath: bucket ? `gs://${bucket}/market-cache/${marketId}-${day}.json` : '',
    digestCollection: COL_DIGEST,
    updatedAt: new Date().toISOString(),
    project: getGcpProjectId(),
    schemaVersion: 2,
  };
}

/**
 * Write organized set: meta + digest + field inventory + daily rollup patch.
 * @returns {Promise<{ meta: boolean, digest: boolean }>}
 */
export async function writeMarketMeta(marketId, data, opts = {}) {
  if (!isFirestoreMetaEnabled() || !marketId) return { meta: false, digest: false };

  const meta = buildMarketMetaFields(marketId, data, opts);
  const { digest, bytes: digestBytes, truncated } = extractMarketDigest(marketId, data);
  const presence = fieldPresence(data);

  const digestDoc = {
    marketId: String(marketId),
    fetchedOn: meta.fetchedOn,
    updatedAt: meta.updatedAt,
    digestBytes,
    truncated: !!truncated,
    // Store digest as JSON string field for REST simplicity
    digestJson: JSON.stringify(digest),
    kind: digest.kind || 'generic',
    schemaVersion: 2,
  };

  const fieldDoc = {
    marketId: String(marketId),
    fetchedOn: meta.fetchedOn,
    updatedAt: meta.updatedAt,
    fieldsFilled: presence.filled,
    fieldsTotal: presence.total,
    filledKeys: JSON.stringify(
      Object.keys(data || {}).filter((k) => !k.startsWith('_') && !presence.hollow.includes(k)).slice(0, 80),
    ),
    hollowKeys: JSON.stringify(presence.hollow),
    schemaVersion: 2,
  };

  const okMeta = await patchDoc(COL_META, marketId, meta);
  const okDigest = await patchDoc(COL_DIGEST, marketId, digestDoc);
  await patchDoc(COL_FIELDS, marketId, fieldDoc);

  // Daily rollup: merge this market into today's board
  try {
    const day = meta.fetchedOn;
    const existing = (await getDoc(COL_ROLLUP, day)) || {};
    let markets = {};
    if (existing.markets && typeof existing.markets === 'object') markets = { ...existing.markets };
    else if (typeof existing.marketsJson === 'string') {
      try { markets = JSON.parse(existing.marketsJson) || {}; } catch { markets = {}; }
    }
    markets[marketId] = {
      ok: true,
      bytes: meta.bytes,
      keys: meta.keyCount,
      filled: meta.fieldsFilled,
      fetchedOn: meta.fetchedOn,
      isCurrent: meta.isCurrent,
    };
    await patchDoc(COL_ROLLUP, day, {
      date: day,
      updatedAt: new Date().toISOString(),
      marketCount: Object.keys(markets).length,
      marketsJson: JSON.stringify(markets),
      schemaVersion: 2,
    });
  } catch (e) {
    console.warn('[firestoreMeta] rollup failed:', e?.message || e);
  }

  if (process.env.LOG_VERBOSE) {
    console.log(`[firestoreMeta] ${marketId} meta=${okMeta} digest=${okDigest} digestBytes=${digestBytes}`);
  }
  return { meta: okMeta, digest: okDigest };
}

/** Non-blocking after cache write. */
export function scheduleMarketMetaWrite(marketId, data, opts = {}) {
  if (!isFirestoreMetaEnabled()) return;
  setTimeout(() => {
    writeMarketMeta(marketId, data, opts).catch(() => {});
  }, 0);
}

export async function readMarketMeta(marketId) {
  if (!isFirestoreMetaEnabled() || !marketId) return null;
  return getDoc(COL_META, marketId);
}

export async function readMarketDigest(marketId) {
  if (!isFirestoreMetaEnabled() || !marketId) return null;
  const doc = await getDoc(COL_DIGEST, marketId);
  if (!doc) return null;
  let digest = null;
  if (typeof doc.digestJson === 'string') {
    try { digest = JSON.parse(doc.digestJson); } catch { /* ignore */ }
  }
  return { ...doc, digest };
}

export async function listMarketMeta(pageSize = 100) {
  if (!isFirestoreMetaEnabled()) return {};
  return listCollection(COL_META, pageSize);
}

export async function readDailyRollup(dateStr) {
  if (!isFirestoreMetaEnabled()) return null;
  const day = dateStr || todayStr();
  const doc = await getDoc(COL_ROLLUP, day);
  if (!doc) return null;
  let markets = {};
  if (typeof doc.marketsJson === 'string') {
    try { markets = JSON.parse(doc.marketsJson); } catch { /* ignore */ }
  }
  return { ...doc, markets };
}

export {
  COL_META,
  COL_DIGEST,
  COL_ROLLUP,
  COL_FIELDS,
  extractMarketDigest,
};
