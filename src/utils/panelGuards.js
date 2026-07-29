/**
 * Null-safe helpers for always-mounted bento panels.
 * Prefer these over bare `.slice` / `.map` on props that arrive after first paint.
 */

/** @returns {any[]} */
export function asArray(v) {
  return Array.isArray(v) ? v : [];
}

/** Safe slice that never throws on non-arrays. */
export function safeSlice(v, start, end) {
  return asArray(v).slice(start, end);
}

/** Finite number or null. */
export function asNumber(v) {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/** History-shaped object with dates/values arrays. */
export function asHistory(v) {
  if (!v || typeof v !== 'object') return { dates: [], values: [] };
  return {
    dates: asArray(v.dates),
    values: asArray(v.values),
    ...v,
  };
}

/** True when a history series has enough points to chart. */
export function hasHistory(v, min = 1) {
  if (!v || typeof v !== 'object') return false;
  if (Array.isArray(v.dates) && v.dates.length >= min) return true;
  if (Array.isArray(v.values) && v.values.length >= min) return true;
  if (Array.isArray(v) && v.length >= min) return true;
  return false;
}
