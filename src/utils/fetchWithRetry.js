/**
 * Fetch with retry + abort timeout.
 * @param {string} url
 * @param {{ retries?: number, timeout?: number, backoff?: number }} opts
 * @returns {Promise<Response>}
 */
const isTest = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';

export async function fetchWithRetry(url, { retries = 2, timeout = 10000, backoff = 1000 } = {}) {
  const maxRetries = isTest ? 0 : retries;
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
      clearTimeout(timer);
      if (!res.ok) throw new Error(res.status);
      return res;
    } catch (err) {
      clearTimeout(timer);
      lastError = err;
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, backoff * (attempt + 1)));
      }
    }
  }
  throw lastError;
}
