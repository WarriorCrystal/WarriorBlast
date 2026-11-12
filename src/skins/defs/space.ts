import { drawGemIcon, rgba, roundRect, shade, star } from '../draw';
import { cells, circ, dots, ell, face, finish, ghostTile, kinds, rg, rng, vg } from '../tiles';
import type { Ctx, SkinDef } from '../types';

/**
 * ESPACIO — cada bloque es un cuerpo celeste que llena todo el cuadrado:
 *   rojo → planeta rocoso · naranja → gigante gaseoso · amarillo → estrella
 *   azul → planeta océano · celeste → cometa · violeta → planeta con anillos
 *   rosa → galaxia espiral · piedra → asteroide
 * Fondo de nebulosa con estrellas y explosiones tipo supernova.
 */

const C = {
  rocky: '#e2553c',
  gas: '#ff9a3c',
  sun: '#ffd23f',
  ocean: '#3f8cff',
  comet: '#46d6e6',
  ringed: '#9b5cf0',
  galaxy: '#f06ab0',
  stone: '#6a6478',
};
type Kind = keyof typeof C;
const kindOf = kinds(C, 'rocky');

const INK = '#0b0820';
const ST = { ink: INK, depth: 'rgba(0,0,0,0.55)', shine: 0.12 };

/** Cielo oscuro teñido del color de la pieza, con estrellitas. */
function sky(ctx: Ctx, s: number, tint: string, seed: number) {
  face(ctx, s, rg(ctx, s, 0.5, 0.5, 0.75, [[0, shade(tint, -0.55)], [1, '#07051a']]), ST);
  dots(ctx, s, seed, 9, 'rgba(255,255,255,0.85)', [0.006, 0.014]);
}

/** Planeta esférico con sombreado de terminador. */
function sphere(ctx: Ctx, s: number, x: number, y: number, r: number, light: string, dark: string) {
  circ(ctx, s, x, y, r);
  ctx.fillStyle = rg(ctx, s, x - r * 0.35, y - r * 0.35, r * 1.5, [[0, light], [0.55, dark], [1, shade(dark.startsWith('#') ? dark : '#333333', -0.6)]]);
  ctx.fill();
}

function shadowSide(ctx: Ctx, s: number, x: number, y: number, r: number) {
  ctx.save();
  circ(ctx, s, x, y, r);
  ctx.clip();
  circ(ctx, s, x + r * 0.55, y + r * 0.45, r * 1.05);
  ctx.fillStyle = 'rgba(5, 3, 20, 0.45)';
  ctx.fill();
  ctx.restore();
  circ(ctx, s, x, y, r);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = Math.max(1, s * 0.015);
  ctx.stroke();
}

function rocky(ctx: Ctx, s: number) {
  sky(ctx, s, C.rocky, 1);
  sphere(ctx, s, 0.5, 0.52, 0.44, '#ff9a72', C.rocky);
  ctx.save();
  circ(ctx, s, 0.5, 0.52, 0.44);
  ctx.clip();
  // cráteres
  for (const [x, y, r] of [[0.34, 0.38, 0.08], [0.62, 0.62, 0.1], [0.68, 0.3, 0.05], [0.3, 0.7, 0.06], [0.5, 0.5, 0.04]]) {
    circ(ctx, s, x, y, r);
    ctx.fillStyle = 'rgba(110, 25, 10, 0.55)';
    ctx.fill();
    circ(ctx, s, x - r * 0.15, y - r * 0.15, r * 0.75);
    ctx.fillStyle = 'rgba(255, 170, 130, 0.35)';
    ctx.fill();
  }
  // casquete polar
  ell(ctx, s, 0.5, 0.1, 0.22, 0.07);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fill();
  ctx.restore();
  shadowSide(ctx, s, 0.5, 0.52, 0.44);
  finish(ctx, s, ST);
}

function gas(ctx: Ctx, s: number) {
  // un gigante tan grande que llena el bloque
  face(ctx, s, vg(ctx, s, '#ffd29a', '#c9601c'), ST);
  const bands = ['#ffe0b0', '#f2a456', '#ffcf8f', '#d9772f', '#f7b871', '#b85a22', '#ffd6a0', '#e08a3c'];
  bands.forEach((c, i) => {
    ctx.beginPath();
    const y0 = i * 0.13 - 0.02;
    ctx.moveTo(0, y0 * s);
    for (let k = 0; k <= 8; k++) ctx.lineTo((k / 8) * s, (y0 + Math.sin(k * 1.3 + i) * 0.015) * s);
    ctx.lineTo(s, (y0 + 0.14) * s);
    ctx.lineTo(0, (y0 + 0.14) * s);
    ctx.closePath();
    ctx.fillStyle = c;
    ctx.fill();
  });
  // gran tormenta ovalada
  ell(ctx, s, 0.64, 0.62, 0.15, 0.08);
  ctx.fillStyle = '#c2452a';
  ctx.fill();
  ell(ctx, s, 0.64, 0.62, 0.09, 0.045);
  ctx.fillStyle = '#e8724a';
  ctx.fill();
  // curvatura: oscurecer bordes
  ctx.fillStyle = rg(ctx, s, 0.35, 0.3, 0.95, [[0, 'rgba(255,255,255,0.15)'], [0.6, 'rgba(0,0,0,0)'], [1, 'rgba(40,10,0,0.55)']]);
  ctx.fillRect(0, 0, s, s);
  finish(ctx, s, ST);
}

function sun(ctx: Ctx, s: number) {
  face(ctx, s, rg(ctx, s, 0.5, 0.5, 0.72, [[0, '#fffbe0'], [0.35, '#ffe45c'], [0.75, '#ff9d1f'], [1, '#d9480f']]), { ...ST, shine: 0 });
  // corona en rayos
  ctx.save();
  ctx.translate(s / 2, s / 2);
  for (let i = 0; i < 16; i++) {
    ctx.rotate(Math.PI / 8);
    ctx.beginPath();
    ctx.moveTo(-s * 0.04, s * 0.28);
    ctx.lineTo(0, s * (i % 2 ? 0.5 : 0.6));
    ctx.lineTo(s * 0.04, s * 0.28);
    ctx.fillStyle = 'rgba(255, 245, 190, 0.55)';
    ctx.fill();
  }
  ctx.restore();
  circ(ctx, s, 0.5, 0.5, 0.27);
  ctx.fillStyle = rg(ctx, s, 0.44, 0.44, 0.3, [[0, '#ffffff'], [0.5, '#fff27a'], [1, '#ffb31f']]);
  ctx.fill();
  // granulado / manchas
  dots(ctx, s, 7, 7, 'rgba(230, 120, 10, 0.35)', [0.012, 0.025], [0.3, 0.3, 0.7, 0.7]);
  finish(ctx, s, { ...ST, shine: 0.1 });
}

function ocean(ctx: Ctx, s: number) {
  sky(ctx, s, C.ocean, 2);
  sphere(ctx, s, 0.5, 0.5, 0.45, '#8cc8ff', '#1f5fc8');
  ctx.save();
  circ(ctx, s, 0.5, 0.5, 0.45);
  ctx.clip();
  // continentes
  ctx.fillStyle = '#4fbf5a';
  for (const pts of [
    [[0.22, 0.3], [0.4, 0.22], [0.48, 0.36], [0.38, 0.5], [0.42, 0.62], [0.3, 0.66], [0.2, 0.48]],
    [[0.58, 0.18], [0.76, 0.26], [0.82, 0.42], [0.68, 0.46], [0.6, 0.34]],
    [[0.56, 0.6], [0.72, 0.58], [0.76, 0.76], [0.62, 0.84], [0.54, 0.74]],
  ] as Array<Array<[number, number]>>) {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * s, y * s) : ctx.moveTo(x * s, y * s)));
    ctx.closePath();
    ctx.fill();
  }
  // nubes
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineCap = 'round';
  ctx.lineWidth = s * 0.035;
  for (const [x, y, w] of [[0.25, 0.42, 0.2], [0.55, 0.52, 0.25], [0.4, 0.8, 0.2]]) {
    ctx.beginPath();
    ctx.moveTo(x * s, y * s);
    ctx.quadraticCurveTo((x + w / 2) * s, (y - 0.04) * s, (x + w) * s, y * s);
    ctx.stroke();
  }
  ctx.restore();
  shadowSide(ctx, s, 0.5, 0.5, 0.45);
  // atmósfera
  circ(ctx, s, 0.5, 0.5, 0.47);
  ctx.strokeStyle = 'rgba(140, 210, 255, 0.5)';
  ctx.lineWidth = s * 0.03;
  ctx.stroke();
  finish(ctx, s, ST);
}

function comet(ctx: Ctx, s: number) {
  sky(ctx, s, C.comet, 3);
  // cola diagonal ancha
  ctx.save();
  ctx.translate(s * 0.68, s * 0.32);
  ctx.rotate(Math.PI * 0.75);
  for (const [w, a, c] of [[0.36, 0.25, '#46d6e6'], [0.24, 0.45, '#9ff0ff'], [0.12, 0.7, '#ffffff']] as Array<[number, number, string]>) {
    const g = ctx.createLinearGradient(0, 0, s * 0.95, 0);
    g.addColorStop(0, rgba(c, a));
    g.addColorStop(1, rgba(c, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, -s * w * 0.35);
    ctx.quadraticCurveTo(s * 0.5, -s * w * 0.9, s * 1.0, -s * w);
    ctx.lineTo(s * 1.0, s * w);
    ctx.quadraticCurveTo(s * 0.5, s * w * 0.9, 0, s * w * 0.35);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  // núcleo
  ctx.save();
  ctx.shadowColor = '#9ff0ff';
  ctx.shadowBlur = s * 0.2;
  circ(ctx, s, 0.68, 0.32, 0.12);
  ctx.fillStyle = rg(ctx, s, 0.66, 0.3, 0.13, [[0, '#ffffff'], [0.5, '#c8faff'], [1, '#46d6e6']]);
  ctx.fill();
  ctx.restore();
  finish(ctx, s, ST);
}

function ringed(ctx: Ctx, s: number) {
  sky(ctx, s, C.ringed, 4);
  const ring = (front: boolean) => {
    ctx.save();
    ctx.translate(s * 0.5, s * 0.52);
    ctx.rotate(-0.38);
    ctx.beginPath();
    if (front) ctx.ellipse(0, 0, s * 0.62, s * 0.17, 0, 0, Math.PI);
    else ctx.ellipse(0, 0, s * 0.62, s * 0.17, 0, Math.PI, Math.PI * 2);
    ctx.lineWidth = s * 0.08;
    ctx.strokeStyle = front ? '#e8d4ff' : '#9d86c8';
    ctx.stroke();
    ctx.lineWidth = s * 0.015;
    ctx.strokeStyle = 'rgba(80, 40, 140, 0.6)';
    ctx.stroke();
    ctx.restore();
  };
  ring(false);
  sphere(ctx, s, 0.5, 0.52, 0.32, '#d6b4ff', '#6a2fc0');
  ctx.save();
  circ(ctx, s, 0.5, 0.52, 0.32);
  ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  for (const y of [0.36, 0.48, 0.6]) {
    ctx.save();
    ctx.translate(s * 0.5, s * y);
    ctx.rotate(-0.38);
    ctx.fillRect(-s * 0.5, -s * 0.025, s, s * 0.05);
    ctx.restore();
  }
  ctx.restore();
  shadowSide(ctx, s, 0.5, 0.52, 0.32);
  ring(true);
  finish(ctx, s, ST);
}

function galaxy(ctx: Ctx, s: number) {
  face(ctx, s, rg(ctx, s, 0.5, 0.5, 0.75, [[0, '#5a1a48'], [1, '#0d0620']]), ST);
  ctx.save();
  ctx.translate(s / 2, s / 2);
  ctx.globalCompositeOperation = 'lighter';
  const rand = rng(9);
  for (let i = 0; i < 260; i++) {
    const arm = i % 2;
    const t = rand();
    const a = t * Math.PI * 3.2 + arm * Math.PI;
    const r = t * s * 0.46;
    const j = (rand() - 0.5) * s * 0.08 * (1 + t);
    const x = Math.cos(a) * r + j;
    const y = Math.sin(a) * r * 0.85 + j;
    ctx.fillStyle = t < 0.2 ? 'rgba(255,240,250,0.9)' : rand() > 0.5 ? 'rgba(255,140,200,0.55)' : 'rgba(170,140,255,0.5)';
    ctx.beginPath();
    ctx.arc(x, y, s * (0.008 + rand() * 0.012), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();
  circ(ctx, s, 0.5, 0.5, 0.12);
  ctx.fillStyle = rg(ctx, s, 0.5, 0.5, 0.12, [[0, 'rgba(255,255,255,1)'], [0.4, 'rgba(255,190,230,0.8)'], [1, 'rgba(240,106,176,0)']]);
  ctx.fill();
  finish(ctx, s, ST);
}

function asteroid(ctx: Ctx, s: number) {
  face(ctx, s, vg(ctx, s, '#8a8496', '#3e3a48'), { ...ST, rad: 0.1 });
  const rand = rng(21);
  for (let i = 0; i < 9; i++) {
    const x = 0.12 + rand() * 0.76;
    const y = 0.12 + rand() * 0.76;
    const r = 0.04 + rand() * 0.07;
    circ(ctx, s, x, y, r);
    ctx.fillStyle = 'rgba(25, 20, 35, 0.5)';
    ctx.fill();
    circ(ctx, s, x - r * 0.2, y - r * 0.2, r * 0.7);
    ctx.fillStyle = 'rgba(170, 165, 185, 0.35)';
    ctx.fill();
  }
  finish(ctx, s, { ...ST, rad: 0.1 });
}

const DRAW: Record<Kind, (ctx: Ctx, s: number) => void> = {
  rocky,
  gas,
  sun,
  ocean,
  comet,
  ringed,
  galaxy,
  stone: asteroid,
};

const space: SkinDef = {
  id: 'space',
  name: { es: 'Espacio', en: 'Outer Space' },
  description: {
    es: 'Planetas, estrellas, cometas y galaxias sobre una nebulosa. Explotan como supernovas.',
    en: 'Planets, stars, comets and galaxies over a nebula. They burst like supernovas.',
  },
  price: 1300,
  order: 5,
  blocks: [C.rocky, C.gas, C.sun, C.ocean, C.comet, C.ringed, C.galaxy, C.stone],
  ui: {
    bg: '#0a0820',
    panel: 'rgba(20, 16, 50, 0.9)',
    panelBorder: 'rgba(160, 130, 255, 0.45)',
    text: '#f2eeff',
    textDim: '#a69fd0',
    accent: '#ffd23f',
    accent2: '#46d6e6',
    good: '#5fe08a',
    danger: '#ff5a6a',
    radius: 16,
    glass: true,
    font: '"Segoe UI", "Helvetica Neue", Arial, sans-serif',
    titleGlow: '0 0 16px rgba(160, 120, 255, 0.85), 0 0 4px rgba(255, 210, 63, 0.6)',
  },
  blockMargin: 0.08,
  flash: '#fff4d6',
  explosion: { power: 1.5, ring: '#ffe7a8', rings: 2, screenFlash: true },

  drawBackground(ctx, w, h) {
    ctx.fillStyle = '#07051a';
    ctx.fillRect(0, 0, w, h);
    const m = Math.max(w, h);
    // nubes de nebulosa
    ctx.globalCompositeOperation = 'lighter';
    const rand = rng(77);
    const cols = ['#6a2fc0', '#c2307a', '#1f6fd0', '#2fb3c0', '#8a2fb0'];
    for (let i = 0; i < 26; i++) {
      const x = rand() * w;
      const y = rand() * h;
      const r = m * (0.12 + rand() * 0.25);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, rgba(cols[i % cols.length], 0.16));
      g.addColorStop(1, rgba(cols[i % cols.length], 0));
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    ctx.globalCompositeOperation = 'source-over';
    // estrellas
    for (let i = 0; i < (w * h) / 900; i++) {
      const x = rand() * w;
      const y = rand() * h;
      const r = rand() < 0.92 ? 0.5 + rand() * 0.8 : 1.4 + rand();
      ctx.fillStyle = `rgba(255,255,255,${0.35 + rand() * 0.6})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      if (r > 1.6) {
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        star(ctx, x, y, r * 4, r * 0.4, 4);
        ctx.fill();
      }
    }
    // planeta lejano
    const px = w * 0.86;
    const py = h * 0.14;
    const pr = Math.min(w, h) * 0.09;
    const pg = ctx.createRadialGradient(px - pr * 0.4, py - pr * 0.4, 0, px, py, pr);
    pg.addColorStop(0, '#9fd8ff');
    pg.addColorStop(1, '#1d3a8a');
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fill();
  },

  drawBoard(ctx, size, cell) {
    const pad = cell * 0.22;
    ctx.save();
    ctx.shadowColor = 'rgba(140, 100, 255, 0.55)';
    ctx.shadowBlur = cell * 0.6;
    roundRect(ctx, -pad, -pad, size + pad * 2, size + pad * 2, cell * 0.35);
    ctx.fillStyle = 'rgba(12, 8, 34, 0.88)';
    ctx.fill();
    ctx.restore();
    roundRect(ctx, -pad, -pad, size + pad * 2, size + pad * 2, cell * 0.35);
    ctx.strokeStyle = 'rgba(180, 150, 255, 0.55)';
    ctx.lineWidth = Math.max(1.5, cell * 0.05);
    ctx.stroke();
    cells(ctx, cell, (x, y, px, py) => {
      const i = cell * 0.06;
      roundRect(ctx, px + i, py + i, cell - i * 2, cell - i * 2, cell * 0.16);
      ctx.fillStyle = (x + y) % 2 ? 'rgba(40, 30, 90, 0.55)' : 'rgba(30, 22, 72, 0.55)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(160, 140, 255, 0.12)';
      ctx.lineWidth = Math.max(1, cell * 0.02);
      ctx.stroke();
    });
  },

  drawBlock(ctx, s, color, variant) {
    if (variant === 'ghost') return ghostTile(ctx, s, 0.14, 'rgba(180,160,255,0.22)', 'rgba(220,210,255,0.9)');
    DRAW[variant === 'stone' ? 'stone' : kindOf(color)](ctx, s);
  },

  drawGem(ctx, s) {
    drawGemIcon(ctx, s, '#9ff0ff', '#ffffff');
  },

  drawTarget(ctx, s) {
    ctx.save();
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = s * 0.15;
    star(ctx, s / 2, s / 2, s * 0.3, s * 0.08, 4);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.restore();
    circ(ctx, s, 0.5, 0.5, 0.07);
    ctx.fillStyle = '#ffd23f';
    ctx.fill();
  },

  particles: {
    draw(ctx, s, color) {
      // destello de supernova
      const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.25, rgba(color.startsWith('#') ? color : '#ffd23f', 0.9));
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, s, s);
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      star(ctx, s / 2, s / 2, s * 0.5, s * 0.05, 4);
      ctx.fill();
    },
    perCell: 6,
    size: [0.25, 0.5],
    speed: [3, 9],
    gravity: 0,
    life: [0.6, 1.2],
    blend: 'add',
    spin: true,
    shrink: true,
  },

  ambient: {
    count: 18,
    draw(ctx, s) {
      const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.3, 'rgba(200,190,255,0.6)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, s, s);
    },
    size: [3, 8],
    speed: [-4, -12],
    alpha: [0.3, 0.8],
    blend: 'add',
  },

  sound: {
    root: 57,
    scale: [0, 2, 4, 6, 7, 9, 11],
    blip: 'sine',
    sparkle: 'sine',
    thump: 0.3,
    music: {
      bpm: 70,
      progression: [0, 5, 3, 1],
      pad: 'sawtooth',
      lead: 'sine',
      bass: 'sine',
      leadDensity: 0.22,
      padGain: 0.05,
      leadGain: 0.03,
      bassGain: 0.08,
      filter: 900,
      reverb: 0.7,
      echo: 0.5,
      hats: false,
    },
  },
};

export default space;
