#!/usr/bin/env node
// Report the real decoded RGBA8 + full mip-chain cost of embedded GLB images.
// Compressed GLB/file size is not a useful proxy for GPU memory: a 1K JPEG and
// a 1K PNG both occupy the same 5.33 MiB once uploaded as RGBA8 with mipmaps.
//
//   node tools/characters/audit_rig_textures.js assets/rigs/XiaoChen.lod.glb
//   node tools/characters/audit_rig_textures.js --production --details <files...>

const fs = require('fs');
const path = require('path');

const argv = process.argv.slice(2);
const details = argv.includes('--details');
const production = argv.includes('--production');
const numberAfter = (flag, fallback) => {
  const index = argv.indexOf(flag);
  if (index < 0) return fallback;
  const value = Number(argv[index + 1]);
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${flag} requires a positive number`);
  return value;
};
const softMiB = numberAfter('--soft-mib', 12);
const hardMiB = numberAfter('--hard-mib', 16);
const flagsWithValues = new Set(['--soft-mib', '--hard-mib']);
const files = [];
for (let i = 0; i < argv.length; i++) {
  if (flagsWithValues.has(argv[i])) { i++; continue; }
  if (!argv[i].startsWith('--')) files.push(path.resolve(argv[i]));
}
if (!files.length) {
  const directory = path.resolve('assets/rigs');
  files.push(...fs.readdirSync(directory).filter(name => name.endsWith('.lod.glb'))
    .sort().map(name => path.join(directory, name)));
}

function parseGlb(file) {
  const raw = fs.readFileSync(file);
  if (raw.length < 20 || raw.readUInt32LE(0) !== 0x46546c67 || raw.readUInt32LE(4) !== 2)
    throw new Error(`${file}: not a glTF 2.0 GLB`);
  let offset = 12, gltf = null, bin = null;
  while (offset < raw.length) {
    const length = raw.readUInt32LE(offset), type = raw.readUInt32LE(offset + 4);
    offset += 8;
    const chunk = raw.subarray(offset, offset + length);
    if (type === 0x4e4f534a) gltf = JSON.parse(chunk);
    if (type === 0x004e4942) bin = chunk;
    offset += length + (length % 4 ? 4 - length % 4 : 0);
  }
  if (!gltf || !bin) throw new Error(`${file}: missing JSON or BIN chunk`);
  return { gltf, bin };
}

function embeddedImage(gltf, bin, image, label) {
  if (image.bufferView === undefined) throw new Error(`${label}: image is not embedded`);
  const view = gltf.bufferViews && gltf.bufferViews[image.bufferView];
  if (!view || (view.buffer || 0) !== 0) throw new Error(`${label}: invalid image bufferView`);
  const start = view.byteOffset || 0;
  return bin.subarray(start, start + view.byteLength);
}

function imageSize(data, mime, label) {
  if (mime === 'image/png') {
    if (data.length < 24 || data.readUInt32BE(0) !== 0x89504e47 || data.toString('ascii', 12, 16) !== 'IHDR')
      throw new Error(`${label}: malformed PNG`);
    return [data.readUInt32BE(16), data.readUInt32BE(20)];
  }
  if (mime === 'image/jpeg') {
    if (data.length < 4 || data[0] !== 0xff || data[1] !== 0xd8)
      throw new Error(`${label}: malformed JPEG`);
    const startsOfFrame = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7,
      0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
    let offset = 2;
    while (offset + 8 < data.length) {
      while (offset < data.length && data[offset] === 0xff) offset++;
      const marker = data[offset++];
      if (marker === 0xd9 || marker === 0xda) break;
      if (marker >= 0xd0 && marker <= 0xd7) continue;
      if (offset + 2 > data.length) break;
      const length = data.readUInt16BE(offset);
      if (length < 2 || offset + length > data.length) break;
      if (startsOfFrame.has(marker))
        return [data.readUInt16BE(offset + 5), data.readUInt16BE(offset + 3)];
      offset += length;
    }
    throw new Error(`${label}: JPEG has no supported size marker`);
  }
  throw new Error(`${label}: unsupported image type ${mime || '(missing)'}`);
}

function mipBytes(width, height) {
  let total = 0, w = width, h = height;
  for (;;) {
    total += w * h * 4;
    if (w === 1 && h === 1) return total;
    w = Math.max(1, Math.floor(w / 2));
    h = Math.max(1, Math.floor(h / 2));
  }
}

function productionCap(name) {
  const value = String(name || '').toLowerCase();
  if (value === 'skin' || value.includes('body')) return 1024;
  if (value === 'eyes' || value.includes('eye_')) return 512;
  if (value.includes('brow')) return 256;
  if (/(hair|ponytail|braid|grey_short|silver)/.test(value)) return 512;
  if (/(shoe|trainer|sneaker|boot|glasses|spectacle|hat|cap|scarf|bag|watch|jewel)/.test(value))
    return 256;
  return 512;
}

let aggregate = 0, aggregateImages = 0, failed = false;
for (const file of files) {
  const { gltf, bin } = parseGlb(file);
  const images = (gltf.images || []).map((entry, index) => {
    const name = entry.name || `image-${index}`;
    const data = embeddedImage(gltf, bin, entry, `${file}/${name}`);
    const [width, height] = imageSize(data, entry.mimeType, `${file}/${name}`);
    return { name, width, height, bytes: mipBytes(width, height), mime: entry.mimeType };
  });
  const bytes = images.reduce((sum, image) => sum + image.bytes, 0);
  const mebibytes = bytes / 1048576;
  const errors = [];
  if (mebibytes > hardMiB + 1e-6)
    errors.push(`${mebibytes.toFixed(2)} MiB exceeds ${hardMiB.toFixed(2)} MiB hard limit`);
  if (production) for (const image of images) {
    const cap = productionCap(image.name);
    if (Math.max(image.width, image.height) > cap)
      errors.push(`${image.name} is ${image.width}x${image.height}; production cap is ${cap}`);
  }
  const relative = path.relative(process.cwd(), file);
  const status = errors.length ? 'FAIL' : mebibytes > softMiB ? 'WARN' : 'PASS';
  console.log(`${status} ${relative} · ${images.length} images · ${mebibytes.toFixed(2)} MiB RGBA8+mips`);
  if (details) for (const image of images)
    console.log(`  ${image.name}: ${image.width}x${image.height} ${image.mime.replace('image/', '')} · ${(image.bytes / 1048576).toFixed(2)} MiB`);
  if (errors.length) {
    failed = true;
    for (const error of errors) console.error(`  ${error}`);
  }
  aggregate += bytes;
  aggregateImages += images.length;
}
console.log(`${failed ? 'FAIL' : 'PASS'}: ${files.length} rigs · ${aggregateImages} images · ` +
  `${(aggregate / 1048576).toFixed(2)} MiB aggregate RGBA8+mips`);
if (failed) process.exitCode = 1;
