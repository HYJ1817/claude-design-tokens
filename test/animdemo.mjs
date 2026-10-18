/**
 * Screenshot the icon-animation demo at ANIM=0 and ANIM=100.
 * Usage: node test/animdemo.mjs
 */
import { chromium } from 'playwright';
import path from 'node:path';

const CHROME =
  process.env.CHROME_PATH ||
  'C:/Users/21022/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe';

const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage({
  viewport: { width: 1000, height: 1100 },
  deviceScaleFactor: 1,
});

const file = path.resolve('examples/icon-animation/index.html');
await page.goto('file:///' + file.split(path.sep).join('/'));
await page.waitForTimeout(900);

const setAnim = async (v) => {
  await page.evaluate((val) => {
    const s = document.getElementById('anim');
    s.value = val;
    s.dispatchEvent(new Event('input'));
  }, v);
  await page.waitForTimeout(250);
};

await setAnim(0);
await page.screenshot({ path: 'docs/images/icon-anim-rest.png', fullPage: true });

await setAnim(100);
await page.screenshot({ path: 'docs/images/icon-anim-end.png', fullPage: true });

await browser.close();
console.log('[animdemo] wrote docs/images/icon-anim-{rest,end}.png');
