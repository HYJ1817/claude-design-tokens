import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
const CHROME = process.env.CHROME_PATH || 'C:/Users/21022/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe';
const css = fs.readFileSync('dist/claude-tokens.css','utf8');
const probes = process.argv.slice(2);
const html = `<!doctype html><html><head><style>${css}</style></head><body>
<div class="cds-root" data-mode="light" id="a"></div>
<div class="cds-root" data-mode="dark" id="b"></div>
</body></html>`;
const p0 = path.resolve('test/.probe.html');
fs.writeFileSync(p0, html);
const b = await chromium.launch({ executablePath: CHROME });
const pg = await b.newPage();
await pg.goto('file:///' + p0.split(path.sep).join('/'));
const out = await pg.evaluate((names) => {
  const r = {};
  for (const id of ['a','b']) {
    const cs = getComputedStyle(document.getElementById(id));
    r[id] = {};
    for (const n of names) r[id][n] = cs.getPropertyValue(n).trim();
  }
  return r;
}, probes);
console.log(JSON.stringify(out, null, 1));
await b.close();
