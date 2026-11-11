// Genera los iconos PNG de la app por código (sin herramientas externas).
// Uso: npm run icons
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const hex = (s) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
const sdRoundRect = (px, py, cx, cy, hw, hh, r) => {
  const qx = Math.abs(px - cx) - hw + r;
  const qy = Math.abs(py - cy) - hh + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
};
const clamp = (v) => Math.max(0, Math.min(1, v));

/**
 * @param size  lado en px
 * @param safe  fracción ocupada por el contenido (maskable = 0.62)
 * @param round radio de esquinas del fondo (0 = cuadrado completo)
 */
function render(size, safe, round) {
  const out = Buffer.alloc(size * size * 4);
  const blocks = [
    ['#20d6ff', -1, -1],
    ['#ff2e88', 1, -1],
    ['#39ff7a', -1, 1],
    ['#ffae00', 1, 1],
  ];
  const c = size / 2;
  const unit = (size * safe) / 4.3;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      // fondo con degradado radial
      const t = Math.hypot(px - c * 0.7, py - c * 0.5) / size;
      let r = 22 - t * 14;
      let g = 14 - t * 8;
      let b = 56 - t * 30;
      // brillo (glow) de los bloques
      for (const [col, ox, oy] of blocks) {
        const [cr, cg, cb] = hex(col);
        const d = sdRoundRect(px, py, c + ox * unit * 1.08, c + oy * unit * 1.08, unit * 0.92, unit * 0.92, unit * 0.28);
        if (d > 0) {
          const glow = Math.exp(-d / (unit * 0.28)) * 0.55;
          r += cr * glow;
          g += cg * glow;
          b += cb * glow;
        }
      }
      for (const [col, ox, oy] of blocks) {
        const [cr, cg, cb] = hex(col);
        const bx = c + ox * unit * 1.08;
        const by = c + oy * unit * 1.08;
        const d = sdRoundRect(px, py, bx, by, unit * 0.92, unit * 0.92, unit * 0.28);
        const a = clamp(0.5 - d);
        if (a <= 0) continue;
        const vy = (py - (by - unit)) / (unit * 2);
        const shade = 1.25 - vy * 0.55;
        let fr = cr * shade;
        let fg = cg * shade;
        let fb = cb * shade;
        const dc = sdRoundRect(px, py, bx, by, unit * 0.52, unit * 0.52, unit * 0.16);
        if (dc < 0) {
          fr *= 0.62;
          fg *= 0.62;
          fb *= 0.62;
        }
        const ring = clamp(1 - Math.abs(dc) / Math.max(1, unit * 0.05));
        fr += (255 - fr) * ring * 0.6;
        fg += (255 - fg) * ring * 0.6;
        fb += (255 - fb) * ring * 0.6;
        const hl = clamp(1 - Math.abs(py - (by - unit * 0.72)) / Math.max(1, unit * 0.05)) * clamp(1 - Math.abs(px - bx) / (unit * 0.6));
        fr += (255 - fr) * hl * 0.8;
        fg += (255 - fg) * hl * 0.8;
        fb += (255 - fb) * hl * 0.8;
        r = r * (1 - a) + fr * a;
        g = g * (1 - a) + fg * a;
        b = b * (1 - a) + fb * a;
      }
      let alpha = 1;
      if (round > 0) alpha = clamp(0.5 - sdRoundRect(px, py, c, c, c, c, size * round));
      const k = (y * size + x) * 4;
      out[k] = Math.min(255, r);
      out[k + 1] = Math.min(255, g);
      out[k + 2] = Math.min(255, b);
      out[k + 3] = Math.round(alpha * 255);
    }
  }
  return png(size, size, out);
}

mkdirSync('public/icons', { recursive: true });
writeFileSync('public/icons/icon-192.png', render(192, 0.8, 0.2));
writeFileSync('public/icons/icon-512.png', render(512, 0.8, 0.2));
writeFileSync('public/icons/maskable-512.png', render(512, 0.6, 0));
writeFileSync('public/icons/apple-touch-icon.png', render(180, 0.74, 0));
console.log('Iconos generados en public/icons');
