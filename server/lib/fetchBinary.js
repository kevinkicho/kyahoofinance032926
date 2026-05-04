// Shared helper for fetching binary payloads (xlsx, pdf, etc.) and HTML
// pages from sources that block our default User-Agent. Several Federal
// Reserve banks live behind Akamai/CDN front-ends that 403 anything that
// doesn't look like a real browser, so we send a stock Chrome UA.
import https from 'https';

const BROWSER_UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function get(url, asBuffer, redirectsLeft = 5) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': BROWSER_UA,
        'Accept': asBuffer
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/octet-stream;q=0.9, */*;q=0.5'
          : 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.5',
      },
    }, (res) => {
      // Follow 301/302/307 (the Fed sites redirect /old paths to /new ones).
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirectsLeft > 0) {
        const next = new URL(res.headers.location, url).toString();
        get(next, asBuffer, redirectsLeft - 1).then(resolve, reject);
        return;
      }
      if (res.statusCode >= 400) {
        reject(new Error(`HTTP ${res.statusCode} from ${new URL(url).hostname}`));
        return;
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        resolve(asBuffer ? buf : buf.toString('utf8'));
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => req.destroy(new Error(`fetch timeout for ${new URL(url).hostname}`)));
  });
}

export const fetchHtml   = (url) => get(url, false);
export const fetchBuffer = (url) => get(url, true);
