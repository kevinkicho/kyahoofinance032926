const BASE = process.env.SHOT_BASE_URL
  || 'https://kyahoofinance032926--kfinance032926.us-central1.hosted.app';

const html = await (await fetch(BASE)).text();
const jsMatch = html.match(/assets\/index-[^"]+\.js/);
console.log('index', jsMatch?.[0]);
if (!jsMatch) process.exit(1);
const js = await (await fetch(`${BASE}/${jsMatch[0]}`)).text();
const all = [...js.matchAll(/([A-Za-z]+Market-[A-Za-z0-9_-]+\.js)/g)].map((m) => m[1]);
const unique = [...new Set(all)];
console.log('market chunks found:', unique.length);
for (const n of unique) {
  const r = await fetch(`${BASE}/assets/${n}`);
  const ct = r.headers.get('content-type') || '';
  const body = await r.text();
  const bad = !r.ok || ct.includes('text/html') || body.trimStart().startsWith('<!DOCTYPE');
  console.log(`${bad ? 'BAD' : 'OK '} ${n} status=${r.status} ct=${ct.slice(0, 40)} bytes=${body.length}`);
}
