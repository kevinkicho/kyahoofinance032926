import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 4200 } });
const page = await ctx.newPage();
await page.goto('http://localhost:5173/?market=globalMacro', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(22000);
const ls = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage).filter(([k]) => k.startsWith('macro-layout'))));
for (const [k, v] of Object.entries(ls)) {
  console.log('=== ' + k + ' ===');
  const arr = JSON.parse(v);
  console.log('  count:', arr.length);
  arr.forEach(it => console.log('    ' + it.i.padEnd(20) + ' x:' + it.x + ' y:' + it.y + ' w:' + it.w + ' h:' + it.h));
}
await browser.close();
