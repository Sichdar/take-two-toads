// Draws the app icons (parchment, a cauldron, a gold balance mark) as PNG files.
// Uses only Node's built-in zlib. Run: node tools/make-icons.js
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc = buf => { let c = 0xFFFFFFFF; for (const b of buf) c = crcTable[(c ^ b) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
  return Buffer.concat([len, td, c]);
}
function png(size, pixel) {
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixel(x / size, y / size);
      const o = y * (size * 3 + 1) + 1 + x * 3;
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

const PAPER = [239, 226, 196], INK = [59, 42, 30], POT = [74, 58, 48], GOLD = [184, 138, 43], GREEN = [155, 196, 106], RED = [168, 50, 42];
function pixel(x, y) {
  const dx = x - 0.5;
  // Gold beam and diamond (the balance)
  if (y > 0.2 && y < 0.25 && Math.abs(dx) < 0.32) return GOLD;
  if (Math.abs(dx) + Math.abs(y - 0.16) < 0.07) return RED;
  // Cauldron body: an ellipse, ink outline
  const ex = dx / 0.3, ey = (y - 0.6) / 0.24;
  const e = ex * ex + ey * ey;
  if (y > 0.42 && e < 1) {
    if (e > 0.82) return INK;
    if (y < 0.47) return GREEN;
    return POT;
  }
  // Rim
  const rx = dx / 0.33, ry = (y - 0.43) / 0.05;
  if (rx * rx + ry * ry < 1) return INK;
  // Legs
  if (y > 0.8 && y < 0.88 && (Math.abs(dx + 0.17) < 0.03 || Math.abs(dx - 0.17) < 0.03)) return INK;
  return PAPER;
}

mkdirSync('icons', { recursive: true });
for (const size of [192, 512]) writeFileSync(`icons/icon-${size}.png`, png(size, pixel));
console.log('icons written');
