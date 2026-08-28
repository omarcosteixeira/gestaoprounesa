import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
  
  try {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    
    // We need to bypass login maybe? Or can we just mock the db?
    // Wait, we might be stopped by the login screen.
    // If it's the login screen, we can't test it easily.
    
    await browser.close();
  } catch (e) {
    console.error(e);
    await browser.close();
  }
})();
