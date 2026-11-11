import { hexToRgb, shade } from '../draw';
import type { Ctx, SkinDef } from '../types';

/** PIXEL RETRO — estilo 8/16 bits. Todo se dibuja a baja resolución y se amplía sin suavizado. */

const P = 10; // resolución del bloque en "píxeles"

function lowRes(ctx: Ctx, w: number, h: number, scale: number, paint: (c: Ctx, w: number, h: number) => void) {
  const cw = Math.max(1, Math.round(w / scale));
  const chh = Math.max(1, Math.round(h / scale));
  const c = document.createElement('canvas');
  c.width = cw;
  c.height = chh;
  const cc = c.getContext('2d')!;
  paint(cc, cw, chh);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(c, 0, 0, w, h);
  ctx.restore();
}

const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

const pixel: SkinDef = {
  id: 'pixel',
  name: { es: 'Pixel Retro', en: 'Retro Pixel' },
  description: { es: 'Nostalgia de 8 bits.', en: '8-bit nostalgia.' },
  price: 500,
  order: 1.5,
  pixelated: true,
  blocks: ['#e83b3b', '#f99c1a', '#5ad23c', '#3b9be8', '#a85de8', '#e85dc0', '#f0e040', '#7a7a8a'],
  ui: {
    bg: '#14102a',
    panel: 'rgba(24, 20, 56, 0.96)',
    panelBorder: '#f0e040',
    text: '#ffffff',
    textDim: '#a8a4d8',
    accent: '#f0e040',
    accent2: '#3b9be8',
    good: '#5ad23c',
    danger: '#e83b3b',
    radius: 0,
    font: '"Courier New", ui-monospace, monospace',
    titleGlow: '3px 3px 0 #e83b3b',
  },
  blockMargin: 0,
  flash: '#ffffff',

  drawBackground(ctx, w, h) {
    lowRes(ctx, w, h, 4, (c, cw, ch) => {
      const top = hexToRgb('#1a1240');
      const bot = hexToRgb('#3a1d5c');
      const img = c.createImageData(cw, ch);
      for (let y = 0; y < ch; y++) {
        for (let x = 0; x < cw; x++) {
          const t = y / ch + (BAYER[y % 4][x % 4] / 16 - 0.5) * 0.12;
          const q = Math.round(Math.max(0, Math.min(1, t)) * 5) / 5;
          const k = (y * cw + x) * 4;
          img.data[k] = top[0] + (bot[0] - top[0]) * q;
          img.data[k + 1] = top[1] + (bot[1] - top[1]) * q;
          img.data[k + 2] = top[2] + (bot[2] - top[2]) * q;
          img.data[k + 3] = 255;
        }
      }
      c.putImageData(img, 0, 0);
      // estrellas
      let seed = 3;
      const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      for (let i = 0; i < (cw * ch) / 300; i++) {
        c.fillStyle = rnd() > 0.8 ? '#f0e040' : '#ffffff';
        c.fillRect(Math.floor(rnd() * cw), Math.floor(rnd() * ch * 0.7), 1, 1);
      }
      // montañas
      c.fillStyle = '#241640';
      for (let x = 0; x < cw; x++) {
        const hh = ch * 0.18 + Math.abs(Math.sin(x * 0.05) * ch * 0.08) + Math.abs(Math.sin(x * 0.13)) * ch * 0.04;
        c.fillRect(x, Math.floor(ch - hh), 1, Math.ceil(hh));
      }
      c.fillStyle = '#1a0f30';
      for (let x = 0; x < cw; x++) {
        const hh = ch * 0.1 + Math.abs(Math.sin(x * 0.09 + 1)) * ch * 0.06;
        c.fillRect(x, Math.floor(ch - hh), 1, Math.ceil(hh));
      }
    });
  },

  drawBoard(ctx, size, cell) {
    const px = Math.max(2, Math.round(cell / P));
    const pad = px * 3;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#000000';
    ctx.fillRect(-pad - px, -pad - px, size + (pad + px) * 2, size + (pad + px) * 2);
    ctx.fillStyle = '#f0e040';
    ctx.fillRect(-pad, -pad, size + pad * 2, size + pad * 2);
    ctx.fillStyle = '#000000';
    ctx.fillRect(-pad + px, -pad + px, size + (pad - px) * 2, size + (pad - px) * 2);
    ctx.fillStyle = '#1b1838';
    ctx.fillRect(0, 0, size, size);
    for (let y = 0; y < 8; y++)
      for (let x = 0; x < 8; x++) {
        ctx.fillStyle = (x + y) % 2 ? '#211d44' : '#1d1a3e';
        ctx.fillRect(x * cell, y * cell, cell, cell);
        ctx.fillStyle = '#2a2656';
        ctx.fillRect(x * cell, y * cell, cell, Math.max(1, px / 2));
        ctx.fillRect(x * cell, y * cell, Math.max(1, px / 2), cell);
      }
  },

  drawBlock(ctx, s, color, variant) {
    lowRes(ctx, s, s, s / P, (c) => {
      if (variant === 'ghost') {
        c.fillStyle = color;
        for (let i = 0; i < P; i++) {
          c.fillRect(i, 0, 1, 1);
          c.fillRect(i, P - 1, 1, 1);
          c.fillRect(0, i, 1, 1);
          c.fillRect(P - 1, i, 1, 1);
        }
        c.globalAlpha = 0.35;
        for (let y = 1; y < P - 1; y++) for (let x = 1; x < P - 1; x++) if ((x + y) % 2 === 0) c.fillRect(x, y, 1, 1);
        return;
      }
      c.fillStyle = '#000000';
      c.fillRect(0, 0, P, P);
      c.fillStyle = color;
      c.fillRect(1, 1, P - 2, P - 2);
      c.fillStyle = shade(color, 0.45);
      c.fillRect(1, 1, P - 2, 1);
      c.fillRect(1, 1, 1, P - 2);
      c.fillStyle = shade(color, -0.4);
      c.fillRect(1, P - 2, P - 2, 1);
      c.fillRect(P - 2, 1, 1, P - 2);
      if (variant !== 'stone') {
        c.fillStyle = '#ffffff';
        c.fillRect(2, 2, 2, 1);
        c.fillRect(2, 3, 1, 1);
      } else {
        c.fillStyle = shade(color, -0.25);
        c.fillRect(3, 4, 2, 1);
        c.fillRect(6, 6, 1, 1);
      }
    });
  },

  drawGem(ctx, s) {
    lowRes(ctx, s, s, s / P, (c) => {
      const rows = ['....##....', '...#ww#...', '..#wccc#..', '.#cccccb#.', '..#ccbb#..', '...#cb#...', '....##....'];
      rows.forEach((r, y) => {
        for (let x = 0; x < r.length; x++) {
          const ch = r[x];
          if (ch === '.') continue;
          c.fillStyle = ch === '#' ? '#000000' : ch === 'w' ? '#ffffff' : ch === 'c' ? '#5ff0ff' : '#1f8fbf';
          c.fillRect(x, y + 1, 1, 1);
        }
      });
    });
  },

  drawTarget(ctx, s) {
    lowRes(ctx, s, s, s / P, (c) => {
      c.fillStyle = '#ffffff';
      const pts = [[3, 3], [6, 3], [4, 4], [5, 4], [4, 5], [5, 5], [3, 6], [6, 6]];
      for (const [x, y] of pts) c.fillRect(x, y, 1, 1);
    });
  },

  particles: {
    draw(ctx, s, color) {
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, s, s);
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillRect(0, 0, s / 2, s / 2);
    },
    perCell: 4,
    size: [0.14, 0.26],
    speed: [3, 7],
    gravity: 14,
    life: [0.45, 0.8],
    blend: 'normal',
    spin: false,
    shrink: false,
  },

  ambient: {
    count: 12,
    draw(ctx, s) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, s, s);
    },
    size: [3, 4],
    speed: [-10, -24],
    alpha: [0.25, 0.6],
    blend: 'normal',
  },

  sound: {
    root: 60,
    scale: [0, 2, 3, 5, 7, 8, 10],
    blip: 'square',
    sparkle: 'square',
    thump: 0.6,
    music: {
      bpm: 128,
      progression: [0, 5, 3, 4],
      pad: 'square',
      lead: 'square',
      bass: 'triangle',
      leadDensity: 0.45,
      padGain: 0.018,
      leadGain: 0.03,
      bassGain: 0.11,
      filter: 2600,
      reverb: 0.15,
      echo: 0.2,
      hats: true,
    },
  },
};

export default pixel;
