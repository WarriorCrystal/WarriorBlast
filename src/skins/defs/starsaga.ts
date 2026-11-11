import { drawGemIcon, rgba, roundRect, shade, softDot, star } from '../draw';
import type { Ctx, SkinDef } from '../types';

/**
 * SAGA ESTELAR — ópera espacial: campo de estrellas con nebulosa y planeta,
 * tablero de holo-consola y bloques de placas de casco con un núcleo de energía
 * que brilla como una espada láser. Los bloques "piedra" son metal de crucero oscuro.
 */

const BLOCKS: SkinDef['blocks'] = ['#ff3b3b', '#3b8cff', '#3bff6a', '#b25bff', '#ffd23b', '#ff8a2b', '#e8f4ff', '#5a6170'];

/** Aleatorio determinista (el fondo siempre igual). */
function rng(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
}

/** Haz de energía horizontal: halo de color + núcleo blanco. */
function beam(ctx: Ctx, x0: number, x1: number, y: number, thick: number, color: string, glow: number) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.shadowColor = color;
  ctx.shadowBlur = glow;
  ctx.strokeStyle = color;
  ctx.lineWidth = thick;
  ctx.beginPath();
  ctx.moveTo(x0, y);
  ctx.lineTo(x1, y);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = thick * 0.42;
  ctx.stroke();
  ctx.restore();
}

const starsaga: SkinDef = {
  id: 'starsaga',
  name: { es: 'Saga Estelar', en: 'Star Saga' },
  description: { es: 'Espadas de energía en una galaxia lejana.', en: 'Energy blades in a distant galaxy.' },
  price: 1000,
  order: 2.5,
  blocks: BLOCKS,
  ui: {
    bg: '#02030a',
    panel: 'rgba(10, 14, 26, 0.92)',
    panelBorder: 'rgba(255, 210, 59, 0.5)',
    text: '#f4f1e4',
    textDim: '#9aa3b8',
    accent: '#ffd23b',
    accent2: '#3b8cff',
    good: '#3bff6a',
    danger: '#ff3b3b',
    radius: 6,
    font: '"Arial Narrow", "Helvetica Neue", Arial, sans-serif',
    titleGlow: '0 0 2px #000, 0 0 14px rgba(255, 210, 59, 0.7)',
  },
  blockMargin: 0.3,
  flash: '#e8f4ff',

  drawBackground(ctx, w, h) {
    ctx.fillStyle = '#02030a';
    ctx.fillRect(0, 0, w, h);
    const m = Math.max(w, h);
    // nebulosas
    const neb = (x: number, y: number, r: number, c: string) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, c);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    };
    neb(w * 0.15, h * 0.2, m * 0.55, 'rgba(90, 40, 140, 0.30)');
    neb(w * 0.9, h * 0.65, m * 0.5, 'rgba(30, 70, 160, 0.25)');
    neb(w * 0.5, h * 1.0, m * 0.45, 'rgba(160, 60, 30, 0.18)');
    // estrellas
    const r = rng(4242);
    const n = Math.round((w * h) / 2200);
    for (let i = 0; i < n; i++) {
      const x = r() * w;
      const y = r() * h;
      const big = r();
      const a = 0.35 + r() * 0.65;
      ctx.fillStyle = big > 0.97 ? `rgba(255, 230, 190, ${a})` : big > 0.94 ? `rgba(190, 215, 255, ${a})` : `rgba(255,255,255,${a})`;
      const sz = big > 0.985 ? 2 : big > 0.9 ? 1.4 : 0.9;
      ctx.fillRect(x, y, sz, sz);
      if (big > 0.993) {
        ctx.save();
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        star(ctx, x + 1, y + 1, 7, 1, 4);
        ctx.fill();
        ctx.restore();
      }
    }
    // planeta con anillo de luz
    const px = w * 0.82;
    const py = h * 0.14;
    const pr = Math.min(w, h) * 0.13;
    const pg = ctx.createRadialGradient(px - pr * 0.4, py - pr * 0.4, pr * 0.1, px, py, pr);
    pg.addColorStop(0, '#e9c48a');
    pg.addColorStop(0.6, '#a8763d');
    pg.addColorStop(1, '#3a2410');
    ctx.save();
    ctx.shadowColor = 'rgba(255, 200, 120, 0.4)';
    ctx.shadowBlur = pr * 0.4;
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fillStyle = pg;
    ctx.fill();
    ctx.restore();
    // bandas del planeta
    ctx.save();
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.clip();
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = `rgba(80, 45, 15, ${0.12 + (i % 2) * 0.1})`;
      ctx.fillRect(px - pr, py - pr * 0.6 + i * pr * 0.3, pr * 2, pr * 0.1);
    }
    // sombra de terminador
    const sh = ctx.createLinearGradient(px - pr, py - pr, px + pr, py + pr);
    sh.addColorStop(0.45, 'rgba(0,0,0,0)');
    sh.addColorStop(1, 'rgba(0,0,0,0.75)');
    ctx.fillStyle = sh;
    ctx.fillRect(px - pr, py - pr, pr * 2, pr * 2);
    ctx.restore();
    // estela de nave lejana
    ctx.save();
    const sx = w * 0.12;
    const sy = h * 0.78;
    const tg = ctx.createLinearGradient(sx, sy, sx + w * 0.25, sy - h * 0.06);
    tg.addColorStop(0, 'rgba(120, 180, 255, 0)');
    tg.addColorStop(1, 'rgba(160, 210, 255, 0.55)');
    ctx.strokeStyle = tg;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + w * 0.25, sy - h * 0.06);
    ctx.stroke();
    ctx.restore();
    // viñeta
    const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, m * 0.8);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, w, h);
  },

  drawBoard(ctx, size, cell) {
    const pad = cell * 0.2;
    // consola metálica
    ctx.save();
    ctx.shadowColor = 'rgba(59, 140, 255, 0.35)';
    ctx.shadowBlur = cell * 0.6;
    roundRect(ctx, -pad, -pad, size + pad * 2, size + pad * 2, cell * 0.12);
    const g = ctx.createLinearGradient(0, -pad, 0, size + pad);
    g.addColorStop(0, '#2a303c');
    g.addColorStop(1, '#14181f');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
    roundRect(ctx, -pad, -pad, size + pad * 2, size + pad * 2, cell * 0.12);
    ctx.strokeStyle = 'rgba(200, 210, 230, 0.35)';
    ctx.lineWidth = Math.max(1, cell * 0.03);
    ctx.stroke();
    // remaches en las esquinas
    for (const [x, y] of [[-pad / 2, -pad / 2], [size + pad / 2, -pad / 2], [-pad / 2, size + pad / 2], [size + pad / 2, size + pad / 2]]) {
      ctx.beginPath();
      ctx.arc(x, y, cell * 0.05, 0, Math.PI * 2);
      ctx.fillStyle = '#8c95a6';
      ctx.fill();
    }
    // pantalla holográfica
    ctx.fillStyle = '#060b16';
    ctx.fillRect(0, 0, size, size);
    for (let y = 0; y < 8; y++)
      for (let x = 0; x < 8; x++) {
        const i = cell * 0.05;
        ctx.fillStyle = (x + y) % 2 ? 'rgba(59, 140, 255, 0.07)' : 'rgba(59, 140, 255, 0.04)';
        ctx.fillRect(x * cell + i, y * cell + i, cell - i * 2, cell - i * 2);
        // marcas de mira en las esquinas de cada celda
        ctx.strokeStyle = 'rgba(120, 180, 255, 0.22)';
        ctx.lineWidth = 1;
        const k = cell * 0.16;
        const x0 = x * cell + i;
        const y0 = y * cell + i;
        const x1 = (x + 1) * cell - i;
        const y1 = (y + 1) * cell - i;
        ctx.beginPath();
        ctx.moveTo(x0, y0 + k); ctx.lineTo(x0, y0); ctx.lineTo(x0 + k, y0);
        ctx.moveTo(x1 - k, y0); ctx.lineTo(x1, y0); ctx.lineTo(x1, y0 + k);
        ctx.moveTo(x1, y1 - k); ctx.lineTo(x1, y1); ctx.lineTo(x1 - k, y1);
        ctx.moveTo(x0 + k, y1); ctx.lineTo(x0, y1); ctx.lineTo(x0, y1 - k);
        ctx.stroke();
      }
    // líneas de barrido
    ctx.fillStyle = 'rgba(120, 180, 255, 0.035)';
    for (let y = 0; y < size; y += Math.max(3, cell * 0.08)) ctx.fillRect(0, y, size, 1);
  },

  drawBlock(ctx, s, color, variant) {
    const i = s * 0.06;
    const r = s * 0.1;
    if (variant === 'ghost') {
      roundRect(ctx, i, i, s - i * 2, s - i * 2, r);
      ctx.fillStyle = rgba(color, 0.12);
      ctx.fill();
      ctx.setLineDash([s * 0.1, s * 0.07]);
      ctx.strokeStyle = rgba(color, 0.9);
      ctx.lineWidth = s * 0.045;
      ctx.stroke();
      return;
    }
    const stone = variant === 'stone';
    // placa de casco
    roundRect(ctx, i, i, s - i * 2, s - i * 2, r);
    const g = ctx.createLinearGradient(0, i, 0, s - i);
    if (stone) {
      g.addColorStop(0, shade(color, 0.2));
      g.addColorStop(1, shade(color, -0.4));
    } else {
      g.addColorStop(0, '#3a414e');
      g.addColorStop(1, '#171b22');
    }
    ctx.fillStyle = g;
    ctx.fill();
    roundRect(ctx, i, i, s - i * 2, s - i * 2, r);
    ctx.strokeStyle = stone ? shade(color, -0.5) : rgba(color, 0.75);
    ctx.lineWidth = s * 0.04;
    ctx.stroke();
    // bisel superior
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.fillRect(i + r, i + s * 0.03, s - (i + r) * 2, s * 0.03);
    // tornillos
    ctx.fillStyle = stone ? shade(color, 0.35) : '#9aa3b4';
    for (const [x, y] of [[0.17, 0.17], [0.83, 0.17], [0.17, 0.83], [0.83, 0.83]]) {
      ctx.beginPath();
      ctx.arc(s * x, s * y, s * 0.035, 0, Math.PI * 2);
      ctx.fill();
    }
    if (stone) {
      // panel de ventilación
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      for (let k = 0; k < 3; k++) ctx.fillRect(s * 0.3, s * (0.36 + k * 0.12), s * 0.4, s * 0.05);
      return;
    }
    // núcleo de energía tipo espada láser
    beam(ctx, s * 0.24, s * 0.76, s * 0.5, s * 0.17, color, s * 0.45);
    // reflejo del brillo sobre la placa
    const glow = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s * 0.5);
    glow.addColorStop(0, rgba(color, 0.25));
    glow.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, s, s);
  },

  drawGem(ctx, s) {
    drawGemIcon(ctx, s, '#9fe0ff');
  },

  drawTarget(ctx, s) {
    // mira de blanco holográfica
    ctx.save();
    ctx.strokeStyle = '#ff3b3b';
    ctx.shadowColor = '#ff3b3b';
    ctx.shadowBlur = s * 0.2;
    ctx.lineWidth = s * 0.06;
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, s * 0.24, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    for (const [a, b, c, d] of [[0.5, 0.12, 0.5, 0.3], [0.5, 0.7, 0.5, 0.88], [0.12, 0.5, 0.3, 0.5], [0.7, 0.5, 0.88, 0.5]]) {
      ctx.moveTo(s * a, s * b);
      ctx.lineTo(s * c, s * d);
    }
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, s * 0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },

  particles: {
    // chispas de energía alargadas
    draw(ctx, s, color) {
      ctx.save();
      ctx.translate(s / 2, s / 2);
      ctx.rotate(Math.PI / 4);
      ctx.translate(-s / 2, -s / 2);
      beam(ctx, s * 0.2, s * 0.8, s / 2, s * 0.14, color, s * 0.25);
      ctx.restore();
      softDot(ctx, s, color, 0.1);
    },
    perCell: 5,
    size: [0.25, 0.55],
    speed: [3, 8],
    gravity: 2,
    life: [0.4, 0.8],
    blend: 'add',
    spin: true,
    shrink: true,
  },

  ambient: {
    count: 22,
    // estrellas fugaces lentas (pasan hacia abajo como en un salto de velocidad suave)
    draw(ctx, s) {
      const g = ctx.createLinearGradient(s / 2, 0, s / 2, s);
      g.addColorStop(0, 'rgba(180, 210, 255, 0)');
      g.addColorStop(1, 'rgba(230, 240, 255, 1)');
      ctx.fillStyle = g;
      ctx.fillRect(s * 0.44, 0, s * 0.12, s);
    },
    size: [6, 18],
    speed: [30, 70],
    alpha: [0.15, 0.5],
    blend: 'add',
  },

  sound: {
    root: 50,
    scale: [0, 2, 3, 5, 7, 8, 10],
    blip: 'sawtooth',
    sparkle: 'sawtooth',
    thump: 0.95,
    music: {
      bpm: 84,
      progression: [0, 5, 3, 4],
      pad: 'sawtooth',
      lead: 'triangle',
      bass: 'sawtooth',
      leadDensity: 0.26,
      padGain: 0.055,
      leadGain: 0.04,
      bassGain: 0.11,
      filter: 1100,
      reverb: 0.7,
      echo: 0.3,
      hats: false,
    },
  },
};

export default starsaga;
