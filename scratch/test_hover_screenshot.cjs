const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForSelector('.market-tab-wrapper', { timeout: 10000 });
  
  const wrappers = await page.$$('.market-tab-wrapper');
  
  for (let i = 0; i < wrappers.length; i++) {
    const wrapper = wrappers[i];
    const button = await wrapper.$('button');
    const label = await button.innerText();
    
    if (label.trim().toLowerCase() === 'commodities') {
      console.log('Hovering over Commodities...');
      await wrapper.hover();
      await page.waitForTimeout(1000); // let css and rendering settle
      
      const screenshotPath = path.join(__dirname, '..', 'hover_screenshot.png');
      await page.screenshot({ path: screenshotPath, fullPage: false });
      console.log(`Saved screenshot to ${screenshotPath}`);
      break;
    }
  }

  await browser.close();
})();
