/**
 * Minimal, dependency-free Electron ASAR reader.
 *
 * ASAR wraps its JSON header in a Chromium `Pickle`. The pickle payload is
 * padded to a 4-byte boundary, so the file data does NOT start right after the
 * JSON string. Getting this wrong shifts every read by the padding amount and
 * silently corrupts binary entries (a woff2 loses its `wOF2` magic, a JSON file
 * gains a stray `};` prefix).
 *
 * Layout:
 *   [0..4)    UInt32LE  = 4                 (length of the size field itself)
 *   [4..8)    UInt32LE  = headerSize        (outer pickle payload size)
 *   [8..12)   UInt32LE  = headerStringSize  (inner payload size)
 *   [12..16)  UInt32LE  = jsonLength
 *   [16..)    JSON header, then padding, then file contents
 *
 * Data base offset = 8 + headerSize   (NOT 16 + jsonLength)
 */

import fs from 'node:fs';

const PICKLE_HEADER = 8;

export function openAsar(asarPath) {
  const fd = fs.openSync(asarPath, 'r');

  const probe = Buffer.alloc(16);
  fs.readSync(fd, probe, 0, 16, 0);

  const headerSize = probe.readUInt32LE(4);
  const jsonLength = probe.readUInt32LE(12);

  // Guard against a non-asar file or a format change.
  const jsonBuf = Buffer.alloc(jsonLength);
  fs.readSync(fd, jsonBuf, 0, jsonLength, 16);
  const jsonText = jsonBuf.toString('utf8');
  if (jsonText[0] !== '{') {
    throw new Error(
      `asar: header JSON does not start with '{' (got ${JSON.stringify(jsonText[0])}). ` +
        'This file is either not an asar or uses an unsupported layout.'
    );
  }
  const header = JSON.parse(jsonText);

  const baseOffset = PICKLE_HEADER + headerSize;

  function resolve(filePath) {
    const parts = filePath.split('/').filter(Boolean);
    let node = header;
    for (const part of parts) {
      if (!node.files || !(part in node.files)) {
        throw new Error(`asar: no such entry "${filePath}" (missing "${part}")`);
      }
      node = node.files[part];
    }
    return node;
  }

  function list(dir = '/') {
    const out = [];
    const walk = (node, prefix) => {
      for (const [name, child] of Object.entries(node.files || {})) {
        const full = `${prefix}/${name}`;
        if (child.files) walk(child, full);
        else out.push({ path: full, size: Number(child.size) || 0 });
      }
    };
    walk(resolve(dir), dir === '/' ? '' : dir);
    return out;
  }

  function readBuffer(filePath) {
    const node = resolve(filePath);
    if (node.files) throw new Error(`asar: "${filePath}" is a directory`);
    const size = Number(node.size);
    const buf = Buffer.alloc(size);
    fs.readSync(fd, buf, 0, size, baseOffset + Number(node.offset));
    return buf;
  }

  return {
    header,
    list,
    readBuffer,
    readText: (p) => readBuffer(p).toString('utf8'),
    readJson: (p) => JSON.parse(readBuffer(p).toString('utf8')),
    close: () => fs.closeSync(fd),
  };
}

/** Extract the integrity block of an asar (Electron 30+ writes this). */
export function readAsarIntegrity(asarPath) {
  const dir = asarPath.replace(/[\\/][^\\/]+$/, '');
  for (const name of ['integrity.json', 'app.asar.integrity', 'app.asar.integrity.json']) {
    const candidate = `${dir}/${name}`;
    if (fs.existsSync(candidate)) {
      try {
        return JSON.parse(fs.readFileSync(candidate, 'utf8'));
      } catch {
        /* ignore malformed */
      }
    }
  }
  return null;
}
