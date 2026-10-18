/**
 * Screenshot the example page in light and dark, for visual review.
 * Usage: node test/shot.mjs
 */
import { chromium } from 'playwright';
import path from 'node:path';

const CHROME =
  process.env.CHROME_PATH ||
  'C:/Users/21022/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe';

const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage({
  viewport: { width: 1100, height: 1400 },
  deviceScaleFactor: 1,
});

const file = path.resolve('examples/preview.html');
await page.goto('file:///' + file.split(path.sep).join('/'));

await page.waitForTimeout(700);
await page.screenshot({ path: 'docs/images/preview-light.png', fullPage: true });

await page.click('.toolbar button[data-set="dark"]');
await page.waitForTimeout(700);
await page.screenshot({ path: 'docs/images/preview-dark.png', fullPage: true });

await browser.close();
console.log('[shot] wrote docs/images/preview-{light,dark}.png');
