/**
 * Simple host/circuit breakers for upstream etiquette.
 * After a hard network failure (ENOTFOUND, EAI_AGAIN), skip further calls
 * to that host for a cooldown window — use cache/snapshot instead.
 */

const circuits = new Map(); // host -> { openUntil, reason, trips }

const DEFAULT_COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes

function hostFromUrl(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return String(url || '').slice(0, 80);
  }
}

export function isCircuitOpen(hostOrUrl) {
  const host = hostOrUrl.includes('://') ? hostFromUrl(hostOrUrl) : hostOrUrl;
  const c = circuits.get(host);
  if (!c) return false;
  if (Date.now() >= c.openUntil) {
    circuits.delete(host);
    return false;
  }
  return true;
}

export function getCircuitState(hostOrUrl) {
  const host = hostOrUrl.includes('://') ? hostFromUrl(hostOrUrl) : hostOrUrl;
  const c = circuits.get(host);
  if (!c || Date.now() >= c.openUntil) {
    return { host, open: false, remainingMs: 0 };
  }
  return {
    host,
    open: true,
    remainingMs: c.openUntil - Date.now(),
    reason: c.reason,
    trips: c.trips,
  };
}

/**
 * Record a failure. DNS / getaddrinfo errors trip the circuit immediately.
 * @returns {boolean} true if circuit is now open
 */
export function noteUpstreamFailure(hostOrUrl, err, cooldownMs = DEFAULT_COOLDOWN_MS) {
  const host = hostOrUrl.includes('://') ? hostFromUrl(hostOrUrl) : hostOrUrl;
  const msg = String(err?.message || err?.code || err || '');
  const isDns =
    /ENOTFOUND|EAI_AGAIN|getaddrinfo|ERR_NAME_NOT_RESOLVED|DNS/i.test(msg)
    || err?.code === 'ENOTFOUND'
    || err?.code === 'EAI_AGAIN';
  if (!isDns) return isCircuitOpen(host);

  const prev = circuits.get(host) || { trips: 0 };
  const openUntil = Date.now() + cooldownMs;
  circuits.set(host, {
    openUntil,
    reason: msg.slice(0, 160),
    trips: (prev.trips || 0) + 1,
  });
  console.warn(
    `[circuit] OPEN ${host} for ${Math.round(cooldownMs / 1000)}s after DNS/network failure: ${msg.slice(0, 120)}`,
  );
  return true;
}

export function resetCircuit(hostOrUrl) {
  const host = hostOrUrl.includes('://') ? hostFromUrl(hostOrUrl) : hostOrUrl;
  circuits.delete(host);
}

export function listOpenCircuits() {
  const now = Date.now();
  const out = [];
  for (const [host, c] of circuits.entries()) {
    if (now < c.openUntil) {
      out.push({
        host,
        remainingMs: c.openUntil - now,
        reason: c.reason,
        trips: c.trips,
      });
    }
  }
  return out;
}

export const IMF_HOST = 'dataservices.imf.org';
