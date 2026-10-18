/**
 * A small CSS parser good enough for Tailwind v4 / minified product CSS.
 *
 * It does NOT try to be spec-complete. It reliably recovers, in source order:
 *   - every custom property declaration with its selector context
 *   - every at-rule wrapper (@media / @supports / @layer / @container)
 *   - every @keyframes block verbatim
 *   - every @font-face block
 *
 * Declarations are recorded per (selector, at-rule chain) so the caller can
 * decide which of them is the effective one.
 */

/** Remove comments while preserving byte offsets is unnecessary here — we only need values. */
function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

/**
 * Walk the stylesheet and emit flat records.
 * @param {string} css
 * @returns {{ rules: Array<{selector:string, at:string[], declarations:Array<{prop:string,value:string}>}>, keyframes: Array<{name:string,body:string,at:string[]}>, fontFaces: string[] }}
 */
export function parseCss(css) {
  const src = stripComments(css);
  const rules = [];
  const keyframes = [];
  const fontFaces = [];

  /** stack of at-rule preludes currently open */
  const atStack = [];
  /** selector of the innermost open style rule */
  let selector = null;
  let declStart = -1;
  let i = 0;
  const len = src.length;

  const flushDeclarations = (end) => {
    if (selector === null) return;
    const chunk = src.slice(declStart, end);
    const declarations = [];
    // split on ';' but not inside parentheses / quotes
    let depth = 0;
    let quote = null;
    let buf = '';
    for (let k = 0; k < chunk.length; k++) {
      const ch = chunk[k];
      if (quote) {
        buf += ch;
        if (ch === quote && chunk[k - 1] !== '\\') quote = null;
        continue;
      }
      if (ch === '"' || ch === "'") {
        quote = ch;
        buf += ch;
        continue;
      }
      if (ch === '(') depth++;
      if (ch === ')') depth--;
      if (ch === ';' && depth === 0) {
        pushDecl(buf);
        buf = '';
        continue;
      }
      buf += ch;
    }
    pushDecl(buf);

    function pushDecl(text) {
      const idx = text.indexOf(':');
      if (idx < 1) return;
      const prop = text.slice(0, idx).trim();
      const value = text.slice(idx + 1).trim();
      if (!prop || !value) return;
      declarations.push({ prop, value });
    }

    if (declarations.length) rules.push({ selector, at: [...atStack], declarations });
  };

  while (i < len) {
    const ch = src[i];

    if (ch === '@') {
      // read prelude up to '{' or ';'
      let j = i;
      while (j < len && src[j] !== '{' && src[j] !== ';') j++;
      const prelude = src.slice(i, j).trim();

      if (src[j] === ';') {
        i = j + 1;
        continue;
      }

      if (/^@keyframes\b/i.test(prelude)) {
        // capture verbatim body (balanced braces)
        let depth = 0;
        let k = j;
        for (; k < len; k++) {
          if (src[k] === '{') depth++;
          else if (src[k] === '}') {
            depth--;
            if (depth === 0) break;
          }
        }
        keyframes.push({
          name: prelude.replace(/^@keyframes\s*/i, '').trim().replace(/^["']|["']$/g, ''),
          body: src.slice(j + 1, k).trim(),
          at: [...atStack],
        });
        i = k + 1;
        continue;
      }

      if (/^@font-face\b/i.test(prelude)) {
        let depth = 0;
        let k = j;
        for (; k < len; k++) {
          if (src[k] === '{') depth++;
          else if (src[k] === '}') {
            depth--;
            if (depth === 0) break;
          }
        }
        fontFaces.push(src.slice(j + 1, k).trim());
        i = k + 1;
        continue;
      }

      // generic at-rule with a block
      atStack.push(prelude);
      i = j + 1;
      continue;
    }

    if (ch === '}') {
      if (selector !== null) {
        flushDeclarations(i);
        selector = null;
      } else {
        atStack.pop();
      }
      i++;
      continue;
    }

    if (ch === '{') {
      // the text between the last delimiter and '{' is the selector
      let k = i - 1;
      while (k >= 0 && src[k] !== '}' && src[k] !== ';' && src[k] !== '{') k--;
      selector = src.slice(k + 1, i).trim();
      declStart = i + 1;
      i++;
      continue;
    }

    i++;
  }

  return { rules, keyframes, fontFaces };
}

/** Split a selector list on top-level commas. */
export function splitSelectors(selector) {
  const out = [];
  let depth = 0;
  let quote = null;
  let buf = '';
  for (let i = 0; i < selector.length; i++) {
    const ch = selector[i];
    if (quote) {
      buf += ch;
      if (ch === quote && selector[i - 1] !== '\\') quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      buf += ch;
      continue;
    }
    if (ch === '(' || ch === '[') depth++;
    if (ch === ')' || ch === ']') depth--;
    if (ch === ',' && depth === 0) {
      out.push(buf.trim());
      buf = '';
      continue;
    }
    buf += ch;
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

const DARK_HINTS = [
  /\[data-mode=["']?dark/i,
  /\.cds-dark-scope/,
  /\.darkTheme/,
  /\.dark\b/,
];

const LIGHT_HINTS = [
  /\[data-mode=["']?light/i,
  /\.cds-light\b/,
  /\.light\b/,
];

/**
 * Remove `:not(...)` sub-expressions before looking for theme hints.
 * `[data-mode=dark] .cds-root:not([data-mode=light])` is a DARK rule, but a naive
 * substring scan sees the word "light" inside the negation.
 */
function stripNegations(selector) {
  let out = '';
  let i = 0;
  while (i < selector.length) {
    const at = selector.indexOf(':not(', i);
    if (at < 0) {
      out += selector.slice(i);
      break;
    }
    out += selector.slice(i, at);
    let depth = 0;
    let k = at + 4; // position of '('
    for (; k < selector.length; k++) {
      if (selector[k] === '(') depth++;
      else if (selector[k] === ')') {
        depth--;
        if (depth === 0) break;
      }
    }
    i = k + 1;
  }
  return out;
}

/**
 * Classify a rule context as dark / light / base.
 * Precedence: explicit data-mode on the selector > prefers-color-scheme media > base.
 */
export function classifyTheme(selector, atRules) {
  const atDark = atRules.some((a) => /prefers-color-scheme\s*:\s*dark/i.test(a));
  const atLight = atRules.some((a) => /prefers-color-scheme\s*:\s*light/i.test(a));

  const bare = stripNegations(selector);
  const selDark = DARK_HINTS.some((re) => re.test(bare));
  const selLight = LIGHT_HINTS.some((re) => re.test(bare));

  if (selLight) return 'light';
  if (selDark) return 'dark';
  if (atLight) return 'light';
  if (atDark) return 'dark';
  return 'base';
}
