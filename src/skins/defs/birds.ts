import { rgba, roundRect, shade } from '../draw';
import type { Ctx, SkinDef } from '../types';

/**
 * PÁJAROS Y CERDOS — dibujos animados de colores planos con contorno grueso y
 * brillo, cielo azul, colinas y estructuras de madera. Cada bloque es un personaje
 * entero visto de frente (todo el bloque es la cara):
 *   rojo → pájaro rojo · amarillo → pájaro amarillo veloz · negro → pájaro bomba
 *   azul → pájaros azules · verde → cerdito · lima → rey cerdo · madera → caja TNT
 * Las "piedras" son bloques de piedra; la gema es un huevo dorado y la diana un tirachinas.
 */

const RED = '#d8202a';
const YELLOW = '#f2d81e';
const BLACK = '#232327';
const BLUE = '#64aed6';
const PIG = '#7dc832';
const KING = '#9fda3a';
const TNT = '#c98a3e';
const STONE = '#8e949b';

const BLOCKS: SkinDef['blocks'] = [RED, YELLOW, BLACK, BLUE, PIG, KING, TNT, STONE];

const INK = '#1b1410';

function rng(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
}

function circle(ctx: Ctx, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
}

function ellipse(ctx: Ctx, x: number, y: number, rx: number, ry: number, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
}

/** Relleno con contorno de tinta (el trazo grueso del estilo de dibujo). */
function inked(ctx: Ctx, s: number, fill: string | CanvasGradient, w = 0.03) {
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = s * w;
  ctx.strokeStyle = INK;
  ctx.lineJoin = 'round';
  ctx.stroke();
}

const R = 0.26;

/** Cara del bloque: cuadrado muy redondeado con degradado brillante. Deja el recorte activo. */
function face(ctx: Ctx, s: number, color: string, r = R) {
  const i = s * 0.05;
  ctx.save();
  roundRect(ctx, i, i, s - i * 2, s - i * 2, s * r);
  const g = ctx.createRadialGradient(s * 0.35, s * 0.3, s * 0.05, s * 0.5, s * 0.5, s * 0.75);
  g.addColorStop(0, shade(color, 0.25));
  g.addColorStop(0.6, color);
  g.addColorStop(1, shade(color, -0.35));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();
}

/** Cierra el recorte, dibuja el contorno de tinta y el brillo superior. */
function finish(ctx: Ctx, s: number, r = R) {
  ctx.restore();
  const i = s * 0.05;
  roundRect(ctx, i, i, s - i * 2, s - i * 2, s * r);
  ctx.lineWidth = s * 0.045;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ellipse(ctx, s * 0.32, s * 0.17, s * 0.13, s * 0.045, -0.35);
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fill();
}

/** Polígono relleno a partir de puntos en fracción de bloque. */
function poly(ctx: Ctx, s: number, pts: number[][]) {
  ctx.beginPath();
  pts.forEach(([x, y], k) => (k === 0 ? ctx.moveTo(s * x, s * y) : ctx.lineTo(s * x, s * y)));
  ctx.closePath();
}

/** Ojo blanco con pupila; `lx`/`ly` desplazan la pupila (por defecto, mirando al frente). */
function eye(ctx: Ctx, s: number, x: number, y: number, r: number, lx = 0, ly = 0.1, pupil = 0.42) {
  circle(ctx, s * x, s * y, s * r);
  inked(ctx, s, '#ffffff', 0.02);
  circle(ctx, s * (x + r * lx), s * (y + r * ly), s * r * pupil);
  ctx.fillStyle = INK;
  ctx.fill();
}

/** Ceja: barra gruesa de (x0,y0) a (x1,y1) con grosor `t`. */
function brow(ctx: Ctx, s: number, x0: number, y0: number, x1: number, y1: number, t: number, color: string) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  const nx = (-dy / len) * t;
  const ny = (dx / len) * t;
  poly(ctx, s, [[x0, y0], [x1, y1], [x1 - nx, y1 - ny], [x0 - nx, y0 - ny]]);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = s * 0.012;
  ctx.strokeStyle = INK;
  ctx.stroke();
}

/** Pico de frente: pieza superior ancha en punta hacia abajo y mandíbula debajo. `open` lo abre. */
function frontBeak(ctx: Ctx, s: number, x: number, y: number, k: number, open = 0) {
  if (open > 0) {
    ellipse(ctx, s * x, s * (y + 0.08 * k), s * 0.1 * k, s * (0.04 + open) * k);
    inked(ctx, s, '#a8141e', 0.015);
  }
  // mandíbula
  poly(ctx, s, [[x - 0.12 * k, y + (0.03 + open) * k], [x + 0.12 * k, y + (0.03 + open) * k], [x, y + (0.15 + open) * k]]);
  inked(ctx, s, '#e8901a', 0.02);
  // pieza superior
  ctx.beginPath();
  ctx.moveTo(s * (x - 0.17 * k), s * (y - 0.02 * k));
  ctx.quadraticCurveTo(s * x, s * (y - 0.12 * k), s * (x + 0.17 * k), s * (y - 0.02 * k));
  ctx.lineTo(s * x, s * (y + 0.12 * k));
  ctx.closePath();
  inked(ctx, s, '#f7b228', 0.02);
}

/** Mechón de plumas con forma de hoja curvada. */
function plume(ctx: Ctx, s: number, x: number, y: number, len: number, ang: number, fill: string) {
  ctx.save();
  ctx.translate(s * x, s * y);
  ctx.rotate(ang);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(s * len * 0.35, -s * len * 0.5, s * len * 0.1, -s * len);
  ctx.quadraticCurveTo(-s * len * 0.25, -s * len * 0.45, 0, 0);
  ctx.closePath();
  inked(ctx, s, fill, 0.015);
  ctx.restore();
}

/** Pájaro rojo: cejas negras gruesas, manchas en las mejillas, plumas rojas arriba y barriga crema. */
function redBird(ctx: Ctx, s: number) {
  face(ctx, s, RED);
  ellipse(ctx, s * 0.5, s * 1.02, s * 0.5, s * 0.3);
  ctx.fillStyle = '#e8cfac';
  ctx.fill();
  ctx.fillStyle = shade(RED, -0.3);
  for (const x of [0.14, 0.86]) {
    ellipse(ctx, s * x, s * 0.6, s * 0.06, s * 0.09);
    ctx.fill();
  }
  ellipse(ctx, s * 0.22, s * 0.68, s * 0.035, s * 0.05);
  ctx.fill();
  plume(ctx, s, 0.44, 0.32, 0.3, -0.75, shade(RED, -0.08));
  plume(ctx, s, 0.48, 0.31, 0.32, -0.2, shade(RED, -0.08));
  eye(ctx, s, 0.36, 0.47, 0.11, 0.2);
  eye(ctx, s, 0.64, 0.47, 0.11, -0.2);
  brow(ctx, s, 0.16, 0.3, 0.5, 0.42, 0.1, INK);
  brow(ctx, s, 0.5, 0.42, 0.84, 0.3, 0.1, INK);
  frontBeak(ctx, s, 0.5, 0.63, 1.2);
  finish(ctx, s);
}

/** Pájaro amarillo: silueta triangular, cresta negra, cejas marrón rojizo, barriga blanca. */
function chuck(ctx: Ctx, s: number) {
  face(ctx, s, YELLOW, 0.18);
  ctx.fillStyle = shade(YELLOW, -0.16);
  poly(ctx, s, [[0, 0], [0.4, 0], [0, 0.8]]);
  ctx.fill();
  poly(ctx, s, [[1, 0], [0.6, 0], [1, 0.8]]);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  poly(ctx, s, [[0.62, 0.14], [0.68, 0.14], [0.86, 0.5], [0.8, 0.5]]);
  ctx.fill();
  ellipse(ctx, s * 0.5, s * 1.0, s * 0.5, s * 0.15);
  ctx.fillStyle = '#fbf7ea';
  ctx.fill();
  plume(ctx, s, 0.46, 0.3, 0.26, -0.7, INK);
  plume(ctx, s, 0.5, 0.29, 0.3, -0.05, INK);
  plume(ctx, s, 0.54, 0.3, 0.24, 0.6, INK);
  eye(ctx, s, 0.37, 0.52, 0.1, 0.2);
  eye(ctx, s, 0.63, 0.52, 0.1, -0.2);
  brow(ctx, s, 0.18, 0.37, 0.5, 0.46, 0.065, '#b8400e');
  brow(ctx, s, 0.5, 0.46, 0.82, 0.37, 0.065, '#b8400e');
  frontBeak(ctx, s, 0.5, 0.7, 1.05);
  finish(ctx, s, 0.18);
}

/** Pájaro bomba: negro, mecha con punta naranja, ojeras grises, cejas marrón rojizo, barriga gris. */
function bomb(ctx: Ctx, s: number) {
  face(ctx, s, BLACK);
  ellipse(ctx, s * 0.5, s * 1.02, s * 0.5, s * 0.26);
  ctx.fillStyle = '#4a4a50';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = s * 0.05;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(s * 0.5, s * 0.26);
  ctx.quadraticCurveTo(s * 0.48, s * 0.15, s * 0.53, s * 0.09);
  ctx.stroke();
  poly(ctx, s, [[0.51, 0.11], [0.61, 0.06], [0.63, 0.12], [0.55, 0.16]]);
  inked(ctx, s, '#f7a81b', 0.012);
  ctx.fillStyle = '#5c5c63';
  ellipse(ctx, s * 0.34, s * 0.5, s * 0.15, s * 0.12);
  ctx.fill();
  ellipse(ctx, s * 0.66, s * 0.5, s * 0.15, s * 0.12);
  ctx.fill();
  eye(ctx, s, 0.35, 0.5, 0.09, 0.2);
  eye(ctx, s, 0.65, 0.5, 0.09, -0.2);
  brow(ctx, s, 0.16, 0.33, 0.48, 0.41, 0.065, '#b8480e');
  brow(ctx, s, 0.52, 0.41, 0.84, 0.33, 0.065, '#b8480e');
  frontBeak(ctx, s, 0.5, 0.65, 1.1);
  finish(ctx, s);
}

/** Pájaros azules: sin cejas, ojos grandes y sorprendidos, mejillas naranjas y pico abierto. */
function blues(ctx: Ctx, s: number) {
  face(ctx, s, BLUE);
  plume(ctx, s, 0.46, 0.27, 0.22, -0.6, shade(BLUE, -0.1));
  plume(ctx, s, 0.5, 0.26, 0.24, 0.05, shade(BLUE, -0.1));
  ctx.fillStyle = '#d86a2a';
  for (const x of [0.3, 0.7]) {
    ellipse(ctx, s * x, s * 0.6, s * 0.12, s * 0.07);
    ctx.fill();
  }
  eye(ctx, s, 0.36, 0.42, 0.12, 0.25, -0.1, 0.38);
  eye(ctx, s, 0.64, 0.42, 0.12, -0.25, -0.1, 0.38);
  frontBeak(ctx, s, 0.5, 0.6, 1.1, 0.04);
  finish(ctx, s);
}

/** Orejas pequeñas arriba. */
function ears(ctx: Ctx, s: number, color: string, xs = [0.32, 0.68]) {
  for (const x of xs) {
    ellipse(ctx, s * x, s * 0.17, s * 0.08, s * 0.065);
    inked(ctx, s, shade(color, -0.08), 0.02);
    ellipse(ctx, s * x, s * 0.175, s * 0.035, s * 0.028);
    ctx.fillStyle = shade(color, -0.35);
    ctx.fill();
  }
}

/** Hocico grande en el centro con orificios ovalados. */
function snout(ctx: Ctx, s: number, color: string, x: number, y: number, k = 1) {
  ellipse(ctx, s * x, s * y, s * 0.17 * k, s * 0.13 * k);
  inked(ctx, s, shade(color, 0.28), 0.022);
  ctx.fillStyle = '#2c5410';
  ellipse(ctx, s * (x - 0.06 * k), s * y, s * 0.032 * k, s * 0.055 * k);
  ctx.fill();
  ellipse(ctx, s * (x + 0.06 * k), s * y, s * 0.032 * k, s * 0.055 * k);
  ctx.fill();
}

/** Cerdito: verde, orejas pequeñas, ojos muy separados, hocico enorme y sin boca. */
function pig(ctx: Ctx, s: number) {
  face(ctx, s, PIG, 0.32);
  ears(ctx, s, PIG);
  eye(ctx, s, 0.22, 0.48, 0.1, 0.25, 0, 0.35);
  eye(ctx, s, 0.78, 0.48, 0.1, -0.25, 0, 0.35);
  snout(ctx, s, PIG, 0.5, 0.52);
  finish(ctx, s, 0.32);
}

/** Rey cerdo: más claro, corona amarilla ladeada con joya azul. */
function kingPig(ctx: Ctx, s: number) {
  face(ctx, s, KING, 0.32);
  ears(ctx, s, KING, [0.3]);
  // corona ladeada a la derecha
  ctx.save();
  ctx.translate(s * 0.68, s * 0.2);
  ctx.rotate(0.25);
  poly(ctx, s, [[-0.17, 0.08], [-0.2, -0.12], [-0.09, -0.02], [0, -0.17], [0.09, -0.02], [0.2, -0.12], [0.17, 0.08]]);
  const g = ctx.createLinearGradient(0, -s * 0.17, 0, s * 0.08);
  g.addColorStop(0, '#fff27a');
  g.addColorStop(1, '#f2c412');
  inked(ctx, s, g, 0.02);
  circle(ctx, 0, s * 0.02, s * 0.035);
  inked(ctx, s, '#3aa0e8', 0.012);
  ctx.restore();
  eye(ctx, s, 0.2, 0.52, 0.09, 0.25, 0, 0.35);
  eye(ctx, s, 0.8, 0.52, 0.09, -0.25, 0, 0.35);
  snout(ctx, s, KING, 0.5, 0.58, 1.1);
  finish(ctx, s, 0.32);
}

/** Vetas de madera horizontales. */
function woodGrain(ctx: Ctx, s: number, base: string, seed: number) {
  const r = rng(seed);
  ctx.strokeStyle = shade(base, -0.3);
  ctx.lineWidth = Math.max(1, s * 0.012);
  for (let k = 0; k < 6; k++) {
    const y = s * (0.1 + k * 0.16 + r() * 0.05);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(s * 0.3, y + s * (r() - 0.5) * 0.06, s * 0.6, y + s * (r() - 0.5) * 0.06, s, y);
    ctx.stroke();
  }
}

/** Caja de TNT: madera con marco, tablón claro y letras rojas. */
function tnt(ctx: Ctx, s: number) {
  face(ctx, s, TNT, 0.08);
  woodGrain(ctx, s, TNT, 31);
  // marco interior
  ctx.strokeStyle = shade(TNT, -0.45);
  ctx.lineWidth = s * 0.05;
  ctx.strokeRect(s * 0.14, s * 0.14, s * 0.72, s * 0.72);
  // tablón con el texto
  ctx.fillStyle = '#f2dcae';
  ctx.fillRect(s * 0.1, s * 0.36, s * 0.8, s * 0.28);
  ctx.strokeStyle = INK;
  ctx.lineWidth = s * 0.02;
  ctx.strokeRect(s * 0.1, s * 0.36, s * 0.8, s * 0.28);
  ctx.font = `900 ${Math.round(s * 0.24)}px "Arial Black", Impact, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#d41c24';
  ctx.fillText('TNT', s / 2, s * 0.51, s * 0.72);
  // clavos
  ctx.fillStyle = '#4a3a2a';
  for (const [x, y] of [[0.14, 0.14], [0.86, 0.14], [0.14, 0.86], [0.86, 0.86]]) {
    circle(ctx, s * x, s * y, s * 0.025);
    ctx.fill();
  }
  finish(ctx, s, 0.08);
}

/** Bloque de piedra con grietas. */
function stoneBlock(ctx: Ctx, s: number) {
  face(ctx, s, STONE, 0.1);
  const r = rng(5);
  for (let k = 0; k < 10; k++) {
    ctx.fillStyle = rgba(r() > 0.5 ? '#ffffff' : '#000000', 0.08 + r() * 0.08);
    circle(ctx, r() * s, r() * s, s * (0.03 + r() * 0.06));
    ctx.fill();
  }
  ctx.strokeStyle = shade(STONE, -0.5);
  ctx.lineWidth = s * 0.025;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(s * 0.62, s * 0.05);
  ctx.lineTo(s * 0.55, s * 0.28);
  ctx.lineTo(s * 0.66, s * 0.4);
  ctx.moveTo(s * 0.05, s * 0.7);
  ctx.lineTo(s * 0.26, s * 0.64);
  ctx.lineTo(s * 0.34, s * 0.78);
  ctx.stroke();
  finish(ctx, s, 0.1);
}

const DESIGNS: Record<string, (ctx: Ctx, s: number) => void> = {
  [RED]: redBird,
  [YELLOW]: chuck,
  [BLACK]: bomb,
  [BLUE]: blues,
  [PIG]: pig,
  [KING]: kingPig,
  [TNT]: tnt,
};

/** Nube esponjosa de dibujos animados. */
function cloud(ctx: Ctx, x: number, y: number, r: number) {
  const puffs = [[0, 0, 1], [r * 0.95, r * 0.25, 0.78], [-r * 0.95, r * 0.3, 0.72], [r * 0.4, -r * 0.45, 0.72], [-r * 0.4, -r * 0.3, 0.6]];
  ctx.fillStyle = 'rgba(190, 225, 245, 0.85)';
  for (const [dx, dy, k] of puffs) {
    circle(ctx, x + dx, y + dy + r * 0.12, r * k);
    ctx.fill();
  }
  ctx.fillStyle = '#ffffff';
  for (const [dx, dy, k] of puffs) {
    circle(ctx, x + dx, y + dy, r * k * 0.95);
    ctx.fill();
  }
}

type Material = 'wood' | 'stone' | 'glass';

/** Rellena el trazado `path` con un material de construcción (madera, piedra o vidrio celeste). */
function materialFill(ctx: Ctx, mat: Material, path: Path2D, x: number, y: number, w: number, h: number, m: number) {
  ctx.save();
  if (mat === 'glass') {
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, 'rgba(200, 240, 255, 0.92)');
    g.addColorStop(1, 'rgba(110, 200, 240, 0.85)');
    ctx.fillStyle = g;
  } else {
    const base = mat === 'wood' ? '#d49a4c' : '#9aa1aa';
    const g = ctx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, shade(base, 0.18));
    g.addColorStop(1, shade(base, -0.18));
    ctx.fillStyle = g;
  }
  ctx.fill(path);
  ctx.clip(path);
  const r = rng(Math.floor(x * 7 + y * 13) + 1);
  if (mat === 'wood') {
    ctx.strokeStyle = 'rgba(110, 60, 20, 0.45)';
    ctx.lineWidth = Math.max(1, m * 0.003);
    const vertical = h > w;
    const n = Math.max(2, Math.round((vertical ? w : h) / (m * 0.012)));
    for (let k = 1; k < n; k++) {
      const t = k / n + (r() - 0.5) * 0.08;
      ctx.beginPath();
      if (vertical) {
        ctx.moveTo(x + w * t, y);
        ctx.lineTo(x + w * t + (r() - 0.5) * m * 0.006, y + h);
      } else {
        ctx.moveTo(x, y + h * t);
        ctx.lineTo(x + w, y + h * t + (r() - 0.5) * m * 0.006);
      }
      ctx.stroke();
    }
  } else if (mat === 'stone') {
    for (let k = 0; k < Math.max(3, (w * h) / (m * m * 0.0015)); k++) {
      ctx.fillStyle = rgba(r() > 0.5 ? '#ffffff' : '#2a2e34', 0.12 + r() * 0.1);
      circle(ctx, x + r() * w, y + r() * h, m * (0.004 + r() * 0.007));
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(40, 44, 50, 0.55)';
    ctx.lineWidth = Math.max(1, m * 0.003);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x + w * (0.3 + r() * 0.4), y);
    ctx.lineTo(x + w * (0.2 + r() * 0.6), y + h * 0.35);
    ctx.lineTo(x + w * (0.3 + r() * 0.4), y + h * 0.6);
    ctx.stroke();
  } else {
    // reflejos diagonales del vidrio
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.lineWidth = Math.max(1.5, Math.min(w, h) * 0.14);
    ctx.lineCap = 'butt';
    const d = Math.min(w, h);
    ctx.beginPath();
    ctx.moveTo(x + d * 0.25, y + d * 0.95);
    ctx.lineTo(x + d * 0.95, y + d * 0.25);
    ctx.stroke();
    ctx.lineWidth *= 0.5;
    ctx.beginPath();
    ctx.moveTo(x + d * 0.55, y + d * 1.15);
    ctx.lineTo(x + d * 1.15, y + d * 0.55);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.lineWidth = Math.max(1, m * 0.003);
    ctx.strokeRect(x + m * 0.004, y + m * 0.004, w - m * 0.008, h - m * 0.008);
  }
  ctx.restore();
  ctx.lineWidth = Math.max(1, m * 0.005);
  ctx.strokeStyle = mat === 'glass' ? '#2a6f98' : INK;
  ctx.stroke(path);
}

function materialRect(ctx: Ctx, mat: Material, x: number, y: number, w: number, h: number, m: number) {
  const p = new Path2D();
  p.rect(x, y, w, h);
  materialFill(ctx, mat, p, x, y, w, h, m);
}

const birds: SkinDef = {
  id: 'birds',
  name: { es: 'Pájaros y Cerdos', en: 'Birds & Pigs' },
  description: {
    es: 'Pájaros enfadados, cerditos, el rey cerdo y cajas de TNT. ¡A por los huevos!',
    en: 'Angry birds, piggies, the king pig and TNT crates. Save the eggs!',
  },
  price: 1100,
  order: 2.6,
  blocks: BLOCKS,
  ui: {
    bg: '#8fd6f5',
    panel: 'rgba(255, 248, 232, 0.96)',
    panelBorder: '#7a4a1e',
    text: '#2a1a0e',
    textDim: '#7a5a3a',
    accent: RED,
    accent2: '#5aa82a',
    good: '#4aa82a',
    danger: '#d41c24',
    radius: 18,
    font: '"Arial Rounded MT Bold", "Segoe UI Rounded", "Trebuchet MS", "Segoe UI", sans-serif',
    titleGlow: '0 3px 0 #7a1a10, 0 0 12px rgba(255, 255, 255, 0.6)',
  },
  blockMargin: 0.05,
  flash: '#fff6d8',
  explosion: { power: 1.25, ring: '#fff6d8', rings: 1, screenFlash: false },

  drawBackground(ctx, w, h) {
    const m = Math.min(w, h);
    const gy = h * 0.93;
    // cielo con resplandor de sol
    const sky = ctx.createLinearGradient(0, 0, 0, gy);
    sky.addColorStop(0, '#3fb0ea');
    sky.addColorStop(0.55, '#8fd4f4');
    sky.addColorStop(1, '#e4f6fd');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    const sun = ctx.createRadialGradient(w * 0.82, h * 0.08, 0, w * 0.82, h * 0.08, m * 0.55);
    sun.addColorStop(0, 'rgba(255, 250, 215, 0.85)');
    sun.addColorStop(0.18, 'rgba(255, 244, 190, 0.35)');
    sun.addColorStop(1, 'rgba(255, 244, 190, 0)');
    ctx.fillStyle = sun;
    ctx.fillRect(0, 0, w, h);
    cloud(ctx, w * 0.16, h * 0.1, m * 0.06);
    cloud(ctx, w * 0.62, h * 0.05, m * 0.045);
    cloud(ctx, w * 0.9, h * 0.2, m * 0.04);
    cloud(ctx, w * 0.36, h * 0.27, m * 0.03);

    // colinas: lejanas azuladas, medias y cercanas
    const hills = (base: number, amp: number, top: string, bottom: string, phase: number, f = 0.35) => {
      const y0 = h * base - amp * 1.3;
      const g = ctx.createLinearGradient(0, y0, 0, gy);
      g.addColorStop(0, top);
      g.addColorStop(1, bottom);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let x = 0; x <= w + 8; x += 6) ctx.lineTo(x, h * base - Math.sin(x / (m * f) + phase) * amp - Math.sin(x / (m * f * 0.37) + phase * 2) * amp * 0.25);
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();
    };
    hills(0.74, m * 0.06, '#b4dfe0', '#cdeee8', 0.4, 0.5);
    hills(0.8, m * 0.05, '#8fd07a', '#b8e2a0', 1.7);
    // arbustos redondos en la línea de la colina cercana
    const r = rng(17);
    for (let x = -m * 0.02; x < w; x += m * (0.06 + r() * 0.08)) {
      const by = h * 0.86 - Math.sin(x / (m * 0.3) + 3) * m * 0.035;
      const br = m * (0.025 + r() * 0.02);
      ctx.fillStyle = '#4e9e34';
      circle(ctx, x, by, br);
      ctx.fill();
      circle(ctx, x + br * 0.9, by + br * 0.25, br * 0.75);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      circle(ctx, x - br * 0.25, by - br * 0.35, br * 0.4);
      ctx.fill();
    }
    hills(0.86, m * 0.035, '#6cc044', '#58ac30', 3, 0.3);

    // suelo: tierra con piedrecitas y franja de hierba
    const dirt = ctx.createLinearGradient(0, gy, 0, h);
    dirt.addColorStop(0, '#8a5c34');
    dirt.addColorStop(1, '#5e3c1e');
    ctx.fillStyle = dirt;
    ctx.fillRect(0, gy, w, h - gy);
    for (let k = 0; k < Math.ceil(w / (m * 0.05)); k++) {
      ctx.fillStyle = rgba(r() > 0.5 ? '#c49a6a' : '#3e2612', 0.5);
      ellipse(ctx, r() * w, gy + m * 0.03 + r() * (h - gy - m * 0.03), m * (0.006 + r() * 0.008), m * (0.004 + r() * 0.005));
      ctx.fill();
    }
    ctx.fillStyle = '#5aa82a';
    ctx.fillRect(0, gy - m * 0.012, w, m * 0.026);
    ctx.fillStyle = '#7cc83c';
    ctx.fillRect(0, gy - m * 0.012, w, m * 0.007);
    ctx.fillStyle = '#4a9020';
    for (let x = 0; x < w; x += m * 0.018) {
      const t = m * (0.018 + r() * 0.014);
      ctx.beginPath();
      ctx.moveTo(x, gy + m * 0.013);
      ctx.lineTo(x + m * 0.009, gy - t);
      ctx.lineTo(x + m * 0.018, gy + m * 0.013);
      ctx.fill();
    }

    // tirachinas a la izquierda, con goma negra
    const sx = w * 0.1;
    const sh = m * 0.22;
    const tipL = [sx - sh * 0.2, gy - sh];
    const tipR = [sx + sh * 0.2, gy - sh];
    const pouch = [sx + sh * 0.03, gy - sh * 0.7];
    const band = (a: number[]) => {
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#121214';
      ctx.lineWidth = m * 0.016;
      ctx.beginPath();
      ctx.moveTo(a[0], a[1] + m * 0.006);
      ctx.quadraticCurveTo((a[0] + pouch[0]) / 2, pouch[1] + m * 0.006, pouch[0], pouch[1]);
      ctx.stroke();
    };
    band(tipL); // goma trasera, detrás de la horquilla
    const fork = (c: string, lw: number) => {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = c;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(sx, gy + m * 0.005);
      ctx.lineTo(sx, gy - sh * 0.55);
      ctx.quadraticCurveTo(sx - sh * 0.17, gy - sh * 0.68, tipL[0], tipL[1]);
      ctx.moveTo(sx, gy - sh * 0.55);
      ctx.quadraticCurveTo(sx + sh * 0.17, gy - sh * 0.68, tipR[0], tipR[1]);
      ctx.stroke();
    };
    fork(INK, m * 0.036);
    fork('#9a6430', m * 0.024);
    ctx.save();
    ctx.translate(-m * 0.004, -m * 0.003);
    fork('rgba(255, 210, 150, 0.35)', m * 0.007);
    ctx.restore();
    // ataduras negras en las puntas
    ctx.fillStyle = '#121214';
    for (const [x, y] of [tipL, tipR]) {
      roundRect(ctx, x - m * 0.016, y + m * 0.004, m * 0.032, m * 0.016, m * 0.005);
      ctx.fill();
    }
    band(tipR); // goma delantera

    // estructura de madera, piedra y vidrio a la derecha
    const u = m * 0.058;
    const x0 = w - m * 0.03 - u * 6.2;
    ctx.lineJoin = 'round';
    const at = (x: number, y: number) => [x0 + x * u, gy - y * u];
    const piece = (mat: 'wood' | 'stone' | 'glass', x: number, y: number, ww: number, hh: number) => {
      const [px, py] = at(x, y + hh);
      materialRect(ctx, mat, px, py, ww * u, hh * u, m);
    };
    piece('stone', -0.1, 0, 6.4, 0.6);
    piece('wood', 0.15, 0.6, 0.55, 2.4);
    piece('glass', 2.7, 0.6, 0.6, 2.4);
    piece('wood', 5.3, 0.6, 0.55, 2.4);
    piece('glass', 0.9, 0.6, 1.5, 0.75);
    piece('stone', 3.6, 0.6, 1.4, 1.4);
    piece('wood', -0.2, 3.0, 6.6, 0.42);
    piece('glass', 0.7, 3.42, 0.5, 2.1);
    piece('stone', 2.3, 3.42, 1.4, 1.0);
    piece('glass', 2.5, 4.42, 1.0, 1.1);
    piece('glass', 4.8, 3.42, 0.5, 2.1);
    piece('wood', 0.4, 5.52, 5.2, 0.42);
    piece('wood', 1.2, 5.94, 0.45, 1.3);
    piece('wood', 4.35, 5.94, 0.45, 1.3);
    piece('glass', 2.25, 5.94, 1.5, 0.6);
    // tejado triangular de piedra
    const [ax, ay] = at(0.9, 7.24);
    const [bx, by] = at(3, 9.2);
    const [cx] = at(5.1, 7.24);
    const roof = new Path2D();
    roof.moveTo(ax, ay);
    roof.lineTo(bx, by);
    roof.lineTo(cx, ay);
    roof.closePath();
    materialFill(ctx, 'stone', roof, ax, by, cx - ax, ay - by, m);
    // tablón suelto y roca a los pies
    ctx.save();
    const [lx, ly] = at(-1.6, 0);
    ctx.translate(lx, ly);
    ctx.rotate(-1.1);
    materialRect(ctx, 'wood', 0, -u * 0.4, u * 3, u * 0.4, m);
    ctx.restore();
    const [rx, ry] = at(-0.7, 0.45);
    const rock = new Path2D();
    rock.arc(rx, ry, u * 0.5, 0, Math.PI * 2);
    materialFill(ctx, 'stone', rock, rx - u * 0.5, ry - u * 0.5, u, u, m);
  },

  drawBoard(ctx, size, cell) {
    const pad = cell * 0.22;
    // marco de tablones
    ctx.save();
    ctx.shadowColor = 'rgba(40, 20, 0, 0.35)';
    ctx.shadowBlur = cell * 0.4;
    ctx.shadowOffsetY = cell * 0.08;
    roundRect(ctx, -pad, -pad, size + pad * 2, size + pad * 2, cell * 0.18);
    ctx.fillStyle = '#c98a3e';
    ctx.fill();
    ctx.restore();
    roundRect(ctx, -pad, -pad, size + pad * 2, size + pad * 2, cell * 0.18);
    ctx.lineWidth = cell * 0.05;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.fillStyle = '#e0a85a';
    ctx.fillRect(-pad * 0.7, -pad * 0.75, size + pad * 1.4, pad * 0.18);
    // clavos
    ctx.fillStyle = '#4a3a2a';
    for (const [x, y] of [[-pad / 2, -pad / 2], [size + pad / 2, -pad / 2], [-pad / 2, size + pad / 2], [size + pad / 2, size + pad / 2]]) {
      circle(ctx, x, y, cell * 0.05);
      ctx.fill();
    }
    // fondo del tablero: madera oscura en tablones
    ctx.fillStyle = '#5a3a1e';
    ctx.fillRect(0, 0, size, size);
    for (let y = 0; y < 8; y++)
      for (let x = 0; x < 8; x++) {
        const i = cell * 0.05;
        ctx.fillStyle = (x + y) % 2 ? '#6e4826' : '#674322';
        roundRect(ctx, x * cell + i, y * cell + i, cell - i * 2, cell - i * 2, cell * 0.12);
        ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        ctx.fillRect(x * cell + i * 2, y * cell + cell * 0.5, cell - i * 4, Math.max(1, cell * 0.015));
      }
  },

  drawBlock(ctx, s, color, variant) {
    if (variant === 'ghost') {
      const i = s * 0.06;
      roundRect(ctx, i, i, s - i * 2, s - i * 2, s * R);
      ctx.fillStyle = rgba(color, 0.25);
      ctx.fill();
      ctx.setLineDash([s * 0.1, s * 0.07]);
      ctx.strokeStyle = rgba('#ffffff', 0.9);
      ctx.lineWidth = s * 0.05;
      ctx.stroke();
      return;
    }
    if (variant === 'stone') return stoneBlock(ctx, s);
    const d = DESIGNS[color];
    if (d) d(ctx, s);
    else {
      face(ctx, s, color);
      finish(ctx, s);
    }
  },

  drawGem(ctx, s) {
    // huevo dorado
    ctx.save();
    ctx.shadowColor = '#ffd84a';
    ctx.shadowBlur = s * 0.2;
    ctx.beginPath();
    ctx.moveTo(s / 2, s * 0.2);
    ctx.bezierCurveTo(s * 0.74, s * 0.2, s * 0.78, s * 0.62, s * 0.72, s * 0.7);
    ctx.bezierCurveTo(s * 0.64, s * 0.84, s * 0.36, s * 0.84, s * 0.28, s * 0.7);
    ctx.bezierCurveTo(s * 0.22, s * 0.62, s * 0.26, s * 0.2, s / 2, s * 0.2);
    ctx.closePath();
    const g = ctx.createRadialGradient(s * 0.42, s * 0.38, s * 0.02, s / 2, s / 2, s * 0.35);
    g.addColorStop(0, '#fffbd0');
    g.addColorStop(0.5, '#ffd84a');
    g.addColorStop(1, '#c8880a');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
    ctx.lineWidth = s * 0.03;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ellipse(ctx, s * 0.42, s * 0.36, s * 0.05, s * 0.09, -0.4);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fill();
  },

  drawTarget(ctx, s) {
    // tirachinas
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const draw = (c: string, w: number) => {
      ctx.strokeStyle = c;
      ctx.lineWidth = s * w;
      ctx.beginPath();
      ctx.moveTo(s / 2, s * 0.84);
      ctx.lineTo(s / 2, s * 0.52);
      ctx.lineTo(s * 0.3, s * 0.2);
      ctx.moveTo(s / 2, s * 0.52);
      ctx.lineTo(s * 0.7, s * 0.2);
      ctx.stroke();
    };
    draw(INK, 0.14);
    draw('#a8682a', 0.08);
    ctx.strokeStyle = '#121214';
    ctx.lineWidth = s * 0.045;
    ctx.beginPath();
    ctx.moveTo(s * 0.3, s * 0.22);
    ctx.quadraticCurveTo(s / 2, s * 0.42, s * 0.7, s * 0.22);
    ctx.stroke();
  },

  particles: {
    // plumas
    draw(ctx, s, color) {
      ctx.save();
      ctx.translate(s / 2, s / 2);
      ctx.rotate(0.6);
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.42);
      ctx.quadraticCurveTo(s * 0.22, -s * 0.05, 0, s * 0.4);
      ctx.quadraticCurveTo(-s * 0.22, -s * 0.05, 0, -s * 0.42);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      ctx.lineWidth = s * 0.05;
      ctx.strokeStyle = INK;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.3);
      ctx.lineTo(0, s * 0.42);
      ctx.stroke();
      ctx.restore();
    },
    perCell: 4,
    size: [0.3, 0.55],
    speed: [2, 6],
    gravity: 5,
    life: [0.6, 1.1],
    blend: 'normal',
    spin: true,
    shrink: false,
  },

  ambient: {
    count: 10,
    // plumas blancas que caen despacio
    draw(ctx, s) {
      ctx.translate(s / 2, s / 2);
      ctx.rotate(-0.5);
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.45);
      ctx.quadraticCurveTo(s * 0.2, 0, 0, s * 0.45);
      ctx.quadraticCurveTo(-s * 0.2, 0, 0, -s * 0.45);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    },
    size: [8, 16],
    speed: [8, 20],
    alpha: [0.4, 0.75],
    blend: 'normal',
  },

  sound: {
    root: 60,
    scale: [0, 2, 4, 5, 7, 9, 11],
    blip: 'triangle',
    sparkle: 'square',
    thump: 0.8,
    music: {
      bpm: 118,
      progression: [0, 3, 4, 0],
      pad: 'triangle',
      lead: 'square',
      bass: 'triangle',
      leadDensity: 0.35,
      padGain: 0.045,
      leadGain: 0.035,
      bassGain: 0.11,
      filter: 2200,
      reverb: 0.35,
      echo: 0.2,
      hats: true,
    },
  },
};

export default birds;
