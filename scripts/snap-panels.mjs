import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 4500 } });
const page = await ctx.newPage();
async function shot(market, file) {
  await page.goto(`http://localhost:5173/?market=${market}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(20000);
  await page.evaluate(() => {
    document.querySelectorAll('*').forEach(el => {
      if (el.scrollHeight > el.clientHeight + 5) el.scrollTop = el.scrollHeight;
    });
  });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: file, fullPage: false });
  console.log('Saved ' + file);
}
await shot('bonds', '/tmp/bonds-tall.png');
await shot('globalMacro', '/tmp/macro-tall.png');
await browser.close();
