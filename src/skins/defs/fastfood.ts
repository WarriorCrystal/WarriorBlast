import { drawGemIcon, roundRect, rgba, shade, star } from '../draw';
import type { Ctx, SkinDef } from '../types';

/**
 * COMIDA RÁPIDA — cada bloque ES una comida que llena todo el cuadrado (como los
 * cubos de la Cámara de pruebas), y cada una tiene un color dominante distinto:
 *   marrón → hamburguesa · amarillo → pizza · rojo → papas fritas · azul → refresco
 *   rosa → dona · verde → helado de menta · violeta → batido de mora
 * Los bloques "piedra" son bolsas de papel kraft.
 * El tablero es una bandeja oscura sobre un mantel de cuadros rojos.
 */

const C = {
  burger: '#c9772f',
  pizza: '#ffc93c',
  fries: '#e8392f',
  soda: '#2f86e8',
  donut: '#f45fa6',
  icecream: '#4fd1a0',
  shake: '#9b59d6',
  stone: '#a8865f',
};

type Kind = keyof typeof C;

const KIND: Record<string, Kind> = Object.fromEntries(
  Object.entries(C).map(([k, v]) => [v, k as Kind]),
) as Record<string, Kind>;

const kindOf = (color: string): Kind => KIND[color.toLowerCase()] ?? 'burger';

const INK = '#3b2314';
const KETCHUP = '#e2342b';
const MUSTARD = '#ffc21a';
const BUN = '#f2ae58';
const BUN_DARK = '#c9772f';

/** Generador pseudoaleatorio con semilla (dibujos estables). */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Degradado vertical entre y0 e y1 (fracciones de s). */
function vgrad(ctx: Ctx, s: number, top: string, bottom: string, y0: number, y1: number) {
  const g = ctx.createLinearGradient(0, y0 * s, 0, y1 * s);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  return g;
}

/** Rellena el trazo actual y lo contornea con tinta. */
function paint(ctx: Ctx, s: number, fill: string | CanvasGradient, line = 0.025) {
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1, s * line);
  ctx.lineJoin = 'round';
  ctx.stroke();
}

/** Línea de tinta horizontal ondulada que separa capas (de x=0 a x=s). */
function wave(ctx: Ctx, s: number, y: number, amp: number, n: number) {
  ctx.moveTo(-s * 0.05, y * s);
  for (let i = 1; i <= n; i++) {
    const x = -0.05 + (i / n) * 1.1;
    ctx.quadraticCurveTo((x - 0.55 / n) * s, (y + (i % 2 ? amp : -amp)) * s, x * s, y * s);
  }
}

const IN = 0.05;
const RAD = 0.14;

/** Abre la cara del bloque: cuadrado redondeado con recorte activo. Cerrar con `finish`. */
function face(ctx: Ctx, s: number, fill: string | CanvasGradient) {
  const i = s * IN;
  // canto inferior (da volumen)
  roundRect(ctx, i, i + s * 0.025, s - i * 2, s - i * 2, s * RAD);
  ctx.fillStyle = 'rgba(30, 12, 4, 0.45)';
  ctx.fill();
  ctx.save();
  roundRect(ctx, i, i, s - i * 2, s - i * 2, s * RAD);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.clip();
}

/** Cierra la cara: borde de tinta y brillo de plástico arriba a la izquierda. */
function finish(ctx: Ctx, s: number) {
  // brillo general suave
  const hl = ctx.createLinearGradient(0, 0, s * 0.6, s * 0.6);
  hl.addColorStop(0, 'rgba(255,255,255,0.22)');
  hl.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = hl;
  ctx.fillRect(0, 0, s, s);
  ctx.restore();
  const i = s * IN;
  roundRect(ctx, i, i, s - i * 2, s - i * 2, s * RAD);
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1.2, s * 0.035);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = Math.max(1, s * 0.022);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(s * 0.16, s * 0.12);
  ctx.lineTo(s * 0.34, s * 0.12);
  ctx.stroke();
}

/* ---------------------------------- comidas ---------------------------------- */

function burger(ctx: Ctx, s: number) {
  const X = (v: number) => v * s;
  face(ctx, s, vgrad(ctx, s, '#f8c272', BUN_DARK, 0, 0.5));
  // sésamo sobre el pan de arriba
  ctx.fillStyle = '#fff6dc';
  for (const [x, y, a] of [
    [0.28, 0.2, 0.3],
    [0.5, 0.15, -0.2],
    [0.72, 0.22, 0.5],
    [0.38, 0.33, -0.5],
    [0.62, 0.34, 0.2],
    [0.18, 0.36, 0.1],
    [0.84, 0.36, -0.3],
  ]) {
    ctx.beginPath();
    ctx.ellipse(X(x), X(y), X(0.03), X(0.015), a, 0, Math.PI * 2);
    ctx.fill();
  }
  // tomate
  ctx.beginPath();
  ctx.rect(-X(0.1), X(0.44), X(1.2), X(0.07));
  paint(ctx, s, vgrad(ctx, s, '#ff6a55', KETCHUP, 0.44, 0.51), 0.02);
  // lechuga
  ctx.beginPath();
  wave(ctx, s, 0.52, 0.04, 9);
  ctx.lineTo(X(1.1), X(0.47));
  ctx.lineTo(-X(0.1), X(0.47));
  ctx.closePath();
  paint(ctx, s, vgrad(ctx, s, '#9be655', '#4fae2a', 0.46, 0.56), 0.02);
  // carne
  ctx.beginPath();
  ctx.rect(-X(0.1), X(0.56), X(1.2), X(0.2));
  paint(ctx, s, vgrad(ctx, s, '#7e4522', '#4a2712', 0.56, 0.76), 0.025);
  const r = rng(5);
  ctx.fillStyle = 'rgba(30, 12, 4, 0.45)';
  for (let k = 0; k < 14; k++) {
    ctx.beginPath();
    ctx.arc(X(0.08 + r() * 0.84), X(0.63 + r() * 0.1), X(0.012 + r() * 0.01), 0, Math.PI * 2);
    ctx.fill();
  }
  // queso con goteos
  ctx.beginPath();
  ctx.moveTo(-X(0.1), X(0.55));
  ctx.lineTo(X(1.1), X(0.55));
  ctx.lineTo(X(1.1), X(0.6));
  for (const [x, d] of [
    [0.86, 0.6],
    [0.8, 0.7],
    [0.74, 0.6],
    [0.48, 0.6],
    [0.42, 0.73],
    [0.36, 0.6],
    [0.16, 0.6],
    [0.12, 0.67],
    [0.08, 0.6],
  ])
    ctx.lineTo(X(x), X(d));
  ctx.lineTo(-X(0.1), X(0.6));
  ctx.closePath();
  paint(ctx, s, vgrad(ctx, s, '#ffe14a', '#f5b40f', 0.55, 0.72), 0.02);
  // pan de abajo
  ctx.beginPath();
  ctx.rect(-X(0.1), X(0.76), X(1.2), X(0.3));
  paint(ctx, s, vgrad(ctx, s, BUN, BUN_DARK, 0.76, 0.96), 0.025);
  finish(ctx, s);
}

function pizza(ctx: Ctx, s: number) {
  const X = (v: number) => v * s;
  // masa: borde dorado
  face(ctx, s, vgrad(ctx, s, '#f3be6d', '#c47a2d', 0, 1));
  // salsa asomando y queso
  roundRect(ctx, X(0.15), X(0.15), X(0.7), X(0.7), X(0.1));
  ctx.fillStyle = '#d8402c';
  ctx.fill();
  ctx.beginPath();
  const n = 20;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = 0.31 + (i % 2 ? 0.02 : -0.01);
    // "superelipse" para que el queso sea cuadradito
    const cx = Math.sign(Math.cos(a)) * Math.pow(Math.abs(Math.cos(a)), 0.5);
    const cy = Math.sign(Math.sin(a)) * Math.pow(Math.abs(Math.sin(a)), 0.5);
    const x = 0.5 + cx * rr;
    const y = 0.5 + cy * rr;
    if (i === 0) ctx.moveTo(X(x), X(y));
    else ctx.lineTo(X(x), X(y));
  }
  ctx.closePath();
  ctx.fillStyle = vgrad(ctx, s, '#ffe466', '#ffbf2e', 0.2, 0.8);
  ctx.fill();
  // burbujas de queso
  ctx.fillStyle = 'rgba(255, 250, 200, 0.7)';
  for (const [x, y, r] of [
    [0.3, 0.55, 0.03],
    [0.7, 0.32, 0.025],
    [0.55, 0.72, 0.025],
  ]) {
    ctx.beginPath();
    ctx.arc(X(x), X(y), X(r), 0, Math.PI * 2);
    ctx.fill();
  }
  // pepperoni
  for (const [x, y] of [
    [0.34, 0.34],
    [0.66, 0.42],
    [0.42, 0.66],
    [0.7, 0.7],
  ]) {
    ctx.beginPath();
    ctx.arc(X(x), X(y), X(0.085), 0, Math.PI * 2);
    paint(ctx, s, vgrad(ctx, s, '#ee5640', '#b52a22', y - 0.085, y + 0.085), 0.02);
    ctx.fillStyle = 'rgba(120,20,15,0.45)';
    for (const [dx, dy] of [
      [-0.03, -0.01],
      [0.025, 0.025],
      [0.01, -0.035],
    ]) {
      ctx.beginPath();
      ctx.arc(X(x + dx), X(y + dy), X(0.012), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // aceitunas y albahaca
  ctx.strokeStyle = '#2a2a2a';
  ctx.lineWidth = Math.max(1, s * 0.02);
  for (const [x, y] of [
    [0.52, 0.27],
    [0.26, 0.5],
    [0.56, 0.52],
  ]) {
    ctx.beginPath();
    ctx.arc(X(x), X(y), X(0.026), 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = '#3f9e3a';
  for (const [x, y, a] of [
    [0.24, 0.72, -0.7],
    [0.76, 0.24, 0.6],
  ]) {
    ctx.beginPath();
    ctx.ellipse(X(x), X(y), X(0.05), X(0.024), a, 0, Math.PI * 2);
    ctx.fill();
  }
  // marcas del horno en la masa
  ctx.fillStyle = 'rgba(110, 50, 10, 0.35)';
  for (const [x, y] of [
    [0.1, 0.3],
    [0.9, 0.62],
    [0.4, 0.09],
    [0.62, 0.91],
  ]) {
    ctx.beginPath();
    ctx.arc(X(x), X(y), X(0.018), 0, Math.PI * 2);
    ctx.fill();
  }
  finish(ctx, s);
}

function fries(ctx: Ctx, s: number) {
  const X = (v: number) => v * s;
  // interior oscuro de la caja
  face(ctx, s, vgrad(ctx, s, '#8e1a14', '#5a0e0a', 0, 0.5));
  // papas apretadas llenando la parte de arriba
  const sticks: Array<[number, number, number]> = [
    [0.08, 0.2, -0.18],
    [0.2, 0.06, -0.1],
    [0.32, 0.14, -0.05],
    [0.44, 0.02, 0.0],
    [0.56, 0.1, 0.05],
    [0.68, 0.0, 0.1],
    [0.8, 0.12, 0.14],
    [0.92, 0.18, 0.2],
    [0.26, 0.22, 0.12],
    [0.5, 0.2, -0.1],
    [0.74, 0.24, -0.08],
  ];
  for (const [x, top, a] of sticks) {
    ctx.save();
    ctx.translate(X(x), X(0.6));
    ctx.rotate(a);
    ctx.beginPath();
    ctx.rect(-X(0.055), X(top - 0.6), X(0.11), X(0.6 - top + 0.1));
    paint(ctx, s, vgrad(ctx, s, '#ffeb8a', '#f0ad17', top - 0.6, 0), 0.018);
    // puntita tostada
    ctx.fillStyle = 'rgba(190, 110, 20, 0.55)';
    ctx.fillRect(-X(0.055), X(top - 0.6), X(0.11), X(0.035));
    ctx.restore();
  }
  // caja roja
  ctx.beginPath();
  ctx.moveTo(-X(0.1), X(0.38));
  ctx.quadraticCurveTo(X(0.5), X(0.52), X(1.1), X(0.38));
  ctx.lineTo(X(1.1), X(1.1));
  ctx.lineTo(-X(0.1), X(1.1));
  ctx.closePath();
  paint(ctx, s, vgrad(ctx, s, '#ff5f4f', '#c3241c', 0.4, 1), 0.03);
  // franja blanca con estrella
  ctx.beginPath();
  ctx.moveTo(-X(0.1), X(0.62));
  ctx.quadraticCurveTo(X(0.5), X(0.72), X(1.1), X(0.62));
  ctx.lineTo(X(1.1), X(0.76));
  ctx.quadraticCurveTo(X(0.5), X(0.86), -X(0.1), X(0.76));
  ctx.closePath();
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  star(ctx, X(0.5), X(0.74), X(0.075), X(0.032), 5);
  paint(ctx, s, MUSTARD, 0.016);
  finish(ctx, s);
}

function soda(ctx: Ctx, s: number) {
  const X = (v: number) => v * s;
  // vaso azul que llena el bloque
  face(ctx, s, vgrad(ctx, s, '#5aa6ff', '#1c5fc0', 0.2, 1));
  // ola blanca
  ctx.beginPath();
  ctx.moveTo(-X(0.1), X(0.62));
  ctx.bezierCurveTo(X(0.3), X(0.48), X(0.6), X(0.8), X(1.1), X(0.58));
  ctx.lineTo(X(1.1), X(0.74));
  ctx.bezierCurveTo(X(0.6), X(0.96), X(0.3), X(0.64), -X(0.1), X(0.78));
  ctx.closePath();
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  // gotitas de frío
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  for (const [x, y, r] of [
    [0.2, 0.45, 0.022],
    [0.78, 0.42, 0.018],
    [0.68, 0.86, 0.02],
    [0.3, 0.88, 0.015],
  ]) {
    ctx.beginPath();
    ctx.ellipse(X(x), X(y), X(r), X(r * 1.3), 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // reflejo vertical
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.fillRect(X(0.12), X(0.32), X(0.06), X(0.6));
  // pajita
  ctx.save();
  ctx.translate(X(0.62), X(0.18));
  ctx.rotate(0.35);
  ctx.beginPath();
  ctx.rect(-X(0.04), -X(0.3), X(0.08), X(0.32));
  paint(ctx, s, '#ffffff', 0.02);
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = KETCHUP;
  ctx.lineWidth = Math.max(1, s * 0.03);
  for (let y = -0.32; y < 0.04; y += 0.08) {
    ctx.beginPath();
    ctx.moveTo(-X(0.05), X(y));
    ctx.lineTo(X(0.05), X(y + 0.05));
    ctx.stroke();
  }
  ctx.restore();
  ctx.restore();
  // tapa blanca abombada
  ctx.beginPath();
  ctx.moveTo(X(0.08), X(0.27));
  ctx.quadraticCurveTo(X(0.5), X(0.06), X(0.92), X(0.27));
  ctx.closePath();
  paint(ctx, s, vgrad(ctx, s, '#ffffff', '#dbe3ee', 0.1, 0.27), 0.022);
  ctx.beginPath();
  ctx.rect(-X(0.1), X(0.25), X(1.2), X(0.09));
  paint(ctx, s, vgrad(ctx, s, '#ffffff', '#c9d3e0', 0.25, 0.34), 0.025);
  finish(ctx, s);
}

function donut(ctx: Ctx, s: number) {
  const X = (v: number) => v * s;
  // masa dorada en las esquinas
  face(ctx, s, vgrad(ctx, s, '#f4bb66', '#c47a2d', 0, 1));
  // glaseado rosa casi hasta el borde, con gotas
  ctx.beginPath();
  const n = 24;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = 0.4 + (i % 3 === 0 ? 0.035 : i % 2 ? -0.012 : 0.01);
    const cx = Math.sign(Math.cos(a)) * Math.pow(Math.abs(Math.cos(a)), 0.6);
    const cy = Math.sign(Math.sin(a)) * Math.pow(Math.abs(Math.sin(a)), 0.6);
    const x = 0.5 + cx * rr;
    const y = 0.48 + cy * rr;
    if (i === 0) ctx.moveTo(X(x), X(y));
    else ctx.lineTo(X(x), X(y));
  }
  ctx.closePath();
  paint(ctx, s, vgrad(ctx, s, '#ffb6d8', '#ee4f97', 0.1, 0.9), 0.022);
  // agujero
  ctx.beginPath();
  ctx.arc(X(0.5), X(0.5), X(0.13), 0, Math.PI * 2);
  paint(ctx, s, vgrad(ctx, s, '#c47a2d', '#e8a95a', 0.37, 0.63), 0.025);
  ctx.beginPath();
  ctx.arc(X(0.5), X(0.5), X(0.08), 0, Math.PI * 2);
  ctx.fillStyle = '#4a2a18';
  ctx.fill();
  // brillo del glaseado
  ctx.beginPath();
  ctx.ellipse(X(0.3), X(0.26), X(0.1), X(0.035), -0.6, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fill();
  // chispitas
  const rand = rng(31);
  const cols = ['#ffffff', '#ffd93b', '#4fc3f7', '#7ee05a', '#8b5cf6', '#ff7043'];
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(1.2, s * 0.028);
  for (let i = 0; i < 22; i++) {
    const a = rand() * Math.PI * 2;
    const rr = 0.18 + rand() * 0.17;
    const x = 0.5 + Math.cos(a) * rr;
    const y = 0.5 + Math.sin(a) * rr;
    const t = rand() * Math.PI;
    ctx.strokeStyle = cols[i % cols.length];
    ctx.beginPath();
    ctx.moveTo(X(x) - Math.cos(t) * X(0.028), X(y) - Math.sin(t) * X(0.028));
    ctx.lineTo(X(x) + Math.cos(t) * X(0.028), X(y) + Math.sin(t) * X(0.028));
    ctx.stroke();
  }
  finish(ctx, s);
}

function icecream(ctx: Ctx, s: number) {
  const X = (v: number) => v * s;
  // helado de menta llenando el bloque
  face(ctx, s, vgrad(ctx, s, '#a8f0d0', '#36b886', 0, 0.7));
  // barquillo abajo con cuadrícula
  ctx.beginPath();
  ctx.rect(-X(0.1), X(0.68), X(1.2), X(0.5));
  paint(ctx, s, vgrad(ctx, s, '#f4c070', '#c9802f', 0.68, 1), 0.025);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, X(0.68), s, X(0.4));
  ctx.clip();
  ctx.strokeStyle = rgba('#8a5320', 0.6);
  ctx.lineWidth = Math.max(1, s * 0.018);
  for (let k = -1; k < 1.2; k += 0.13) {
    ctx.beginPath();
    ctx.moveTo(X(k), X(0.68));
    ctx.lineTo(X(k + 0.35), X(1.03));
    ctx.moveTo(X(k + 0.35), X(0.68));
    ctx.lineTo(X(k), X(1.03));
    ctx.stroke();
  }
  ctx.restore();
  // helado que chorrea sobre el barquillo
  ctx.beginPath();
  ctx.moveTo(-X(0.1), X(0.6));
  for (const [x, y] of [
    [0.1, 0.7],
    [0.16, 0.8],
    [0.22, 0.7],
    [0.44, 0.72],
    [0.5, 0.86],
    [0.56, 0.72],
    [0.76, 0.7],
    [0.82, 0.78],
    [0.88, 0.69],
  ])
    ctx.lineTo(X(x), X(y));
  ctx.lineTo(X(1.1), X(0.62));
  ctx.lineTo(X(1.1), -X(0.1));
  ctx.lineTo(-X(0.1), -X(0.1));
  ctx.closePath();
  paint(ctx, s, vgrad(ctx, s, '#a8f0d0', '#3fc28f', 0, 0.8), 0.025);
  // trocitos de chocolate
  const r = rng(12);
  ctx.fillStyle = '#4a2a18';
  for (let k = 0; k < 11; k++) {
    const x = 0.12 + r() * 0.76;
    const y = 0.14 + r() * 0.48;
    ctx.save();
    ctx.translate(X(x), X(y));
    ctx.rotate(r() * Math.PI);
    ctx.fillRect(-X(0.025), -X(0.015), X(0.05), X(0.03));
    ctx.restore();
  }
  // brillo
  ctx.beginPath();
  ctx.ellipse(X(0.32), X(0.24), X(0.12), X(0.04), -0.5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fill();
  finish(ctx, s);
}

function shake(ctx: Ctx, s: number) {
  const X = (v: number) => v * s;
  // batido de mora en vaso
  face(ctx, s, vgrad(ctx, s, '#c38ef0', '#6a2fb0', 0.3, 1));
  // franjas del vaso
  ctx.fillStyle = 'rgba(255,255,255,0.13)';
  for (const x of [0.2, 0.44, 0.68]) ctx.fillRect(X(x), X(0.3), X(0.1), X(0.8));
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(X(0.12), X(0.42), X(0.05), X(0.46));
  // pajita
  ctx.save();
  ctx.translate(X(0.7), X(0.16));
  ctx.rotate(0.4);
  ctx.beginPath();
  ctx.rect(-X(0.045), -X(0.3), X(0.09), X(0.3));
  paint(ctx, s, '#ff86c0', 0.02);
  ctx.restore();
  // crema batida con gotas violetas
  ctx.beginPath();
  ctx.moveTo(-X(0.1), -X(0.1));
  ctx.lineTo(X(1.1), -X(0.1));
  ctx.lineTo(X(1.1), X(0.36));
  for (let i = 0; i <= 6; i++) {
    const x = 1 - (i / 6) * 1.0;
    ctx.quadraticCurveTo(X(x + 0.08), X(i % 2 ? 0.46 : 0.36), X(x), X(0.38));
  }
  ctx.lineTo(-X(0.1), X(0.36));
  ctx.closePath();
  paint(ctx, s, vgrad(ctx, s, '#ffffff', '#e6dcef', 0.05, 0.45), 0.025);
  // rizos de la crema
  ctx.strokeStyle = 'rgba(160, 130, 190, 0.5)';
  ctx.lineWidth = Math.max(1, s * 0.018);
  ctx.lineCap = 'round';
  for (const [x, y] of [
    [0.25, 0.22],
    [0.5, 0.28],
    [0.75, 0.2],
  ]) {
    ctx.beginPath();
    ctx.arc(X(x), X(y), X(0.07), Math.PI * 0.1, Math.PI * 0.9);
    ctx.stroke();
  }
  // moras sobre la crema
  for (const [x, y] of [
    [0.66, 0.22],
    [0.2, 0.3],
  ]) {
    ctx.beginPath();
    ctx.arc(X(x), X(y), X(0.05), 0, Math.PI * 2);
    paint(ctx, s, vgrad(ctx, s, '#7a3fc0', '#3d1470', y - 0.05, y + 0.05), 0.018);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.arc(X(x - 0.015), X(y - 0.018), X(0.013), 0, Math.PI * 2);
    ctx.fill();
  }
  // cereza
  ctx.beginPath();
  ctx.moveTo(X(0.42), X(0.1));
  ctx.quadraticCurveTo(X(0.46), X(0.0), X(0.54), -X(0.02));
  ctx.strokeStyle = '#4a7a26';
  ctx.lineWidth = Math.max(1, s * 0.022);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(X(0.4), X(0.14), X(0.065), 0, Math.PI * 2);
  paint(ctx, s, vgrad(ctx, s, '#ff4a4a', '#b51b23', 0.08, 0.2), 0.02);
  ctx.beginPath();
  ctx.arc(X(0.38), X(0.12), X(0.018), 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fill();
  finish(ctx, s);
}

/** Bolsa de papel kraft doblada (bloque "piedra"). */
function bag(ctx: Ctx, s: number) {
  const X = (v: number) => v * s;
  const g = ctx.createLinearGradient(0, 0, s, s);
  g.addColorStop(0, shade(C.stone, 0.18));
  g.addColorStop(1, shade(C.stone, -0.12));
  face(ctx, s, g);
  // pliegue de arriba con borde dentado
  ctx.fillStyle = shade(C.stone, -0.18);
  ctx.beginPath();
  ctx.moveTo(0, X(0.3));
  for (let k = 0; k <= 10; k++) ctx.lineTo((k / 10) * s, X(k % 2 ? 0.27 : 0.31));
  ctx.lineTo(s, 0);
  ctx.lineTo(0, 0);
  ctx.closePath();
  ctx.fill();
  // arrugas
  ctx.strokeStyle = 'rgba(80, 55, 30, 0.3)';
  ctx.lineWidth = Math.max(1, s * 0.015);
  ctx.beginPath();
  ctx.moveTo(X(0.18), X(0.45));
  ctx.lineTo(X(0.32), X(0.62));
  ctx.lineTo(X(0.26), X(0.85));
  ctx.moveTo(X(0.7), X(0.4));
  ctx.lineTo(X(0.62), X(0.66));
  ctx.lineTo(X(0.8), X(0.82));
  ctx.stroke();
  // grapa
  ctx.fillStyle = '#d8dde4';
  ctx.strokeStyle = 'rgba(60,60,70,0.5)';
  ctx.lineWidth = Math.max(1, s * 0.012);
  roundRect(ctx, X(0.4), X(0.15), X(0.2), X(0.045), X(0.02));
  ctx.fill();
  ctx.stroke();
  finish(ctx, s);
}

const FOOD: Record<Kind, (ctx: Ctx, s: number) => void> = {
  burger,
  pizza,
  fries,
  soda,
  donut,
  icecream,
  shake,
  stone: bag,
};

const fastfood: SkinDef = {
  id: 'fastfood',
  name: { es: 'Comida rápida', en: 'Fast Food' },
  description: {
    es: 'Hamburguesas, pizza, papas fritas, refrescos, donas, helados y batidos en una bandeja.',
    en: 'Burgers, pizza, fries, sodas, donuts, ice cream and milkshakes on a tray.',
  },
  price: 1500,
  order: 3.5,
  blocks: [C.burger, C.pizza, C.fries, C.soda, C.donut, C.icecream, C.shake, C.stone],
  ui: {
    bg: '#fbe9d7',
    panel: 'rgba(255, 252, 245, 0.95)',
    panelBorder: '#f0c39a',
    text: '#3b2314',
    textDim: '#86634a',
    accent: '#e8453c',
    accent2: MUSTARD,
    good: '#2fb36b',
    danger: '#d22f27',
    radius: 18,
    font: '"Segoe UI Rounded", "Arial Rounded MT Bold", "Nunito", "Segoe UI", system-ui, sans-serif',
    titleGlow: '0 3px 0 rgba(150, 40, 20, 0.35), 0 0 14px rgba(255, 194, 26, 0.55)',
  },
  blockMargin: 0.08,
  flash: '#fff3c4',
  explosion: { power: 1.25, ring: '#ffb703' },

  drawBackground(ctx, w, h) {
    // mantel de cuadros rojos y blancos (vichy)
    ctx.fillStyle = '#fff8ef';
    ctx.fillRect(0, 0, w, h);
    const step = 34;
    ctx.fillStyle = 'rgba(214, 48, 39, 0.42)';
    for (let x = 0; x < w; x += step * 2) ctx.fillRect(x, 0, step, h);
    for (let y = 0; y < h; y += step * 2) ctx.fillRect(0, y, w, step);
    // trama de tela
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    for (let k = -h; k < w; k += 6) {
      ctx.beginPath();
      ctx.moveTo(k, 0);
      ctx.lineTo(k + h, h);
      ctx.stroke();
    }
    // viñeta cálida
    const v = ctx.createRadialGradient(w / 2, h * 0.45, Math.min(w, h) * 0.3, w / 2, h * 0.45, Math.max(w, h) * 0.8);
    v.addColorStop(0, 'rgba(255, 236, 200, 0)');
    v.addColorStop(1, 'rgba(110, 30, 10, 0.35)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, w, h);
  },

  drawBoard(ctx, size, cell) {
    const pad = cell * 0.24;
    // bandeja de plástico oscura
    ctx.save();
    ctx.shadowColor = 'rgba(60, 10, 0, 0.45)';
    ctx.shadowBlur = cell * 0.45;
    ctx.shadowOffsetY = cell * 0.14;
    roundRect(ctx, -pad, -pad, size + pad * 2, size + pad * 2, cell * 0.4);
    ctx.fillStyle = '#3a2a24';
    ctx.fill();
    ctx.restore();
    const rim = ctx.createLinearGradient(0, -pad, 0, size + pad);
    rim.addColorStop(0, '#5a4239');
    rim.addColorStop(1, '#2b1e19');
    roundRect(ctx, -pad, -pad, size + pad * 2, size + pad * 2, cell * 0.4);
    ctx.fillStyle = rim;
    ctx.fill();
    roundRect(ctx, -pad * 0.4, -pad * 0.4, size + pad * 0.8, size + pad * 0.8, cell * 0.28);
    ctx.fillStyle = '#241915';
    ctx.fill();
    // papel encerado con borde dentado (detrás de las celdas)
    for (let y = 0; y < 8; y++)
      for (let x = 0; x < 8; x++) {
        const i = cell * 0.06;
        roundRect(ctx, x * cell + i, y * cell + i, cell - i * 2, cell - i * 2, cell * 0.18);
        const g = ctx.createLinearGradient(0, y * cell, 0, (y + 1) * cell);
        g.addColorStop(0, '#3b2c26');
        g.addColorStop(1, '#46352e');
        ctx.fillStyle = g;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 220, 180, 0.06)';
        ctx.lineWidth = Math.max(1, cell * 0.02);
        ctx.stroke();
      }
  },

  drawBlock(ctx, s, color, variant) {
    if (variant === 'ghost') {
      const i = s * 0.05;
      roundRect(ctx, i, i, s - i * 2, s - i * 2, s * RAD);
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = Math.max(1.5, s * 0.045);
      ctx.stroke();
      return;
    }
    const kind = variant === 'stone' ? 'stone' : kindOf(color);
    FOOD[kind](ctx, s);
  },

  drawGem(ctx, s) {
    drawGemIcon(ctx, s, '#ffd54a', '#ffffff');
  },

  drawTarget(ctx, s) {
    // estrella de "¡oferta!"
    ctx.save();
    ctx.shadowColor = 'rgba(80, 20, 0, 0.45)';
    ctx.shadowBlur = s * 0.06;
    ctx.shadowOffsetY = s * 0.02;
    star(ctx, s / 2, s / 2, s * 0.32, s * 0.2, 10);
    ctx.fillStyle = MUSTARD;
    ctx.fill();
    ctx.restore();
    star(ctx, s / 2, s / 2, s * 0.32, s * 0.2, 10);
    ctx.strokeStyle = KETCHUP;
    ctx.lineWidth = Math.max(1.5, s * 0.04);
    ctx.lineJoin = 'round';
    ctx.stroke();
    star(ctx, s / 2, s / 2, s * 0.11, s * 0.05, 5);
    ctx.fillStyle = KETCHUP;
    ctx.fill();
  },

  particles: {
    draw(ctx, s, color) {
      // chispitas de dona con el color de la baldosa
      const k = kindOf(color);
      const c = k === 'stone' ? '#e0c49c' : color;
      ctx.save();
      ctx.translate(s / 2, s / 2);
      ctx.rotate(0.6);
      roundRect(ctx, -s * 0.4, -s * 0.15, s * 0.8, s * 0.3, s * 0.15);
      ctx.fillStyle = shade(c, 0.1);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = Math.max(1, s * 0.08);
      ctx.stroke();
      ctx.restore();
    },
    perCell: 5,
    size: [0.16, 0.28],
    speed: [2.5, 6],
    gravity: 7,
    life: [0.6, 1.1],
    blend: 'normal',
    spin: true,
    shrink: false,
  },

  ambient: {
    // burbujitas de refresco que suben
    count: 14,
    draw(ctx, s) {
      ctx.beginPath();
      ctx.arc(s / 2, s / 2, s * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.lineWidth = Math.max(1, s * 0.08);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(s * 0.38, s * 0.36, s * 0.1, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    },
    size: [6, 14],
    speed: [-14, -30],
    alpha: [0.35, 0.7],
    blend: 'normal',
  },

  sound: {
    root: 64,
    scale: [0, 2, 4, 5, 7, 9],
    blip: 'square',
    sparkle: 'triangle',
    thump: 0.4,
    music: {
      bpm: 118,
      progression: [0, 3, 4, 3],
      pad: 'triangle',
      lead: 'square',
      bass: 'triangle',
      leadDensity: 0.42,
      padGain: 0.04,
      leadGain: 0.025,
      bassGain: 0.1,
      filter: 2200,
      reverb: 0.3,
      echo: 0.2,
      hats: true,
    },
  },
};

export default fastfood;
