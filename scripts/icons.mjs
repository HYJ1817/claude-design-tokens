#!/usr/bin/env node
/**
 * Extract the icon-font animation mechanism as data.
 *
 * This records *mechanism*, not artwork: axis definitions, how many glyphs are
 * animated, which archetype each one is, and the geometry of the variation
 * regions. No outlines, no font binaries.
 *
 * Usage: node scripts/icons.mjs [--data <dir>]
 *
 * Requires fontTools (pip install fonttools brotli). Exits quietly if absent.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { openAsar } from '../src/asar.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const getArg = (n, d = null) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};

const dataDir = path.resolve(ROOT, getArg('data', 'data'));
const tokens = JSON.parse(fs.readFileSync(path.join(dataDir, 'tokens.json'), 'utf8'));

const PY = `
import json, sys
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

path = sys.argv[1]
f = TTFont(path)

axes = [{
    "tag": a.axisTag,
    "min": a.minValue,
    "default": a.defaultValue,
    "max": a.maxValue,
    "name": (f["name"].getDebugName(a.axisNameID) or a.axisTag),
} for a in f["fvar"].axes]

gvar = f["gvar"]
cmap = f.getBestCmap()
rev = {g: c for c, g in cmap.items()}

def pts(gn, v):
    i = instantiateVariableFont(TTFont(path), {"ANIM": v, "ANM2": v}, inplace=False)
    gl = i["glyf"][gn]
    return list(gl.coordinates) if not gl.isComposite() else []

def disp(gn, v):
    a, b = pts(gn, 0), pts(gn, v)
    if not a or len(a) != len(b):
        return 0.0
    return max((max(abs(p[0]-q[0]), abs(p[1]-q[1])) for p, q in zip(a, b)), default=0.0)

animated = []
for gn, vs in gvar.variations.items():
    tags = set()
    for v in vs:
        tags.update(v.axes.keys())
    if not ({"ANIM", "ANM2"} & tags):
        continue

    d50, d100 = disp(gn, 50), disp(gn, 100)
    if d100 >= 1:
        arch = "morph"
    elif d50 >= 1:
        arch = "pulse"
    else:
        arch = "static"

    regions = []
    for v in vs:
        for tag in ("ANIM", "ANM2"):
            if tag in v.axes:
                regions.append({"axis": tag, "support": [round(x, 4) for x in v.axes[tag]]})

    animated.append({
        "glyph": gn,
        "codepoint": ("U+%04X" % rev[gn]) if gn in rev else None,
        "mapped": gn in rev,
        "axes": sorted(tags),
        "archetype": arch,
        "displacementAt50": round(d50, 1),
        "displacementAt100": round(d100, 1),
        "regions": regions,
        "pointCount": (len(f["glyf"][gn].coordinates)
                       if not f["glyf"][gn].isComposite() else None),
    })

out = {
    "axes": axes,
    "glyphCount": len(f.getGlyphOrder()),
    "cmapSize": len(cmap),
    "privateUseRange": ["U+%04X" % min(cmap), "U+%04X" % max(cmap)] if cmap else None,
    "animated": sorted(animated, key=lambda a: a["codepoint"] or "~"),
}
print(json.dumps(out))
`;

/* Pull the icon font out of the asar into a temp file for fontTools. */
const fontPath = path.join(dataDir, '.icons.woff2');
let raw;
try {
  const a = openAsar(tokens.meta.asar.path);
  const hit = a.list('/').find((e) => /anthropicons.*\.woff2$/i.test(e.path));
  if (!hit) throw new Error('no anthropicons font in asar');
  fs.writeFileSync(fontPath, a.readBuffer(hit.path));
  a.close();

  raw = execFileSync('python', ['-c', PY, fontPath], {
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
} catch (err) {
  console.error('[icons] skipped:', String(err.message).split('\n')[0]);
  console.error('[icons] requires: pip install fonttools brotli');
  fs.rmSync(fontPath, { force: true });
  process.exit(0);
}
fs.rmSync(fontPath, { force: true });

const parsed = JSON.parse(raw);

const out = {
  meta: {
    source: tokens.meta,
    generatedAt: tokens.meta.extractedAt,
    note:
      'Mechanism data only. No outlines, no font binaries. Archetype is ' +
      'classified by sampling the MIDDLE of the animation axis: a pulse returns ' +
      'to its rest outline at 100 and would look static at the ends.',
  },
  axes: parsed.axes,
  coverage: {
    glyphs: parsed.glyphCount,
    cmapEntries: parsed.cmapSize,
    animated: parsed.animated.length,
    mapped: parsed.animated.filter((a) => a.mapped).length,
    unmapped: parsed.animated.filter((a) => !a.mapped).length,
    archetypes: parsed.animated.reduce((acc, a) => {
      acc[a.archetype] = (acc[a.archetype] || 0) + 1;
      return acc;
    }, {}),
  },
  privateUseRange: parsed.privateUseRange,
  animated: parsed.animated,
};

fs.writeFileSync(path.join(dataDir, 'icon-animation.json'), JSON.stringify(out, null, 2) + '\n');

const c = out.coverage;
console.log(
  `[icons] ${c.animated}/${c.glyphs} glyphs animated ` +
    `(${c.archetypes.morph || 0} morph, ${c.archetypes.pulse || 0} pulse); ` +
    `${c.mapped} mapped, ${c.unmapped} unmapped`
);
console.log(
  `[icons] axes: ${out.axes.map((a) => `${a.tag} ${a.min}..${a.max}`).join(', ')}`
);
