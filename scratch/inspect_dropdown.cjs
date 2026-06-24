const { chromium } = require('playwright');

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
      await wrapper.hover();
      await page.waitForTimeout(1000); // let css and rendering settle
      
      const dropdownHtml = await page.evaluate(el => {
        const dropdown = el.querySelector('.market-panel-dropdown');
        if (!dropdown) return 'No dropdown found!';
        
        // Let's get computed styles and dimensions
        const style = window.getComputedStyle(dropdown);
        const rect = dropdown.getBoundingClientRect();
        
        return {
          html: dropdown.outerHTML,
          display: style.display,
          visibility: style.visibility,
          opacity: style.opacity,
          rect: {
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height
          }
        };
      }, wrapper);
      
      console.log(JSON.stringify(dropdownHtml, null, 2));
      break;
    }
  }

  await browser.close();
})();
