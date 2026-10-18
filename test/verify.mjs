/**
 * Sanity check: load the generated CSS in a real browser and confirm that the
 * light/dark token switch actually resolves to different computed values.
 *
 * Usage: node test/verify.mjs [--chrome <path>]
 */

import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const args = process.argv.slice(2);
const getArg = (n, d = null) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};

const CHROME =
  getArg('chrome') ||
  process.env.CHROME_PATH ||
  'C:/Users/21022/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe';

const tokensCss = fs.readFileSync(path.resolve('dist/claude-tokens.css'), 'utf8');
const motionCss = fs.readFileSync(path.resolve('dist/claude-motion.css'), 'utf8');

const PROBES = [
  '--cds-gray-40',
  '--cds-fill-brand',
  '--cds-page-bg',
  '--cds-text-primary',
  '--cds-neutral-0',
  '--cds-bg-accent',
  '--cds-dur-base',
  '--cds-ease-out',
  '--cds-btn-spring',
];

const swatch = (mode, id) => `
<div class="cds-root" data-mode="${mode}" id="${id}">
  <div class="swatch">
    <div class="sw" style="background:var(--cds-gray-40);color:var(--cds-text-primary)">gray-40</div>
    <div class="sw" style="background:var(--cds-fill-brand);color:#fff">fill-brand</div>
    <div class="sw" style="background:var(--cds-page-bg);color:var(--cds-text-primary)">page-bg</div>
    <div class="sw" style="background:var(--cds-bg-accent);color:var(--cds-text-primary)">bg-accent</div>
  </div>
</div>`;

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
${tokensCss}
${motionCss}
body{margin:0;font:14px system-ui;background:#888}
.swatch{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:16px}
.sw{border-radius:8px;padding:10px;font-size:11px}
</style></head><body>
${swatch('light', 'light')}
${swatch('dark', 'dark')}
${swatch('system', 'system')}
</body></html>`;

const htmlPath = path.resolve('test/.verify.html');
fs.writeFileSync(htmlPath, html);

const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage();
await page.goto('file:///' + htmlPath.replace(/\\/g, '/'));

const result = await page.evaluate((probes) => {
  const read = (id) => {
    const cs = getComputedStyle(document.getElementById(id));
    const out = {};
    for (const p of probes) out[p] = cs.getPropertyValue(p).trim();
    return out;
  };
  return { light: read('light'), dark: read('dark') };
}, PROBES);

await browser.close();

/* ------------------------------------------------------------------ */
/* assertions                                                          */
/* ------------------------------------------------------------------ */

const failures = [];
const expectNonEmpty = (mode, prop) => {
  if (!result[mode][prop]) failures.push(`${mode}: ${prop} is empty`);
};

for (const p of PROBES) {
  expectNonEmpty('light', p);
  expectNonEmpty('dark', p);
}

// Semantic tokens are documented to flip between themes. Raw palette values
// (--cds-gray-*, --cds-clay, ...) deliberately do not.
for (const p of ['--cds-text-primary', '--cds-neutral-0', '--cds-page-bg', '--cds-bg-accent']) {
  if (result.light[p] === result.dark[p]) {
    failures.push(`${p} did not change between light and dark (both "${result.light[p]}")`);
  }
}

// Raw palette values must stay theme-invariant.
for (const p of ['--cds-gray-40', '--cds-fill-brand']) {
  if (result.light[p] !== result.dark[p]) {
    failures.push(`${p} is a raw palette value and should not change between themes`);
  }
}

// Motion tokens must be theme-invariant.
for (const p of ['--cds-dur-base', '--cds-ease-out', '--cds-btn-spring']) {
  if (result.light[p] !== result.dark[p]) {
    failures.push(`${p} should not change between themes`);
  }
}

// Brand colour is documented as clay.
if (!/#d97757|c6613f/i.test(result.light['--cds-fill-brand'] + result.dark['--cds-fill-brand'])) {
  failures.push('--cds-fill-brand does not reference a clay value');
}

console.log(JSON.stringify(result, null, 2));

if (failures.length) {
  console.error('\nFAIL:');
  for (const f of failures) console.error('  -', f);
  process.exit(1);
}
console.log('\nOK: all token assertions passed');
