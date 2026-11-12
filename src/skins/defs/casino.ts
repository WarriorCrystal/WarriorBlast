import { roundRect, shade, star } from '../draw';
import { cells, circ, face, finish, ghostTile, kinds, paint, poly, rg, rng, vg } from '../tiles';
import type { Ctx, SkinDef } from '../types';

/**
 * CASINO — mesa de paño verde con luces doradas. Cada bloque llena todo el cuadrado:
 *   rojo → dado · blanco → carta (as de picas) · dorado → 7 de la suerte
 *   azul → ficha azul · violeta → ficha violeta · naranja → campana de tragamonedas
 *   celeste → diamante · piedra → placa "BAR"
 * Explota en monedas y destellos dorados.
 */

const C = {
  dice: '#d8263a',
  card: '#f4f1e8',
  seven: '#f5c331',
  chipBlue: '#2f5fd8',
  chipViolet: '#8a3fd0',
  bell: '#ff8a2a',
  diamond: '#3fd0e0',
  stone: '#4a4a52',
};
type Kind = keyof typeof C;
const kindOf = kinds(C, 'dice');

const INK = '#1a1008';
const GOLD = '#f5c331';
const ST = { ink: INK, depth: 'rgba(0, 0, 0, 0.5)', shine: 0.25 };

function dice(ctx: Ctx, s: number) {
  // dado rojo translúcido de casino
  face(ctx, s, rg(ctx, s, 0.35, 0.3, 0.85, [[0, '#ff7a8a'], [0.55, '#d8263a'], [1, '#7a0a18']]), { ...ST, rad: 0.18 });
  const pip = (x: number, y: number) => {
    circ(ctx, s, x, y, 0.085);
    ctx.fillStyle = rg(ctx, s, x - 0.02, y - 0.02, 0.1, [[0, '#ffffff'], [1, '#d8dce4']]);
    ctx.fill();
    ctx.strokeStyle = 'rgba(80, 0, 10, 0.5)';
    ctx.lineWidth = s * 0.012;
    ctx.stroke();
  };
  for (const [x, y] of [[0.26, 0.26], [0.74, 0.26], [0.5, 0.5], [0.26, 0.74], [0.74, 0.74]]) pip(x, y);
  finish(ctx, s, { ...ST, rad: 0.18, shine: 0.3 });
}

function spade(ctx: Ctx, s: number, x: number, y: number, k: number) {
  ctx.beginPath();
  ctx.moveTo(x * s, (y - k) * s);
  ctx.bezierCurveTo((x + k * 1.3) * s, (y - k * 0.1) * s, (x + k * 0.9) * s, (y + k * 0.9) * s, x * s, (y + k * 0.35) * s);
  ctx.bezierCurveTo((x - k * 0.9) * s, (y + k * 0.9) * s, (x - k * 1.3) * s, (y - k * 0.1) * s, x * s, (y - k) * s);
  ctx.closePath();
  ctx.fill();
  poly(ctx, s, [[x, y + k * 0.2], [x + k * 0.35, y + k * 1.05], [x - k * 0.35, y + k * 1.05]]);
  ctx.fill();
}

function card(ctx: Ctx, s: number) {
  face(ctx, s, vg(ctx, s, '#ffffff', '#e8e2d2'), { ...ST, rad: 0.1 });
  // marco interior
  roundRect(ctx, s * 0.12, s * 0.12, s * 0.76, s * 0.76, s * 0.06);
  ctx.strokeStyle = 'rgba(180, 30, 40, 0.35)';
  ctx.lineWidth = s * 0.015;
  ctx.stroke();
  ctx.fillStyle = '#16161c';
  spade(ctx, s, 0.5, 0.46, 0.26);
  // "A" en las esquinas
  ctx.font = `bold ${s * 0.2}px Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('A', s * 0.2, s * 0.21);
  ctx.save();
  ctx.translate(s * 0.8, s * 0.79);
  ctx.rotate(Math.PI);
  ctx.fillText('A', 0, 0);
  ctx.restore();
  finish(ctx, s, { ...ST, rad: 0.1, shine: 0.1 });
}

function seven(ctx: Ctx, s: number) {
  face(ctx, s, rg(ctx, s, 0.4, 0.35, 0.8, [[0, '#fff2a8'], [0.5, GOLD], [1, '#a8740a']]), ST);
  // rayos de fondo
  ctx.save();
  ctx.translate(s / 2, s / 2);
  ctx.fillStyle = 'rgba(255, 255, 220, 0.35)';
  for (let i = 0; i < 12; i++) {
    ctx.rotate(Math.PI / 6);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-s * 0.08, -s * 0.8);
    ctx.lineTo(s * 0.08, -s * 0.8);
    ctx.fill();
  }
  ctx.restore();
  // el 7 grande y rojo con contorno
  ctx.font = `900 ${s * 0.92}px "Arial Black", Impact, Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = s * 0.1;
  ctx.strokeText('7', s * 0.5, s * 0.55);
  ctx.strokeStyle = '#5a0a0a';
  ctx.lineWidth = s * 0.05;
  ctx.strokeText('7', s * 0.5, s * 0.55);
  const g = ctx.createLinearGradient(0, s * 0.15, 0, s * 0.95);
  g.addColorStop(0, '#ff5a5a');
  g.addColorStop(1, '#a8101a');
  ctx.fillStyle = g;
  ctx.fillText('7', s * 0.5, s * 0.55);
  finish(ctx, s, ST);
}

function chip(ctx: Ctx, s: number, col: string, value: string) {
  face(ctx, s, shade(col, -0.45), { ...ST, rad: 0.18 });
  // ficha que ocupa todo el cuadrado
  circ(ctx, s, 0.5, 0.5, 0.47);
  ctx.fillStyle = rg(ctx, s, 0.4, 0.38, 0.6, [[0, shade(col, 0.35)], [0.7, col], [1, shade(col, -0.35)]]);
  ctx.fill();
  // muescas blancas del canto
  ctx.save();
  ctx.translate(s / 2, s / 2);
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 8; i++) {
    ctx.rotate(Math.PI / 4);
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.47, -0.14, 0.14);
    ctx.arc(0, 0, s * 0.35, 0.14, -0.14, true);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  // anillo dorado punteado e interior
  circ(ctx, s, 0.5, 0.5, 0.3);
  ctx.fillStyle = shade(col, 0.15);
  ctx.fill();
  ctx.setLineDash([s * 0.03, s * 0.025]);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = s * 0.025;
  circ(ctx, s, 0.5, 0.5, 0.26);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.font = `900 ${s * 0.2}px "Arial Black", Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(value, s * 0.5, s * 0.52);
  circ(ctx, s, 0.5, 0.5, 0.47);
  ctx.strokeStyle = shade(col, -0.55);
  ctx.lineWidth = s * 0.025;
  ctx.stroke();
  finish(ctx, s, { ...ST, rad: 0.18, shine: 0.2 });
}

const chipBlue = (ctx: Ctx, s: number) => chip(ctx, s, C.chipBlue, '50');
const chipViolet = (ctx: Ctx, s: number) => chip(ctx, s, C.chipViolet, '100');

function bell(ctx: Ctx, s: number) {
  face(ctx, s, vg(ctx, s, '#ffe4c0', '#ffb070'), ST);
  // campana dorada-naranja grande
  ctx.beginPath();
  ctx.moveTo(s * 0.5, s * 0.08);
  ctx.bezierCurveTo(s * 0.2, s * 0.1, s * 0.22, s * 0.5, s * 0.14, s * 0.7);
  ctx.quadraticCurveTo(s * 0.02, s * 0.82, s * 0.1, s * 0.84);
  ctx.lineTo(s * 0.9, s * 0.84);
  ctx.quadraticCurveTo(s * 0.98, s * 0.82, s * 0.86, s * 0.7);
  ctx.bezierCurveTo(s * 0.78, s * 0.5, s * 0.8, s * 0.1, s * 0.5, s * 0.08);
  ctx.closePath();
  paint(ctx, s, rg(ctx, s, 0.38, 0.32, 0.7, [[0, '#ffe6a0'], [0.5, '#ff9a2a'], [1, '#b8500a']]), '#5a2400', 0.03);
  // badajo y aro
  circ(ctx, s, 0.5, 0.88, 0.08);
  paint(ctx, s, '#ffcc4a', '#5a2400', 0.025);
  circ(ctx, s, 0.5, 0.07, 0.05);
  paint(ctx, s, '#ffcc4a', '#5a2400', 0.02);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.beginPath();
  ctx.ellipse(s * 0.36, s * 0.38, s * 0.04, s * 0.14, 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(90, 36, 0, 0.35)';
  ctx.fillRect(s * 0.16, s * 0.66, s * 0.68, s * 0.04);
  finish(ctx, s, ST);
}

function diamond(ctx: Ctx, s: number) {
  face(ctx, s, rg(ctx, s, 0.5, 0.5, 0.75, [[0, '#1a4a5a'], [1, '#0a1a24']]), ST);
  // brillante talla clásica, enorme
  const top = 0.18;
  const mid = 0.38;
  const bot = 0.94;
  const facets: Array<[Array<[number, number]>, string]> = [
    [[[0.28, top], [0.72, top], [0.62, mid], [0.38, mid]], '#c8faff'],
    [[[0.28, top], [0.38, mid], [0.04, mid]], '#7ae8f4'],
    [[[0.72, top], [0.96, mid], [0.62, mid]], '#5ad8e8'],
    [[[0.04, mid], [0.38, mid], [0.5, bot]], '#3fd0e0'],
    [[[0.38, mid], [0.62, mid], [0.5, bot]], '#a0f4ff'],
    [[[0.62, mid], [0.96, mid], [0.5, bot]], '#1fa8c0'],
  ];
  for (const [pts, col] of facets) {
    poly(ctx, s, pts);
    paint(ctx, s, col, '#0a3a48', 0.016);
  }
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = '#ffffff';
  ctx.shadowBlur = s * 0.1;
  star(ctx, s * 0.36, s * 0.27, s * 0.09, s * 0.015, 4);
  ctx.fill();
  star(ctx, s * 0.8, s * 0.6, s * 0.06, s * 0.012, 4);
  ctx.fill();
  ctx.restore();
  finish(ctx, s, ST);
}

function bar(ctx: Ctx, s: number) {
  face(ctx, s, vg(ctx, s, '#6a6a74', '#2a2a32'), { ...ST, rad: 0.1 });
  roundRect(ctx, s * 0.08, s * 0.32, s * 0.84, s * 0.36, s * 0.06);
  paint(ctx, s, vg(ctx, s, '#1a1a20', '#000000', 0.32, 0.68), '#c8c8d0', 0.02);
  ctx.font = `900 ${s * 0.26}px "Arial Black", Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#d8d8e0';
  ctx.fillText('BAR', s * 0.5, s * 0.52);
  finish(ctx, s, { ...ST, rad: 0.1, shine: 0.15 });
}

const DRAW: Record<Kind, (ctx: Ctx, s: number) => void> = {
  dice,
  card,
  seven,
  chipBlue,
  chipViolet,
  bell,
  diamond,
  stone: bar,
};

function coin(ctx: Ctx, s: number) {
  ctx.beginPath();
  ctx.arc(s / 2, s / 2, s * 0.44, 0, Math.PI * 2);
  const g = ctx.createRadialGradient(s * 0.38, s * 0.36, 0, s / 2, s / 2, s * 0.5);
  g.addColorStop(0, '#fff6c0');
  g.addColorStop(0.5, '#f5c331');
  g.addColorStop(1, '#a8740a');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = '#7a5008';
  ctx.lineWidth = Math.max(1, s * 0.07);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(s / 2, s / 2, s * 0.28, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(122, 80, 8, 0.6)';
  ctx.lineWidth = Math.max(1, s * 0.05);
  ctx.stroke();
}

const casino: SkinDef = {
  id: 'casino',
  name: { es: 'Casino', en: 'Casino' },
  description: {
    es: 'Fichas, dados, cartas y el 7 de la suerte sobre paño verde. ¡Lluvia de monedas!',
    en: 'Chips, dice, cards and lucky 7s on green felt. A shower of coins!',
  },
  price: 1800,
  order: 5.6,
  blocks: [C.dice, C.card, C.seven, C.chipBlue, C.chipViolet, C.bell, C.diamond, C.stone],
  ui: {
    bg: '#0a3a24',
    panel: 'rgba(14, 50, 32, 0.95)',
    panelBorder: GOLD,
    text: '#fff6dc',
    textDim: '#c8d8b0',
    accent: GOLD,
    accent2: '#e8303f',
    good: '#4fe08a',
    danger: '#ff4a5a',
    radius: 12,
    font: '"Georgia", "Palatino Linotype", serif',
    titleGlow: '0 0 14px rgba(245, 195, 49, 0.85), 0 2px 0 rgba(0,0,0,0.6)',
    swatches: [C.dice, '#e8e2d2', C.seven, C.chipBlue, C.chipViolet, C.bell, C.diamond],
  },
  blockMargin: 0.08,
  flash: '#fff2b0',
  explosion: { power: 1.35, ring: GOLD, rings: 2, screenFlash: true },

  drawBackground(ctx, w, h) {
    // paño verde
    const g = ctx.createRadialGradient(w / 2, h * 0.45, 0, w / 2, h * 0.45, Math.max(w, h) * 0.75);
    g.addColorStop(0, '#1a8a4f');
    g.addColorStop(0.6, '#0e5a32');
    g.addColorStop(1, '#05301a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // textura de fieltro
    const r = rng(4);
    for (let i = 0; i < (w * h) / 40; i++) {
      ctx.fillStyle = r() > 0.5 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.05)';
      ctx.fillRect(r() * w, r() * h, 1.5, 1.5);
    }
    // arco dorado de la mesa
    ctx.strokeStyle = 'rgba(245, 195, 49, 0.4)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(w / 2, h * 1.05, w * 0.75, h * 0.35, 0, Math.PI, Math.PI * 2);
    ctx.stroke();
    // luces doradas (bokeh)
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 24; i++) {
      const x = r() * w;
      const y = r() * h * 0.55;
      const rr = 10 + r() * 40;
      const lg = ctx.createRadialGradient(x, y, 0, x, y, rr);
      lg.addColorStop(0, 'rgba(255, 210, 90, 0.35)');
      lg.addColorStop(1, 'rgba(255, 210, 90, 0)');
      ctx.fillStyle = lg;
      ctx.fillRect(x - rr, y - rr, rr * 2, rr * 2);
    }
    ctx.globalCompositeOperation = 'source-over';
    // fila de bombillas arriba
    for (let x = 12; x < w; x += 28) {
      ctx.fillStyle = 'rgba(255, 220, 120, 0.9)';
      ctx.beginPath();
      ctx.arc(x, 10, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  },

  drawBoard(ctx, size, cell) {
    const pad = cell * 0.3;
    // baranda de madera caoba con filete dorado
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = cell * 0.5;
    ctx.shadowOffsetY = cell * 0.12;
    roundRect(ctx, -pad, -pad, size + pad * 2, size + pad * 2, cell * 0.4);
    ctx.fillStyle = '#4a1a10';
    ctx.fill();
    ctx.restore();
    const rail = ctx.createLinearGradient(0, -pad, 0, size + pad);
    rail.addColorStop(0, '#8a3a22');
    rail.addColorStop(1, '#3a1208');
    roundRect(ctx, -pad, -pad, size + pad * 2, size + pad * 2, cell * 0.4);
    ctx.fillStyle = rail;
    ctx.fill();
    roundRect(ctx, -pad * 0.45, -pad * 0.45, size + pad * 0.9, size + pad * 0.9, cell * 0.26);
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = Math.max(1.5, cell * 0.05);
    ctx.stroke();
    ctx.fillStyle = '#0e5a32';
    ctx.fill();
    cells(ctx, cell, (x, y, px, py) => {
      const i = cell * 0.07;
      roundRect(ctx, px + i, py + i, cell - i * 2, cell - i * 2, cell * 0.14);
      ctx.fillStyle = (x + y) % 2 ? '#127040' : '#106438';
      ctx.fill();
      ctx.strokeStyle = 'rgba(245, 195, 49, 0.18)';
      ctx.lineWidth = Math.max(1, cell * 0.02);
      ctx.stroke();
    });
  },

  drawBlock(ctx, s, color, variant) {
    if (variant === 'ghost') return ghostTile(ctx, s, 0.14, 'rgba(245,195,49,0.2)', 'rgba(255,225,120,0.9)');
    DRAW[variant === 'stone' ? 'stone' : kindOf(color)](ctx, s);
  },

  drawGem(ctx, s) {
    ctx.save();
    ctx.translate(s * 0.2, s * 0.2);
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = s * 0.06;
    coin(ctx, s * 0.6);
    ctx.restore();
  },

  drawTarget(ctx, s) {
    // trébol dorado de la suerte
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = s * 0.06;
    ctx.fillStyle = GOLD;
    for (const [x, y] of [[0.5, 0.33], [0.35, 0.52], [0.65, 0.52]]) {
      circ(ctx, s, x, y, 0.12);
      ctx.fill();
    }
    poly(ctx, s, [[0.5, 0.5], [0.58, 0.78], [0.42, 0.78]]);
    ctx.fill();
    ctx.restore();
  },

  particles: {
    draw(ctx, s, color) {
      if (kindOf(color) === 'diamond' || kindOf(color) === 'card') {
        ctx.fillStyle = '#fff6c0';
        star(ctx, s / 2, s / 2, s * 0.5, s * 0.1, 4);
        ctx.fill();
      } else coin(ctx, s);
    },
    perCell: 6,
    size: [0.18, 0.32],
    speed: [3, 8],
    gravity: 11,
    life: [0.6, 1.2],
    blend: 'normal',
    spin: true,
    shrink: false,
  },

  ambient: {
    count: 14,
    draw(ctx, s) {
      star(ctx, s / 2, s / 2, s * 0.5, s * 0.1, 4);
      ctx.fillStyle = '#ffe9a0';
      ctx.fill();
    },
    size: [5, 12],
    speed: [-6, -14],
    alpha: [0.3, 0.8],
    blend: 'add',
  },

  sound: {
    // salón de casino: campanitas brillantes y lounge de jazz suave
    root: 62,
    scale: [0, 2, 4, 7, 9, 11],
    blip: 'sine',
    sparkle: 'sine',
    thump: 0.4,
    music: {
      bpm: 116,
      progression: [0, 4, 1, 3],
      pad: 'sawtooth',
      lead: 'sine',
      bass: 'triangle',
      leadDensity: 0.4,
      padGain: 0.03,
      leadGain: 0.04,
      bassGain: 0.11,
      filter: 1500,
      reverb: 0.35,
      echo: 0.3,
      hats: true,
    },
  },
};

export default casino;
