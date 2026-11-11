import type { Ctx } from './types';

/** Utilidades de dibujo compartidas por las skins. */

export function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgba(hex: string, a: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

/** Aclara (amt>0) u oscurece (amt<0) un color. amt ∈ [-1, 1]. */
export function shade(hex: string, amt: number): string {
  const [r, g, b] = hexToRgb(hex);
  const f = (c: number) => Math.round(amt >= 0 ? c + (255 - c) * amt : c * (1 + amt));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}

export function mix(a: string, b: string, t: number): string {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  const m = (i: number) => Math.round(ca[i] + (cb[i] - ca[i]) * t);
  return `rgb(${m(0)},${m(1)},${m(2)})`;
}

/** Desenfoque barato y universal (Safari antiguo no soporta ctx.filter): reduce y vuelve a ampliar. */
export function cheapBlur(src: HTMLCanvasElement, factor: number): HTMLCanvasElement {
  const w = Math.max(1, Math.round(src.width / factor));
  const h = Math.max(1, Math.round(src.height / factor));
  const small = document.createElement('canvas');
  small.width = w;
  small.height = h;
  const sc = small.getContext('2d')!;
  sc.imageSmoothingQuality = 'high';
  sc.drawImage(src, 0, 0, w, h);
  const out = document.createElement('canvas');
  out.width = src.width;
  out.height = src.height;
  const oc = out.getContext('2d')!;
  oc.imageSmoothingQuality = 'high';
  oc.drawImage(small, 0, 0, src.width, src.height);
  return out;
}

/** Estrella de n puntas (destellos). */
export function star(ctx: Ctx, cx: number, cy: number, outer: number, inner: number, points = 4) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i * Math.PI) / points - Math.PI / 2;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/** Gema facetada genérica (usada por defecto como marca de gema). */
export function drawGemIcon(ctx: Ctx, s: number, fill = '#7ff6ff', edge = '#ffffff') {
  const cx = s / 2;
  const cy = s / 2;
  const r = s * 0.27;
  ctx.save();
  ctx.shadowColor = fill;
  ctx.shadowBlur = s * 0.2;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx + r, cy - r * 0.2);
  ctx.lineTo(cx, cy + r);
  ctx.lineTo(cx - r, cy - r * 0.2);
  ctx.closePath();
  const g = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.4, fill);
  g.addColorStop(1, shade(fill.startsWith('#') ? fill : '#7ff6ff', -0.45));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineWidth = Math.max(1, s * 0.025);
  ctx.strokeStyle = edge;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - r, cy - r * 0.2);
  ctx.lineTo(cx + r, cy - r * 0.2);
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx - r * 0.35, cy - r * 0.2);
  ctx.lineTo(cx, cy + r);
  ctx.lineTo(cx + r * 0.35, cy - r * 0.2);
  ctx.closePath();
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = Math.max(1, s * 0.015);
  ctx.stroke();
  ctx.restore();
}

/** Marca de bloque objetivo genérica: diana. */
export function drawTargetIcon(ctx: Ctx, s: number, color = '#ffffff') {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = Math.max(1.5, s * 0.06);
  ctx.beginPath();
  ctx.arc(s / 2, s / 2, s * 0.24, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(s / 2, s / 2, s * 0.08, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

/** Partícula circular suave con degradado radial. */
export function softDot(ctx: Ctx, s: number, color: string, core = 0.25) {
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(core, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
}
