import https from 'https';

const DEFAULT_USER_AGENT = 'kyahoofinance-researcher (Educational Sandbox)';

export function fetchJSON(url, userAgent = DEFAULT_USER_AGENT) {
  return new Promise((resolve, reject) => {
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
    https.get(options, (res) => {
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
  });
}