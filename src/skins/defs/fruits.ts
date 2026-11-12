import { roundRect, shade } from '../draw';
import { cells, circ, dots, ell, face, finish, ghostTile, kinds, paint, rg, rng, vg } from '../tiles';
import type { Ctx, SkinDef } from '../types';

/**
 * FRUTAS — cada bloque es una fruta (o un corte de fruta) que llena todo el cuadrado:
 *   rosa → sandía · rojo → fresa · violeta → uvas · naranja → naranja en rodaja
 *   amarillo → limón · verde → kiwi · azul → arándanos · piedra → coco
 * Tabla de madera sobre un fondo fresco; explotan en salpicaduras de jugo.
 */

const C = {
  melon: '#ff4f6d',
  berry: '#d8202e',
  grape: '#8a3fc8',
  orange: '#ff9420',
  lemon: '#ffe03a',
  kiwi: '#7cc242',
  blue: '#3d5fd1',
  stone: '#8a6242',
};
type Kind = keyof typeof C;
const kindOf = kinds(C, 'melon');

const INK = '#2a1a10';
const ST = { ink: INK, depth: 'rgba(40, 20, 0, 0.35)', shine: 0.25 };

function seed(ctx: Ctx, s: number, x: number, y: number, a: number, col = '#1a1008') {
  ell(ctx, s, x, y, 0.022, 0.035, a);
  ctx.fillStyle = col;
  ctx.fill();
}

function melon(ctx: Ctx, s: number) {
  // corte de sandía: pulpa roja con cáscara verde abajo
  face(ctx, s, rg(ctx, s, 0.5, 0.25, 0.8, [[0, '#ff8a9a'], [0.7, '#ff4f6d'], [1, '#e8304f']]), ST);
  ctx.beginPath();
  ctx.moveTo(0, 0.78 * s);
  ctx.quadraticCurveTo(0.5 * s, 0.86 * s, s, 0.78 * s);
  ctx.lineTo(s, s);
  ctx.lineTo(0, s);
  ctx.closePath();
  ctx.fillStyle = '#eafbd0';
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, 0.85 * s);
  ctx.quadraticCurveTo(0.5 * s, 0.93 * s, s, 0.85 * s);
  ctx.lineTo(s, s);
  ctx.lineTo(0, s);
  ctx.closePath();
  ctx.fillStyle = vg(ctx, s, '#4fae3a', '#24701f', 0.85, 1);
  ctx.fill();
  // semillas
  for (const [x, y, a] of [[0.25, 0.3, 0.3], [0.5, 0.22, 0], [0.75, 0.3, -0.3], [0.36, 0.5, 0.2], [0.64, 0.5, -0.2], [0.2, 0.62, 0.5], [0.5, 0.64, 0], [0.8, 0.62, -0.5]]) seed(ctx, s, x, y, a);
  finish(ctx, s, ST);
}

function berry(ctx: Ctx, s: number) {
  // piel de frutilla a todo el cuadrado, con las hojas cubriendo el borde de arriba
  face(ctx, s, rg(ctx, s, 0.4, 0.45, 0.8, [[0, '#ff6a6a'], [0.55, '#e0202e'], [1, '#8a0a14']]), ST);
  // semillas en hileras alternadas, cada una en su hoyito
  for (let row = 0; row < 7; row++) {
    const y = 0.3 + row * 0.12;
    for (let k = 0; k < 6; k++) {
      const x = 0.08 + k * 0.17 + (row % 2 ? 0.085 : 0);
      ell(ctx, s, x, y + 0.008, 0.03, 0.038);
      ctx.fillStyle = 'rgba(110, 0, 10, 0.45)';
      ctx.fill();
      ell(ctx, s, x, y, 0.016, 0.025);
      ctx.fillStyle = '#ffe680';
      ctx.fill();
    }
  }
  // corona de hojas a lo ancho
  ctx.beginPath();
  ctx.moveTo(-0.02 * s, 0);
  ctx.lineTo(1.02 * s, 0);
  const tips = 7;
  for (let i = tips; i >= 0; i--) {
    const x = i / tips;
    const xm = (i - 0.5) / tips;
    ctx.lineTo(x * s, (i % 2 ? 0.3 : 0.22) * s);
    if (i > 0) ctx.quadraticCurveTo(xm * s, 0.1 * s, ((i - 1) / tips) * s, ((i - 1) % 2 ? 0.3 : 0.22) * s);
  }
  ctx.closePath();
  paint(ctx, s, vg(ctx, s, '#7ad84a', '#2f8a2a', 0, 0.3), '#1a5a1a', 0.022);
  ctx.strokeStyle = 'rgba(20, 80, 20, 0.5)';
  ctx.lineWidth = s * 0.012;
  for (let i = 1; i < tips; i += 2) {
    ctx.beginPath();
    ctx.moveTo((i / tips) * s, 0.05 * s);
    ctx.lineTo((i / tips) * s, 0.26 * s);
    ctx.stroke();
  }
  ctx.fillStyle = '#3f7a1a';
  ctx.fillRect(0.46 * s, 0, 0.08 * s, 0.1 * s);
  ell(ctx, s, 0.26, 0.48, 0.1, 0.035, -0.5);
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fill();
  finish(ctx, s, ST);
}

/** Bayas redondas en cuadrícula n×n que llenan todo el cuadrado. */
function berryGrid(ctx: Ctx, s: number, n: number, bg: string, light: string, mid: string, dark: string, inkc: string, after?: (x: number, y: number, r: number) => void) {
  face(ctx, s, bg, ST);
  const step = 1 / n;
  const r = step * 0.56;
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      const x = step * (i + 0.5);
      const y = step * (j + 0.5);
      circ(ctx, s, x, y, r);
      paint(ctx, s, rg(ctx, s, x - r * 0.35, y - r * 0.4, r * 1.35, [[0, light], [0.5, mid], [1, dark]]), inkc, 0.02);
      circ(ctx, s, x - r * 0.35, y - r * 0.4, r * 0.2);
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.fill();
      after?.(x, y, r);
    }
}

function grape(ctx: Ctx, s: number) {
  berryGrid(ctx, s, 3, '#2a0a48', '#d8a8ff', '#8a3fc8', '#4a1478', '#2a0a48', (x, y, r) => {
    // pruina: velo blanquecino
    ell(ctx, s, x + r * 0.25, y + r * 0.3, r * 0.45, r * 0.3);
    ctx.fillStyle = 'rgba(230, 210, 255, 0.18)';
    ctx.fill();
  });
  // ramita arriba
  ctx.strokeStyle = '#6a4a20';
  ctx.lineWidth = s * 0.035;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0.5 * s, 0.22 * s);
  ctx.quadraticCurveTo(0.54 * s, 0.1 * s, 0.68 * s, 0.06 * s);
  ctx.stroke();
  ell(ctx, s, 0.8, 0.1, 0.12, 0.05, -0.3);
  paint(ctx, s, '#5fbf3a', '#1f5a1a', 0.018);
  finish(ctx, s, ST);
}

/** Rodaja cuadrada de cítrico: cáscara en el borde, gajos que llegan a las esquinas. */
function citrus(ctx: Ctx, s: number, rind: string, pith: string, pulp: string, pulpDark: string, seeds: boolean) {
  face(ctx, s, vg(ctx, s, shade(rind, 0.2), shade(rind, -0.15)), ST);
  roundRect(ctx, s * 0.1, s * 0.1, s * 0.8, s * 0.8, s * 0.1);
  ctx.fillStyle = pith;
  ctx.fill();
  ctx.save();
  roundRect(ctx, s * 0.14, s * 0.14, s * 0.72, s * 0.72, s * 0.07);
  ctx.clip();
  ctx.fillStyle = pith;
  ctx.fillRect(0, 0, s, s);
  ctx.translate(s / 2, s / 2);
  const n = 10;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2;
    const a1 = ((i + 1) / n) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a0) * s, Math.sin(a0) * s);
    ctx.lineTo(Math.cos(a1) * s, Math.sin(a1) * s);
    ctx.closePath();
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 0.5);
    g.addColorStop(0, shade(pulp, 0.35));
    g.addColorStop(0.6, pulp);
    g.addColorStop(1, pulpDark);
    ctx.fillStyle = g;
    ctx.fill();
  }
  // membranas blancas entre gajos
  ctx.strokeStyle = pith;
  ctx.lineWidth = s * 0.03;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * s, Math.sin(a) * s);
    ctx.stroke();
  }
  // vesículas de jugo
  const r = rng(rind.length * 13);
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = s * 0.012;
  ctx.lineCap = 'round';
  for (let i = 0; i < 40; i++) {
    const a = r() * Math.PI * 2;
    const d = (0.1 + r() * 0.3) * s;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * d, Math.sin(a) * d);
    ctx.lineTo(Math.cos(a) * (d + s * 0.05), Math.sin(a) * (d + s * 0.05));
    ctx.stroke();
  }
  if (seeds) {
    ctx.fillStyle = '#fffbe0';
    for (const a of [0.3, 2.2, 4.1]) {
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * s * 0.14, Math.sin(a) * s * 0.14, s * 0.02, s * 0.04, a + Math.PI / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.04, 0, Math.PI * 2);
  ctx.fillStyle = pith;
  ctx.fill();
  ctx.restore();
  // poros de la cáscara
  dots(ctx, s, 3, 14, 'rgba(255,255,255,0.3)', [0.006, 0.01], [0.02, 0.02, 0.98, 0.1]);
  finish(ctx, s, ST);
}

const orange = (ctx: Ctx, s: number) => citrus(ctx, s, '#ff8a10', '#fff2dc', '#ff9a2a', '#e86a08', false);
const lemon = (ctx: Ctx, s: number) => citrus(ctx, s, '#f5d010', '#fffbe8', '#ffe85a', '#f0cc18', true);

function kiwi(ctx: Ctx, s: number) {
  // rodaja de kiwi a todo el cuadrado con piel marrón en el borde
  face(ctx, s, '#8a6a3a', ST);
  roundRect(ctx, s * 0.09, s * 0.09, s * 0.82, s * 0.82, s * 0.12);
  ctx.fillStyle = rg(ctx, s, 0.5, 0.5, 0.55, [[0, '#f4ffd8'], [0.25, '#c8ec7a'], [0.7, '#7cc242'], [1, '#4f9a22']]);
  ctx.fill();
  // rayos claros
  ctx.save();
  ctx.translate(s / 2, s / 2);
  ctx.strokeStyle = 'rgba(240, 255, 210, 0.5)';
  ctx.lineWidth = s * 0.012;
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * s * 0.14, Math.sin(a) * s * 0.14);
    ctx.lineTo(Math.cos(a) * s * 0.38, Math.sin(a) * s * 0.38);
    ctx.stroke();
  }
  // corona de semillas
  ctx.fillStyle = '#1a1408';
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    ctx.beginPath();
    ctx.ellipse(Math.cos(a) * s * 0.2, Math.sin(a) * s * 0.2, s * 0.018, s * 0.032, a + Math.PI / 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ell(ctx, s, 0.5, 0.5, 0.1, 0.07);
  ctx.fillStyle = '#fbfff0';
  ctx.fill();
  finish(ctx, s, ST);
}

function blue(ctx: Ctx, s: number) {
  berryGrid(ctx, s, 2, '#0e1640', '#9ab0ff', '#3d5fd1', '#1a2a78', '#0e1640', (x, y, r) => {
    // pruina y coronita de cinco puntas
    ell(ctx, s, x + r * 0.2, y + r * 0.35, r * 0.5, r * 0.3);
    ctx.fillStyle = 'rgba(210, 225, 255, 0.2)';
    ctx.fill();
    ctx.save();
    ctx.translate(x * s, (y - r * 0.05) * s);
    circ(ctx, 1, 0, 0, r * s * 0.22);
    ctx.fillStyle = '#1a2050';
    ctx.fill();
    for (let i = 0; i < 5; i++) {
      ctx.rotate((Math.PI * 2) / 5);
      ctx.beginPath();
      ctx.moveTo(-r * s * 0.08, 0);
      ctx.lineTo(0, -r * s * 0.3);
      ctx.lineTo(r * s * 0.08, 0);
      ctx.closePath();
      ctx.fillStyle = '#2a3070';
      ctx.fill();
    }
    ctx.restore();
  });
  finish(ctx, s, ST);
}

function coconut(ctx: Ctx, s: number) {
  face(ctx, s, vg(ctx, s, '#a07850', '#5a3a20'), { ...ST, rad: 0.1 });
  // fibras
  const r = rng(44);
  ctx.strokeStyle = 'rgba(40, 20, 5, 0.45)';
  ctx.lineWidth = s * 0.012;
  for (let i = 0; i < 40; i++) {
    const x = r() * s;
    const y = r() * s;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (r() - 0.5) * s * 0.2, y + s * (0.05 + r() * 0.08));
    ctx.stroke();
  }
  // tres "ojitos"
  ctx.fillStyle = '#2a1608';
  for (const [x, y] of [[0.4, 0.42], [0.6, 0.42], [0.5, 0.58]]) {
    circ(ctx, s, x, y, 0.045);
    ctx.fill();
  }
  dots(ctx, s, 9, 6, 'rgba(255, 220, 170, 0.25)', [0.02, 0.04]);
  finish(ctx, s, { ...ST, rad: 0.1, shine: 0.12 });
}

const DRAW: Record<Kind, (ctx: Ctx, s: number) => void> = {
  melon,
  berry,
  grape,
  orange,
  lemon,
  kiwi,
  blue,
  stone: coconut,
};

/** Color del jugo según la fruta. */
const JUICE: Record<Kind, string> = {
  melon: '#ff4f6d',
  berry: '#e0283a',
  grape: '#9a4ad8',
  orange: '#ffa020',
  lemon: '#ffe83a',
  kiwi: '#8ad24a',
  blue: '#4a6ae0',
  stone: '#fff6e8',
};

const fruits: SkinDef = {
  id: 'fruits',
  name: { es: 'Frutas', en: 'Fruits' },
  description: {
    es: 'Sandía, fresa, uvas, naranja, limón, kiwi y arándanos. ¡Explotan en jugo!',
    en: 'Watermelon, strawberry, grapes, orange, lemon, kiwi and blueberries. Juicy splashes!',
  },
  price: 700,
  order: 5.3,
  blocks: [C.melon, C.berry, C.grape, C.orange, C.lemon, C.kiwi, C.blue, C.stone],
  ui: {
    bg: '#eafbe0',
    panel: 'rgba(255, 255, 248, 0.95)',
    panelBorder: '#a8dc80',
    text: '#2a3a14',
    textDim: '#6a7f50',
    accent: '#ff5a3a',
    accent2: '#3fae3a',
    good: '#2fae4f',
    danger: '#e02a3a',
    radius: 20,
    font: '"Segoe UI Rounded", "Arial Rounded MT Bold", "Nunito", "Segoe UI", system-ui, sans-serif',
    titleGlow: '0 3px 0 rgba(40, 110, 20, 0.3), 0 0 14px rgba(255, 200, 40, 0.6)',
  },
  blockMargin: 0.08,
  flash: '#fffbe0',
  explosion: { power: 1.2, ring: '#ffd23a', rings: 1, screenFlash: false },

  drawBackground(ctx, w, h) {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#f6ffd8');
    g.addColorStop(0.5, '#d8f6c0');
    g.addColorStop(1, '#ffe8c0');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // hojas dispersas
    const r = rng(23);
    for (let i = 0; i < Math.max(12, (w * h) / 26000); i++) {
      const x = r() * w;
      const y = r() * h;
      const sz = 14 + r() * 26;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(r() * Math.PI * 2);
      ctx.beginPath();
      ctx.ellipse(0, 0, sz, sz * 0.45, 0, 0, Math.PI * 2);
      ctx.fillStyle = r() > 0.5 ? 'rgba(90, 180, 60, 0.28)' : 'rgba(60, 150, 50, 0.22)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(40, 110, 30, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-sz, 0);
      ctx.lineTo(sz, 0);
      ctx.stroke();
      ctx.restore();
    }
    // gotitas de jugo
    for (let i = 0; i < (w * h) / 9000; i++) {
      ctx.fillStyle = ['rgba(255,80,100,0.18)', 'rgba(255,160,30,0.18)', 'rgba(255,230,60,0.22)'][i % 3];
      ctx.beginPath();
      ctx.arc(r() * w, r() * h, 3 + r() * 7, 0, Math.PI * 2);
      ctx.fill();
    }
  },

  drawBoard(ctx, size, cell) {
    const pad = cell * 0.26;
    // tabla de cortar de madera
    ctx.save();
    ctx.shadowColor = 'rgba(80, 50, 10, 0.4)';
    ctx.shadowBlur = cell * 0.45;
    ctx.shadowOffsetY = cell * 0.12;
    roundRect(ctx, -pad, -pad, size + pad * 2, size + pad * 2, cell * 0.35);
    ctx.fillStyle = '#c99a5a';
    ctx.fill();
    ctx.restore();
    ctx.save();
    roundRect(ctx, -pad, -pad, size + pad * 2, size + pad * 2, cell * 0.35);
    ctx.clip();
    const wg = ctx.createLinearGradient(-pad, 0, size + pad, 0);
    wg.addColorStop(0, '#d8a868');
    wg.addColorStop(0.5, '#e8bc80');
    wg.addColorStop(1, '#c8945a');
    ctx.fillStyle = wg;
    ctx.fillRect(-pad, -pad, size + pad * 2, size + pad * 2);
    ctx.strokeStyle = 'rgba(120, 70, 20, 0.22)';
    ctx.lineWidth = Math.max(1, cell * 0.025);
    const r = rng(5);
    for (let y = -pad; y < size + pad; y += cell * 0.22) {
      ctx.beginPath();
      ctx.moveTo(-pad, y);
      for (let x = -pad; x <= size + pad; x += cell) ctx.lineTo(x, y + (r() - 0.5) * cell * 0.08);
      ctx.stroke();
    }
    ctx.restore();
    cells(ctx, cell, (x, y, px, py) => {
      const i = cell * 0.07;
      roundRect(ctx, px + i, py + i, cell - i * 2, cell - i * 2, cell * 0.2);
      ctx.fillStyle = (x + y) % 2 ? 'rgba(120, 70, 20, 0.2)' : 'rgba(120, 70, 20, 0.14)';
      ctx.fill();
    });
  },

  drawBlock(ctx, s, color, variant) {
    if (variant === 'ghost') return ghostTile(ctx, s, 0.14, 'rgba(255,255,255,0.3)', 'rgba(80,160,40,0.9)');
    DRAW[variant === 'stone' ? 'stone' : kindOf(color)](ctx, s);
  },

  drawGem(ctx, s) {
    // cereza brillante
    ctx.strokeStyle = '#3a7a1a';
    ctx.lineWidth = Math.max(1.5, s * 0.04);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(s * 0.42, s * 0.55);
    ctx.quadraticCurveTo(s * 0.48, s * 0.25, s * 0.66, s * 0.2);
    ctx.stroke();
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = s * 0.06;
    circ(ctx, s, 0.42, 0.62, 0.16);
    ctx.fillStyle = rg(ctx, s, 0.38, 0.56, 0.18, [[0, '#ff8080'], [0.5, '#e01020'], [1, '#800010']]);
    ctx.fill();
    ctx.restore();
    circ(ctx, s, 0.37, 0.56, 0.04);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fill();
  },

  drawTarget(ctx, s) {
    // hojita verde
    ctx.save();
    ctx.translate(s / 2, s / 2);
    ctx.rotate(-0.6);
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = s * 0.05;
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.3, s * 0.15, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#4fc23a';
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(1.5, s * 0.035);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-s * 0.28, 0);
    ctx.lineTo(s * 0.28, 0);
    ctx.stroke();
    ctx.restore();
  },

  particles: {
    draw(ctx, s, color) {
      // gota de jugo
      const c = JUICE[kindOf(color)];
      ctx.beginPath();
      ctx.moveTo(s * 0.5, s * 0.05);
      ctx.bezierCurveTo(s * 0.85, s * 0.45, s * 0.85, s * 0.92, s * 0.5, s * 0.92);
      ctx.bezierCurveTo(s * 0.15, s * 0.92, s * 0.15, s * 0.45, s * 0.5, s * 0.05);
      ctx.fillStyle = c;
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(s * 0.4, s * 0.62, s * 0.08, s * 0.14, 0.3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fill();
    },
    perCell: 7,
    size: [0.14, 0.3],
    speed: [3, 8],
    gravity: 12,
    life: [0.5, 1.0],
    blend: 'normal',
    spin: true,
    shrink: true,
  },

  sound: {
    root: 65,
    scale: [0, 2, 4, 5, 7, 9],
    blip: 'sine',
    sparkle: 'triangle',
    thump: 0.35,
    music: {
      bpm: 112,
      progression: [0, 4, 5, 3],
      pad: 'triangle',
      lead: 'triangle',
      bass: 'sine',
      leadDensity: 0.45,
      padGain: 0.035,
      leadGain: 0.035,
      bassGain: 0.1,
      filter: 2400,
      reverb: 0.3,
      echo: 0.2,
      hats: true,
    },
  },
};

export default fruits;
