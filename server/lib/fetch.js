import https from 'https';

const DEFAULT_USER_AGENT = 'kyahoofinance-researcher (Educational Sandbox)';

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

export function fetchJSON(url, userAgent = DEFAULT_USER_AGENT) {
  const isFRED = url.includes('api.stlouisfed.org');
  const doFetch = () => new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'User-Agent': userAgent,
        'Accept': 'application/json',
      },
    };
    const req = https.get(options, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchJSON(res.headers.location, userAgent).then(resolve).catch(reject);
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

    const timeoutMs = 10000;
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error(`fetchJSON timeout (${timeoutMs}ms) for ${urlObj.hostname}${urlObj.pathname}`));
    });
  });

  if (isFRED) {
    return throttleFRED().then(doFetch);
  }
  return doFetch();
}