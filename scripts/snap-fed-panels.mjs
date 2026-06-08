import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 5500 } });
const page = await ctx.newPage();
async function shot(market, file) {
  await page.goto(`http://localhost:5173/?market=${market}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(22000);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: file, fullPage: true });
  console.log('Saved ' + file);
}
await shot('globalMacro', '/tmp/macro-fed.png');
await shot('sentiment', '/tmp/sentiment-fed.png');
await browser.close();
