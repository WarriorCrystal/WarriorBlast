import { drawGemIcon, roundRect, shade, star } from '../draw';
import type { Ctx, SkinDef } from '../types';

/**
 * BOCA JUNIORS — azul y oro. Cada bloque llena todo el cuadrado:
 *   escudo del club · Copa Libertadores · mitad azul y mitad amarilla · bandera de Suecia
 *   franja azul y oro · un 12 con los colores del escudo · La Bombonera de noche
 * Los bloques "piedra" son tablones de cemento de la tribuna con una franja azul y oro.
 * El tablero es un marco azul con borde dorado y cae papelito en el fondo.
 */

const C = {
  escudo: '#0d2f6e',
  copa: '#f5b800',
  mitad: '#1f5fbf',
  suecia: '#006aa7',
  franja: '#163a80',
  doce: '#12306e',
  bombonera: '#ffd23f',
  stone: '#8f969e',
};

type Kind = keyof typeof C;

const KIND: Record<string, Kind> = Object.fromEntries(
  Object.entries(C).map(([k, v]) => [v, k as Kind]),
) as Record<string, Kind>;

const kindOf = (color: string): Kind => KIND[color.toLowerCase()] ?? 'escudo';

const NAVY = '#0a2558';
const BLUE = '#1450a8';
const GOLD = '#ffc72c';
const GOLD_DARK = '#d99a00';
const INK = '#06142e';
const SWE_BLUE = '#006aa7';
const SWE_YELLOW = '#fecc02';

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

function vgrad(ctx: Ctx, s: number, top: string, bottom: string, y0: number, y1: number) {
  const g = ctx.createLinearGradient(0, y0 * s, 0, y1 * s);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  return g;
}

/** Rellena el trazo actual y lo contornea con tinta. */
function paint(ctx: Ctx, s: number, fill: string | CanvasGradient, line = 0.025, ink = INK) {
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.lineWidth = Math.max(1, s * line);
  ctx.lineJoin = 'round';
  ctx.stroke();
}

const IN = 0.05;
const RAD = 0.14;

/** Abre la cara del bloque: cuadrado redondeado con recorte activo. Cerrar con `finish`. */
function face(ctx: Ctx, s: number, fill: string | CanvasGradient) {
  const i = s * IN;
  roundRect(ctx, i, i + s * 0.025, s - i * 2, s - i * 2, s * RAD);
  ctx.fillStyle = 'rgba(2, 8, 24, 0.55)';
  ctx.fill();
  ctx.save();
  roundRect(ctx, i, i, s - i * 2, s - i * 2, s * RAD);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.clip();
}

/** Cierra la cara: brillo, borde dorado fino y contorno oscuro. */
function finish(ctx: Ctx, s: number) {
  const hl = ctx.createLinearGradient(0, 0, s * 0.6, s * 0.6);
  hl.addColorStop(0, 'rgba(255,255,255,0.2)');
  hl.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = hl;
  ctx.fillRect(0, 0, s, s);
  ctx.restore();
  const i = s * IN;
  roundRect(ctx, i, i, s - i * 2, s - i * 2, s * RAD);
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1.2, s * 0.035);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = Math.max(1, s * 0.022);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(s * 0.16, s * 0.12);
  ctx.lineTo(s * 0.34, s * 0.12);
  ctx.stroke();
}

/* ---------------------------------- bloques ---------------------------------- */

/** Contorno del escudo (puntas arriba con muesca al centro, punta abajo), centrado en (0.5, 0.52). */
function shieldPath(ctx: Ctx, s: number, k: number) {
  const kk = k * 0.88;
  const P = (x: number, y: number): [number, number] => [(0.5 + (x - 0.5) * kk * 0.86) * s, (0.52 + (y - 0.52) * kk) * s];
  ctx.beginPath();
  ctx.moveTo(...P(0.05, 0.2));
  ctx.lineTo(...P(0.3, 0.04));
  ctx.quadraticCurveTo(...P(0.4, 0.12), ...P(0.5, 0.12));
  ctx.quadraticCurveTo(...P(0.6, 0.12), ...P(0.7, 0.04));
  ctx.lineTo(...P(0.95, 0.2));
  ctx.bezierCurveTo(...P(0.95, 0.5), ...P(0.92, 0.66), ...P(0.86, 0.75));
  ctx.quadraticCurveTo(...P(0.74, 0.9), ...P(0.5, 0.98));
  ctx.quadraticCurveTo(...P(0.26, 0.9), ...P(0.14, 0.75));
  ctx.bezierCurveTo(...P(0.08, 0.66), ...P(0.05, 0.5), ...P(0.05, 0.2));
  ctx.closePath();
}

const SLAB = '"Rockwell Extra Bold", "Rockwell", "Arial Black", "Segoe UI Black", sans-serif';

/** Texto ajustado a un ancho máximo (escala horizontal). */
function fitText(ctx: Ctx, text: string, x: number, y: number, px: number, maxW: number) {
  ctx.font = `900 ${Math.max(6, px)}px ${SLAB}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const w = ctx.measureText(text).width;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(Math.min(1, maxW / Math.max(1, w)), 1);
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

function escudo(ctx: Ctx, s: number) {
  const X = (v: number) => v * s;
  face(ctx, s, vgrad(ctx, s, '#123a86', '#061637', 0, 1));
  // aro dorado exterior
  shieldPath(ctx, s, 1);
  ctx.fillStyle = vgrad(ctx, s, '#ffd24a', '#f0a800', 0, 1);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1, s * 0.022);
  ctx.lineJoin = 'round';
  ctx.stroke();
  // anillo azul
  shieldPath(ctx, s, 0.88);
  ctx.fillStyle = NAVY;
  ctx.fill();
  // filete dorado
  shieldPath(ctx, s, 0.82);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = Math.max(1, s * 0.014);
  ctx.stroke();
  // interior con la franja
  ctx.save();
  shieldPath(ctx, s, 0.8);
  ctx.clip();
  ctx.fillStyle = vgrad(ctx, s, '#1b3f86', '#0c2458', 0.1, 0.95);
  ctx.fillRect(0, 0, s, s);
  ctx.fillStyle = vgrad(ctx, s, '#ffd24a', '#f2ac00', 0.34, 0.54);
  ctx.fillRect(0, X(0.36), s, X(0.17));
  ctx.restore();
  ctx.fillStyle = NAVY;
  fitText(ctx, 'CABJ', X(0.5), X(0.448), X(0.14), X(0.5));
  // brillo
  ctx.beginPath();
  ctx.ellipse(X(0.3), X(0.22), X(0.09), X(0.025), -0.35, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fill();
  finish(ctx, s);
}

function copa(ctx: Ctx, s: number) {
  const X = (v: number) => v * s;
  // fondo dorado con rayos de gloria
  const bg = ctx.createRadialGradient(X(0.5), X(0.3), 0, X(0.5), X(0.3), X(0.85));
  bg.addColorStop(0, '#fff2a8');
  bg.addColorStop(0.45, '#ffc72c');
  bg.addColorStop(1, '#c98a00');
  face(ctx, s, bg);
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(X(0.5), X(0.3));
    ctx.lineTo(X(0.5) + Math.cos(a - 0.09) * X(1.2), X(0.3) + Math.sin(a - 0.09) * X(1.2));
    ctx.lineTo(X(0.5) + Math.cos(a + 0.09) * X(1.2), X(0.3) + Math.sin(a + 0.09) * X(1.2));
    ctx.closePath();
    ctx.fill();
  }
  const silver = () => {
    const g = ctx.createLinearGradient(X(0.36), 0, X(0.64), 0);
    g.addColorStop(0, '#7d8798');
    g.addColorStop(0.32, '#ffffff');
    g.addColorStop(0.6, '#c3ccd8');
    g.addColorStop(1, '#5f6a7c');
    return g;
  };
  const lw = 0.022;
  ctx.save();
  ctx.translate(X(0.5), X(0.52));
  ctx.scale(0.88, 0.88);
  ctx.translate(-X(0.5), -X(0.52));
  // base escalonada de madera con placas
  ctx.beginPath();
  ctx.moveTo(X(0.36), X(0.64));
  ctx.lineTo(X(0.64), X(0.64));
  ctx.lineTo(X(0.64), X(0.67));
  ctx.lineTo(X(0.67), X(0.67));
  ctx.lineTo(X(0.67), X(0.7));
  ctx.lineTo(X(0.69), X(0.7));
  ctx.lineTo(X(0.7), X(0.93));
  ctx.lineTo(X(0.72), X(0.93));
  ctx.lineTo(X(0.72), X(0.97));
  ctx.lineTo(X(0.28), X(0.97));
  ctx.lineTo(X(0.28), X(0.93));
  ctx.lineTo(X(0.3), X(0.93));
  ctx.lineTo(X(0.31), X(0.7));
  ctx.lineTo(X(0.33), X(0.7));
  ctx.lineTo(X(0.33), X(0.67));
  ctx.lineTo(X(0.36), X(0.67));
  ctx.closePath();
  paint(ctx, s, vgrad(ctx, s, '#6b3a18', '#3a1c0a', 0.64, 0.97), lw);
  ctx.fillStyle = 'rgba(255, 210, 90, 0.85)';
  for (let row = 0; row < 2; row++)
    for (let col = 0; col < 4; col++) ctx.fillRect(X(0.36 + col * 0.075), X(0.76 + row * 0.08), X(0.05), X(0.035));
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(X(0.33), X(0.7), X(0.04), X(0.23));
  // columna acampanada
  ctx.beginPath();
  ctx.moveTo(X(0.465), X(0.45));
  ctx.lineTo(X(0.535), X(0.45));
  ctx.quadraticCurveTo(X(0.55), X(0.6), X(0.63), X(0.64));
  ctx.lineTo(X(0.37), X(0.64));
  ctx.quadraticCurveTo(X(0.45), X(0.6), X(0.465), X(0.45));
  ctx.closePath();
  paint(ctx, s, silver(), lw);
  // cuello
  roundRect(ctx, X(0.44), X(0.405), X(0.12), X(0.05), X(0.015));
  paint(ctx, s, silver(), lw);
  // aletas laterales (trompetas)
  for (const d of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(X(0.5 + d * 0.13), X(0.268));
    ctx.lineTo(X(0.5 + d * 0.19), X(0.272));
    ctx.lineTo(X(0.5 + d * 0.235), X(0.235));
    ctx.lineTo(X(0.5 + d * 0.235), X(0.345));
    ctx.lineTo(X(0.5 + d * 0.19), X(0.308));
    ctx.lineTo(X(0.5 + d * 0.13), X(0.312));
    ctx.closePath();
    paint(ctx, s, silver(), lw);
  }
  // esfera
  ctx.beginPath();
  ctx.arc(X(0.5), X(0.29), X(0.135), 0, Math.PI * 2);
  const sph = ctx.createRadialGradient(X(0.45), X(0.23), X(0.01), X(0.5), X(0.29), X(0.15));
  sph.addColorStop(0, '#ffffff');
  sph.addColorStop(0.5, '#c9d1dc');
  sph.addColorStop(1, '#6b7586');
  paint(ctx, s, sph, lw);
  // franja ecuatorial con dos ranuras
  ctx.save();
  ctx.beginPath();
  ctx.arc(X(0.5), X(0.29), X(0.135), 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = 'rgba(90, 100, 115, 0.35)';
  ctx.fillRect(0, X(0.265), s, X(0.05));
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1, s * 0.012);
  for (const y of [0.262, 0.318]) {
    ctx.beginPath();
    ctx.moveTo(X(0.36), X(y));
    ctx.quadraticCurveTo(X(0.5), X(y + 0.012), X(0.64), X(y));
    ctx.stroke();
  }
  ctx.restore();
  // platito y jugador pateando
  roundRect(ctx, X(0.46), X(0.145), X(0.08), X(0.02), X(0.008));
  paint(ctx, s, silver(), 0.015);
  ctx.strokeStyle = '#3a4250';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(1.5, s * 0.026);
  ctx.beginPath();
  ctx.moveTo(X(0.485), X(0.145)); // pierna de apoyo
  ctx.lineTo(X(0.49), X(0.11));
  ctx.lineTo(X(0.5), X(0.085)); // torso
  ctx.lineTo(X(0.505), X(0.055));
  ctx.moveTo(X(0.5), X(0.09)); // pierna que patea
  ctx.lineTo(X(0.545), X(0.11));
  ctx.lineTo(X(0.565), X(0.135));
  ctx.moveTo(X(0.445), X(0.06)); // brazos
  ctx.lineTo(X(0.505), X(0.065));
  ctx.lineTo(X(0.555), X(0.08));
  ctx.stroke();
  ctx.fillStyle = '#3a4250';
  ctx.beginPath();
  ctx.arc(X(0.508), X(0.035), X(0.018), 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(X(0.535), X(0.135), X(0.011), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // destello
  star(ctx, X(0.44), X(0.23), X(0.05), X(0.012), 4);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  finish(ctx, s);
}

function mitad(ctx: Ctx, s: number) {
  const X = (v: number) => v * s;
  face(ctx, s, vgrad(ctx, s, '#2a6fd6', '#0c3277', 0, 1));
  // mitad amarilla (diagonal)
  ctx.beginPath();
  ctx.moveTo(-X(0.1), -X(0.1));
  ctx.lineTo(X(1.1), -X(0.1));
  ctx.lineTo(-X(0.1), X(1.1));
  ctx.closePath();
  ctx.fillStyle = vgrad(ctx, s, '#ffe066', '#f2a900', 0, 0.9);
  ctx.fill();
  // costura
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1, s * 0.03);
  ctx.beginPath();
  ctx.moveTo(X(1.1), -X(0.1));
  ctx.lineTo(-X(0.1), X(1.1));
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = Math.max(1, s * 0.012);
  ctx.setLineDash([X(0.04), X(0.03)]);
  ctx.beginPath();
  ctx.moveTo(X(1.1), -X(0.04));
  ctx.lineTo(-X(0.04), X(1.1));
  ctx.stroke();
  ctx.setLineDash([]);
  // brillos en cada mitad
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.ellipse(X(0.3), X(0.28), X(0.12), X(0.04), -0.78, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.beginPath();
  ctx.ellipse(X(0.72), X(0.7), X(0.12), X(0.04), -0.78, 0, Math.PI * 2);
  ctx.fill();
  finish(ctx, s);
}

function suecia(ctx: Ctx, s: number) {
  const X = (v: number) => v * s;
  face(ctx, s, vgrad(ctx, s, shade(SWE_BLUE, 0.12), shade(SWE_BLUE, -0.25), 0, 1));
  // cruz nórdica (proporción 5:2:9 × 4:2:4 adaptada al cuadrado)
  ctx.fillStyle = vgrad(ctx, s, shade(SWE_YELLOW, 0.15), shade(SWE_YELLOW, -0.1), 0, 1);
  ctx.fillRect(X(0.29), -X(0.1), X(0.17), X(1.2));
  ctx.fillRect(-X(0.1), X(0.415), X(1.2), X(0.17));
  // ondulación de tela
  for (let k = 0; k < 3; k++) {
    const g = ctx.createLinearGradient(X(k * 0.36), 0, X(k * 0.36 + 0.36), 0);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.14)');
    g.addColorStop(1, 'rgba(0,0,0,0.12)');
    ctx.fillStyle = g;
    ctx.fillRect(X(k * 0.36), 0, X(0.36), s);
  }
  finish(ctx, s);
}

/** Un "12" gigante con los colores del escudo: azul, franja de oro y filete dorado. */
/** Base azul con franja de oro y filete dorado (los colores del escudo). */
function franjaBase(ctx: Ctx, s: number) {
  const X = (v: number) => v * s;
  face(ctx, s, vgrad(ctx, s, '#1b3f86', '#0a2152', 0, 1));
  // franja dorada
  ctx.fillStyle = vgrad(ctx, s, '#ffd24a', '#f2ac00', 0.36, 0.64);
  ctx.fillRect(0, X(0.36), s, X(0.28));
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1, s * 0.016);
  ctx.beginPath();
  ctx.moveTo(0, X(0.36));
  ctx.lineTo(s, X(0.36));
  ctx.moveTo(0, X(0.64));
  ctx.lineTo(s, X(0.64));
  ctx.stroke();
  // filete dorado interior
  roundRect(ctx, X(0.11), X(0.11), X(0.78), X(0.78), X(0.08));
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = Math.max(1, s * 0.018);
  ctx.stroke();
}

/** Bloque liso con la franja de oro, como el del 12 pero sin número. */
function franja(ctx: Ctx, s: number) {
  franjaBase(ctx, s);
  finish(ctx, s);
}

function doce(ctx: Ctx, s: number) {
  const X = (v: number) => v * s;
  franjaBase(ctx, s);
  // "12" azul con contorno dorado
  const px = X(0.66);
  ctx.font = `900 ${Math.max(6, px)}px ${SLAB}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const w = ctx.measureText('12').width;
  ctx.save();
  ctx.translate(X(0.5), X(0.52));
  ctx.scale(Math.min(1.1, X(0.7) / Math.max(1, w)), 1);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(2, px * 0.2);
  ctx.strokeText('12', 0, 0);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = Math.max(1.5, px * 0.12);
  ctx.strokeText('12', 0, 0);
  ctx.fillStyle = NAVY;
  ctx.fillText('12', 0, 0);
  ctx.restore();
  finish(ctx, s);
}

function bombonera(ctx: Ctx, s: number) {
  const X = (v: number) => v * s;
  // cielo nocturno
  face(ctx, s, vgrad(ctx, s, '#05102e', '#1b2d6b', 0, 0.4));
  // reflectores
  for (const x of [0.16, 0.84]) {
    const g = ctx.createRadialGradient(X(x), X(0.1), 0, X(x), X(0.1), X(0.3));
    g.addColorStop(0, 'rgba(255, 250, 220, 0.9)');
    g.addColorStop(0.2, 'rgba(255, 240, 180, 0.35)');
    g.addColorStop(1, 'rgba(255, 240, 180, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, X(0.5));
    ctx.fillStyle = '#fffbe6';
    ctx.fillRect(X(x - 0.06), X(0.07), X(0.12), X(0.05));
  }
  // tribunas en bandas azul y oro (curvas, de arriba hacia abajo)
  const rows: Array<[number, string]> = [
    [0.26, BLUE],
    [0.36, GOLD],
    [0.46, BLUE],
    [0.56, GOLD],
    [0.64, BLUE],
  ];
  for (const [y, col] of rows) {
    ctx.beginPath();
    ctx.moveTo(-X(0.1), X(y + 0.04));
    ctx.quadraticCurveTo(X(0.5), X(y - 0.05), X(1.1), X(y + 0.04));
    ctx.lineTo(X(1.1), X(1.1));
    ctx.lineTo(-X(0.1), X(1.1));
    ctx.closePath();
    ctx.fillStyle = vgrad(ctx, s, shade(col, 0.1), shade(col, -0.2), y, y + 0.1);
    ctx.fill();
    ctx.strokeStyle = 'rgba(2, 8, 24, 0.55)';
    ctx.lineWidth = Math.max(1, s * 0.012);
    ctx.stroke();
  }
  // hinchada (puntitos)
  const r = rng(12);
  for (let k = 0; k < 70; k++) {
    const x = r();
    const y = 0.28 + r() * 0.42;
    ctx.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.55)' : 'rgba(10, 20, 50, 0.45)';
    ctx.fillRect(X(x), X(y), X(0.014), X(0.014));
  }
  // cancha
  ctx.beginPath();
  ctx.moveTo(-X(0.1), X(0.78));
  ctx.quadraticCurveTo(X(0.5), X(0.7), X(1.1), X(0.78));
  ctx.lineTo(X(1.1), X(1.1));
  ctx.lineTo(-X(0.1), X(1.1));
  ctx.closePath();
  paint(ctx, s, vgrad(ctx, s, '#3fb85c', '#1f7a36', 0.74, 1), 0.015);
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = Math.max(1, s * 0.012);
  ctx.beginPath();
  ctx.ellipse(X(0.5), X(0.88), X(0.14), X(0.045), 0, 0, Math.PI * 2);
  ctx.moveTo(X(0.5), X(0.74));
  ctx.lineTo(X(0.5), X(1));
  ctx.stroke();
  // papelitos
  const p = rng(77);
  for (let k = 0; k < 16; k++) {
    ctx.save();
    ctx.translate(X(p()), X(0.12 + p() * 0.6));
    ctx.rotate(p() * Math.PI);
    ctx.fillStyle = k % 2 ? '#ffffff' : GOLD;
    ctx.fillRect(-X(0.012), -X(0.008), X(0.024), X(0.016));
    ctx.restore();
  }
  finish(ctx, s);
}

/** Tablón de cemento de la tribuna con una franja azul y oro pintada (bloque "piedra"). */
function tablon(ctx: Ctx, s: number) {
  const X = (v: number) => v * s;
  const g = ctx.createLinearGradient(0, 0, s, s);
  g.addColorStop(0, shade(C.stone, 0.2));
  g.addColorStop(1, shade(C.stone, -0.18));
  face(ctx, s, g);
  // escalones
  ctx.fillStyle = 'rgba(30, 34, 40, 0.28)';
  ctx.fillRect(0, X(0.32), s, X(0.04));
  ctx.fillRect(0, X(0.68), s, X(0.04));
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(0, X(0.36), s, X(0.02));
  ctx.fillRect(0, X(0.72), s, X(0.02));
  // grano del cemento
  const r = rng(9);
  for (let k = 0; k < 40; k++) {
    ctx.fillStyle = r() < 0.5 ? 'rgba(40,44,50,0.25)' : 'rgba(255,255,255,0.2)';
    ctx.fillRect(X(r()), X(r()), X(0.012), X(0.012));
  }
  // franja azul y oro pintada, algo gastada
  ctx.fillStyle = "rgba(20, 80, 168, 0.55)";
  ctx.fillRect(0, X(0.42), s, X(0.06));
  ctx.fillStyle = "rgba(255, 199, 44, 0.65)";
  ctx.fillRect(0, X(0.48), s, X(0.06));
  ctx.fillStyle = "rgba(20, 80, 168, 0.55)";
  ctx.fillRect(0, X(0.54), s, X(0.06));
  // grieta
  ctx.strokeStyle = 'rgba(30, 34, 40, 0.45)';
  ctx.lineWidth = Math.max(1, s * 0.012);
  ctx.beginPath();
  ctx.moveTo(X(0.78), X(0.1));
  ctx.lineTo(X(0.72), X(0.22));
  ctx.lineTo(X(0.8), X(0.3));
  ctx.stroke();
  finish(ctx, s);
}

const DRAW: Record<Kind, (ctx: Ctx, s: number) => void> = {
  escudo,
  copa,
  mitad,
  suecia,
  franja,
  doce,
  bombonera,
  stone: tablon,
};

/** Color de papelito para cada tipo de bloque. */
const CONFETTI: Record<Kind, string> = {
  escudo: '#2a6fd6',
  copa: GOLD,
  mitad: GOLD,
  suecia: SWE_YELLOW,
  franja: GOLD,
  doce: GOLD,
  bombonera: GOLD,
  stone: '#c3c9d1',
};

const boca: SkinDef = {
  id: 'boca',
  name: { es: 'Boca Juniors', en: 'Boca Juniors' },
  description: {
    es: 'Azul y oro: escudo, Libertadores, la franja, el 12, Bombonera y la bandera de Suecia.',
    en: 'Blue and gold: crest, Libertadores cup, the gold stripe, the 12, La Bombonera and the Swedish flag.',
  },
  price: 1905,
  order: 4.5,
  blocks: [C.escudo, C.copa, C.mitad, C.suecia, C.franja, C.doce, C.bombonera, C.stone],
  ui: {
    bg: '#071a40',
    panel: 'rgba(12, 36, 86, 0.94)',
    panelBorder: GOLD,
    text: '#ffffff',
    textDim: '#b5c4e4',
    accent: GOLD,
    accent2: '#3a7fe0',
    good: '#3ccf6e',
    danger: '#ff5a5a',
    radius: 16,
    font: '"Segoe UI", "Arial Rounded MT Bold", system-ui, sans-serif',
    titleGlow: '0 3px 0 rgba(0, 20, 60, 0.8), 0 0 16px rgba(255, 199, 44, 0.6)',
    swatches: [GOLD, '#3a7fe0', '#ffe066', '#1a9be0', '#f2a900', '#ffd24a', '#7fb2ff'],
  },
  blockMargin: 0.08,
  flash: '#fff3b0',
  explosion: { power: 1.35, ring: '#f5c400', rings: 2 },

  drawBackground(ctx, w, h) {
    // azul profundo con la franja de oro atravesando la pantalla
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#0d2b66');
    g.addColorStop(1, '#04112e');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    const band = ctx.createLinearGradient(0, h * 0.36, 0, h * 0.58);
    band.addColorStop(0, 'rgba(255, 199, 44, 0)');
    band.addColorStop(0.15, 'rgba(255, 199, 44, 0.32)');
    band.addColorStop(0.85, 'rgba(240, 168, 0, 0.32)');
    band.addColorStop(1, 'rgba(240, 168, 0, 0)');
    ctx.fillStyle = band;
    ctx.fillRect(0, h * 0.36, w, h * 0.22);
    // rayado de tela de camiseta
    ctx.strokeStyle = 'rgba(255,255,255,0.035)';
    ctx.lineWidth = 2;
    for (let k = -h; k < w; k += 9) {
      ctx.beginPath();
      ctx.moveTo(k, 0);
      ctx.lineTo(k + h, h);
      ctx.stroke();
    }
    // papelitos quietos
    const r = rng(1905);
    for (let k = 0; k < 90; k++) {
      ctx.save();
      ctx.translate(r() * w, r() * h);
      ctx.rotate(r() * Math.PI);
      ctx.fillStyle = r() < 0.5 ? 'rgba(255, 210, 63, 0.35)' : 'rgba(255, 255, 255, 0.22)';
      ctx.fillRect(-4, -2.5, 8, 5);
      ctx.restore();
    }
    // viñeta
    const v = ctx.createRadialGradient(w / 2, h * 0.45, Math.min(w, h) * 0.3, w / 2, h * 0.45, Math.max(w, h) * 0.8);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0, 4, 16, 0.6)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, w, h);
  },

  drawBoard(ctx, size, cell) {
    const pad = cell * 0.24;
    ctx.save();
    ctx.shadowColor = 'rgba(255, 199, 44, 0.35)';
    ctx.shadowBlur = cell * 0.5;
    roundRect(ctx, -pad, -pad, size + pad * 2, size + pad * 2, cell * 0.36);
    ctx.fillStyle = '#071a40';
    ctx.fill();
    ctx.restore();
    // marco dorado
    const rim = ctx.createLinearGradient(0, -pad, 0, size + pad);
    rim.addColorStop(0, '#ffe27a');
    rim.addColorStop(0.5, GOLD);
    rim.addColorStop(1, GOLD_DARK);
    roundRect(ctx, -pad, -pad, size + pad * 2, size + pad * 2, cell * 0.36);
    ctx.fillStyle = rim;
    ctx.fill();
    roundRect(ctx, -pad * 0.55, -pad * 0.55, size + pad * 1.1, size + pad * 1.1, cell * 0.28);
    ctx.fillStyle = '#06163a';
    ctx.fill();
    for (let y = 0; y < 8; y++)
      for (let x = 0; x < 8; x++) {
        const i = cell * 0.06;
        roundRect(ctx, x * cell + i, y * cell + i, cell - i * 2, cell - i * 2, cell * 0.16);
        const g = ctx.createLinearGradient(0, y * cell, 0, (y + 1) * cell);
        g.addColorStop(0, '#0b2453');
        g.addColorStop(1, '#0e2b62');
        ctx.fillStyle = g;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 199, 44, 0.08)';
        ctx.lineWidth = Math.max(1, cell * 0.02);
        ctx.stroke();
      }
  },

  drawBlock(ctx, s, color, variant) {
    if (variant === 'ghost') {
      const i = s * IN;
      roundRect(ctx, i, i, s - i * 2, s - i * 2, s * RAD);
      ctx.fillStyle = 'rgba(255, 199, 44, 0.22)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 230, 140, 0.95)';
      ctx.lineWidth = Math.max(1.5, s * 0.045);
      ctx.stroke();
      return;
    }
    const kind = variant === 'stone' ? 'stone' : kindOf(color);
    DRAW[kind](ctx, s);
  },

  drawGem(ctx, s) {
    drawGemIcon(ctx, s, '#7fd0ff', '#ffffff');
  },

  drawTarget(ctx, s) {
    // estrella dorada de campeón
    ctx.save();
    ctx.shadowColor = 'rgba(0, 10, 40, 0.6)';
    ctx.shadowBlur = s * 0.06;
    ctx.shadowOffsetY = s * 0.02;
    star(ctx, s / 2, s / 2, s * 0.33, s * 0.14, 5);
    ctx.fillStyle = GOLD;
    ctx.fill();
    ctx.restore();
    star(ctx, s / 2, s / 2, s * 0.33, s * 0.14, 5);
    ctx.strokeStyle = NAVY;
    ctx.lineWidth = Math.max(1.5, s * 0.04);
    ctx.lineJoin = 'round';
    ctx.stroke();
  },

  particles: {
    draw(ctx, s, color) {
      // papelitos con los colores del club
      const c = CONFETTI[kindOf(color)];
      ctx.save();
      ctx.translate(s / 2, s / 2);
      ctx.rotate(0.5);
      ctx.fillStyle = c;
      ctx.fillRect(-s * 0.4, -s * 0.24, s * 0.8, s * 0.48);
      ctx.strokeStyle = 'rgba(6, 20, 46, 0.6)';
      ctx.lineWidth = Math.max(1, s * 0.06);
      ctx.strokeRect(-s * 0.4, -s * 0.24, s * 0.8, s * 0.48);
      ctx.restore();
    },
    perCell: 6,
    size: [0.14, 0.26],
    speed: [2.5, 6.5],
    gravity: 6,
    life: [0.7, 1.2],
    blend: 'normal',
    spin: true,
    shrink: false,
  },

  ambient: {
    // papelitos cayendo sobre la cancha
    count: 18,
    draw(ctx, s) {
      ctx.save();
      ctx.translate(s / 2, s / 2);
      ctx.rotate(0.4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-s * 0.4, -s * 0.25, s * 0.8, s * 0.5);
      ctx.restore();
    },
    size: [5, 11],
    speed: [12, 26],
    alpha: [0.3, 0.65],
    blend: 'normal',
  },

  sound: {
    root: 62,
    scale: [0, 2, 4, 5, 7, 9, 11],
    blip: 'triangle',
    sparkle: 'square',
    thump: 0.55,
    music: {
      bpm: 128,
      progression: [0, 4, 5, 3],
      pad: 'sawtooth',
      lead: 'square',
      bass: 'triangle',
      leadDensity: 0.45,
      padGain: 0.03,
      leadGain: 0.025,
      bassGain: 0.11,
      filter: 1900,
      reverb: 0.35,
      echo: 0.18,
      hats: true,
    },
  },
};

export default boca;
