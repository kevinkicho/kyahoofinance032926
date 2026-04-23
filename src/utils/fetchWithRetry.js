/**
 * Fetch with retry + per-attempt timeout and overall total-timeout budget.
 * @param {string} url
 * @param {{ retries?: number, timeout?: number, backoff?: number, totalTimeout?: number }} opts
 * @returns {Promise<Response>}
 */
const isTest = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';

export async function fetchWithRetry(url, { retries = 2, timeout = 10000, backoff = 1000, totalTimeout = 30000 } = {}) {
  const maxRetries = isTest ? 0 : retries;
  const totalController = totalTimeout ? new AbortController() : null;
  const totalTimer = totalTimeout ? setTimeout(() => totalController.abort(), totalTimeout) : null;
  let lastError;
  try {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const attemptController = new AbortController();
      const timer = setTimeout(() => attemptController.abort(), timeout);
      const signal = totalController
        ? AbortSignal.any([attemptController.signal, totalController.signal])
        : attemptController.signal;
      try {
        const res = await fetch(url, { signal, cache: 'no-store' });
        if (!res.ok) throw new Error(res.status);
        return res;
      } catch (err) {
        lastError = err;
        if (totalController?.signal.aborted) {
          throw new Error('Total timeout exceeded');
        }
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, backoff * (attempt + 1)));
        }
      } finally {
        clearTimeout(timer);
      }
    }
    throw lastError;
  } finally {
    if (totalTimer) clearTimeout(totalTimer);
  }
}
