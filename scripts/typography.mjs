#!/usr/bin/env node
/**
 * Extract the typography, sizing and density system.
 *
 * Claude's tokens are not just colours: there is a full type scale with paired
 * line-heights, a five-step density ladder, a five-step control-size ladder, and
 * a user-facing text-size preference that re-points the scale per surface.
 *
 * Everything here is read from the stylesheet, not inferred.
 *
 * Usage: node scripts/typography.mjs [--data <dir>]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { openAsar } from '../src/asar.mjs';
import { parseCss, splitSelectors, classifyTheme } from '../src/css.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const getArg = (n, d = null) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};

const dataDir = path.resolve(ROOT, getArg('data', 'data'));
const tokens = JSON.parse(fs.readFileSync(path.join(dataDir, 'tokens.json'), 'utf8'));
const V = tokens.variables;
const asarPath = tokens.meta.asar.path;

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

const base = (name) => V[name]?.resolved.base ?? null;
const light = (name) => V[name]?.resolved.light ?? base(name);
const dark = (name) => V[name]?.resolved.dark ?? null;

/**
 * Resolve a `var()` chain to a literal.
 *
 * This must follow *every* link, not just single-level aliases: the base size
 * tokens are `var(--cds-font-size-body--lg)`, and the density block re-points
 * the `--lg` suffix. A one-level resolver silently reports the alias instead of
 * the value.
 */
function resolve(name, theme = 'light', seen = new Set()) {
  if (!name || seen.has(name)) return null;
  seen.add(name);
  const raw = theme === 'dark' ? (dark(name) ?? base(name)) : (light(name) ?? base(name));
  if (raw == null) return null;
  const s = String(raw).trim();
  const whole = s.match(/^var\(\s*(--[a-zA-Z0-9_-]+)\s*(?:,[^)]*)?\)$/);
  if (whole) return resolve(whole[1].slice(2), theme, seen);
  return s;
}

/**
 * Resolve a `calc(<num>rem * var(--cds-rem-scale, 1))` to rem.
 * Also handles the already-substituted `calc(<num>rem * 1)` form a browser
 * reports.
 */
function resolveRem(name, theme = 'light') {
  const raw = resolve(name, theme);
  return toRem(raw);
}

/** `calc(.875rem * var(--cds-rem-scale,1))` -> 0.875 rem, with rem-scale 1. */
function toRem(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  // calc(.875rem * var(--cds-rem-scale,1))  |  calc(.875rem * 1)  |  calc(.875rem*1)
  const m = s.match(/^calc\(\s*(-?[\d.]+)rem\s*\*\s*(?:var\(--cds-rem-scale\s*,\s*1\)|1)\s*\)$/);
  if (m) return Number(m[1]);
  const r = s.match(/^(-?[\d.]+)rem$/);
  if (r) return Number(r[1]);
  return null;
}

/** Parse `"wght" 460` into { axis, value }. */
function parseAxis(raw) {
  if (raw == null) return null;
  const m = String(raw).match(/^"([a-z]{4})"\s+(-?[\d.]+)$/i);
  return m ? { axis: m[1], value: Number(m[2]) } : null;
}

/* ------------------------------------------------------------------ */
/* 1. type scale — size + paired line-height                           */
/* ------------------------------------------------------------------ */

const SIZE_KEYS = [
  'caption',
  'footnote',
  'code',
  'body',
  'prose',
  'heading',
  'title',
];

const scale = [];
for (const key of SIZE_KEYS) {
  const sizeName = `cds-font-size-${key}`;
  const leadName = `cds-leading-${key}`;
  const sizeRem = resolveRem(sizeName);
  const leadRem = resolveRem(leadName);
  scale.push({
    role: key,
    sizeToken: `--${sizeName}`,
    size: resolve(sizeName),
    rem: sizeRem,
    leadingToken: `--${leadName}`,
    leading: resolve(leadName),
    leadingRem: leadRem,
    // Ratio is the useful number when re-implementing.
    ratio: sizeRem && leadRem ? Number((leadRem / sizeRem).toFixed(3)) : null,
  });
}

/* ------------------------------------------------------------------ */
/* 2. the text-size preference (Small / Medium / Large)                 */
/* ------------------------------------------------------------------ */

/** Variant suffixes: base, --textsm, --textmd, --textlg, --own */
const VARIANTS = ['', '--textsm', '--textmd', '--textlg', '--own'];

const textSizePref = {};
for (const v of VARIANTS) {
  const row = {};
  for (const key of ['body', 'prose', 'prose--xs', 'prose--sm', 'prose--lg', 'heading']) {
    const sizeName = `cds-font-size-${key}${v}`;
    const leadName = `cds-leading-${key}${v}`;
    if (!V[sizeName] && !V[leadName]) continue;
    row[key] = {
      size: resolve(sizeName),
      rem: resolveRem(sizeName),
      leading: resolve(leadName),
      leadingRem: resolveRem(leadName),
    };
  }
  if (Object.keys(row).length) textSizePref[v || 'default'] = row;
}

/* ------------------------------------------------------------------ */
/* 3. weights, and the dark-mode axis swap                             */
/* ------------------------------------------------------------------ */

const WEIGHTS = ['regular', 'medium', 'semibold', 'bold'];
const weights = [];
for (const w of WEIGHTS) {
  const lightWeight = base(`cds-font-weight-${w}`);
  const lightAxis = base(`cds-font-wght-${w}`);
  const darkAxis = dark(`cds-font-wght-${w}`);
  const parsedDark = parseAxis(darkAxis);
  weights.push({
    name: w,
    token: `--cds-font-weight-${w}`,
    lightValue: lightWeight == null ? null : Number(lightWeight),
    lightAxis: lightAxis === 'normal' ? null : parseAxis(lightAxis),
    darkAxis: parsedDark,
    delta:
      parsedDark && lightWeight != null ? parsedDark.value - Number(lightWeight) : null,
  });
}

const grades = {};
for (const w of ['semibold', 'bold']) {
  grades[w] = base(`cds-font-grad-${w}`);
}

/* ------------------------------------------------------------------ */
/* 4. density ladder (data-density) + size ladder (data-size)          */
/* ------------------------------------------------------------------ */

const asar = openAsar(asarPath);
const mainCss = asar
  .list('/')
  .filter((e) => e.path.endsWith('.css'))
  .sort((a, b) => b.size - a.size)[0];
const css = asar.readText(mainCss.path);
const parsed = parseCss(css);
asar.close();

/** Collect the custom properties a selector sets, keyed by selector. */
function propsFor(predicate) {
  const out = new Map();
  for (const rule of parsed.rules) {
    for (const sel of splitSelectors(rule.selector)) {
      if (!predicate(sel)) continue;
      if (!out.has(sel)) out.set(sel, {});
      for (const d of rule.declarations) {
        if (d.prop.startsWith('--')) out.get(sel)[d.prop.slice(2)] = d.value;
      }
    }
  }
  return out;
}

const STEP_PROPS = [
  'cds-radius',
  'cds-h-control',
  'cds-h-control-nested',
  'cds-icon',
  'cds-pad-xs',
  'cds-pad-sm',
  'cds-pad-md',
];

const steps = {};
for (const [sel, props] of propsFor((s) => /^\.cds-root \[data-step="\d"\]$/.test(s))) {
  const n = sel.match(/data-step="(\d)"/)[1];
  const row = {};
  for (const p of STEP_PROPS) {
    if (!props[p]) continue;
    row[p] = { raw: props[p], rem: toRem(props[p]) };
  }
  steps[n] = row;
}

const sizes = {};
for (const [sel, props] of propsFor((s) => /^\.cds-root \[data-size=(xs|sm|lg)\]$/.test(s))) {
  const n = sel.match(/data-size=(\w+)/)[1];
  const row = {};
  for (const [k, v] of Object.entries(props)) {
    if (!k.startsWith('cds-')) continue;
    row[k] = v;
  }
  sizes[n] = row;
}

/**
 * Two sources describe density: the `.cds-root` base block (compact default) and
 * the `[data-density=comfortable]` override. Capture both so the table shows the
 * actual pair rather than one column of dashes.
 */
const densityBase = {};
for (const [sel, props] of propsFor((s) => s === '.cds-root')) {
  for (const [k, v] of Object.entries(props)) {
    if (!k.startsWith('cds-')) continue;
    if (!/^cds-(radius|h-control|icon|pad|gap|font-size)/.test(k)) continue;
    densityBase[k] = { raw: v, rem: toRem(v) };
  }
}

const densityComfortable = {};
for (const [sel, props] of propsFor((s) => /^\.cds-root\[data-density=comfortable\]$/.test(s))) {
  for (const [k, v] of Object.entries(props)) {
    if (!k.startsWith('cds-')) continue;
    densityComfortable[k] = { raw: v, rem: toRem(v) };
  }
}

/* ------------------------------------------------------------------ */
/* 5. fonts                                                            */
/* ------------------------------------------------------------------ */

const fonts = {};
for (const name of ['cds-font-sans', 'cds-font-sans-display', 'cds-font-mono', 'cds-font-system', 'cds-font-voice']) {
  const v = base(name);
  if (v) fonts[name] = v;
}

/* ------------------------------------------------------------------ */
/* emit                                                                */
/* ------------------------------------------------------------------ */

const out = {
  meta: {
    source: tokens.meta,
    generatedAt: tokens.meta.extractedAt,
  },
  scale,
  textSizePreference: textSizePref,
  weights: {
    steps: weights,
    grades,
    note:
      'Light mode uses the plain font-weight property (wght tokens are "normal"). ' +
      'Dark mode switches to an explicit font-variation-settings wght axis, uniformly -40.',
  },
  densityLadder: { compact: densityBase, comfortable: densityComfortable },
  stepLadder: steps,
  sizeLadder: sizes,
  fonts,
};

fs.writeFileSync(path.join(dataDir, 'typography.json'), JSON.stringify(out, null, 2) + '\n');

console.log(
  `[typography] ${scale.length} scale steps, ${Object.keys(textSizePref).length} text-size variants, ` +
    `${Object.keys(steps).length} density steps, ${Object.keys(sizes).length} size variants`
);
for (const s of scale) {
  console.log(
    `[typography]   ${s.role.padEnd(9)} ${String(s.rem ?? '?').padStart(6)}rem / ` +
      `${String(s.leadingRem ?? '?').padStart(6)}rem  ratio ${s.ratio ?? '?'}`
  );
}
