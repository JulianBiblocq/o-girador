const p = require('puppeteer');
(async () => {
  const b = await p.launch();
  const page = await b.newPage();
  page.on('console', m => console.log('BROWSER:', m.text()));
  page.on('pageerror', e => console.log('ERROR:', e.message));
  await page.goto('http://localhost:5173');
  await new Promise(r => setTimeout(r, 6000));
  await b.close();
})();
