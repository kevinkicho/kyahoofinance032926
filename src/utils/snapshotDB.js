const DB_NAME = 'hub-snapshots';
const STORE = 'snapshots';
const VERSION = 1;

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB unavailable'));
  }
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('marketId', 'marketId', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function todayStr() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Saves a snapshot record to IndexedDB.
 * @param {{ marketId: string, date?: string, [key: string]: any }} record
 */
export async function putSnapshot(record) {
  const { marketId } = record;
  const date = record.date || todayStr();
  if (!marketId) return;
  try {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const store = db.transaction(STORE, 'readwrite').objectStore(STORE);
      const req = store.put({ ...record, id: `${marketId}|${date}`, marketId, date });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('[snapshotDB] put failed for', marketId, '-', e?.message);
  }
}

/**
 * Retrieves the most recent snapshot for a given market.
 * @param {string} marketId
 * @returns {Promise<?Object>}
 */
export async function getLatest(marketId) {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const store = db.transaction(STORE, 'readonly').objectStore(STORE);
      const range = IDBKeyRange.bound(`${marketId}|`, `${marketId}|\uffff`);
      const req = store.openCursor(range, 'prev');
      req.onsuccess = () => resolve(req.result ? req.result.value : null);
      req.onerror = () => reject(req.error);
    });
  } catch { return null; }
}

/**
 * Retrieves the latest snapshot for each market present in the DB.
 * @returns {Promise<Object<string, Object>>}
 */
export async function getAllLatest() {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const store = db.transaction(STORE, 'readonly').objectStore(STORE);
      const req = store.openCursor();
      const latestByMarket = {};
      req.onsuccess = () => {
        const cur = req.result;
        if (cur) {
          const rec = cur.value;
          const prev = latestByMarket[rec.marketId];
          if (!prev || rec.date > prev.date) latestByMarket[rec.marketId] = rec;
          cur.continue();
        } else {
          resolve(latestByMarket);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch (e) { console.error('[snapshotDB] getAllLatest failed:', e); return {}; }
}

/**
 * Retrieves a snapshot for a specific market and date.
 * @param {string} marketId
 * @param {string} date - ISO date string (YYYY-MM-DD)
 * @returns {Promise<?Object>}
 */
export async function getSnapshot(marketId, date) {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const store = db.transaction(STORE, 'readonly').objectStore(STORE);
      const req = store.get(`${marketId}|${date}`);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch { return null; }
}

/**
 * Retrieves all dates with snapshots for a given market.
 * @param {string} marketId
 * @returns {Promise<string[]>}
 */
export async function getAllDatesFor(marketId) {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const store = db.transaction(STORE, 'readonly').objectStore(STORE);
      const range = IDBKeyRange.bound(`${marketId}|`, `${marketId}|\uffff`);
      const dates = [];
      const req = store.openKeyCursor(range);
      req.onsuccess = () => {
        const cur = req.result;
        if (cur) {
          dates.push(String(cur.key).split('|')[1]);
          cur.continue();
        } else {
          resolve(dates);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch (e) { console.error('[snapshotDB] getAllDatesFor failed:', e); return []; }
}

export { todayStr };
