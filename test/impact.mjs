/**
 * Practical impact test: use ONLY the generated CSS, applied the way a real
 * project would, and measure whether the values come out right.
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const CHROME =
  process.env.CHROME_PATH ||
  'C:/Users/21022/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe';

const css = fs.readFileSync('dist/claude-tokens.css', 'utf8');
const motion = fs.readFileSync('dist/claude-motion.css', 'utf8');

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
${css}
${motion}
body { margin: 0; }

/* A realistic consumer: the scope element also sets the type defaults. */
.cds-root {
  font-family: var(--cds-font-sans);
  font-size: var(--cds-font-size-body);
  line-height: var(--cds-leading-body);
  color: var(--cds-text-primary);
  background: var(--cds-page-bg);
  padding: 10px;
}
</style></head><body>

<div class="cds-root" data-mode="light" id="light">
  <p id="t1">Body text</p>
  <p id="t2" style="font-family: var(--cds-font-mono)">Mono</p>
  <p id="t3" style="font-family: var(--cds-font-voice)">Serif voice</p>
  <p id="t4" style="font-weight: var(--cds-font-weight-semibold)">Semibold</p>
  <p id="t5" style="font-size: var(--cds-font-size-title)">Title</p>
  <div id="b1" style="background: var(--cds-fill-brand); width:40px;height:20px"></div>
  <div id="b2" style="box-shadow: var(--cds-focus-shadow); width:40px;height:20px"></div>
  <div id="s1" style="background: var(--cds-alpha-2); width:40px;height:20px"></div>
</div>

<div class="cds-root" data-mode="dark" id="dark">
  <p id="d1">Body text dark</p>
  <p id="d2" style="font-weight: var(--cds-font-weight-semibold)">Semibold dark</p>
</div>

</body></html>`;

const tmp = path.resolve('test/.practical.html');
fs.writeFileSync(tmp, html);

const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage();
await page.goto('file:///' + tmp.split(path.sep).join('/'));

const r = await page.evaluate(() => {
  const g = (id, prop) => {
    const el = document.getElementById(id);
    return el ? getComputedStyle(el)[prop] : 'MISSING';
  };
  return {
    'body font-size': g('t1', 'fontSize'),
    'body line-height': g('t1', 'lineHeight'),
    'body font-family': g('t1', 'fontFamily').slice(0, 40) + '…',
    'mono family': g('t2', 'fontFamily'),
    'serif voice family': g('t3', 'fontFamily'),
    'semibold weight': g('t4', 'fontWeight'),
    'title size': g('t5', 'fontSize'),
    'brand bg': g('b1', 'backgroundColor'),
    'focus shadow layers': g('b2', 'boxShadow').split('),').length,
    'alpha bg': g('s1', 'backgroundColor'),
    'dark body size': g('d1', 'fontSize'),
    'dark weight': g('d2', 'fontWeight'),
  };
});

await browser.close();

for (const [k, v] of Object.entries(r)) console.log(k.padEnd(22), v);

/* ---------------------------------------------------------------- */
/* assertions: these are the values a consumer actually depends on    */
/* ---------------------------------------------------------------- */

const failures = [];
const expect = (label, actual, want) => {
  if (String(actual) !== String(want)) {
    failures.push(`${label}: got ${actual}, want ${want}`);
  }
};

// --cds-rem-scale must be supplied, or the whole type scale collapses to 16px.
expect('body font-size', r['body font-size'], '15px');
expect('body line-height', r['body line-height'], '22px');
expect('title size', r['title size'], '22px');
expect('dark body size', r['dark body size'], '15px');

// Substituted font stacks must not be empty or degenerate.
if (!/serif/.test(r['serif voice family'])) failures.push('serif stack lost its fallbacks');
if (!/monospace/.test(r['mono family'])) failures.push('mono stack lost its fallbacks');
if (/^Times New Roman$/.test(r['serif voice family'])) failures.push('serif fell back to bare Times');

// Core design values.
expect('semibold weight', r['semibold weight'], '580');
expect('brand bg', r['brand bg'], 'rgb(198, 97, 63)');
if (!/color\(|rgb/.test(r['alpha bg'])) failures.push('alpha ladder did not resolve');
if (r['focus shadow layers'] < 1) failures.push('focus shadow missing');

if (failures.length) {
  console.error('FAIL:');
  for (const f of failures) console.error('  -', f);
  process.exit(1);
}
console.log('OK: consumer-facing values are correct');
