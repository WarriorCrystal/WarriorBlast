import { hexToRgb, shade } from '../draw';
import type { Ctx, SkinDef } from '../types';

/**
 * MUNDO DE BLOQUES — estilo vóxel/artesanía: cada color es un material pixelado
 * de 16×16 (hierba, tierra, tablones, agua, cristal, ladrillo, oro y piedra).
 */

const P = 16; // resolución de la textura del bloque

const C = {
  grass: '#5fae3c',
  dirt: '#8a5a32',
  planks: '#c4924e',
  water: '#3f7fd8',
  crystal: '#9b5fd6',
  brick: '#c4493a',
  gold: '#f0c63a',
  stone: '#808080',
};

function lowRes(ctx: Ctx, w: number, h: number, scale: number, paint: (c: Ctx, w: number, h: number) => void) {
  const cw = Math.max(1, Math.round(w / scale));
  const ch = Math.max(1, Math.round(h / scale));
  const c = document.createElement('canvas');
  c.width = cw;
  c.height = ch;
  const cc = c.getContext('2d')!;
  paint(cc, cw, ch);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(c, 0, 0, w, h);
  ctx.restore();
}

/** Ruido determinista por píxel (mismo material = misma textura). */
function noise(x: number, y: number, seed: number): number {
  let n = x * 374761393 + y * 668265263 + seed * 2246822519;
  n = (n ^ (n >>> 13)) * 1274126177;
  n = n ^ (n >>> 16);
  return ((n >>> 0) % 1000) / 1000;
}

function seedOf(color: string): number {
  let h = 7;
  for (let i = 0; i < color.length; i++) h = (h * 31 + color.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Pinta un píxel con el color base variado por ruido. */
function px(c: Ctx, x: number, y: number, color: string, amt: number) {
  c.fillStyle = shade(color, amt);
  c.fillRect(x, y, 1, 1);
}

function paintMaterial(c: Ctx, color: string, stone: boolean) {
  const seed = seedOf(color);
  const n = (x: number, y: number) => noise(x, y, seed);
  const key = stone ? C.stone : color.toLowerCase();

  switch (key) {
    case C.grass:
      for (let y = 0; y < P; y++)
        for (let x = 0; x < P; x++) {
          const r = n(x, y);
          px(c, x, y, color, r > 0.85 ? 0.22 : r < 0.2 ? -0.18 : (r - 0.5) * 0.12);
        }
      // briznas
      for (let i = 0; i < 9; i++) {
        const x = Math.floor(n(i, 99) * P);
        const y = Math.floor(n(99, i) * (P - 2)) + 1;
        px(c, x, y, color, 0.3);
        px(c, x, y + 1, color, 0.12);
      }
      break;

    case C.dirt:
      for (let y = 0; y < P; y++)
        for (let x = 0; x < P; x++) {
          const r = n(x, y);
          px(c, x, y, color, r > 0.9 ? -0.35 : r > 0.75 ? 0.15 : (r - 0.5) * 0.15);
        }
      // piedrecitas
      for (let i = 0; i < 5; i++) {
        const x = Math.floor(n(i, 7) * (P - 1));
        const y = Math.floor(n(7, i) * (P - 1));
        c.fillStyle = '#9c8c80';
        c.fillRect(x, y, 2, 1);
        c.fillStyle = '#6d625a';
        c.fillRect(x, y + 1, 2, 1);
      }
      break;

    case C.planks:
      for (let y = 0; y < P; y++) {
        const row = Math.floor(y / 4);
        for (let x = 0; x < P; x++) {
          const grain = Math.sin((x + row * 5) * 0.9 + n(row, 3) * 6) * 0.05;
          px(c, x, y, color, grain + (n(x, y) - 0.5) * 0.08 + (row % 2 ? -0.05 : 0));
        }
        if (y % 4 === 3) {
          c.fillStyle = shade(color, -0.42);
          c.fillRect(0, y, P, 1);
        }
      }
      // juntas verticales escalonadas
      c.fillStyle = shade(color, -0.42);
      for (let row = 0; row < 4; row++) c.fillRect(row % 2 ? 4 : 11, row * 4, 1, 3);
      break;

    case C.water:
      for (let y = 0; y < P; y++)
        for (let x = 0; x < P; x++) px(c, x, y, color, (n(x, y) - 0.5) * 0.08 + (y / P) * -0.12);
      c.fillStyle = shade(color, 0.35);
      for (let i = 0; i < 4; i++) {
        const y = 2 + i * 4;
        const x0 = (i * 5) % 8;
        c.fillRect(x0, y, 4, 1);
        c.fillRect(x0 + 4, y - 1, 3, 1);
        c.fillRect(x0 + 7, y, 2, 1);
      }
      break;

    case C.crystal:
      for (let y = 0; y < P; y++)
        for (let x = 0; x < P; x++) {
          const band = ((x + y) >> 2) % 3;
          px(c, x, y, color, [0.22, -0.05, -0.25][band] + (n(x, y) - 0.5) * 0.08);
        }
      c.fillStyle = shade(color, 0.6);
      for (let i = 0; i < 4; i++) c.fillRect(Math.floor(n(i, 5) * 13) + 1, Math.floor(n(5, i) * 13) + 1, 1, 1);
      break;

    case C.brick:
      c.fillStyle = '#c9bdb0';
      c.fillRect(0, 0, P, P);
      for (let row = 0; row < 4; row++) {
        const off = row % 2 ? 4 : 0;
        for (let b = -1; b < 2; b++) {
          const bx = b * 8 + off;
          for (let y = row * 4; y < row * 4 + 3; y++)
            for (let x = Math.max(0, bx); x < Math.min(P, bx + 7); x++)
              px(c, x, y, color, (n(x, y) - 0.5) * 0.18 + (y === row * 4 ? 0.12 : 0));
        }
      }
      break;

    case C.gold:
      for (let y = 0; y < P; y++)
        for (let x = 0; x < P; x++) px(c, x, y, color, (n(x, y) - 0.5) * 0.06);
      c.fillStyle = shade(color, 0.4);
      c.fillRect(0, 0, P, 1);
      c.fillRect(0, 0, 1, P);
      c.fillStyle = shade(color, -0.3);
      c.fillRect(0, P - 1, P, 1);
      c.fillRect(P - 1, 0, 1, P);
      c.fillStyle = shade(color, -0.15);
      c.fillRect(2, 2, P - 4, 1);
      c.fillRect(2, 2, 1, P - 4);
      c.fillStyle = '#fffbe0';
      c.fillRect(3, 4, 1, 3);
      c.fillRect(4, 3, 3, 1);
      break;

    default: // piedra y cualquier color desconocido
      for (let y = 0; y < P; y++)
        for (let x = 0; x < P; x++) {
          const r = n(x, y);
          px(c, x, y, color, r > 0.88 ? 0.18 : r < 0.12 ? -0.22 : (r - 0.5) * 0.14);
        }
      c.fillStyle = shade(color, -0.32);
      for (const [x, y, w] of [[2, 4, 3], [5, 5, 2], [9, 10, 4], [8, 11, 1], [11, 2, 2]]) c.fillRect(x, y, w, 1);
      break;
  }

  // sombreado del borde para dar volumen de cubo
  c.fillStyle = 'rgba(255,255,255,0.18)';
  c.fillRect(0, 0, P, 1);
  c.fillRect(0, 1, 1, P - 1);
  c.fillStyle = 'rgba(0,0,0,0.32)';
  c.fillRect(0, P - 1, P, 1);
  c.fillRect(P - 1, 0, 1, P - 1);
}

const blockworld: SkinDef = {
  id: 'blockworld',
  name: { es: 'Mundo de Bloques', en: 'Block World' },
  description: { es: 'Hierba, tierra, madera y oro pixelados.', en: 'Pixelated grass, dirt, wood and gold.' },
  price: 900,
  order: 1.7,
  pixelated: true,
  blocks: [C.grass, C.dirt, C.planks, C.water, C.crystal, C.brick, C.gold, C.stone],
  ui: {
    bg: '#6fb0f0',
    panel: 'rgba(58, 42, 30, 0.96)',
    panelBorder: '#1e140c',
    text: '#ffffff',
    textDim: '#d8c8b0',
    accent: '#7ed957',
    accent2: '#f0c63a',
    good: '#7ed957',
    danger: '#e05040',
    radius: 0,
    font: '"Courier New", ui-monospace, monospace',
    titleGlow: '3px 3px 0 #3a2a1e',
  },
  blockMargin: 0,
  flash: '#ffffff',

  drawBackground(ctx, w, h) {
    lowRes(ctx, w, h, 6, (c, cw, ch) => {
      // cielo en franjas
      const top = hexToRgb('#4f94e6');
      const bot = hexToRgb('#a8d4ff');
      for (let y = 0; y < ch; y++) {
        const t = Math.round((y / ch) * 6) / 6;
        c.fillStyle = `rgb(${top[0] + (bot[0] - top[0]) * t},${top[1] + (bot[1] - top[1]) * t},${top[2] + (bot[2] - top[2]) * t})`;
        c.fillRect(0, y, cw, 1);
      }
      // sol cuadrado
      c.fillStyle = '#fff6b0';
      const sx = Math.floor(cw * 0.78);
      const sy = Math.floor(ch * 0.1);
      c.fillRect(sx, sy, 6, 6);
      c.fillStyle = '#ffe26a';
      c.fillRect(sx + 1, sy + 1, 4, 4);
      // nubes rectangulares
      let seed = 11;
      const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      for (let i = 0; i < Math.max(3, Math.round(cw / 25)); i++) {
        const x = Math.floor(rnd() * cw);
        const y = Math.floor(rnd() * ch * 0.4);
        const len = 8 + Math.floor(rnd() * 10);
        c.fillStyle = '#ffffff';
        c.fillRect(x, y, len, 3);
        c.fillRect(x + 2, y - 2, len - 5, 2);
        c.fillStyle = '#dcebff';
        c.fillRect(x, y + 3, len, 1);
      }
      // colinas: hierba, tierra y piedra
      const ground = (x: number) =>
        Math.floor(ch * 0.2 + Math.round(Math.sin(x * 0.06) * 3 + Math.sin(x * 0.17 + 2) * 2) * 1.5);
      for (let x = 0; x < cw; x++) {
        const gh = ground(x);
        const gy = ch - gh;
        for (let y = gy; y < ch; y++) {
          const d = y - gy;
          const r = noise(x, y, 3);
          let col: string;
          if (d < 2) col = r > 0.7 ? '#76c64a' : '#5fae3c';
          else if (d < 3 && r > 0.5) col = '#4a8f2c';
          else if (d < gh * 0.5) col = r > 0.85 ? '#6d4524' : '#8a5a32';
          else col = r > 0.85 ? '#666666' : r < 0.1 ? '#9a9a9a' : '#808080';
          c.fillStyle = col;
          c.fillRect(x, y, 1, 1);
        }
      }
      // árboles cuadrados
      for (let i = 0; i < Math.max(2, Math.round(cw / 40)); i++) {
        const x = Math.floor(rnd() * (cw - 6)) + 2;
        const base = ch - ground(x);
        c.fillStyle = '#6b4a2a';
        c.fillRect(x, base - 5, 1, 5);
        c.fillStyle = '#3e8a2a';
        c.fillRect(x - 2, base - 9, 5, 4);
        c.fillStyle = '#4fa034';
        c.fillRect(x - 1, base - 10, 3, 1);
      }
    });
  },

  drawBoard(ctx, size, cell) {
    const p = Math.max(2, Math.round(cell / P));
    const pad = p * 4;
    ctx.imageSmoothingEnabled = false;
    // marco de madera oscura
    ctx.fillStyle = '#1e140c';
    ctx.fillRect(-pad - p, -pad - p, size + (pad + p) * 2, size + (pad + p) * 2);
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = ['#7a5230', '#6a4528', '#5a3a20', '#4a2f1a'][i];
      ctx.fillRect(-pad + i * p, -pad + i * p, size + (pad - i * p) * 2, size + (pad - i * p) * 2);
    }
    // celdas vacías: piedra oscura
    for (let y = 0; y < 8; y++)
      for (let x = 0; x < 8; x++) {
        ctx.fillStyle = (x + y) % 2 ? '#3b3b40' : '#36363b';
        ctx.fillRect(x * cell, y * cell, cell, cell);
        ctx.fillStyle = '#2a2a2e';
        ctx.fillRect(x * cell, y * cell, cell, p);
        ctx.fillRect(x * cell, y * cell, p, cell);
        ctx.fillStyle = '#45454b';
        ctx.fillRect(x * cell + cell * 0.3, y * cell + cell * 0.55, p * 2, p);
      }
  },

  drawBlock(ctx, s, color, variant) {
    lowRes(ctx, s, s, s / P, (c) => {
      if (variant === 'ghost') {
        c.globalAlpha = 0.4;
        paintMaterial(c, color, false);
        c.globalAlpha = 1;
        c.fillStyle = '#ffffff';
        c.fillRect(0, 0, P, 1);
        c.fillRect(0, P - 1, P, 1);
        c.fillRect(0, 0, 1, P);
        c.fillRect(P - 1, 0, 1, P);
        return;
      }
      paintMaterial(c, color, variant === 'stone');
    });
  },

  drawGem(ctx, s) {
    lowRes(ctx, s, s, s / P, (c) => {
      const rows = [
        '.....####.....',
        '....#wwcc#....',
        '...#wccccb#...',
        '..#cccccccb#..',
        '...#cccccb#...',
        '....#cccb#....',
        '.....#cb#.....',
        '......##......',
      ];
      rows.forEach((r, y) => {
        for (let x = 0; x < r.length; x++) {
          const ch = r[x];
          if (ch === '.') continue;
          c.fillStyle = ch === '#' ? '#0b3b3a' : ch === 'w' ? '#ffffff' : ch === 'c' ? '#5ff2e4' : '#1fa89c';
          c.fillRect(x + 1, y + 4, 1, 1);
        }
      });
    });
  },

  drawTarget(ctx, s) {
    lowRes(ctx, s, s, s / P, (c) => {
      c.fillStyle = '#000000';
      c.fillRect(4, 4, 8, 8);
      c.fillStyle = '#e05040';
      c.fillRect(5, 5, 6, 6);
      c.fillStyle = '#ffffff';
      c.fillRect(6, 6, 4, 4);
      c.fillStyle = '#e05040';
      c.fillRect(7, 7, 2, 2);
    });
  },

  particles: {
    draw(ctx, s, color) {
      ctx.fillStyle = shade(color, -0.25);
      ctx.fillRect(0, 0, s, s);
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, s * 0.75, s * 0.75);
      ctx.fillStyle = shade(color, 0.3);
      ctx.fillRect(0, 0, s * 0.35, s * 0.35);
    },
    perCell: 5,
    size: [0.12, 0.22],
    speed: [2.5, 6],
    gravity: 18,
    life: [0.5, 0.9],
    blend: 'normal',
    spin: false,
    shrink: true,
  },

  ambient: {
    count: 8,
    draw(ctx, s) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, s, s);
    },
    size: [3, 5],
    speed: [6, 14],
    alpha: [0.25, 0.55],
    blend: 'normal',
  },

  sound: {
    root: 57,
    scale: [0, 2, 4, 7, 9],
    blip: 'triangle',
    sparkle: 'square',
    thump: 0.75,
    music: {
      bpm: 76,
      progression: [0, 3, 4, 2],
      pad: 'triangle',
      lead: 'sine',
      bass: 'triangle',
      leadDensity: 0.28,
      padGain: 0.05,
      leadGain: 0.045,
      bassGain: 0.09,
      filter: 1600,
      reverb: 0.6,
      echo: 0.35,
      hats: false,
    },
  },
};

export default blockworld;
