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
  face(ctx, s, vg(ctx, s, '#ffd6d6', '#ffaaaa'), ST);
  // fresa enorme
  ctx.beginPath();
  ctx.moveTo(0.5 * s, 0.98 * s);
  ctx.bezierCurveTo(0.0, 0.6 * s, 0.0, 0.18 * s, 0.5 * s, 0.2 * s);
  ctx.bezierCurveTo(1.0 * s, 0.18 * s, 1.0 * s, 0.6 * s, 0.5 * s, 0.98 * s);
  ctx.closePath();
  paint(ctx, s, rg(ctx, s, 0.38, 0.4, 0.65, [[0, '#ff6a6a'], [0.6, '#d8202e'], [1, '#8a0a14']]), '#5a0a0a', 0.028);
  // pepitas
  ctx.fillStyle = '#ffe680';
  for (let row = 0; row < 6; row++) {
    const y = 0.32 + row * 0.11;
    const half = 0.34 - row * 0.05;
    for (let k = 0; k < 5; k++) {
      const x = 0.5 - half + (k + (row % 2) * 0.5) * (half * 2) / 5;
      if (x < 0.5 - half || x > 0.5 + half) continue;
      ell(ctx, s, x, y, 0.014, 0.022);
      ctx.fill();
    }
  }
  // hojas
  ctx.fillStyle = '#3fae3a';
  ctx.strokeStyle = '#1a5a1a';
  ctx.lineWidth = s * 0.02;
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i - 2) * 0.55;
    ctx.save();
    ctx.translate(0.5 * s, 0.22 * s);
    ctx.rotate(a + Math.PI / 2);
    ctx.beginPath();
    ctx.ellipse(0, s * 0.09, s * 0.05, s * 0.11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  ctx.fillStyle = '#2f8a2a';
  ctx.fillRect(0.47 * s, 0.02 * s, 0.06 * s, 0.14 * s);
  ell(ctx, s, 0.34, 0.42, 0.06, 0.03, -0.8);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fill();
  finish(ctx, s, ST);
}

function grape(ctx: Ctx, s: number) {
  face(ctx, s, vg(ctx, s, '#e8d8ff', '#bfa0f0'), ST);
  // racimo
  const balls: Array<[number, number]> = [
    [0.22, 0.3], [0.42, 0.28], [0.62, 0.28], [0.8, 0.32],
    [0.32, 0.48], [0.52, 0.47], [0.72, 0.5],
    [0.2, 0.62], [0.42, 0.66], [0.62, 0.67], [0.82, 0.66],
    [0.32, 0.84], [0.52, 0.86], [0.72, 0.84],
  ];
  for (const [x, y] of balls) {
    circ(ctx, s, x, y, 0.13);
    paint(ctx, s, rg(ctx, s, x - 0.04, y - 0.05, 0.16, [[0, '#d0a0ff'], [0.5, '#8a3fc8'], [1, '#4a1478']]), '#2a0a48', 0.02);
    circ(ctx, s, x - 0.04, y - 0.05, 0.025);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fill();
  }
  // tallo y hojita
  ctx.strokeStyle = '#6a4a20';
  ctx.lineWidth = s * 0.04;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0.5 * s, 0.18 * s);
  ctx.quadraticCurveTo(0.52 * s, 0.08 * s, 0.6 * s, 0.04 * s);
  ctx.stroke();
  ell(ctx, s, 0.72, 0.12, 0.13, 0.06, -0.3);
  paint(ctx, s, '#5fbf3a', '#1f5a1a', 0.02);
  finish(ctx, s, ST);
}

function citrus(ctx: Ctx, s: number, peel: string, rind: string, pulp: string, pulpDark: string, inkc: string) {
  face(ctx, s, peel, ST);
  circ(ctx, s, 0.5, 0.5, 0.47);
  ctx.fillStyle = rind;
  ctx.fill();
  circ(ctx, s, 0.5, 0.5, 0.41);
  ctx.fillStyle = '#fffbe8';
  ctx.fill();
  // gajos
  ctx.save();
  ctx.translate(s / 2, s / 2);
  for (let i = 0; i < 9; i++) {
    const a0 = (i / 9) * Math.PI * 2 + 0.06;
    const a1 = ((i + 1) / 9) * Math.PI * 2 - 0.06;
    ctx.beginPath();
    ctx.moveTo(Math.cos((a0 + a1) / 2) * s * 0.04, Math.sin((a0 + a1) / 2) * s * 0.04);
    ctx.arc(0, 0, s * 0.37, a0, a1);
    ctx.closePath();
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 0.37);
    g.addColorStop(0, shade(pulp, 0.3));
    g.addColorStop(1, pulpDark);
    ctx.fillStyle = g;
    ctx.fill();
  }
  // vesículas de jugo
  const r = rng(peel.length * 7);
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = s * 0.012;
  for (let i = 0; i < 26; i++) {
    const a = r() * Math.PI * 2;
    const rr = (0.1 + r() * 0.25) * s;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    ctx.lineTo(Math.cos(a) * (rr + s * 0.04), Math.sin(a) * (rr + s * 0.04));
    ctx.stroke();
  }
  ctx.restore();
  circ(ctx, s, 0.5, 0.5, 0.47);
  ctx.strokeStyle = inkc;
  ctx.lineWidth = s * 0.02;
  ctx.stroke();
  finish(ctx, s, ST);
}

const orange = (ctx: Ctx, s: number) => citrus(ctx, s, '#ffcf8a', '#ff8a10', '#ff9a2a', '#f07010', '#a04a00');
const lemon = (ctx: Ctx, s: number) => citrus(ctx, s, '#fff6b0', '#f5d010', '#ffe85a', '#f2d020', '#8a7a00');

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
  face(ctx, s, vg(ctx, s, '#d8e2ff', '#a6b8f0'), ST);
  const balls: Array<[number, number, number]> = [
    [0.28, 0.28, 0.22], [0.72, 0.28, 0.22], [0.28, 0.72, 0.22], [0.72, 0.72, 0.22], [0.5, 0.5, 0.2],
  ];
  for (const [x, y, r] of balls) {
    circ(ctx, s, x, y, r);
    paint(ctx, s, rg(ctx, s, x - r * 0.3, y - r * 0.3, r * 1.3, [[0, '#9ab0ff'], [0.5, '#3d5fd1'], [1, '#1a2a78']]), '#0e1640', 0.022);
    // pruina (capa blanquecina) y coronita
    circ(ctx, s, x - r * 0.3, y - r * 0.35, r * 0.35);
    ctx.fillStyle = 'rgba(220, 230, 255, 0.35)';
    ctx.fill();
    ctx.save();
    ctx.translate(x * s, y * s);
    ctx.fillStyle = '#1a2050';
    for (let i = 0; i < 5; i++) {
      ctx.rotate((Math.PI * 2) / 5);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(s * 0.02, -s * 0.045);
      ctx.lineTo(-s * 0.02, -s * 0.045);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
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
