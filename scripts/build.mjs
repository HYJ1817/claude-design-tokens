#!/usr/bin/env node
/**
 * Turn data/*.json into drop-in stylesheets.
 *
 * Usage:
 *   node scripts/build.mjs [--data <dir>] [--dist <dir>]
 *
 * Produces:
 *   dist/claude-tokens.css        all --cds-* tokens, light + dark, prefixed selector
 *   dist/claude-tokens-flat.css   the same set with no theme switching (light only)
 *   dist/claude-motion.css        durations, easings, springs + all @keyframes
 *
 * The generated files are namespaced under `.cds-root` so they will not collide
 * with an existing design system. Pass --scope to change it.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const getArg = (name, fallback = null) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const dataDir = path.resolve(ROOT, getArg('data', 'data'));
const distDir = path.resolve(ROOT, getArg('dist', 'dist'));
const SCOPE = getArg('scope', '.cds-root');

const tokens = JSON.parse(fs.readFileSync(path.join(dataDir, 'tokens.json'), 'utf8'));
const kf = JSON.parse(fs.readFileSync(path.join(dataDir, 'keyframes.json'), 'utf8'));
const report = JSON.parse(fs.readFileSync(path.join(dataDir, 'report.json'), 'utf8'));

const meta = tokens.meta;

/* ------------------------------------------------------------------ */
/* host-provided variables                                             */
/* ------------------------------------------------------------------ */

/**
 * The app references these but never defines them: they are injected at runtime
 * or expected from the host. Shipping them with sane defaults turns the token
 * set from "96% works" into "works out of the box".
 */
const REQUIRED_SUBSTITUTES = [
  ['cds-rem-scale', '1', 'referenced 110x; rem multiplier for the whole scale'],
  ['placeholder-reveal-delay', '.5s', 'skeleton reveal delay, injected at runtime'],
  ['cmp-chin-row-h', '2rem', 'composer chin row height'],
  ['cds-font-mono-override', 'initial', 'mono override hook; empty so the fallback chain applies'],
  // The app ships Anthropic Serif/Sans as binaries we cannot redistribute. These
  // aliases give every consumer a working stack instead of an empty value.
  // The original stacks already end in a full fallback chain, so these only need
  // to occupy the *first* slot. Repeating the chain here would duplicate it.
  ['font-anthropic-serif', 'ui-serif',
   'first-slot substitute for the non-redistributable Anthropic Serif'],
  ['font-anthropic-mono', '"SF Mono"',
   'first-slot substitute for the non-redistributable Anthropic Mono'],
  ['font-anthropic-sans-display', 'ui-sans-serif',
   'first-slot substitute for the non-redistributable Anthropic Sans Display'],
];

/* ------------------------------------------------------------------ */
/* grouping                                                            */
/* ------------------------------------------------------------------ */

/**
 * Not every extracted variable belongs in a reusable theme file.
 *   cds-*        the real design system            -> include
 *   claude-*     Claude Code app-specific surfaces -> include (documented)
 *   cq-*         a separate, self-contained widget  -> include separately
 *   tw-*         Tailwind v4 runtime internals      -> exclude
 *   _*           Sass/CSS intermediate values       -> exclude
 *   others       pre-Tailwind legacy variables      -> include separately
 */
function classify(name) {
  if (name.startsWith('tw-') || name.startsWith('_')) return 'internal';
  if (name.startsWith('cds-') || name.startsWith('claude-')) return 'cds';
  if (name.startsWith('cq-')) return 'cq';
  return 'legacy';
}

const buckets = { cds: [], cq: [], legacy: [], internal: [] };
for (const [name, v] of Object.entries(tokens.variables)) {
  buckets[classify(name)].push({ name, ...v });
}

/* Motion tokens live inside the cds bucket; pull them out for the motion file. */
const MOTION_RE = /^cds-(dur|ease|animate|transition|spring|btn-spring)/;
const motionVars = buckets.cds.filter((t) => MOTION_RE.test(t.name));

/* ------------------------------------------------------------------ */
/* css emission helpers                                                */
/* ------------------------------------------------------------------ */

const banner = (what) => `/*!
 * ${what}
 *
 * Extracted from ${meta.product} ${meta.version || ''} (${meta.packageName || 'n/a'})
 *   asar sha256: ${meta.asar.sha256}
 *   extracted:   ${meta.extractedAt}
 *
 * Generated file — do not edit. Run \`npm run build\` instead.
 *
 * These are design values reverse-engineered from a shipped application for
 * interoperability and study. No Anthropic source code, font binaries or icon
 * assets are included. See NOTICE.md.
 */
`;

/** Emit `--name: value;` lines for a theme. */
function decls(items, theme, indent = '  ') {
  const out = [];
  for (const t of items) {
    const value = t.resolved[theme];
    if (value == null) continue;
    out.push(`${indent}--${t.name}: ${value};`);
  }
  return out;
}

/** A token is themed when light/dark actually differ from base. */
const themed = (t) =>
  (t.resolved.light != null && t.resolved.light !== t.resolved.base) ||
  (t.resolved.dark != null && t.resolved.dark !== t.resolved.base);

const themedTokens = buckets.cds.filter(themed);
const staticTokens = buckets.cds.filter((t) => !themed(t));

/* ------------------------------------------------------------------ */
/* claude-tokens.css                                                   */
/* ------------------------------------------------------------------ */

{
  const L = [];
  L.push(banner('Claude design tokens — themed'));
  L.push(`/* Scope: ${SCOPE}  |  ${buckets.cds.length} tokens  |  ${themedTokens.length} themed */`);
  L.push('');
  L.push(`@layer claude-tokens {`);
  L.push('');
  L.push(`  /* ----------------------------------------------------------------`);
  L.push(`   * Theme switch mechanism (recovered from the shipped stylesheet)`);
  L.push(`   *`);
  L.push(`   *   ${SCOPE}[data-mode=light]   explicit light`);
  L.push(`   *   ${SCOPE}[data-mode=dark]    explicit dark`);
  L.push(`   *   ${SCOPE}[data-mode=system]  follow prefers-color-scheme`);
  L.push(`   *`);
  L.push(`   * Tokens that never change between themes are declared once on`);
  L.push(`   * ${SCOPE} itself; only the ${themedTokens.length} that differ are re-declared.`);
  L.push(`   * ---------------------------------------------------------------- */`);
  L.push('');

  // base / light
  L.push(`  ${SCOPE} {`);
  // `--cds-rem-scale` is referenced 110 times but never defined by the app; it
  // is injected at runtime. Without it every `calc(Nrem * var(--cds-rem-scale,1))`
  // is invalid and the whole type/density scale falls back to inherited values.
  L.push(...REQUIRED_SUBSTITUTES.map(([k, v, note]) => `  --${k}: ${v}; /* ${note} */`));
  L.push('');
  L.push(...decls(staticTokens, 'base'));
  L.push('');
  L.push(...decls(themedTokens, 'base'));
  L.push('  }');
  L.push('');

  // dark overrides
  L.push(`  /* dark */`);
  L.push(`  ${SCOPE}[data-mode='dark'] {`);
  L.push(...decls(themedTokens, 'dark'));
  L.push('  }');
  L.push('');
  L.push(`  @media (prefers-color-scheme: dark) {`);
  L.push(`    ${SCOPE}[data-mode='system'] {`);
  L.push(...decls(themedTokens, 'dark', '      '));
  L.push('    }');
  L.push('  }');
  L.push('');

  // light overrides (only where light differs from base)
  const lightDiffers = themedTokens.filter(
    (t) => t.resolved.light != null && t.resolved.light !== t.resolved.base
  );
  if (lightDiffers.length) {
    L.push(`  /* light (only where it differs from the base values) */`);
    L.push(`  ${SCOPE}[data-mode='light'] {`);
    L.push(...decls(lightDiffers, 'light'));
    L.push('  }');
    L.push('');
    L.push(`  @media (prefers-color-scheme: light) {`);
    L.push(`    ${SCOPE}[data-mode='system'] {`);
    L.push(...decls(lightDiffers, 'light', '      '));
    L.push('    }');
    L.push('  }');
    L.push('');
  }

  L.push('}');
  L.push('');
  fs.mkdirSync(distDir, { recursive: true });
  fs.writeFileSync(path.join(distDir, 'claude-tokens.css'), L.join('\n'));
}

/* ------------------------------------------------------------------ */
/* claude-motion.css                                                   */
/* ------------------------------------------------------------------ */

{
  const L = [];
  L.push(banner('Claude motion — durations, easings, springs, keyframes'));
  L.push(`/* ${motionVars.length} motion variables, ${Object.keys(kf.keyframes).length} @keyframes */`);
  L.push('');
  L.push(`@layer claude-motion {`);
  L.push('');
  L.push(`  ${SCOPE} {`);
  for (const t of motionVars) {
    if (t.resolved.base == null) continue;
    L.push(`    --${t.name}: ${t.resolved.base};`);
  }
  L.push('  }');
  L.push('');
  L.push('}');
  L.push('');
  L.push('/* ------------------------------------------------------------------');
  L.push(' * Keyframes — verbatim from the shipped stylesheet.');
  L.push(' * ---------------------------------------------------------------- */');
  L.push('');
  for (const [name, body] of Object.entries(kf.keyframes)) {
    L.push(`@keyframes ${name} { ${body.body} }`);
  }
  L.push('');
  fs.mkdirSync(distDir, { recursive: true });
  fs.writeFileSync(path.join(distDir, 'claude-motion.css'), L.join('\n'));
}

/* ------------------------------------------------------------------ */
/* claude-tokens-flat.css  (no theming, for quick drop-in)             */
/* ------------------------------------------------------------------ */

{
  const L = [];
  L.push(banner('Claude design tokens — flat (light only, no theme switching)'));
  L.push(`/* ${buckets.cds.length} tokens */`);
  L.push('');
  L.push(`@layer claude-tokens {`);
  L.push(`  ${SCOPE} {`);
  L.push(...REQUIRED_SUBSTITUTES.map(([k, v, note]) => `    --${k}: ${v}; /* ${note} */`));
  for (const t of buckets.cds) {
    const value = t.resolved.light ?? t.resolved.base ?? t.resolved.dark;
    if (value == null) continue;
    L.push(`    --${t.name}: ${value};`);
  }
  L.push('  }');
  L.push('}');
  L.push('');
  fs.writeFileSync(path.join(distDir, 'claude-tokens-flat.css'), L.join('\n'));
}

/* ------------------------------------------------------------------ */
/* cq + legacy, so nothing extracted is silently dropped               */
/* ------------------------------------------------------------------ */

for (const [bucketName, label, scope] of [
  ['cq', 'cq — self-contained widget subsystem', `${SCOPE} .cq-root`],
  ['legacy', 'legacy pre-Tailwind variables', SCOPE],
]) {
  const items = buckets[bucketName];
  if (!items.length) continue;
  const L = [];
  L.push(banner(`Claude design tokens — ${label}`));
  L.push(`/* ${items.length} tokens */`);
  L.push('');
  L.push(`@layer claude-tokens {`);
  L.push(`  ${scope} {`);
  for (const t of items) {
    const value = t.resolved.base ?? t.resolved.light ?? t.resolved.dark;
    if (value == null) continue;
    L.push(`    --${t.name}: ${value};`);
  }
  L.push('  }');
  L.push('}');
  L.push('');
  fs.writeFileSync(path.join(distDir, `claude-tokens-${bucketName}.css`), L.join('\n'));
}

/* ------------------------------------------------------------------ */
/* summary                                                             */
/* ------------------------------------------------------------------ */

const summary = {
  generatedAt: meta.extractedAt,
  source: { version: meta.version, asarSha256: meta.asar.sha256 },
  scope: SCOPE,
  buckets: {
    cds: buckets.cds.length,
    cq: buckets.cq.length,
    legacy: buckets.legacy.length,
    internal: buckets.internal.length,
  },
  themed: themedTokens.length,
  motionVariables: motionVars.length,
  keyframes: Object.keys(kf.keyframes).length,
  outputs: fs.readdirSync(distDir).filter((f) => f.endsWith('.css')).sort(),
};
fs.writeFileSync(path.join(distDir, 'build-summary.json'), JSON.stringify(summary, null, 2) + '\n');

console.log('[build]', JSON.stringify(summary.buckets), `${themedTokens.length} themed`);
console.log('[build] outputs:', summary.outputs.join(', '));
