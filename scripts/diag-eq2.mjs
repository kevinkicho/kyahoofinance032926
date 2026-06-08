import { chromium } from 'playwright';
const b = await chromium.launch();

// (1) Fresh context — simulates a never-visited browser
{
  const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 } });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('PE: ' + e.message.slice(0,200)));
  p.on('console', m => { if (m.type() === 'error') errs.push('CE: ' + m.text().slice(0,200)); });
  await p.goto('http://localhost:5173/?market=equities', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(15000);
  await p.screenshot({ path: '/tmp/eq-fresh.png', fullPage: true });
  const grid = await p.evaluate(() => [...document.querySelectorAll('.react-grid-layout > *')].map(c => {
    const r = c.getBoundingClientRect();
    return { title: c.querySelector('.bento-panel-title, .eq-panel-title')?.textContent?.trim()?.slice(0,30), w: Math.round(r.width), h: Math.round(r.height) };
  }));
  console.log('=== FRESH context ===');
  grid.forEach(it => console.log('  "'+(it.title||'')+'" w='+it.w+' h='+it.h));
  console.log('errors:', errs);
  await ctx.close();
}

// (2) Inject stale localStorage v3 with degenerate sizes — simulates the user's situation
{
  const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 } });
  await ctx.addInitScript(() => {
    // Bad v3 layout — simulate what's stuck in user's browser
    const bad = JSON.stringify([
      {i:'kpi',x:0,y:0,w:1,h:1,moved:false,static:false},
      {i:'heatmap',x:0,y:1,w:1,h:1,moved:false,static:false},
      {i:'sidebar',x:0,y:2,w:1,h:1,moved:false,static:false},
    ]);
    localStorage.setItem('equities-heatmap-layout-v3', bad);
    localStorage.setItem('equities-heatmap-layout-v4', bad);  // also pollute v4 in case
  });
  const p = await ctx.newPage();
  await p.goto('http://localhost:5173/?market=equities', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(15000);
  await p.screenshot({ path: '/tmp/eq-stale.png', fullPage: true });
  const grid = await p.evaluate(() => [...document.querySelectorAll('.react-grid-layout > *')].map(c => {
    const r = c.getBoundingClientRect();
    return { title: c.querySelector('.bento-panel-title, .eq-panel-title')?.textContent?.trim()?.slice(0,30), w: Math.round(r.width), h: Math.round(r.height) };
  }));
  const ls = await p.evaluate(() => Object.fromEntries(Object.entries(localStorage).filter(([k]) => k.includes('equities')).map(([k,v]) => [k, JSON.parse(v).map(i => `${i.i}=${i.w}x${i.h}`).join(',')])));
  console.log('=== STALE v3+v4 simulation ===');
  grid.forEach(it => console.log('  "'+(it.title||'')+'" w='+it.w+' h='+it.h));
  console.log('localStorage:', ls);
  await ctx.close();
}

await b.close();
