import { roundRect } from './draw';
import type { Ctx } from './types';

/**
 * Ayudas para skins de "baldosa ilustrada": cada bloque ES un objeto que llena todo el
 * cuadrado (como Comida rápida o Cámara de Pruebas). Patrón de uso:
 *
 *   face(ctx, s, relleno);   // abre la cara con recorte activo
 *   ...dibujar el objeto en coordenadas 0..s...
 *   finish(ctx, s);          // cierra el recorte, borde y brillo
 */

/** Generador pseudoaleatorio con semilla (dibujos estables). */
export function rng(seed: number) {
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
export function vg(ctx: Ctx, s: number, top: string, bottom: string, y0 = 0, y1 = 1) {
  const g = ctx.createLinearGradient(0, y0 * s, 0, y1 * s);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  return g;
}

/** Degradado radial centrado en (x, y) con radio r (fracciones de s). */
export function rg(ctx: Ctx, s: number, x: number, y: number, r: number, stops: Array<[number, string]>) {
  const g = ctx.createRadialGradient(x * s, y * s, 0, x * s, y * s, r * s);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}

/** Círculo como trazo actual (fracciones de s). */
export function circ(ctx: Ctx, s: number, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.arc(x * s, y * s, r * s, 0, Math.PI * 2);
}

/** Elipse como trazo actual (fracciones de s). */
export function ell(ctx: Ctx, s: number, x: number, y: number, rx: number, ry: number, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x * s, y * s, rx * s, ry * s, rot, 0, Math.PI * 2);
}

/** Polígono como trazo actual (pares de fracciones de s). */
export function poly(ctx: Ctx, s: number, pts: Array<[number, number]>) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * s, y * s) : ctx.moveTo(x * s, y * s)));
  ctx.closePath();
}

/** Rellena el trazo actual y lo contornea. */
export function paint(ctx: Ctx, s: number, fill: string | CanvasGradient, ink: string, line = 0.025) {
  ctx.fillStyle = fill;
  ctx.fill();
  if (line > 0) {
    ctx.strokeStyle = ink;
    ctx.lineWidth = Math.max(1, s * line);
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
}

/** Puntitos de brillo (estrellas, azúcar, chispas). */
export function dots(ctx: Ctx, s: number, seed: number, n: number, color: string, r: [number, number], area = [0, 0, 1, 1]) {
  const rand = rng(seed);
  ctx.fillStyle = color;
  for (let i = 0; i < n; i++) {
    circ(ctx, s, area[0] + rand() * (area[2] - area[0]), area[1] + rand() * (area[3] - area[1]), r[0] + rand() * (r[1] - r[0]));
    ctx.fill();
  }
}

export interface FaceStyle {
  /** Margen interior (fracción de s). */
  inset?: number;
  /** Radio de esquinas (fracción de s). */
  rad?: number;
  /** Color del contorno. */
  ink?: string;
  /** Sombra del canto inferior (rgba) o null para no dibujarla. */
  depth?: string | null;
  /** Intensidad del brillo superior izquierdo 0..1. */
  shine?: number;
  /** Grosor del contorno (fracción de s). */
  line?: number;
  /** Sombreado suave en la mitad inferior para dar volumen 0..1. */
  soft?: number;
}

const DEF: Required<FaceStyle> = { inset: 0.05, rad: 0.14, ink: '#1c1410', depth: 'rgba(0,0,0,0.4)', shine: 0.22, line: 0.035, soft: 0 };

/** Abre la cara del bloque: cuadrado redondeado con recorte activo. Cerrar con `finish`. */
export function face(ctx: Ctx, s: number, fill: string | CanvasGradient, st: FaceStyle = {}) {
  const o = { ...DEF, ...st };
  const i = s * o.inset;
  if (o.depth) {
    roundRect(ctx, i, i + s * 0.025, s - i * 2, s - i * 2, s * o.rad);
    ctx.fillStyle = o.depth;
    ctx.fill();
  }
  ctx.save();
  roundRect(ctx, i, i, s - i * 2, s - i * 2, s * o.rad);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.clip();
}

/** Cierra la cara: brillo, borde y reflejo. */
export function finish(ctx: Ctx, s: number, st: FaceStyle = {}) {
  const o = { ...DEF, ...st };
  if (o.soft > 0) {
    const sg = ctx.createLinearGradient(0, s * 0.45, 0, s);
    sg.addColorStop(0, 'rgba(0,0,0,0)');
    sg.addColorStop(1, `rgba(0,0,0,${o.soft})`);
    ctx.fillStyle = sg;
    ctx.fillRect(0, 0, s, s);
  }
  if (o.shine > 0) {
    const hl = ctx.createLinearGradient(0, 0, s * 0.6, s * 0.6);
    hl.addColorStop(0, `rgba(255,255,255,${o.shine})`);
    hl.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hl;
    ctx.fillRect(0, 0, s, s);
  }
  ctx.restore();
  const i = s * o.inset;
  roundRect(ctx, i, i, s - i * 2, s - i * 2, s * o.rad);
  ctx.strokeStyle = o.ink;
  ctx.lineWidth = Math.max(1, s * o.line);
  ctx.stroke();
  if (o.shine > 0) {
    ctx.strokeStyle = `rgba(255,255,255,${Math.min(0.7, o.shine * 2.4)})`;
    ctx.lineWidth = Math.max(1, s * 0.022);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(s * 0.16, s * 0.12);
    ctx.lineTo(s * 0.34, s * 0.12);
    ctx.stroke();
  }
}

/** Sombra de "pieza arrastrada": cuadrado translúcido con borde. */
export function ghostTile(ctx: Ctx, s: number, rad = 0.14, fill = 'rgba(255,255,255,0.25)', edge = 'rgba(255,255,255,0.9)') {
  const i = s * 0.05;
  roundRect(ctx, i, i, s - i * 2, s - i * 2, s * rad);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = Math.max(1.5, s * 0.045);
  ctx.stroke();
}

/** Construye `kindOf(color)` a partir del mapa nombre → color. */
export function kinds<K extends string>(map: Record<K, string>, fallback: NoInfer<K>) {
  const rev = Object.fromEntries(Object.entries(map).map(([k, v]) => [(v as string).toLowerCase(), k])) as Record<string, K>;
  return (color: string): K => rev[color.toLowerCase()] ?? fallback;
}

/** Celdas vacías estándar (8×8) con un pintor por celda. */
export function cells(ctx: Ctx, cell: number, paintCell: (x: number, y: number, px: number, py: number) => void) {
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) paintCell(x, y, x * cell, y * cell);
}
