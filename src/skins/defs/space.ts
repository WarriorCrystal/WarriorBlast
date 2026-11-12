import { drawGemIcon, rgba, roundRect, shade, star } from '../draw';
import { cells, circ, ell, face, finish, ghostTile, kinds, rg, rng, vg } from '../tiles';
import type { Ctx, SkinDef } from '../types';

/**
 * ESPACIO — cada bloque es una ventanilla cuadrada de nave espacial con marco de metal
 * del color de la pieza; a través del vidrio se ve, ocupando todo el cuadrado:
 *   rojo → superficie de Marte · naranja → bandas de un gigante gaseoso
 *   amarillo → plasma solar con protuberancia · azul → huracán sobre un océano
 *   celeste → luna de hielo agrietada · violeta → anillos planetarios de cerca
 *   rosa → nebulosa · piedra → asteroide
 * Fondo: el borde de un planeta enorme visto desde la órbita.
 */

const C = {
  mars: '#e2553c',
  gas: '#ff9a3c',
  sun: '#ffd23f',
  earth: '#3f8cff',
  ice: '#46d6e6',
  rings: '#9b5cf0',
  nebula: '#f06ab0',
  stone: '#6a6478',
};
type Kind = keyof typeof C;
const kindOf = kinds(C, 'mars');

const INK = '#07051a';
const RAD = 0.12;
const ST = { ink: INK, depth: 'rgba(0,0,0,0.55)', shine: 0, rad: RAD };
const F = 0.08; // grosor del marco (fracción de s)

/** Abre la ventanilla: el contenido se dibuja a sangre en todo el cuadrado. */
function open(ctx: Ctx, s: number, fill: string | CanvasGradient) {
  face(ctx, s, fill, ST);
}

/** Cierra la ventanilla: reflejo del vidrio, marco de metal coloreado y remaches. */
function close(ctx: Ctx, s: number, metal: string) {
  // reflejo diagonal en el vidrio
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.beginPath();
  ctx.moveTo(s * 0.1, s * 0.62);
  ctx.lineTo(s * 0.62, s * 0.1);
  ctx.lineTo(s * 0.78, s * 0.1);
  ctx.lineTo(s * 0.1, s * 0.78);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.beginPath();
  ctx.moveTo(s * 0.1, s * 0.9);
  ctx.lineTo(s * 0.9, s * 0.1);
  ctx.lineTo(s * 0.9, s * 0.18);
  ctx.lineTo(s * 0.18, s * 0.9);
  ctx.closePath();
  ctx.fill();
  // sombra interior del marco
  const i = s * 0.05;
  ctx.strokeStyle = 'rgba(0,0,0,0.28)';
  ctx.lineWidth = s * (F + 0.025) * 2;
  roundRect(ctx, i, i, s - i * 2, s - i * 2, s * RAD);
  ctx.stroke();
  // marco metálico
  const g = ctx.createLinearGradient(0, 0, s, s);
  g.addColorStop(0, shade(metal, 0.55));
  g.addColorStop(0.45, metal);
  g.addColorStop(1, shade(metal, -0.5));
  ctx.strokeStyle = g;
  ctx.lineWidth = s * F * 2;
  roundRect(ctx, i, i, s - i * 2, s - i * 2, s * RAD);
  ctx.stroke();
  finish(ctx, s, ST);
  // canto interior brillante
  const k = s * (0.05 + F);
  roundRect(ctx, k, k, s - k * 2, s - k * 2, s * 0.05);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = Math.max(1, s * 0.012);
  ctx.stroke();
  // remaches
  for (const [x, y] of [[0.1, 0.1], [0.9, 0.1], [0.1, 0.9], [0.9, 0.9]]) {
    circ(ctx, s, x, y, 0.022);
    ctx.fillStyle = shade(metal, 0.7);
    ctx.fill();
    circ(ctx, s, x + 0.006, y + 0.006, 0.012);
    ctx.fillStyle = shade(metal, -0.55);
    ctx.fill();
  }
}

function stars(ctx: Ctx, s: number, seed: number, n: number) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const x = r() * s;
    const y = r() * s;
    const z = s * (0.005 + r() * 0.01);
    ctx.fillStyle = `rgba(255,255,255,${0.5 + r() * 0.5})`;
    ctx.fillRect(x, y, z, z);
  }
}

function mars(ctx: Ctx, s: number) {
  open(ctx, s, vg(ctx, s, '#f08a5a', '#8a2a14'));
  // dunas onduladas
  const r = rng(3);
  for (let k = 0; k < 7; k++) {
    const y = 0.12 + k * 0.13;
    ctx.beginPath();
    ctx.moveTo(0, y * s);
    for (let x = 0; x <= 1.0001; x += 0.1) ctx.lineTo(x * s, (y + Math.sin(x * 7 + k * 1.7) * 0.025) * s);
    ctx.lineTo(s, (y + 0.06) * s);
    ctx.lineTo(0, (y + 0.06) * s);
    ctx.closePath();
    ctx.fillStyle = k % 2 ? 'rgba(120, 30, 10, 0.25)' : 'rgba(255, 190, 140, 0.18)';
    ctx.fill();
  }
  // cráteres en perspectiva
  for (const [x, y, w] of [[0.3, 0.32, 0.12], [0.7, 0.55, 0.16], [0.36, 0.76, 0.09], [0.78, 0.22, 0.07]]) {
    ell(ctx, s, x, y, w, w * 0.55);
    ctx.fillStyle = 'rgba(80, 15, 5, 0.55)';
    ctx.fill();
    ell(ctx, s, x, y + w * 0.12, w * 0.85, w * 0.4);
    ctx.fillStyle = 'rgba(255, 170, 120, 0.35)';
    ctx.fill();
  }
  for (let i = 0; i < 30; i++) {
    ctx.fillStyle = 'rgba(60, 10, 0, 0.35)';
    ctx.fillRect(r() * s, r() * s, s * 0.012, s * 0.012);
  }
  close(ctx, s, '#e2553c');
}

function gas(ctx: Ctx, s: number) {
  open(ctx, s, vg(ctx, s, '#ffd29a', '#c9601c'));
  const bands = ['#ffe0b0', '#f2a456', '#ffcf8f', '#d9772f', '#f7b871', '#b85a22', '#ffd6a0', '#e08a3c'];
  bands.forEach((c, i) => {
    ctx.beginPath();
    const y0 = i * 0.13 - 0.02;
    ctx.moveTo(0, y0 * s);
    for (let k = 0; k <= 10; k++) ctx.lineTo((k / 10) * s, (y0 + Math.sin(k * 1.1 + i * 2) * 0.018) * s);
    ctx.lineTo(s, (y0 + 0.15) * s);
    ctx.lineTo(0, (y0 + 0.15) * s);
    ctx.closePath();
    ctx.fillStyle = c;
    ctx.fill();
  });
  // remolinos
  ctx.strokeStyle = 'rgba(255, 240, 210, 0.45)';
  ctx.lineWidth = s * 0.018;
  for (const [x, y] of [[0.28, 0.3], [0.7, 0.86]]) {
    ctx.beginPath();
    ctx.ellipse(x * s, y * s, s * 0.08, s * 0.03, 0, 0.3, Math.PI * 1.7);
    ctx.stroke();
  }
  // gran tormenta
  ell(ctx, s, 0.6, 0.58, 0.2, 0.1);
  ctx.fillStyle = '#c2452a';
  ctx.fill();
  ell(ctx, s, 0.6, 0.58, 0.13, 0.06);
  ctx.fillStyle = '#e8724a';
  ctx.fill();
  ell(ctx, s, 0.58, 0.57, 0.06, 0.025);
  ctx.fillStyle = '#ffb08a';
  ctx.fill();
  close(ctx, s, '#ff9a3c');
}

function sun(ctx: Ctx, s: number) {
  open(ctx, s, rg(ctx, s, 0.5, 0.5, 0.75, [[0, '#fff6b0'], [0.5, '#ffb42a'], [1, '#e2560f']]));
  // granulación del plasma (celdas)
  const r = rng(5);
  for (let i = 0; i < 38; i++) {
    const x = r();
    const y = r();
    const rr = 0.04 + r() * 0.05;
    circ(ctx, s, x, y, rr);
    ctx.fillStyle = rg(ctx, s, x, y, rr, [[0, 'rgba(255, 250, 200, 0.55)'], [0.7, 'rgba(255, 200, 60, 0.15)'], [1, 'rgba(200, 70, 0, 0.35)']]);
    ctx.fill();
  }
  // protuberancia en arco
  ctx.save();
  ctx.shadowColor = '#fff2a0';
  ctx.shadowBlur = s * 0.08;
  ctx.lineCap = 'round';
  for (const [w, c] of [[0.09, 'rgba(255, 120, 20, 0.9)'], [0.04, 'rgba(255, 245, 190, 0.95)']] as Array<[number, string]>) {
    ctx.strokeStyle = c;
    ctx.lineWidth = s * w;
    ctx.beginPath();
    ctx.moveTo(s * 0.16, s * 0.92);
    ctx.bezierCurveTo(s * 0.12, s * 0.3, s * 0.82, s * 0.28, s * 0.74, s * 0.92);
    ctx.stroke();
  }
  ctx.restore();
  // mancha solar
  ell(ctx, s, 0.66, 0.32, 0.07, 0.05);
  ctx.fillStyle = 'rgba(120, 30, 0, 0.6)';
  ctx.fill();
  ell(ctx, s, 0.66, 0.32, 0.035, 0.025);
  ctx.fillStyle = 'rgba(60, 10, 0, 0.8)';
  ctx.fill();
  close(ctx, s, '#f5b81f');
}

function earth(ctx: Ctx, s: number) {
  open(ctx, s, vg(ctx, s, '#2a7fe0', '#0e3a8a'));
  // costa en la esquina
  ctx.beginPath();
  ctx.moveTo(0, s * 0.62);
  ctx.bezierCurveTo(s * 0.14, s * 0.6, s * 0.2, s * 0.78, s * 0.3, s * 0.82);
  ctx.bezierCurveTo(s * 0.38, s * 0.86, s * 0.4, s * 0.96, s * 0.46, s);
  ctx.lineTo(0, s);
  ctx.closePath();
  ctx.fillStyle = vg(ctx, s, '#6fbf4a', '#a88a4a', 0.6, 1);
  ctx.fill();
  ctx.strokeStyle = 'rgba(160, 230, 255, 0.6)';
  ctx.lineWidth = s * 0.015;
  ctx.stroke();
  // huracán en espiral
  ctx.save();
  ctx.translate(s * 0.6, s * 0.42);
  ctx.lineCap = 'round';
  for (let arm = 0; arm < 3; arm++) {
    ctx.beginPath();
    for (let t = 0; t <= 1.0001; t += 0.04) {
      const a = t * Math.PI * 2.4 + (arm * Math.PI * 2) / 3;
      const rr = s * (0.04 + t * 0.4);
      const x = Math.cos(a) * rr;
      const y = Math.sin(a) * rr * 0.9;
      if (t === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = s * 0.07;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = s * 0.12;
    ctx.stroke();
  }
  ctx.restore();
  // ojo del huracán
  circ(ctx, s, 0.6, 0.42, 0.035);
  ctx.fillStyle = '#1f5fc8';
  ctx.fill();
  close(ctx, s, '#3f8cff');
}

function ice(ctx: Ctx, s: number) {
  open(ctx, s, rg(ctx, s, 0.35, 0.3, 0.9, [[0, '#f0ffff'], [0.5, '#a8eef6'], [1, '#3aa8c8']]));
  // placas de hielo con grietas
  const r = rng(12);
  const lines: Array<Array<[number, number]>> = [
    [[0, 0.3], [0.2, 0.34], [0.34, 0.5], [0.52, 0.48], [0.66, 0.62], [0.82, 0.6], [1, 0.72]],
    [[0.44, 0], [0.4, 0.18], [0.34, 0.5], [0.24, 0.7], [0.3, 0.86], [0.26, 1]],
    [[0.66, 0.62], [0.7, 0.82], [0.84, 1]],
    [[0.52, 0.48], [0.68, 0.3], [0.86, 0.24], [1, 0.08]],
    [[0, 0.82], [0.14, 0.78], [0.24, 0.7]],
  ];
  for (const pts of lines) {
    ctx.beginPath();
    pts.forEach(([x, y], k) => (k ? ctx.lineTo(x * s, y * s) : ctx.moveTo(x * s, y * s)));
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(20, 90, 140, 0.7)';
    ctx.lineWidth = s * 0.03;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = s * 0.01;
    ctx.stroke();
  }
  // placas con tonos distintos
  ctx.fillStyle = 'rgba(40, 150, 200, 0.18)';
  ctx.beginPath();
  ctx.moveTo(0.34 * s, 0.5 * s);
  ctx.lineTo(0.52 * s, 0.48 * s);
  ctx.lineTo(0.66 * s, 0.62 * s);
  ctx.lineTo(0.7 * s, 0.82 * s);
  ctx.lineTo(0.84 * s, s);
  ctx.lineTo(0.26 * s, s);
  ctx.lineTo(0.3 * s, 0.86 * s);
  ctx.lineTo(0.24 * s, 0.7 * s);
  ctx.closePath();
  ctx.fill();
  // escarcha
  for (let i = 0; i < 22; i++) {
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    star(ctx, r() * s, r() * s, s * (0.012 + r() * 0.018), s * 0.004, 4);
    ctx.fill();
  }
  close(ctx, s, '#46d6e6');
}

function rings(ctx: Ctx, s: number) {
  open(ctx, s, '#120a2a');
  stars(ctx, s, 8, 14);
  // anillos de cerca: franjas diagonales de partículas con huecos
  ctx.save();
  ctx.translate(s / 2, s / 2);
  ctx.rotate(-0.5);
  const bands: Array<[number, number, string]> = [
    [-0.62, 0.16, '#5a2fa0'],
    [-0.44, 0.2, '#b88af0'],
    [-0.22, 0.05, '#e8d4ff'],
    [-0.14, 0.24, '#9b5cf0'],
    [0.14, 0.04, '#120a2a'],
    [0.2, 0.18, '#c9a2ff'],
    [0.4, 0.1, '#7a40d0'],
    [0.52, 0.2, '#d8c0ff'],
  ];
  for (const [y, h, c] of bands) {
    ctx.fillStyle = c;
    ctx.fillRect(-s, y * s, s * 2, h * s);
  }
  const r = rng(4);
  for (let i = 0; i < 140; i++) {
    ctx.fillStyle = r() > 0.5 ? 'rgba(255,255,255,0.45)' : 'rgba(40, 10, 80, 0.35)';
    const z = s * (0.008 + r() * 0.014);
    ctx.fillRect((r() - 0.5) * s * 1.6, (r() - 0.5) * s * 1.3, z * 2, z);
  }
  ctx.restore();
  close(ctx, s, '#9b5cf0');
}

function nebula(ctx: Ctx, s: number) {
  open(ctx, s, '#160622');
  ctx.globalCompositeOperation = 'lighter';
  const r = rng(9);
  const cols = ['#f06ab0', '#a040e0', '#ff9ad0', '#5a40e0', '#ff6a8a'];
  for (let i = 0; i < 16; i++) {
    const x = r();
    const y = r();
    const rr = 0.18 + r() * 0.3;
    ctx.fillStyle = rg(ctx, s, x, y, rr, [[0, rgba(cols[i % cols.length], 0.45)], [1, rgba(cols[i % cols.length], 0)]]);
    ctx.fillRect(0, 0, s, s);
  }
  ctx.globalCompositeOperation = 'source-over';
  // filamentos oscuros de polvo
  ctx.strokeStyle = 'rgba(20, 0, 30, 0.45)';
  ctx.lineWidth = s * 0.05;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, s * 0.7);
  ctx.bezierCurveTo(s * 0.3, s * 0.5, s * 0.5, s * 0.9, s, s * 0.6);
  ctx.stroke();
  stars(ctx, s, 10, 18);
  ctx.save();
  ctx.shadowColor = '#ffffff';
  ctx.shadowBlur = s * 0.08;
  ctx.fillStyle = '#ffffff';
  star(ctx, s * 0.36, s * 0.36, s * 0.12, s * 0.018, 4);
  ctx.fill();
  star(ctx, s * 0.72, s * 0.72, s * 0.07, s * 0.012, 4);
  ctx.fill();
  ctx.restore();
  close(ctx, s, '#f06ab0');
}

function asteroid(ctx: Ctx, s: number) {
  open(ctx, s, vg(ctx, s, '#8a8496', '#3e3a48'));
  const spots: Array<[number, number, number]> = [[0.28, 0.28, 0.1], [0.7, 0.32, 0.07], [0.5, 0.62, 0.13], [0.22, 0.74, 0.06], [0.8, 0.78, 0.08]];
  for (const [x, y, rr] of spots) {
    circ(ctx, s, x, y, rr);
    ctx.fillStyle = 'rgba(25, 20, 35, 0.5)';
    ctx.fill();
    circ(ctx, s, x - rr * 0.2, y - rr * 0.2, rr * 0.72);
    ctx.fillStyle = 'rgba(170, 165, 185, 0.35)';
    ctx.fill();
  }
  close(ctx, s, '#7a7488');
}

const DRAW: Record<Kind, (ctx: Ctx, s: number) => void> = {
  mars,
  gas,
  sun,
  earth,
  ice,
  rings,
  nebula,
  stone: asteroid,
};

const space: SkinDef = {
  id: 'space',
  name: { es: 'Espacio', en: 'Outer Space' },
  description: {
    es: 'Ventanillas de una nave con vista a Marte, soles, huracanes, hielo, anillos y nebulosas. Explotan como supernovas.',
    en: 'Spaceship portholes looking out on Mars, suns, hurricanes, ice, rings and nebulas. They burst like supernovas.',
  },
  price: 1300,
  order: 5,
  // Desactivada por ahora (se conserva para más adelante).
  disabled: true,
  blocks: [C.mars, C.gas, C.sun, C.earth, C.ice, C.rings, C.nebula, C.stone],
  ui: {
    bg: '#0a0820',
    panel: 'rgba(20, 18, 44, 0.92)',
    panelBorder: 'rgba(150, 170, 220, 0.45)',
    text: '#eef2ff',
    textDim: '#a0a8cc',
    accent: '#ffd23f',
    accent2: '#46d6e6',
    good: '#5fe08a',
    danger: '#ff5a6a',
    radius: 10,
    glass: true,
    font: '"Segoe UI", "Helvetica Neue", Arial, sans-serif',
    titleGlow: '0 0 16px rgba(70, 214, 230, 0.7), 0 0 4px rgba(255, 210, 63, 0.6)',
  },
  blockMargin: 0.08,
  flash: '#fff4d6',
  explosion: { power: 1.5, ring: '#ffe7a8', rings: 2, screenFlash: true },

  drawBackground(ctx, w, h) {
    ctx.fillStyle = '#05041a';
    ctx.fillRect(0, 0, w, h);
    const m = Math.max(w, h);
    const r = rng(77);
    // nebulosa tenue
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 10; i++) {
      const x = r() * w;
      const y = r() * h * 0.7;
      const rr = m * (0.15 + r() * 0.25);
      const g = ctx.createRadialGradient(x, y, 0, x, y, rr);
      const c = ['#3a2a9a', '#8a2a8a', '#1a5a9a'][i % 3];
      g.addColorStop(0, rgba(c, 0.18));
      g.addColorStop(1, rgba(c, 0));
      ctx.fillStyle = g;
      ctx.fillRect(x - rr, y - rr, rr * 2, rr * 2);
    }
    ctx.globalCompositeOperation = 'source-over';
    // estrellas
    for (let i = 0; i < (w * h) / 700; i++) {
      const x = r() * w;
      const y = r() * h;
      const z = r() < 0.93 ? 1 : 2;
      ctx.fillStyle = `rgba(255,255,255,${0.3 + r() * 0.7})`;
      ctx.fillRect(x, y, z, z);
    }
    // borde de un planeta enorme abajo, visto desde la órbita
    const R = Math.max(w * 1.4, h * 0.9);
    const cx = w * 0.5;
    const cy = h + R * 0.82;
    const atm = ctx.createRadialGradient(cx, cy, R * 0.98, cx, cy, R * 1.08);
    atm.addColorStop(0, 'rgba(90, 180, 255, 0.9)');
    atm.addColorStop(1, 'rgba(90, 180, 255, 0)');
    ctx.fillStyle = atm;
    ctx.beginPath();
    ctx.arc(cx, cy, R * 1.08, 0, Math.PI * 2);
    ctx.fill();
    const pg = ctx.createLinearGradient(0, cy - R, 0, cy - R * 0.85);
    pg.addColorStop(0, '#2a6ad0');
    pg.addColorStop(1, '#081a40');
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fill();
    // nubes sobre el planeta
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 6;
    for (let k = 1; k < 5; k++) {
      ctx.beginPath();
      ctx.arc(cx, cy, R - k * 14, Math.PI * 1.2, Math.PI * 1.8);
      ctx.stroke();
    }
    ctx.restore();
    // un sol lejano
    const sx = w * 0.84;
    const sy = h * 0.12;
    const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, m * 0.12);
    sg.addColorStop(0, 'rgba(255, 250, 220, 1)');
    sg.addColorStop(0.08, 'rgba(255, 230, 150, 0.9)');
    sg.addColorStop(1, 'rgba(255, 200, 100, 0)');
    ctx.fillStyle = sg;
    ctx.fillRect(sx - m * 0.12, sy - m * 0.12, m * 0.24, m * 0.24);
  },

  drawBoard(ctx, size, cell) {
    const pad = cell * 0.24;
    // panel de la estación: acero oscuro con esquineras y filo luminoso
    ctx.save();
    ctx.shadowColor = 'rgba(70, 214, 230, 0.35)';
    ctx.shadowBlur = cell * 0.5;
    roundRect(ctx, -pad, -pad, size + pad * 2, size + pad * 2, cell * 0.18);
    ctx.fillStyle = '#1a1c2a';
    ctx.fill();
    ctx.restore();
    const steel = ctx.createLinearGradient(0, -pad, 0, size + pad);
    steel.addColorStop(0, '#3a3e52');
    steel.addColorStop(1, '#1a1c28');
    roundRect(ctx, -pad, -pad, size + pad * 2, size + pad * 2, cell * 0.18);
    ctx.fillStyle = steel;
    ctx.fill();
    roundRect(ctx, -pad * 0.4, -pad * 0.4, size + pad * 0.8, size + pad * 0.8, cell * 0.1);
    ctx.fillStyle = '#0a0b16';
    ctx.fill();
    ctx.strokeStyle = 'rgba(70, 214, 230, 0.7)';
    ctx.lineWidth = Math.max(1, cell * 0.03);
    ctx.stroke();
    // esquineras
    ctx.fillStyle = '#ffd23f';
    const L = cell * 0.7;
    const T = cell * 0.08;
    for (const [x, y, sx, sy] of [[-pad, -pad, 1, 1], [size + pad, -pad, -1, 1], [-pad, size + pad, 1, -1], [size + pad, size + pad, -1, -1]]) {
      ctx.fillRect(x, y, sx * L, sy * T);
      ctx.fillRect(x, y, sx * T, sy * L);
    }
    cells(ctx, cell, (x, y, px, py) => {
      const i = cell * 0.06;
      roundRect(ctx, px + i, py + i, cell - i * 2, cell - i * 2, cell * 0.1);
      ctx.fillStyle = (x + y) % 2 ? '#141628' : '#111324';
      ctx.fill();
      ctx.strokeStyle = 'rgba(120, 160, 220, 0.14)';
      ctx.lineWidth = Math.max(1, cell * 0.02);
      ctx.stroke();
    });
  },

  drawBlock(ctx, s, color, variant) {
    if (variant === 'ghost') return ghostTile(ctx, s, RAD, 'rgba(120,220,240,0.18)', 'rgba(160,235,250,0.9)');
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
      const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.25, rgba(color, 0.9));
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
      g.addColorStop(0.3, 'rgba(200,220,255,0.6)');
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
