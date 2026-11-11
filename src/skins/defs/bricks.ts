import { roundRect, rgba, shade, star } from '../draw';
import type { Ctx, SkinDef } from '../types';

/**
 * LADRILLOS DE JUGUETE — piezas de plástico ABS vistas desde arriba, encajadas sobre
 * una placa base. Cada color tiene su forma: ladrillo 1×1 (un tetón), ladrillo 2×2
 * (cuatro tetones) o placa lisa (sin tetones).
 */

const C = {
  red: '#c91a14',
  yellow: '#f2c219',
  blue: '#0d5bb5',
  green: '#23893a',
  orange: '#f07a1a',
  purple: '#7d4aa6',
  sky: '#46a9dc',
  stone: '#a0a5a9',
};

type Shape = '1x1' | '2x2' | 'flat';

const SHAPE: Record<string, Shape> = {
  [C.red]: '1x1',
  [C.blue]: '1x1',
  [C.purple]: '1x1',
  [C.yellow]: '2x2',
  [C.green]: '2x2',
  [C.orange]: 'flat',
  [C.sky]: 'flat',
  [C.stone]: '1x1',
};

const shapeOf = (color: string): Shape => SHAPE[color.toLowerCase()] ?? '1x1';

/**
 * Tetón visto desde arriba con luz de arriba-izquierda: sombra de contacto,
 * lateral del cilindro asomando abajo-derecha, cara superior casi plana y brillo fino.
 */
function stud(ctx: Ctx, cx: number, cy: number, r: number, color: string) {
  ctx.save();
  // sombra de contacto suave
  const sh = ctx.createRadialGradient(cx + r * 0.2, cy + r * 0.25, r * 0.7, cx + r * 0.2, cy + r * 0.25, r * 1.35);
  sh.addColorStop(0, 'rgba(0,0,0,0.30)');
  sh.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sh;
  ctx.beginPath();
  ctx.arc(cx + r * 0.2, cy + r * 0.25, r * 1.35, 0, Math.PI * 2);
  ctx.fill();
  // lateral del cilindro (visible abajo-derecha)
  ctx.fillStyle = shade(color, -0.3);
  ctx.beginPath();
  ctx.arc(cx + r * 0.07, cy + r * 0.1, r, 0, Math.PI * 2);
  ctx.fill();
  // cara superior
  const g = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  g.addColorStop(0, shade(color, 0.1));
  g.addColorStop(1, shade(color, -0.04));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  // canto superior iluminado (arriba-izquierda)
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = Math.max(1, r * 0.1);
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.93, Math.PI * 0.95, Math.PI * 1.6);
  ctx.stroke();
  // relieve sutil en el centro (como el grabado de los tetones reales)
  ctx.strokeStyle = rgba('#000000', 0.08);
  ctx.lineWidth = Math.max(1, r * 0.07);
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** Cara superior de una pieza (s×s): plástico casi mate con cantos marcados. */
function body(ctx: Ctx, s: number, color: string, flat: boolean) {
  const i = s * 0.025; // pequeña junta entre piezas vecinas
  const w = s - i * 2;
  const r = s * 0.035;
  // canto exterior oscuro (altura de la pieza vista casi en planta)
  roundRect(ctx, i, i, w, w, r);
  ctx.fillStyle = shade(color, -0.38);
  ctx.fill();
  // cara superior, ligeramente desplazada arriba-izquierda
  const e = s * (flat ? 0.035 : 0.05);
  roundRect(ctx, i, i, w - e, w - e, r);
  const g = ctx.createLinearGradient(0, 0, s, s);
  g.addColorStop(0, shade(color, 0.08));
  g.addColorStop(0.6, color);
  g.addColorStop(1, shade(color, -0.06));
  ctx.fillStyle = g;
  ctx.fill();
  // filo de luz arriba-izquierda
  ctx.strokeStyle = 'rgba(255,255,255,0.32)';
  ctx.lineWidth = Math.max(1, s * 0.018);
  ctx.beginPath();
  ctx.moveTo(i + r, i + s * 0.012);
  ctx.lineTo(i + w - e - r, i + s * 0.012);
  ctx.moveTo(i + s * 0.012, i + r);
  ctx.lineTo(i + s * 0.012, i + w - e - r);
  ctx.stroke();
  return { i, w: w - e };
}

/** Pieza completa según su forma. */
function piece(ctx: Ctx, s: number, color: string, shape: Shape) {
  const { i, w } = body(ctx, s, color, shape === 'flat');
  if (shape === '1x1') {
    stud(ctx, i + w / 2, i + w / 2, s * 0.3, color);
  } else if (shape === '2x2') {
    const q = w / 4;
    for (const dy of [1, 3]) for (const dx of [1, 3]) stud(ctx, i + q * dx, i + q * dy, s * 0.155, color);
  } else {
    // placa lisa: brillo suave y ranura perimetral como las piezas reales
    const sheen = ctx.createLinearGradient(i, i, i + w, i + w);
    sheen.addColorStop(0, 'rgba(255,255,255,0.22)');
    sheen.addColorStop(0.45, 'rgba(255,255,255,0.04)');
    sheen.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sheen;
    roundRect(ctx, i, i, w, w, s * 0.035);
    ctx.fill();
    const k = s * 0.09;
    roundRect(ctx, i + k, i + k, w - k * 2, w - k * 2, s * 0.03);
    ctx.strokeStyle = rgba('#000000', 0.12);
    ctx.lineWidth = Math.max(1, s * 0.014);
    ctx.stroke();
  }
}

const bricks: SkinDef = {
  id: 'bricks',
  name: { es: 'Ladrillos', en: 'Toy Bricks' },
  description: { es: 'Piezas 1×1, 2×2 y placas lisas que encajan.', en: 'Snap-together 1×1, 2×2 and flat bricks.' },
  price: 1000,
  order: 1.8,
  blocks: [C.red, C.yellow, C.blue, C.green, C.orange, C.purple, C.sky, C.stone],
  ui: {
    bg: '#c7d0d8',
    panel: 'rgba(246, 248, 250, 0.94)',
    panelBorder: '#b4bec8',
    text: '#1f2328',
    textDim: '#56616c',
    accent: C.red,
    accent2: C.yellow,
    good: C.green,
    danger: '#b8322a',
    radius: 10,
    font: '"Arial Rounded MT Bold", "Arial Black", "Segoe UI", system-ui, sans-serif',
    titleGlow: '0 2px 0 rgba(0,0,0,0.18)',
  },
  blockMargin: 0.08,
  flash: '#ffffff',

  drawBackground(ctx, w, h) {
    // gris azulado mate, sin brillo: descansa la vista y deja destacar las piezas
    const g = ctx.createRadialGradient(w / 2, h * 0.4, 0, w / 2, h * 0.4, Math.max(w, h) * 0.75);
    g.addColorStop(0, '#d0d8df');
    g.addColorStop(1, '#b7c1ca');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // tetones apenas insinuados, como una placa base al fondo
    const step = 32;
    for (let y = step / 2; y < h + step; y += step)
      for (let x = step / 2; x < w + step; x += step) {
        ctx.fillStyle = 'rgba(60, 75, 90, 0.05)';
        ctx.beginPath();
        ctx.arc(x + 1, y + 1.5, 8.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.fill();
      }
  },

  drawBoard(ctx, size, cell) {
    const pad = cell * 0.2;
    // placa base gris oscuro
    ctx.save();
    ctx.shadowColor = 'rgba(30, 40, 55, 0.28)';
    ctx.shadowBlur = cell * 0.35;
    ctx.shadowOffsetY = cell * 0.1;
    roundRect(ctx, -pad, -pad, size + pad * 2, size + pad * 2, cell * 0.12);
    ctx.fillStyle = '#4a5157';
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#596168';
    ctx.fillRect(0, 0, size, size);
    for (let y = 0; y < 8; y++)
      for (let x = 0; x < 8; x++) stud(ctx, x * cell + cell / 2, y * cell + cell / 2, cell * 0.28, '#61696f');
  },

  drawBlock(ctx, s, color, variant) {
    if (variant === 'ghost') {
      const i = s * 0.04;
      roundRect(ctx, i, i, s - i * 2, s - i * 2, s * 0.05);
      ctx.fillStyle = rgba(color.startsWith('#') ? color : '#ffffff', 0.35);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = Math.max(1.5, s * 0.045);
      ctx.stroke();
      return;
    }
    if (variant === 'stone') return piece(ctx, s, C.stone, '1x1');
    piece(ctx, s, color, shapeOf(color));
  },

  drawGem(ctx, s) {
    // tetón transparente tipo "joya" sobre la pieza
    const cx = s / 2;
    const cy = s / 2;
    const r = s * 0.3;
    ctx.save();
    ctx.shadowColor = '#7ff6ff';
    ctx.shadowBlur = s * 0.18;
    const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 0, cx, cy, r);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.35, '#9ff8ff');
    g.addColorStop(1, '#17a6c0');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(1, s * 0.03);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    star(ctx, cx - r * 0.35, cy - r * 0.35, r * 0.45, r * 0.1, 4);
    ctx.fill();
  },

  drawTarget(ctx, s) {
    // diana roja y blanca impresa sobre el tetón
    const cx = s / 2;
    const cy = s / 2;
    const rings: Array<[number, string]> = [
      [0.27, '#ffffff'],
      [0.2, C.red],
      [0.13, '#ffffff'],
      [0.06, C.red],
    ];
    for (const [r, c] of rings) {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(cx, cy, s * r, 0, Math.PI * 2);
      ctx.fill();
    }
  },

  particles: {
    draw(ctx, s, color) {
      // mini pieza que sale volando
      ctx.fillStyle = shade(color, -0.35);
      roundRect(ctx, s * 0.08, s * 0.1, s * 0.88, s * 0.86, s * 0.06);
      ctx.fill();
      ctx.fillStyle = color;
      roundRect(ctx, s * 0.04, s * 0.04, s * 0.86, s * 0.84, s * 0.06);
      ctx.fill();
      ctx.fillStyle = shade(color, -0.25);
      ctx.beginPath();
      ctx.arc(s * 0.5, s * 0.49, s * 0.24, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = shade(color, 0.12);
      ctx.beginPath();
      ctx.arc(s * 0.47, s * 0.46, s * 0.23, 0, Math.PI * 2);
      ctx.fill();
    },
    perCell: 4,
    size: [0.18, 0.32],
    speed: [3, 7],
    gravity: 20,
    life: [0.5, 0.9],
    blend: 'normal',
    spin: true,
    shrink: true,
  },

  sound: {
    root: 60,
    scale: [0, 2, 4, 7, 9],
    blip: 'square',
    sparkle: 'triangle',
    thump: 0.8,
    music: {
      bpm: 104,
      progression: [0, 4, 5, 3],
      pad: 'triangle',
      lead: 'square',
      bass: 'triangle',
      leadDensity: 0.32,
      padGain: 0.045,
      leadGain: 0.03,
      bassGain: 0.1,
      filter: 1800,
      reverb: 0.35,
      echo: 0.25,
      hats: true,
    },
  },
};

export default bricks;
