/**
 * Transient outbound-network errors that must not take down Express.
 * Regression: Census trade fan-out + ECONNRESET used to uncaughtException
 * and kill `npm run dev` mid-session.
 */
export const TRANSIENT_NET_CODES = new Set([
  'ECONNRESET',
  'EPIPE',
  'ETIMEDOUT',
  'ECONNREFUSED',
  'ENOTFOUND',
  'EAI_AGAIN',
  'EHOSTUNREACH',
  'ENETUNREACH',
]);

/**
 * @param {unknown} err
 * @returns {boolean}
 */
export function isTransientNetworkError(err) {
  if (err == null) return false;
  const code = err?.code || err?.errno;
  if (typeof code === 'string' && TRANSIENT_NET_CODES.has(code)) return true;
  const msg = String(err?.message || err || '');
  return /ECONNRESET|socket hang up|network socket disconnected|EPIPE|ETIMEDOUT|ENOTFOUND/i.test(msg);
}
