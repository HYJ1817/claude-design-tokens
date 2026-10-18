#!/usr/bin/env node
/**
 * Resolve the semantic role layer on top of the raw token dump.
 *
 * Claude defines most surfaces as `--cds-fill-brand: var(--cds-clay-emphasized)`.
 * This walks those var() chains so every documented role gets a literal value,
 * and emits data/roles.json for the docs and for consumers that cannot run CSS.
 *
 * Usage: node scripts/roles.mjs [--data <dir>] [--theme light|dark]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

/**
 * Which tokens are worth publishing as "roles"?
 * These are the ones an app actually consumes: brand, accents, semantic
 * statuses, surfaces, text, borders, and the interaction alphas.
 */
const ROLE_GROUPS = {
  brand: [
    'cds-fill-brand',
    'cds-fill-brand-hover',
    'cds-clay',
    'cds-clay-emphasized',
  ],
  accent: [
    'cds-text-accent',
    'cds-border-accent',
    'cds-fill-accent',
    'cds-fill-accent-hover',
    'cds-bg-accent',
    'cds-bg-accent-muted',
  ],
  status: [
    'cds-fill-danger',
    'cds-fill-danger-hover',
    'cds-bg-danger',
    'cds-border-danger',
    'cds-text-danger',
    'cds-fill-success',
    'cds-fill-success-hover',
    'cds-bg-success',
    'cds-fill-warning',
    'cds-fill-warning-hover',
    'cds-bg-warning',
    'cds-fill-pro',
    'cds-fill-pro-hover',
    'cds-bg-pro',
  ],
  surface: [
    'cds-page-bg',
    'cds-surface-0',
    'cds-surface-1',
    'cds-surface-2',
    'cds-surface-3',
    'cds-surface-panel',
    'cds-surface-popover',
    'cds-backdrop',
  ],
  text: [
    'cds-text-primary',
    'cds-text-secondary',
    'cds-text-muted',
    'cds-text-disabled',
    'cds-text-stays-secondary',
  ],
  border: ['cds-border', 'cds-border-line', 'cds-border-strong', 'cds-border-stronger'],
  interaction: [
    'cds-alpha-0',
    'cds-alpha-1',
    'cds-alpha-2',
    'cds-alpha-3',
    'cds-alpha-4',
    'cds-fill-ghost-hover',
    'cds-fill-ghost-selected',
    'cds-fill-control',
    'cds-fill-control-hover',
    'cds-fill-secondary',
    'cds-fill-primary',
    'cds-fill-primary-hover',
    'cds-fill-disabled',
    'cds-opacity-disabled',
    'cds-focus-shadow',
    'cds-focus-shadow-danger',
  ],
  motion: [
    'cds-dur-fast',
    'cds-dur-snap',
    'cds-dur-base',
    'cds-dur-sheet',
    'cds-dur-slow',
    'cds-ease-out',
    'cds-ease-overshoot',
    'cds-ease-snap',
    'cds-btn-spring',
  ],
  typography: [
    'cds-font-sans',
    'cds-font-sans-display',
    'cds-font-mono',
    'cds-font-system',
    'cds-font-size-caption',
    'cds-font-size-footnote',
    'cds-font-size-body',
    'cds-font-size-prose',
    'cds-font-size-heading',
    'cds-font-size-title',
    'cds-font-weight-regular',
    'cds-font-weight-medium',
    'cds-font-weight-semibold',
    'cds-font-weight-bold',
    'font-anthropic-sans',
    'font-anthropic-serif',
  ],
  radius: [
    'cds-radius',
    'cds-radius--xs',
    'cds-radius--sm',
    'cds-radius--lg',
    'cds-panel-radius',
    'cds-message-bubble-radius',
    'cds-radius-composer',
    'cds-checkbox-radius',
  ],
  shadow: ['cds-shadow-sm', 'cds-shadow-md', 'cds-shadow-lg', 'cds-shadow-popover'],
};

const THEME = getArg('theme', 'light');

/** Follow a pure `var(--x)` chain to a literal. */
function resolve(name, theme, seen = new Set()) {
  if (seen.has(name)) return { value: null, cycle: true };
  seen.add(name);
  const t = V[name];
  if (!t) return { value: null, missing: true };
  const raw = t.resolved[theme] ?? t.resolved.base;
  if (raw == null) return { value: null, missing: true };
  const m = raw.trim().match(/^var\(\s*(--[a-zA-Z0-9_-]+)\s*\)$/);
  if (!m) return { value: raw, chain: [...seen] };
  const next = resolve(m[1].slice(2), theme, seen);
  return { ...next, chain: [...seen] };
}

const out = {
  meta: {
    source: tokens.meta,
    theme: THEME,
    generatedAt: new Date().toISOString(),
  },
  groups: {},
};

let resolvedCount = 0;
let missingCount = 0;

for (const [group, names] of Object.entries(ROLE_GROUPS)) {
  const rows = [];
  for (const name of names) {
    if (!V[name]) {
      missingCount++;
      rows.push({ token: name, missing: true });
      continue;
    }
    const light = resolve(name, 'light');
    const dark = resolve(name, 'dark');
    const themed = light.value !== dark.value;
    if (light.value) resolvedCount++;
    rows.push({
      token: name,
      raw: V[name].resolved,
      light: light.value,
      dark: dark.value,
      themed,
      chain: light.chain && light.chain.length > 1 ? light.chain : undefined,
    });
  }
  out.groups[group] = rows;
}

out.summary = {
  roles: Object.values(ROLE_GROUPS).flat().length,
  resolved: resolvedCount,
  missing: missingCount,
  themed: Object.values(out.groups)
    .flat()
    .filter((r) => r.themed).length,
};

fs.writeFileSync(path.join(dataDir, 'roles.json'), JSON.stringify(out, null, 2) + '\n');

console.log(
  `[roles] ${out.summary.roles} roles: ${out.summary.resolved} resolved, ` +
    `${out.summary.missing} missing, ${out.summary.themed} theme-dependent`
);
for (const [group, rows] of Object.entries(out.groups)) {
  const missing = rows.filter((r) => r.missing).map((r) => r.token);
  if (missing.length) console.log(`[roles]   ${group}: missing ${missing.join(', ')}`);
}
