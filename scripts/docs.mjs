#!/usr/bin/env node
/**
 * Generate docs/TOKENS.md and docs/MOTION.md from data/*.json.
 *
 * Hand-writing a 900-row table guarantees drift. These docs are generated so
 * they always match the extractor output.
 *
 * Usage: node scripts/docs.mjs [--data <dir>] [--docs <dir>]
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
const docsDir = path.resolve(ROOT, getArg('docs', 'docs'));

const tokens = JSON.parse(fs.readFileSync(path.join(dataDir, 'tokens.json'), 'utf8'));
const roles = JSON.parse(fs.readFileSync(path.join(dataDir, 'roles.json'), 'utf8'));
const kf = JSON.parse(fs.readFileSync(path.join(dataDir, 'keyframes.json'), 'utf8'));
const report = JSON.parse(fs.readFileSync(path.join(dataDir, 'report.json'), 'utf8'));

const meta = tokens.meta;
const V = tokens.variables;
fs.mkdirSync(docsDir, { recursive: true });

const header = (title, extra = '') => `# ${title}

> Generated from Claude ${meta.version} (\`${meta.asar.sha256.slice(0, 16)}…\`).
> Do not edit by hand — run \`npm run docs\`.

${extra}`;

/* ------------------------------------------------------------------ */
/* TOKENS.md                                                           */
/* ------------------------------------------------------------------ */

{
  const L = [];
  L.push(
    header(
      'Token reference',
      'Every variable the extractor found, grouped by prefix. Values shown are the\n' +
        'light-theme resolution; a value that differs in dark mode is marked **↕**.'
    )
  );
  L.push('');

  /* --- role tables first: these are what people actually want --- */
  L.push('## Semantic roles');
  L.push('');
  L.push(
    'Resolved `var()` chains, so these are literal values you can paste. ' +
      '`↕` marks a token whose dark value differs.'
  );
  L.push('');

  const ROLE_TITLES = {
    brand: 'Brand',
    accent: 'Accent (links, focus)',
    status: 'Status',
    surface: 'Surfaces',
    text: 'Text',
    border: 'Borders',
    interaction: 'Interaction states',
    motion: 'Motion',
    typography: 'Typography',
    radius: 'Radius',
    shadow: 'Shadow',
  };

  for (const [group, rows] of Object.entries(roles.groups)) {
    L.push(`### ${ROLE_TITLES[group] || group}`);
    L.push('');
    L.push('| Token | Light | Dark |');
    L.push('|---|---|---|');
    for (const r of rows) {
      if (r.missing) {
        L.push(`| \`--${r.token}\` | _absent_ | |`);
        continue;
      }
      const light = String(r.light ?? '').replace(/\|/g, '\\|');
      const dark = String(r.dark ?? '');
      const same = light === dark;
      const mark = same ? '' : ' **↕**';
      const darkCell = same ? '—' : dark.replace(/\|/g, '\\|');
      L.push(`| \`--${r.token}\` | \`${light}\`${mark} | \`${darkCell}\` |`);
    }
    L.push('');
  }

  /* --- full palette --- */
  L.push('## Full palette');
  L.push('');
  L.push(
    'Raw colour ramps. These are theme-invariant by design — they are the source ' +
      'values the semantic tokens point at.'
  );
  L.push('');

  const PALETTES = [
    'clay',
    'gray',
    'blue',
    'aqua',
    'green',
    'red',
    'yellow',
    'violet',
    'magenta',
    'orange',
  ];

  for (const p of PALETTES) {
    const re = new RegExp(`^cds-${p}-(\\d+)$`);
    const steps = Object.keys(V)
      .map((k) => {
        const m = k.match(re);
        return m ? { step: Number(m[1]), name: k } : null;
      })
      .filter(Boolean)
      .sort((a, b) => a.step - b.step);
    if (!steps.length) continue;

    L.push(`### ${p} (${steps.length} steps)`);
    L.push('');
    L.push('| Step | Value |');
    L.push('|---|---|');
    for (const s of steps) {
      const v = V[s.name].resolved.light ?? V[s.name].resolved.base ?? '';
      L.push(`| \`${s.step}\` | \`${v}\` |`);
    }
    L.push('');
  }

  /* --- everything else, alphabetical, collapsed --- */
  L.push('## All variables');
  L.push('');
  L.push(
    `${Object.keys(V).length} variables. Semantic roles above cover the common ` +
      'cases; this is the complete list.'
  );
  L.push('');

  const prefixes = new Map();
  for (const name of Object.keys(V)) {
    const p = name.split('-')[0];
    if (!prefixes.has(p)) prefixes.set(p, []);
    prefixes.get(p).push(name);
  }

  for (const [p, names] of [...prefixes.entries()].sort(
    (a, b) => b[1].length - a[1].length
  )) {
    L.push(`<details><summary><code>${p}-*</code> (${names.length})</summary>`);
    L.push('');
    L.push('| Token | Base | Dark |');
    L.push('|---|---|---|');
    for (const name of names.sort()) {
      const r = V[name].resolved;
      const base = r.base ?? r.light ?? '';
      const dark = r.dark ?? '';
      const diff = dark && dark !== base;
      L.push(
        `| \`--${name}\` | \`${String(base).replace(/\|/g, '\\|')}\` | ` +
          `${diff ? `\`${String(dark).replace(/\|/g, '\\|')}\`` : '—'} |`
      );
    }
    L.push('');
    L.push('</details>');
    L.push('');
  }

  /* --- diagnostics --- */
  L.push('## Diagnostics');
  L.push('');
  L.push('### Progressive enhancement pairs');
  L.push('');
  L.push(
    `${report.progressiveEnhancement.length} variables are defined twice under ` +
      'different at-rule chains — typically a plain fallback at the top level plus ' +
      'a modern value inside `@supports`. Both are correct; the `@supports` branch ' +
      'wins where the browser supports it.'
  );
  L.push('');
  L.push('| Variable | Fallback | Modern |');
  L.push('|---|---|---|');
  for (const p of report.progressiveEnhancement.slice(0, 40)) {
    const plain = p.variants.find((v) => !v.at || !/@supports/.test(v.at));
    const modern = p.variants.find((v) => v.at && /@supports/.test(v.at));
    if (!plain || !modern) continue;
    L.push(
      `| \`--${p.name}\` | \`${plain.values[0]}\` | \`${modern.values[0]}\` |`
    );
  }
  L.push('');
  if (report.progressiveEnhancement.length > 40) {
    L.push(
      `_(${report.progressiveEnhancement.length - 40} more in \`data/report.json\`)_`
    );
    L.push('');
  }

  L.push('### Unresolved references');
  L.push('');
  L.push('Referenced by the stylesheet but never defined by it:');
  L.push('');
  L.push('| Variable | Refs |');
  L.push('|---|---|');
  for (const u of report.unresolved) {
    L.push(`| \`--${u.name}\` | ${u.refs} |`);
  }
  L.push('');

  fs.writeFileSync(path.join(docsDir, 'TOKENS.md'), L.join('\n'));
  console.log('[docs] wrote docs/TOKENS.md');
}

/* ------------------------------------------------------------------ */
/* MOTION.md                                                           */
/* ------------------------------------------------------------------ */

{
  const L = [];
  L.push(
    header(
      'Motion reference',
      'Durations, easings, springs, and every `@keyframes` block, verbatim.'
    )
  );
  L.push('');

  L.push('## Durations');
  L.push('');
  L.push('| Token | Value | Role |');
  L.push('|---|---|---|');
  const DUR_ROLE = {
    'cds-dur-fast': 'instant feedback, icon reveals',
    'cds-dur-snap': 'geometric snap: segmented controls, checkboxes',
    'cds-dur-base': 'default transition: cards, chips, pills',
    'cds-dur-sheet': 'drawers and panels sliding in',
    'cds-dur-slow': 'slow cross-fades',
  };
  for (const [name, role] of Object.entries(DUR_ROLE)) {
    const v = V[name]?.resolved.light ?? V[name]?.resolved.base;
    if (v) L.push(`| \`--${name}\` | \`${v}\` | ${role} |`);
  }
  L.push('');

  L.push('## Easings');
  L.push('');
  L.push('| Token | Value | Character |');
  L.push('|---|---|---|');
  const EASE_ROLE = {
    'cds-ease-out': 'standard ease-out; the default for almost everything',
    'cds-ease-overshoot': 'elastic overshoot for entrances (bubbles, pills)',
    'cds-ease-snap': 'mechanical snap; no overshoot',
  };
  for (const [name, role] of Object.entries(EASE_ROLE)) {
    const v = V[name]?.resolved.light ?? V[name]?.resolved.base;
    if (v) L.push(`| \`--${name}\` | \`${v}\` | ${role} |`);
  }
  L.push('');

  L.push('## Springs');
  L.push('');
  const spring = V['cds-btn-spring']?.resolved.base;
  if (spring) {
    L.push(
      'Button press feedback is a CSS `linear()` easing, not a JS spring. This is ' +
        'worth copying: it gives you spring physics with zero runtime cost.'
    );
    L.push('');
    L.push('```css');
    L.push(`--cds-btn-spring: ${spring};`);
    L.push('```');
    L.push('');
    L.push(
      'Read the curve: it rises past 1.0 around the 4th–6th stop, peaks near ' +
        '`1.0915`, then settles back to `1`. That overshoot is what makes the press ' +
        'feel bouncy rather than linear.'
    );
    L.push('');
  }

  L.push('## Keyframes');
  L.push('');
  L.push(`${Object.keys(kf.keyframes).length} blocks, grouped by purpose.`);
  L.push('');

  const GROUPS = [
    ['Entrances', /(fade|reveal|morph|slide|chip|drop|page-tabs|page-title)/],
    ['Exits', /(out|leaves)/],
    ['Collapse / expand', /grid-rows/],
    ['Pills', /pill/],
    ['Skeletons and shimmer', /(skeleton|shimmer|placeholder)/],
    ['Working indicators', /(working-dot|dot-pulse)/],
    ['Scroll fade', /scroll-fade/],
    ['Sticky edges', /sticky-edge/],
    ['Check / resolve', /resolve/],
    ['Misc', /.*/],
  ];

  const assigned = new Set();
  for (const [title, re] of GROUPS) {
    const names = Object.keys(kf.keyframes)
      .filter((n) => !assigned.has(n) && re.test(n))
      .sort();
    if (!names.length) continue;
    for (const n of names) assigned.add(n);

    L.push(`### ${title}`);
    L.push('');
    for (const n of names) {
      const body = kf.keyframes[n].body;
      L.push(`<details><summary><code>${n}</code></summary>`);
      L.push('');
      L.push('```css');
      L.push(`@keyframes ${n} { ${body} }`);
      L.push('```');
      L.push('');
      L.push('</details>');
      L.push('');
    }
  }

  fs.writeFileSync(path.join(docsDir, 'MOTION.md'), L.join('\n'));
  console.log('[docs] wrote docs/MOTION.md');
}

/* ------------------------------------------------------------------ */
/* TYPOGRAPHY.md                                                       */
/* ------------------------------------------------------------------ */

{
  const typoPath = path.join(dataDir, 'typography.json');
  if (fs.existsSync(typoPath)) {
    const typo = JSON.parse(fs.readFileSync(typoPath, 'utf8'));
    const L = [];
    L.push(
      header(
        'Typography and sizing',
        'The type scale, its paired line-heights, the density ladders, and the\n' +
          'dark-mode font-weight correction.'
      )
    );
    L.push('');

    L.push('## Type scale');
    L.push('');
    L.push(
      'Every size has a paired line-height token. The ratio column is what you ' +
        'want when re-implementing with a different base size.'
    );
    L.push('');
    L.push('| Role | Size | Line-height | Ratio | Size token |');
    L.push('|---|---|---|---|---|');
    for (const s of typo.scale) {
      const rem = s.rem == null ? '—' : `${s.rem}rem`;
      const lead = s.leadingRem == null ? '—' : `${s.leadingRem}rem`;
      L.push(`| ${s.role} | ${rem} | ${lead} | ${s.ratio ?? '—'} | \`${s.sizeToken}\` |`);
    }
    L.push('');

    L.push('## Text size preference');
    L.push('');
    L.push(
      'Claude exposes Small / Medium / Large transcript text. Rather than scaling ' +
        'one value, it re-points the whole scale per surface — note that ' +
        '`--textmd` only overrides body copy while `--textsm` and `--textlg` ' +
        'override the full set.'
    );
    L.push('');

    const variants = Object.keys(typo.textSizePreference);
    const roles = [...new Set(variants.flatMap((v) => Object.keys(typo.textSizePreference[v])))];
    L.push('| Role | ' + variants.join(' | ') + ' |');
    L.push('|---|' + variants.map(() => '---').join('|') + '|');
    for (const role of roles) {
      const cells = variants.map((v) => {
        const cell = typo.textSizePreference[v][role];
        return cell ? `${cell.rem} / ${cell.leadingRem}` : '—';
      });
      L.push(`| ${role} | ${cells.join(' | ')} |`);
    }
    L.push('');
    L.push('_Cells are `size / line-height` in rem._');
    L.push('');

    L.push('## Weights');
    L.push('');
    L.push(typo.weights.note);
    L.push('');
    L.push('| Name | Light `font-weight` | Dark `wght` axis | Δ |');
    L.push('|---|---|---|---|');
    for (const w of typo.weights.steps) {
      L.push(
        `| ${w.name} | ${w.lightValue ?? '—'} | ${w.darkAxis ? w.darkAxis.value : '—'} | ` +
          `${w.delta == null ? '—' : w.delta} |`
      );
    }
    L.push('');
    L.push(
      `Grade axis in dark mode: \`semibold\` = ${typo.weights.grades.semibold}, ` +
        `\`bold\` = ${typo.weights.grades.bold}. Grade changes apparent weight ` +
        'without changing advance width, so nothing reflows on theme change.'
    );
    L.push('');
    L.push(
      'Note the non-standard ramp: `semibold` is **580**, `bold` is **600**. ' +
        'Do not assume 600/700.'
    );
    L.push('');

    L.push('## Density ladder');
    L.push('');
    L.push(
      '`data-density="comfortable"` bumps the whole scale up one notch. The ' +
        'unset default is the compact one.'
    );
    L.push('');
    L.push('| Token | Default | comfortable |');
    L.push('|---|---|---|');
    const densKeys = [
      ...new Set([
        ...Object.keys(typo.densityLadder.compact || {}),
        ...Object.keys(typo.densityLadder.comfortable || {}),
      ]),
    ];
    for (const k of densKeys) {
      const a = typo.densityLadder.compact?.[k];
      const b = typo.densityLadder.comfortable?.[k];
      const fmt = (v) => (v ? (v.rem == null ? v.raw : `${v.rem}rem`) : '—');
      L.push(`| \`--${k}\` | ${fmt(a)} | ${fmt(b)} |`);
    }
    L.push('');

    L.push('## Step ladder');
    L.push('');
    L.push(
      'Five steps of control sizing. `data-step="1"` through `"5"` set these on ' +
        'a subtree — useful for dense toolbars.'
    );
    L.push('');
    const stepKeys = [...new Set(Object.values(typo.stepLadder).flatMap(Object.keys))];
    L.push('| Token | ' + Object.keys(typo.stepLadder).join(' | ') + ' |');
    L.push('|---|' + Object.keys(typo.stepLadder).map(() => '---').join('|') + '|');
    for (const k of stepKeys) {
      const cells = Object.keys(typo.stepLadder).map((n) => {
        const cell = typo.stepLadder[n][k];
        return cell ? `${cell.rem}rem` : '—';
      });
      L.push(`| \`--${k}\` | ${cells.join(' | ')} |`);
    }
    L.push('');

    L.push('## Font stacks');
    L.push('');
    for (const [k, v] of Object.entries(typo.fonts)) {
      L.push(`### \`--${k}\``);
      L.push('');
      L.push('```css');
      L.push(v);
      L.push('```');
      L.push('');
    }

    fs.writeFileSync(path.join(docsDir, 'TYPOGRAPHY.md'), L.join('\n'));
    console.log('[docs] wrote docs/TYPOGRAPHY.md');
  }
}
