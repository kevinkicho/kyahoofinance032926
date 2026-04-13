import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const CACHE_DIR = path.join(__dirname, '..', 'datacache');

if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

export function todayStr() { return new Date().toISOString().split('T')[0]; }

export function readDailyCache(market) {
  try {
    const fp = path.join(CACHE_DIR, `${market}-${todayStr()}.json`);
    if (fs.existsSync(fp)) {
      const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
      const str = JSON.stringify(data);
      if (str.length < 200) {
        console.warn(`[datacache] skipping stale cache for ${market}: too small (${str.length} bytes)`);
        return null;
      }
      return data;
    }
  } catch { /* skip */ }
  return null;
}

export function writeDailyCache(market, data) {
  try {
    if (!data || typeof data !== 'object') return;
    const str = JSON.stringify(data);
    if (str.length < 200) {
      console.warn(`[datacache] skipping cache for ${market}: response too small (${str.length} bytes), likely empty`);
      return;
    }
    fs.writeFileSync(path.join(CACHE_DIR, `${market}-${todayStr()}.json`), str, 'utf8');
  } catch (e) { console.warn(`[datacache] write failed for ${market}:`, e.message); }
}

export function readLatestCache(market) {
  try {
    const files = fs.readdirSync(CACHE_DIR)
      .filter(f => f.startsWith(`${market}-`) && f.endsWith('.json'))
      .sort().reverse();
    if (!files.length) return null;
    const fetchedOn = files[0].slice(market.length + 1, -5);
    return { data: JSON.parse(fs.readFileSync(path.join(CACHE_DIR, files[0]), 'utf8')), fetchedOn };
  } catch { return null; }
}

export function cleanOldCaches() {
  try {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 7);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    fs.readdirSync(CACHE_DIR).forEach(f => {
      const m = f.match(/-(\d{4}-\d{2}-\d{2})\.json$/);
      if (m && m[1] < cutoffStr) fs.unlinkSync(path.join(CACHE_DIR, f));
    });
  } catch { /* best-effort */ }
}
