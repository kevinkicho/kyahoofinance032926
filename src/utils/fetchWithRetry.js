/**
 * Fetch with retry + per-attempt timeout and overall total-timeout budget.
 * @param {string} url
 * @param {{ retries?: number, timeout?: number, backoff?: number, totalTimeout?: number }} opts
 * @returns {Promise<Response>}
 */
function anySignal(signals) {
  const controller = new AbortController();
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      return controller.signal;
    }
    signal.addEventListener('abort', () => controller.abort(signal.reason), { signal: controller.signal });
  }
  return controller.signal;
}

const isTest = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';

export async function fetchWithRetry(url, {
  retries = 2,
  timeout = 10000,
  backoff = 1000,
  totalTimeout = 30000,
  headers = undefined,
} = {}) {
  const maxRetries = isTest ? 0 : retries;
  const totalReason = new DOMException('Total timeout exceeded', 'AbortError');
  const totalController = totalTimeout ? new AbortController() : null;
  const totalTimer = totalTimeout ? setTimeout(() => totalController.abort(totalReason), totalTimeout) : null;
  let lastError;
  try {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const attemptController = new AbortController();
      const timer = setTimeout(() => attemptController.abort(), timeout);
      const signal = totalController
        ? anySignal([attemptController.signal, totalController.signal])
        : attemptController.signal;
      try {
        const res = await fetch(url, { signal, cache: 'no-store', headers });
        if (!res.ok) throw new Error(res.status);
        return res;
      } catch (err) {
        lastError = err;
        if (totalController?.signal.aborted) {
          throw totalReason;
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
