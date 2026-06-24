import https from 'https';

const DEFAULT_USER_AGENT = 'kyahoofinance-researcher (Educational Sandbox)';
// FRED is fronted by Akamai/edgesuite, which sporadically 403s requests
// from non-browser User-Agents — the block is per-series and per-edge, so
// e.g. WALCL fails while CPIAUCSL succeeds on the same Node process.
// Send a stock browser UA only to FRED, leaving all other endpoints alone.
const FRED_USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const FRED_RATE_LIMIT = 120;
const FRED_WINDOW_MS = 60_000;
const fredCallTimestamps = [];

async function throttleFRED() {
  const now = Date.now();
  const windowStart = now - FRED_WINDOW_MS;
  while (fredCallTimestamps.length > 0 && fredCallTimestamps[0] < windowStart) {
    fredCallTimestamps.shift();
  }
  if (fredCallTimestamps.length >= FRED_RATE_LIMIT) {
    const waitMs = fredCallTimestamps[0] + FRED_WINDOW_MS - now + 100;
    console.warn(`[FRED throttle] At ${FRED_RATE_LIMIT}/min limit, waiting ${Math.round(waitMs / 1000)}s`);
    await new Promise(r => setTimeout(r, waitMs));
  }
  fredCallTimestamps.push(Date.now());
}

export function fetchJSON(url, userAgent = DEFAULT_USER_AGENT, extraHeaders = {}, timeoutMs = 10000) {
  const isFRED = url.includes('api.stlouisfed.org');
  // Override only when the caller didn't explicitly pass a UA (i.e. used the
  // default). Routes that already pass a custom UA — e.g. EDGAR's required
  // contact-identifier UA — must not be overridden.
  const effectiveUA = (isFRED && userAgent === DEFAULT_USER_AGENT) ? FRED_USER_AGENT : userAgent;
  const doFetch = () => new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'User-Agent': effectiveUA,
        'Accept': 'application/json',
        ...extraHeaders
      },
    };
    const req = https.get(options, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        // Resolve to the redirect URL as a promise so the caller's retry
        // and throttle wrappers still apply. Pass the original userAgent
        // so the FRED UA override is re-evaluated for the redirect target.
        fetchJSON(res.headers.location, userAgent, extraHeaders, timeoutMs).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode >= 400) {
        let data = '';
        res.on('data', d => data += d);
        res.on('end', () => {
          reject(new Error(`HTTP ${res.statusCode} from ${urlObj.hostname}: ${data.substring(0, 200)}`));
        });
        return;
      }
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    }).on('error', reject);

    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error(`fetchJSON timeout (${timeoutMs}ms) for ${urlObj.hostname}${urlObj.pathname}`));
    });
  });

  // Retry on FRED transient 5xx and on Akamai 403 — both are usually
  // edge/CDN-level rather than the underlying API actually denying us, and
  // a brief delay routes the retry to a different edge node. Without the
  // retries, panels like Fed Balance Sheet (WALCL) and M2 (M2SL) flip to
  // "NO DATA" whenever Akamai's WAF gets twitchy. Three attempts with
  // increasing jitter buy us a substantial reliability bump for ~2.5s of
  // worst-case extra latency on the rare bad day.
  const withRetry = async () => {
    const delays = [300, 900, 2000];
    let lastErr;
    for (let i = 0; i <= delays.length; i++) {
      try { return await doFetch(); }
      catch (e) {
        lastErr = e;
        const msg = String(e?.message || '');
        const transient = /HTTP 5\d\d/.test(msg) || /HTTP 403/.test(msg) || /timeout/i.test(msg);
        if (!isFRED || !transient || i === delays.length) throw e;
        const jitter = Math.floor(Math.random() * 250);
        await new Promise(r => setTimeout(r, delays[i] + jitter));
      }
    }
    throw lastErr;
  };
  if (isFRED) {
    return throttleFRED().then(withRetry);
  }
  return doFetch();
}