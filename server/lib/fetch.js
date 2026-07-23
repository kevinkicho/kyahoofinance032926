import https from 'https';

const DEFAULT_USER_AGENT = 'kyahoofinance-researcher (Educational Sandbox)';
const FRED_USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const FRED_RATE_LIMIT = 120;
const FRED_WINDOW_MS = 60_000;
const MAX_REDIRECTS = 5;
const fredCallTimestamps = [];

async function throttleFRED() {
  const now = Date.now();
  const windowStart = now - FRED_WINDOW_MS;
  // Prune stale entries efficiently — find the first non-stale index and slice.
  const staleIdx = fredCallTimestamps.findIndex(ts => ts >= windowStart);
  if (staleIdx > 0) fredCallTimestamps.splice(0, staleIdx);
  else if (staleIdx === -1 && fredCallTimestamps.length > 0) fredCallTimestamps.length = 0;

  if (fredCallTimestamps.length >= FRED_RATE_LIMIT) {
    const waitMs = fredCallTimestamps[0] + FRED_WINDOW_MS - now + 100;
    console.warn(`[FRED throttle] At ${FRED_RATE_LIMIT}/min limit, waiting ${Math.round(waitMs / 1000)}s`);
    await new Promise(r => setTimeout(r, waitMs));
  }
  fredCallTimestamps.push(Date.now());
}

function doFetchJSON(url, userAgent, extraHeaders, timeoutMs) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'User-Agent': userAgent,
        'Accept': 'application/json',
        ...extraHeaders
      },
    };
    const req = https.get(options, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        reject({ redirect: res.headers.location });
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
}

export function fetchJSON(url, userAgent = DEFAULT_USER_AGENT, extraHeaders = {}, timeoutMs = 10000, _redirectsLeft = MAX_REDIRECTS) {
  const isFRED = url.includes('api.stlouisfed.org');
  const effectiveUA = (isFRED && userAgent === DEFAULT_USER_AGENT) ? FRED_USER_AGENT : userAgent;

  const withRedirects = async () => {
    let currentUrl = url;
    let redirectsLeft = _redirectsLeft;
    while (redirectsLeft > 0) {
      try {
        return await doFetchJSON(currentUrl, effectiveUA, extraHeaders, timeoutMs);
      } catch (e) {
        if (e?.redirect && redirectsLeft > 0) {
          currentUrl = e.redirect;
          redirectsLeft--;
          continue;
        }
        throw e;
      }
    }
    throw new Error(`Too many redirects (>${MAX_REDIRECTS}) for ${url}`);
  };

  const withRetry = async () => {
    // FRED free tier: 120/min soft limit (we throttle) + occasional 403/429.
    // Longer backoff on 429 so concurrent market routes don't stampede.
    const delays = [300, 900, 2000, 5000];
    let lastErr;
    for (let i = 0; i <= delays.length; i++) {
      try { return await withRedirects(); }
      catch (e) {
        lastErr = e;
        const msg = String(e?.message || '');
        const is429 = /HTTP\s*429|rate[\s_-]?limit|too many requests/i.test(msg);
        const transient =
          is429 ||
          /HTTP 5\d\d/.test(msg) ||
          /HTTP 403/.test(msg) ||
          /timeout/i.test(msg);
        if (!isFRED || !transient || i === delays.length) throw e;
        const base = is429 ? Math.max(delays[i] || 5000, 8000) : delays[i];
        const jitter = Math.floor(Math.random() * (is429 ? 1500 : 250));
        if (is429) {
          console.warn(`[FRED] 429/rate-limit — backoff ${Math.round((base + jitter) / 1000)}s (attempt ${i + 1})`);
        }
        await new Promise(r => setTimeout(r, base + jitter));
      }
    }
    throw lastErr;
  };

  if (isFRED) {
    return throttleFRED().then(withRetry);
  }
  return withRedirects();
}