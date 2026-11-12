import { roundRect } from '../draw';
import { rng } from '../tiles';
import type { Ctx, SkinDef } from '../types';

/**
 * GAME BOY — consola portátil de pantalla verde: solo 4 tonos de verde, píxeles gordos
 * (12×12 por bloque) y un marco de consola alrededor del tablero.
 * Cada bloque es una baldosa de pantalla con un icono distinto que llena todo el cuadrado:
 *   ladrillo · corazón · estrella · carita · diamante · diana · cruz · piedra = trama
 * A diferencia de "Pixel Retro" (colores, noche violeta), aquí todo es monocromo verde.
 */

/** Paleta de 4 tonos (oscuro → claro). */
const G = ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'] as const;

/**
 * Los 7 colores de bloque tienen que ser distintos entre sí (identifican la pieza), pero
 * en pantalla todo se dibuja con los 4 tonos de G: estos valores solo sirven de etiqueta.
 */
const C = {
  brick: '#306230',
  heart: '#8bac0f',
  star: '#9bbc0f',
  smile: '#0f380f',
  diamond: '#30622f',
  target: '#8bac0e',
  plus: '#0f380e',
  stone: '#1f4a1f',
};
type Kind = keyof typeof C;
const REV: Record<string, Kind> = Object.fromEntries(Object.entries(C).map(([k, v]) => [v, k as Kind]));
const kindOf = (c: string): Kind => REV[c.toLowerCase()] ?? 'brick';

const N = 12; // píxeles por bloque

/** Dibuja a baja resolución y amplía sin suavizado. */
function lowRes(ctx: Ctx, w: number, h: number, cw: number, ch: number, paint: (c: Ctx) => void) {
  const c = document.createElement('canvas');
  c.width = cw;
  c.height = ch;
  const cc = c.getContext('2d')!;
  paint(cc);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(c, 0, 0, w, h);
  ctx.restore();
}

const px = (c: Ctx, x: number, y: number, t: number) => {
  c.fillStyle = G[Math.max(0, Math.min(3, t))];
  c.fillRect(x, y, 1, 1);
};

/** Iconos 10×10 ('.' = fondo, '0'..'3' = tono). */
const ICON: Partial<Record<Kind, string[]>> = {
  heart: [
    '..........',
    '.000..000.',
    '0111001110',
    '0131111110',
    '0111111110',
    '.01111110.',
    '..011110..',
    '...0110...',
    '....00....',
    '..........',
  ],
  star: [
    '....00....',
    '...0330...',
    '...0330...',
    '0000330000',
    '0333333330',
    '.03333330.',
    '..033330..',
    '..033330..',
    '.03300330.',
    '.00....00.',
  ],
  smile: [
    '...0000...',
    '.00333300.',
    '.03333330.',
    '0330330330',
    '0330330330',
    '0333333330',
    '0303333030',
    '.03000030.',
    '.00333300.',
    '...0000...',
  ],
  diamond: [
    '....00....',
    '...0320...',
    '..033220..',
    '.03322220.',
    '0332222220',
    '0222222210',
    '.02222210.',
    '..022110..',
    '...0110...',
    '....00....',
  ],
  plus: [
    '..........',
    '...0000...',
    '...0330...',
    '0000330000',
    '0333333330',
    '0322222210',
    '0000110000',
    '...0110...',
    '...0000...',
    '..........',
  ],
};

/** Fondo de cada baldosa (tono base). */
const BG: Record<Kind, number> = { brick: 1, heart: 3, star: 1, smile: 2, diamond: 1, target: 2, plus: 2, stone: 1 };

function tile(c: Ctx, kind: Kind) {
  // marco oscuro
  c.fillStyle = G[0];
  c.fillRect(0, 0, N, N);
  const b = BG[kind];
  for (let y = 1; y < N - 1; y++)
    for (let x = 1; x < N - 1; x++) {
      let t = b;
      if (kind === 'diamond' && (x + y) % 2 === 0) t = 0; // trama
      if (kind === 'plus' && x % 3 === 0 && y % 3 === 0) t = 3;
      if (kind === 'stone') t = (x + y) % 2 ? 1 : 0;
      if (kind === 'brick') {
        const row = Math.floor((y - 1) / 3);
        const off = row % 2 ? 2 : 0;
        if ((y - 1) % 3 === 2 || (x - 1 + off) % 5 === 4) t = 0;
        else t = (y - 1) % 3 === 0 ? 2 : 1;
      }
      if (kind === 'target') {
        const d = Math.floor(Math.max(Math.abs(x - 5.5), Math.abs(y - 5.5)));
        t = [3, 0, 3, 1, 0][d] ?? 2;
      }
      px(c, x, y, t);
    }
  // bisel: luz arriba-izquierda, sombra abajo-derecha
  if (kind !== 'brick' && kind !== 'target' && kind !== 'stone') {
    for (let i = 1; i < N - 1; i++) {
      px(c, i, 1, Math.min(3, b + 1));
      px(c, 1, i, Math.min(3, b + 1));
      px(c, i, N - 2, Math.max(0, b - 1));
      px(c, N - 2, i, Math.max(0, b - 1));
    }
  }
  const icon = ICON[kind];
  if (icon)
    icon.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) if (row[x] !== '.') px(c, x + 1, y + 1, Number(row[x]));
    });
  if (kind === 'stone') {
    px(c, 3, 3, 2);
    px(c, 8, 7, 2);
  }
}

function ghost(c: Ctx) {
  for (let i = 0; i < N; i++) {
    if (i % 2 === 0) {
      px(c, i, 0, 0);
      px(c, i, N - 1, 0);
      px(c, 0, i, 0);
      px(c, N - 1, i, 0);
    }
  }
  c.globalAlpha = 0.35;
  for (let y = 2; y < N - 2; y++) for (let x = 2; x < N - 2; x++) if ((x + y) % 2 === 0) px(c, x, y, 0);
  c.globalAlpha = 1;
}

const gameboy: SkinDef = {
  id: 'gameboy',
  name: { es: 'Game Boy', en: 'Game Boy' },
  description: {
    es: 'Pantalla verde de 4 tonos, píxeles gordos y chiptune de 8 bits en tu consola de bolsillo.',
    en: '4-shade green screen, chunky pixels and 8-bit chiptune on your pocket console.',
  },
  price: 600,
  order: 5.4,
  pixelated: true,
  blocks: [C.brick, C.heart, C.star, C.smile, C.diamond, C.target, C.plus, C.stone],
  ui: {
    bg: '#c4c0b8',
    panel: 'rgba(155, 188, 15, 0.97)',
    panelBorder: G[0],
    text: G[0],
    textDim: G[1],
    accent: G[1],
    accent2: '#9a2257',
    good: G[1],
    danger: '#9a2257',
    radius: 4,
    font: '"Courier New", ui-monospace, monospace',
    titleGlow: `3px 3px 0 ${G[2]}`,
    swatches: [G[0], G[1], G[0], G[1], G[0], G[1], G[0]],
  },
  blockMargin: 0,
  flash: G[3],
  explosion: { power: 0.9, ring: G[0], rings: 1, screenFlash: false },

  drawBackground(ctx, w, h) {
    // plástico gris de la consola
    ctx.fillStyle = '#c4c0b8';
    ctx.fillRect(0, 0, w, h);
    const r = rng(8);
    for (let i = 0; i < (w * h) / 60; i++) {
      ctx.fillStyle = r() > 0.5 ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)';
      ctx.fillRect(r() * w, r() * h, 2, 2);
    }
    const m = Math.min(w, h);
    // cruceta abajo a la izquierda
    const dx = w * 0.14;
    const dy = h * 0.88;
    const a = m * 0.045;
    ctx.fillStyle = '#2a2a30';
    ctx.fillRect(dx - a * 1.5, dy - a * 0.5, a * 3, a);
    ctx.fillRect(dx - a * 0.5, dy - a * 1.5, a, a * 3);
    // botones A y B
    ctx.fillStyle = '#9a2257';
    for (const [bx, by] of [[w * 0.8, h * 0.86], [w * 0.9, h * 0.83]]) {
      ctx.beginPath();
      ctx.arc(bx, by, a * 0.75, 0, Math.PI * 2);
      ctx.fill();
    }
    // rejilla del altavoz
    ctx.save();
    ctx.translate(w * 0.86, h * 0.96);
    ctx.rotate(-Math.PI / 6);
    ctx.fillStyle = 'rgba(60, 60, 70, 0.45)';
    for (let i = 0; i < 6; i++) roundRect(ctx, i * a * 0.45, -a * 1.2, a * 0.18, a * 1.6, a * 0.09), ctx.fill();
    ctx.restore();
  },

  drawBoard(ctx, size, cell) {
    const pad = cell * 0.3;
    // bisel oscuro de la pantalla, con la esquina inferior derecha más redondeada
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = cell * 0.3;
    ctx.shadowOffsetY = cell * 0.08;
    const x0 = -pad;
    const y0 = -pad;
    const W = size + pad * 2;
    const r1 = cell * 0.18;
    const r2 = cell * 0.7;
    ctx.beginPath();
    ctx.moveTo(x0 + r1, y0);
    ctx.lineTo(x0 + W - r1, y0);
    ctx.arcTo(x0 + W, y0, x0 + W, y0 + r1, r1);
    ctx.lineTo(x0 + W, y0 + W - r2);
    ctx.arcTo(x0 + W, y0 + W, x0 + W - r2, y0 + W, r2);
    ctx.lineTo(x0 + r1, y0 + W);
    ctx.arcTo(x0, y0 + W, x0, y0 + W - r1, r1);
    ctx.lineTo(x0, y0 + r1);
    ctx.arcTo(x0, y0, x0 + r1, y0, r1);
    ctx.closePath();
    ctx.fillStyle = '#5a5c6c';
    ctx.fill();
    ctx.restore();
    // LED de encendido
    ctx.save();
    ctx.shadowColor = '#ff3a3a';
    ctx.shadowBlur = cell * 0.2;
    ctx.fillStyle = '#ff3a3a';
    ctx.beginPath();
    ctx.arc(-pad * 0.5, size * 0.3, cell * 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // pantalla LCD
    const e = cell * 0.08;
    ctx.fillStyle = G[2];
    ctx.fillRect(-e, -e, size + e * 2, size + e * 2);
    for (let y = 0; y < 8; y++)
      for (let x = 0; x < 8; x++) {
        ctx.fillStyle = (x + y) % 2 ? G[3] : '#94b40f';
        ctx.fillRect(x * cell, y * cell, cell, cell);
        // rejilla de puntos del LCD
        ctx.fillStyle = 'rgba(48, 98, 48, 0.18)';
        const d = Math.max(1, Math.round(cell / N));
        ctx.fillRect(x * cell, y * cell, cell, d);
        ctx.fillRect(x * cell, y * cell, d, cell);
      }
  },

  drawBlock(ctx, s, color, variant) {
    lowRes(ctx, s, s, N, N, (c) => {
      if (variant === 'ghost') return ghost(c);
      tile(c, variant === 'stone' ? 'stone' : kindOf(color));
    });
  },

  drawGem(ctx, s) {
    lowRes(ctx, s, s, N, N, (c) => {
      const rows = ['....00....', '...0330...', '..033330..', '.03333320.', '..033320..', '...0320...', '....00....'];
      rows.forEach((row, y) => {
        for (let x = 0; x < row.length; x++) if (row[x] !== '.') px(c, x + 1, y + 2, Number(row[x]));
      });
    });
  },

  drawTarget(ctx, s) {
    lowRes(ctx, s, s, N, N, (c) => {
      for (let i = 3; i <= 8; i++) {
        px(c, i, i, 0);
        px(c, 11 - i, i, 0);
      }
      px(c, 5, 5, 3);
      px(c, 6, 6, 3);
    });
  },

  particles: {
    draw(ctx, s, color) {
      const k = kindOf(color);
      ctx.fillStyle = k === 'heart' || k === 'star' || k === 'target' ? G[1] : G[0];
      ctx.fillRect(0, 0, s, s);
      ctx.fillStyle = G[3];
      ctx.fillRect(s * 0.25, s * 0.25, s * 0.25, s * 0.25);
    },
    perCell: 4,
    size: [0.16, 0.26],
    speed: [3, 7],
    gravity: 16,
    life: [0.4, 0.75],
    blend: 'normal',
    spin: false,
    shrink: false,
  },

  sound: {
    root: 60,
    scale: [0, 2, 4, 5, 7, 9, 11],
    blip: 'square',
    sparkle: 'square',
    thump: 0.5,
    music: {
      bpm: 150,
      progression: [0, 5, 3, 4],
      pad: 'square',
      lead: 'square',
      bass: 'triangle',
      leadDensity: 0.6,
      padGain: 0.012,
      leadGain: 0.03,
      bassGain: 0.11,
      filter: 4000,
      reverb: 0.05,
      echo: 0.1,
      hats: true,
    },
  },
};

export default gameboy;
