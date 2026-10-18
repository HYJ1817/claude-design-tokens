/**
 * Minimal, dependency-free Electron ASAR reader.
 *
 * ASAR layout:
 *   [0..4)    UInt32LE  = 4          (header size field length, always 4)
 *   [4..8)    UInt32LE  = headerSize (length of the pickle payload)
 *   [8..12)   UInt32LE  = payloadSize (JSON length + padding)
 *   [12..16)  UInt32LE  = jsonLength
 *   [16..)    JSON header, then file contents
 *   file offset base = 16 + jsonLength
 */

import fs from 'node:fs';

const HEADER_PROBE = 16;

export function openAsar(asarPath) {
  const fd = fs.openSync(asarPath, 'r');
  const probe = Buffer.alloc(HEADER_PROBE);
  fs.readSync(fd, probe, 0, HEADER_PROBE, 0);

  const jsonLength = probe.readUInt32LE(12);
  const jsonBuf = Buffer.alloc(jsonLength);
  fs.readSync(fd, jsonBuf, 0, jsonLength, HEADER_PROBE);

  const header = JSON.parse(jsonBuf.toString('utf8'));
  const baseOffset = HEADER_PROBE + jsonLength;

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
