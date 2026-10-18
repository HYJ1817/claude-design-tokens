#!/usr/bin/env node
/**
 * Extract the design-token / motion surface out of a Claude Desktop ASAR.
 *
 * Usage:
 *   node scripts/extract.mjs [--asar <path>] [--out <dir>] [--dist <dir>] [--quiet]
 *
 * With no --asar it auto-detects the newest Claude install on this machine.
 *
 * Output:
 *   <out>/tokens.json      every custom property, all definitions, with context
 *   <out>/keyframes.json   every @keyframes block, verbatim
 *   <out>/fonts.json       every @font-face block, verbatim
 *   <out>/report.json      conflicts, unresolved refs, per-file stats
 *   <dist>/*.css           ready-to-use stylesheets (see build.mjs)
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { openAsar } from '../src/asar.mjs';
import { parseCss, splitSelectors, classifyTheme } from '../src/css.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const getArg = (name, fallback = null) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const QUIET = args.includes('--quiet');
const log = (...a) => {
  if (!QUIET) console.log(...a);
};

/* ------------------------------------------------------------------ */
/* locate the ASAR                                                     */
/* ------------------------------------------------------------------ */

function readdirSafe(dir) {
  try {
    return fs.readdirSync(dir);
  } catch {
    // C:/Program Files/WindowsApps is ACL-protected against enumeration
    return [];
  }
}

/**
 * WindowsApps is not listable by a normal user, but a known path can still be
 * stat'd. Ask PowerShell for the installed package locations instead.
 */
function detectViaAppx() {
  if (process.platform !== 'win32') return [];
  try {
    const out = execFileSync(
      'powershell',
      [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        'Get-AppxPackage -Name *Claude* | ForEach-Object { $_.InstallLocation }',
      ],
      { encoding: 'utf8', timeout: 20000, windowsHide: true }
    );
    return out
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function detectAsar() {
  const candidates = [];
  const consider = (p) => {
    if (!p || !fs.existsSync(p)) return;
    try {
      const st = fs.statSync(p);
      candidates.push({ path: p, mtime: st.mtimeMs });
    } catch {
      /* unreadable */
    }
  };

  for (const root of ['C:/Program Files/Claude', 'C:/Program Files (x86)/Claude']) {
    consider(`${root}/resources/app.asar`);
    consider(`${root}/app/resources/app.asar`);
  }
  for (const entry of readdirSafe('C:/Program Files/WindowsApps')) {
    if (/^Claude_/i.test(entry)) {
      consider(`C:/Program Files/WindowsApps/${entry}/app/resources/app.asar`);
    }
  }
  for (const loc of detectViaAppx()) {
    consider(`${loc.replace(/\\/g, '/')}/app/resources/app.asar`);
  }

  if (!candidates.length) {
    throw new Error(
      'No Claude app.asar found. Pass --asar <path> explicitly.\n' +
        'Windows default: C:\\Program Files\\WindowsApps\\Claude_<version>_x64__<hash>\\app\\resources\\app.asar'
    );
  }
  candidates.sort((a, b) => b.mtime - a.mtime);
  return candidates[0].path;
}

/* ------------------------------------------------------------------ */
/* main                                                                */
/* ------------------------------------------------------------------ */

const asarPath = getArg('asar') || detectAsar();
const outDir = path.resolve(ROOT, getArg('out', 'data'));

log(`[extract] asar  : ${asarPath}`);
const sha256 = crypto.createHash('sha256').update(fs.readFileSync(asarPath)).digest('hex');
const sizeBytes = fs.statSync(asarPath).size;
log(`[extract] sha256: ${sha256}`);

const asar = openAsar(asarPath);
const allEntries = asar.list('/');

const cssFiles = allEntries
  .filter((e) => e.path.endsWith('.css'))
  .sort((a, b) => a.path.localeCompare(b.path));

log(`[extract] files : ${allEntries.length} total, ${cssFiles.length} css`);

/* package.json in some builds is prefixed with junk and has trailing content
 * that breaks strict JSON parsing, so pull only the fields we need. */
const pkg = {};
try {
  const raw = asar.readText('/package.json');
  for (const field of ['name', 'productName', 'version']) {
    const m = raw.match(new RegExp(`"${field}"\\s*:\\s*"([^"]*)"`));
    if (m) pkg[field] = m[1];
  }
} catch {
  /* not present */
}

/* ------------------------------------------------------------------ */
/* parse every stylesheet                                              */
/* ------------------------------------------------------------------ */

/**
 * name -> {
 *   defs: Map<`${theme}|${selector}|${value}` -> {value, theme, selector, at, files:Set}>
 * }
 * Identical definitions repeated across per-window stylesheets collapse into
 * one entry carrying a `files` list.
 */
const variables = new Map();
const keyframes = new Map();
const fontFaces = [];
const fileStats = [];
let order = 0;

const getVar = (name) => {
  let v = variables.get(name);
  if (!v) {
    v = { defs: new Map() };
    variables.set(name, v);
  }
  return v;
};

for (const file of cssFiles) {
  const rel = file.path.replace(/^\//, '');
  const css = asar.readText(file.path);
  const parsed = parseCss(css);

  for (const rule of parsed.rules) {
    const at = rule.at.length ? rule.at.join(' && ') : null;
    for (const sel of splitSelectors(rule.selector)) {
      const theme = classifyTheme(sel, rule.at);
      for (const decl of rule.declarations) {
        if (!decl.prop.startsWith('--')) continue;
        const name = decl.prop.slice(2);
        const key = `${theme}|${sel}|${decl.value}`;
        const bucket = getVar(name);
        const existing = bucket.defs.get(key);
        if (existing) {
          existing.files.add(rel);
        } else {
          bucket.defs.set(key, {
            value: decl.value,
            theme,
            selector: sel,
            at,
            files: new Set([rel]),
            order: order++,
          });
        }
      }
    }
  }

  for (const kf of parsed.keyframes) {
    const existing = keyframes.get(kf.name);
    if (!existing) {
      keyframes.set(kf.name, {
        body: kf.body,
        at: kf.at.length ? kf.at.join(' && ') : null,
        file: rel,
      });
    } else if (existing.body !== kf.body) {
      existing.variant = { body: kf.body, file: rel };
    }
  }

  for (const ff of parsed.fontFaces) fontFaces.push({ body: ff, file: rel });

  fileStats.push({
    file: rel,
    bytes: css.length,
    customProperties: parsed.rules.reduce(
      (n, r) => n + r.declarations.filter((d) => d.prop.startsWith('--')).length,
      0
    ),
    keyframes: parsed.keyframes.length,
    fontFaces: parsed.fontFaces.length,
  });
}

asar.close();

/* ------------------------------------------------------------------ */
/* resolve effective value per theme + detect real conflicts            */
/* ------------------------------------------------------------------ */

const THEMES = ['base', 'light', 'dark'];

/**
 * Claude ships one stylesheet per BrowserWindow, and every window bundles the
 * same core token set. When the same (name, theme, selector) appears in several
 * windows, they normally agree. Where they do not, the main window is the
 * authoritative app surface, so it is ranked last (i.e. wins).
 */
function fileRank(file) {
  if (/renderer\/main_window\//.test(file)) return 3;
  if (/renderer\/(buddy|quick|find_in_page|about)_window\//.test(file)) return 1;
  return 2;
}

const variablesOut = {};
const conflicts = [];
const progressive = [];

for (const [name, bucket] of [...variables.entries()].sort((a, b) =>
  a[0].localeCompare(b[0])
)) {
  const entries = [...bucket.defs.values()]
    .sort((a, b) => a.order - b.order)
    .map((e) => {
      const files = [...e.files].sort();
      return {
        value: e.value,
        theme: e.theme,
        selector: e.selector,
        at: e.at,
        files,
        rank: Math.max(...files.map(fileRank)),
        order: e.order,
      };
    });

  /** Pick the winning value for a theme: highest file rank, then last in source order. */
  const winner = (theme) => {
    const candidates = entries.filter((e) => e.theme === theme);
    if (!candidates.length) return null;
    candidates.sort((a, b) => a.rank - b.rank || a.order - b.order);
    return candidates.at(-1).value;
  };

  // Conflicts worth reporting: same theme, same selector, same at-rule chain,
  // more than one distinct value. Grouping by at-rule chain separates real
  // cascade overrides from @supports progressive-enhancement fallbacks.
  const perTheme = {};
  for (const t of THEMES) {
    const scoped = entries.filter((e) => e.theme === t);
    if (!scoped.length) continue;
    const byContext = new Map();
    for (const e of scoped) {
      const key = `${e.selector}\u0000${e.at || ''}`;
      if (!byContext.has(key)) {
        byContext.set(key, { selector: e.selector, at: e.at, values: new Set() });
      }
      byContext.get(key).values.add(e.value);
    }
    const disagreeing = [...byContext.values()]
      .filter((c) => c.values.size > 1)
      .map((c) => ({ selector: c.selector, at: c.at, values: [...c.values] }));
    if (disagreeing.length) perTheme[t] = disagreeing;
  }
  if (Object.keys(perTheme).length) {
    conflicts.push({ name, resolved: { base: winner('base'), light: winner('light'), dark: winner('dark') }, byTheme: perTheme });
  }

  // Progressive-enhancement pairs: same selector, different at-rule chain.
  // Typically `X:fallback` at the top level plus `X:modern` inside @supports.
  // Not a conflict — the @supports branch wins where supported — but useful.
  for (const t of THEMES) {
    const scoped = entries.filter((e) => e.theme === t);
    const bySelector = new Map();
    for (const e of scoped) {
      if (!bySelector.has(e.selector)) bySelector.set(e.selector, new Map());
      const m = bySelector.get(e.selector);
      if (!m.has(e.at || '')) m.set(e.at || '', new Set());
      m.get(e.at || '').add(e.value);
    }
    for (const [selector, chains] of bySelector) {
      if (chains.size > 1) {
        progressive.push({
          name,
          theme: t,
          selector,
          variants: [...chains.entries()].map(([at, vals]) => ({
            at: at || null,
            values: [...vals],
          })),
        });
      }
    }
  }

  variablesOut[name] = {
    resolved: {
      // `base` is the unconditional value; `light`/`dark` override it.
      base: winner('base'),
      light: winner('light'),
      dark: winner('dark'),
    },
    entries,
  };
}

/* ------------------------------------------------------------------ */
/* unresolved var() references                                         */
/* ------------------------------------------------------------------ */

const referenced = new Map();
for (const v of Object.values(variablesOut)) {
  for (const e of v.entries) {
    for (const m of e.value.matchAll(/var\(\s*(--[a-zA-Z0-9_-]+)/g)) {
      const ref = m[1].slice(2);
      referenced.set(ref, (referenced.get(ref) || 0) + 1);
    }
  }
}
const unresolved = [...referenced.entries()]
  .filter(([name]) => !variablesOut[name])
  .map(([name, refs]) => ({ name, refs }))
  .sort((a, b) => b.refs - a.refs);

/* ------------------------------------------------------------------ */
/* emit                                                                */
/* ------------------------------------------------------------------ */

fs.mkdirSync(outDir, { recursive: true });

const meta = {
  product: pkg.productName || 'Claude',
  packageName: pkg.name || null,
  version: pkg.version || null,
  asar: { path: asarPath.replace(/\\/g, '/'), sha256, sizeBytes },
  // Derived from the asar mtime rather than wall-clock time, so re-running the
  // extractor on the same build produces byte-identical output.
  extractedAt: fs.statSync(asarPath).mtime.toISOString(),
  extractor: 'claude-design-tokens@1',
  counts: {
    files: allEntries.length,
    cssFiles: cssFiles.length,
    cssBytes: fileStats.reduce((n, f) => n + f.bytes, 0),
    variables: Object.keys(variablesOut).length,
    keyframes: keyframes.size,
    fontFaces: fontFaces.length,
    conflicts: conflicts.length,
    progressiveEnhancement: progressive.length,
    unresolvedRefs: unresolved.length,
  },
};

const write = (name, obj) => {
  const p = path.join(outDir, name);
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n');
  log(`[extract] wrote ${path.relative(ROOT, p)}`);
};

write('tokens.json', { meta, variables: variablesOut });

write('keyframes.json', {
  meta,
  keyframes: Object.fromEntries(
    [...keyframes.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  ),
});

write('fonts.json', { meta, fontFaces });

write('report.json', {
  meta,
  files: fileStats.sort((a, b) => b.bytes - a.bytes),
  conflicts,
  progressiveEnhancement: progressive,
  unresolved,
});

log(
  `[extract] done  : ${meta.counts.variables} variables, ` +
    `${meta.counts.keyframes} keyframes, ${meta.counts.conflicts} conflicts, ` +
    `${meta.counts.unresolvedRefs} unresolved refs`
);
