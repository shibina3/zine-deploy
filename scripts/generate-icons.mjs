import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

/**
 * Generates the PWA icons without any image dependency: a rounded wine tile with
 * a champagne "Z". Run with `node scripts/generate-icons.mjs`.
 */

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeBuffer = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function encodePng(width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const scanline = width * 4;
  const raw = Buffer.alloc((scanline + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (scanline + 1)] = 0;
    rgba.copy(raw, y * (scanline + 1) + 1, y * scanline, (y + 1) * scanline);
  }

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function insideRoundedRect(x, y, size, radius, padding) {
  const min = padding;
  const max = size - padding;
  if (x < min || y < min || x >= max || y >= max) return false;
  const r = radius;
  const cx = Math.min(Math.max(x, min + r), max - r);
  const cy = Math.min(Math.max(y, min + r), max - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}

function insideTriangle(px, py, ax, ay, bx, by, cx, cy) {
  const d1 = (px - bx) * (ay - by) - (ax - bx) * (py - by);
  const d2 = (px - cx) * (by - cy) - (bx - cx) * (py - cy);
  const d3 = (px - ax) * (cy - ay) - (cx - ax) * (py - ay);
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNeg && hasPos);
}

function drawIcon(size, { padding = 0, maskable = false } = {}) {
  const rgba = Buffer.alloc(size * size * 4);
  const radius = size * (maskable ? 0.5 : 0.22);
  const inner = maskable ? size * 0.16 : size * 0.055;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;

      if (!insideRoundedRect(x, y, size, radius, padding)) {
        rgba[index + 3] = 0;
        continue;
      }

      // Wine gradient background.
      const t = (x / size) * 0.45 + (y / size) * 0.55;
      rgba[index] = Math.round(46 + t * 28);
      rgba[index + 1] = Math.round(13 + t * 8);
      rgba[index + 2] = Math.round(21 + t * 14);
      rgba[index + 3] = 255;

      // Gold Z geometry.
      const glyphSize = size - inner * 2;
      const zx = inner;
      const zy = inner;
      const barHeight = glyphSize * 0.135;
      const top = zy + glyphSize * 0.16;
      const bottom = zy + glyphSize * 0.84 - barHeight;
      const left = zx + glyphSize * 0.2;
      const right = zx + glyphSize * 0.8;

      const inTopBar = x >= left && x <= right && y >= top && y <= top + barHeight;
      const inBottomBar = x >= left && x <= right && y >= bottom && y <= bottom + barHeight;
      const inDiagonal = insideTriangle(
        x,
        y,
        left,
        top + barHeight,
        right,
        bottom,
        left,
        bottom,
      );

      if (inTopBar || inBottomBar || inDiagonal) {
        rgba[index] = 227;
        rgba[index + 1] = 197;
        rgba[index + 2] = 116;
        rgba[index + 3] = 255;
      }
    }
  }

  return encodePng(size, size, rgba);
}

mkdirSync(new URL('../public/icons/', import.meta.url), { recursive: true });
writeFileSync(new URL('../public/icons/icon-192.png', import.meta.url), drawIcon(192));
writeFileSync(new URL('../public/icons/icon-512.png', import.meta.url), drawIcon(512));
writeFileSync(
  new URL('../public/icons/icon-maskable-512.png', import.meta.url),
  drawIcon(512, { maskable: true }),
);

console.log('Generated PWA icons in public/icons');
