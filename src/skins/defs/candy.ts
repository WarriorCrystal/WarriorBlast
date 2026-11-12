import { drawGemIcon, roundRect, shade, star } from '../draw';
import { cells, circ, dots, ell, face, finish, ghostTile, kinds, paint, rg, rng, vg } from '../tiles';
import type { Ctx, SkinDef } from '../types';

/**
 * CANDY — cada bloque es una golosina que llena todo el cuadrado:
 *   rosa → piruleta en espiral · turquesa → caramelo envuelto · amarillo → osito de goma
 *   rojo → gominola azucarada · violeta → caramelo duro facetado · naranja → gusanito ácido
 *   verde → pastilla de menta · piedra → terrón de azúcar
 * Fondo de rayas rosa y turquesa; explota en confeti de azúcar.
 */

const C = {
  lolly: '#ff5fa2',
  wrapped: '#2ed3c6',
  bear: '#ffc23a',
  gumdrop: '#ff4757',
  gem: '#a66cff',
  worm: '#ff8f3a',
  mint: '#6fdc5a',
  stone: '#e8dce6',
};
type Kind = keyof typeof C;
const kindOf = kinds(C, 'lolly');

const INK = '#5a1a44';
const ST = { ink: INK, depth: 'rgba(120, 20, 80, 0.35)', shine: 0.3 };

/** Brillo de golosina: reflejo blanco curvo. */
function gloss(ctx: Ctx, s: number, x = 0.3, y = 0.26, w = 0.13) {
  ell(ctx, s, x, y, w, w * 0.35, -0.6);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fill();
}

function lolly(ctx: Ctx, s: number) {
  face(ctx, s, '#ffffff', ST);
  // espiral rosa y blanca que llena todo el cuadrado
  ctx.save();
  ctx.translate(s / 2, s / 2);
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    for (let t = 0; t <= 1.001; t += 0.05) {
      const a = (i / 8) * Math.PI * 2 + t * Math.PI * 2.2;
      const r = t * s * 0.75;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    for (let t = 1; t >= 0; t -= 0.05) {
      const a = ((i + 0.5) / 8) * Math.PI * 2 + t * Math.PI * 2.2;
      const r = t * s * 0.75;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fillStyle = i % 2 ? '#ff5fa2' : '#ff9fc8';
    ctx.fill();
  }
  ctx.restore();
  circ(ctx, s, 0.5, 0.5, 0.07);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.fillStyle = rg(ctx, s, 0.5, 0.5, 0.65, [[0, 'rgba(255,255,255,0)'], [1, 'rgba(160,20,90,0.35)']]);
  ctx.fillRect(0, 0, s, s);
  gloss(ctx, s);
  finish(ctx, s, ST);
}

function wrapped(ctx: Ctx, s: number) {
  face(ctx, s, vg(ctx, s, '#9ff4ec', '#1fb5aa'), ST);
  // alas del envoltorio a los lados (plisadas)
  for (const dir of [-1, 1]) {
    ctx.beginPath();
    const x0 = 0.5 + dir * 0.2;
    ctx.moveTo(x0 * s, 0.38 * s);
    ctx.lineTo((0.5 + dir * 0.55) * s, 0.12 * s);
    ctx.lineTo((0.5 + dir * 0.55) * s, 0.88 * s);
    ctx.lineTo(x0 * s, 0.62 * s);
    ctx.closePath();
    paint(ctx, s, vg(ctx, s, '#e0fffb', '#7ae6dc', 0.1, 0.9), '#0f7a72', 0.022);
    ctx.strokeStyle = 'rgba(15, 122, 114, 0.45)';
    ctx.lineWidth = s * 0.015;
    for (const y of [0.24, 0.36, 0.5, 0.64, 0.76]) {
      ctx.beginPath();
      ctx.moveTo(x0 * s, (0.5 + (y - 0.5) * 0.3) * s);
      ctx.lineTo((0.5 + dir * 0.5) * s, y * s);
      ctx.stroke();
    }
  }
  // caramelo central
  ell(ctx, s, 0.5, 0.5, 0.28, 0.24);
  paint(ctx, s, rg(ctx, s, 0.42, 0.4, 0.35, [[0, '#d8fffa'], [0.5, '#2ed3c6'], [1, '#128f86']]), '#0f6a64', 0.03);
  // rayas blancas en diagonal
  ctx.save();
  ell(ctx, s, 0.5, 0.5, 0.28, 0.24);
  ctx.clip();
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = s * 0.05;
  for (let x = -0.2; x < 1.2; x += 0.16) {
    ctx.beginPath();
    ctx.moveTo(x * s, 0.2 * s);
    ctx.lineTo((x + 0.3) * s, 0.8 * s);
    ctx.stroke();
  }
  ctx.restore();
  gloss(ctx, s, 0.4, 0.38, 0.08);
  finish(ctx, s, ST);
}

function bear(ctx: Ctx, s: number) {
  face(ctx, s, vg(ctx, s, '#fff4c8', '#ffd98a'), ST);
  const fill = rg(ctx, s, 0.45, 0.4, 0.6, [[0, 'rgba(255, 240, 170, 0.95)'], [0.6, 'rgba(255, 194, 58, 0.95)'], [1, 'rgba(220, 140, 10, 0.95)']]);
  const parts: Array<[number, number, number, number]> = [
    [0.27, 0.12, 0.08, 0.08], // orejas
    [0.73, 0.12, 0.08, 0.08],
    [0.2, 0.62, 0.1, 0.13], // brazos
    [0.8, 0.62, 0.1, 0.13],
    [0.3, 0.9, 0.12, 0.1], // pies
    [0.7, 0.9, 0.12, 0.1],
    [0.5, 0.66, 0.27, 0.27], // panza
    [0.5, 0.3, 0.24, 0.2], // cabeza
  ];
  for (const [x, y, rx, ry] of parts) {
    ell(ctx, s, x, y, rx, ry);
    paint(ctx, s, fill, '#a8620a', 0.022);
  }
  // hocico y ojos
  ell(ctx, s, 0.5, 0.36, 0.08, 0.055);
  ctx.fillStyle = 'rgba(255, 250, 220, 0.7)';
  ctx.fill();
  ctx.fillStyle = '#8a4a08';
  for (const x of [0.42, 0.58]) {
    circ(ctx, s, x, 0.27, 0.022);
    ctx.fill();
  }
  circ(ctx, s, 0.5, 0.34, 0.018);
  ctx.fill();
  ell(ctx, s, 0.5, 0.66, 0.14, 0.14);
  ctx.fillStyle = 'rgba(255, 250, 220, 0.35)';
  ctx.fill();
  gloss(ctx, s, 0.38, 0.22, 0.06);
  finish(ctx, s, ST);
}

function gumdrop(ctx: Ctx, s: number) {
  face(ctx, s, vg(ctx, s, '#ffd2d8', '#ff9aa8'), ST);
  // gominola en cúpula enorme
  ctx.beginPath();
  ctx.moveTo(0.04 * s, 0.94 * s);
  ctx.bezierCurveTo(0.04 * s, 0.1 * s, 0.96 * s, 0.1 * s, 0.96 * s, 0.94 * s);
  ctx.closePath();
  paint(ctx, s, rg(ctx, s, 0.38, 0.35, 0.7, [[0, '#ff9aa8'], [0.5, '#ff4757'], [1, '#b81a2c']]), '#7a0a1a', 0.03);
  // cristales de azúcar
  const r = rng(17);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0.04 * s, 0.94 * s);
  ctx.bezierCurveTo(0.04 * s, 0.1 * s, 0.96 * s, 0.1 * s, 0.96 * s, 0.94 * s);
  ctx.closePath();
  ctx.clip();
  for (let i = 0; i < 46; i++) {
    const x = r();
    const y = 0.25 + r() * 0.72;
    ctx.fillStyle = r() > 0.4 ? 'rgba(255,255,255,0.85)' : 'rgba(255,220,225,0.7)';
    ctx.save();
    ctx.translate(x * s, y * s);
    ctx.rotate(r() * Math.PI);
    const z = s * (0.014 + r() * 0.012);
    ctx.fillRect(-z / 2, -z / 2, z, z);
    ctx.restore();
  }
  ctx.restore();
  gloss(ctx, s, 0.32, 0.42, 0.1);
  finish(ctx, s, ST);
}

function gem(ctx: Ctx, s: number) {
  face(ctx, s, vg(ctx, s, '#d6bbff', '#7a3fe0'), ST);
  // caramelo duro facetado: octógono con facetas
  const c = 0.5;
  const R = 0.46;
  const r = 0.26;
  const P = (rad: number, i: number): [number, number] => [c + Math.cos((i * Math.PI) / 4 + Math.PI / 8) * rad, c + Math.sin((i * Math.PI) / 4 + Math.PI / 8) * rad];
  const cols = ['#e2ccff', '#c49bff', '#a66cff', '#8a4ef0', '#6a2fc0', '#8a4ef0', '#b88aff', '#d6bbff'];
  for (let i = 0; i < 8; i++) {
    const [a, b, d, e] = [P(R, i), P(R, i + 1), P(r, i + 1), P(r, i)];
    ctx.beginPath();
    ctx.moveTo(a[0] * s, a[1] * s);
    ctx.lineTo(b[0] * s, b[1] * s);
    ctx.lineTo(d[0] * s, d[1] * s);
    ctx.lineTo(e[0] * s, e[1] * s);
    ctx.closePath();
    paint(ctx, s, cols[i], '#4a1a8a', 0.015);
  }
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const p = P(r, i);
    if (i) ctx.lineTo(p[0] * s, p[1] * s);
    else ctx.moveTo(p[0] * s, p[1] * s);
  }
  ctx.closePath();
  paint(ctx, s, rg(ctx, s, 0.45, 0.42, 0.3, [[0, '#ffffff'], [0.4, '#c9a2ff'], [1, '#8a4ef0']]), '#4a1a8a', 0.015);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  star(ctx, 0.4 * s, 0.4 * s, s * 0.08, s * 0.015, 4);
  ctx.fill();
  finish(ctx, s, ST);
}

function worm(ctx: Ctx, s: number) {
  face(ctx, s, vg(ctx, s, '#fff0dc', '#ffd2a8'), ST);
  // gusanito en S con franjas
  ctx.lineCap = 'round';
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(0.14 * s, 0.2 * s);
    ctx.bezierCurveTo(0.9 * s, 0.05 * s, 0.95 * s, 0.5 * s, 0.5 * s, 0.5 * s);
    ctx.bezierCurveTo(0.05 * s, 0.5 * s, 0.1 * s, 0.95 * s, 0.86 * s, 0.82 * s);
  };
  path();
  ctx.strokeStyle = '#8a3a0a';
  ctx.lineWidth = s * 0.27;
  ctx.stroke();
  const bands = ['#ff4757', '#ff8f3a', '#ffd23a'];
  bands.forEach((col, i) => {
    path();
    ctx.strokeStyle = col;
    ctx.lineWidth = s * (0.23 - i * 0.075);
    ctx.stroke();
  });
  // azúcar ácida
  dots(ctx, s, 5, 40, 'rgba(255,255,255,0.85)', [0.006, 0.012], [0.08, 0.08, 0.92, 0.92]);
  // carita
  ctx.fillStyle = '#3a1a0a';
  circ(ctx, s, 0.82, 0.78, 0.02);
  ctx.fill();
  circ(ctx, s, 0.88, 0.84, 0.02);
  ctx.fill();
  finish(ctx, s, ST);
}

function mint(ctx: Ctx, s: number) {
  face(ctx, s, vg(ctx, s, '#e4ffdc', '#9ae88a'), ST);
  // pastilla redonda con rayos verde/blanco
  circ(ctx, s, 0.5, 0.5, 0.44);
  paint(ctx, s, '#ffffff', '#1f7a2a', 0.03);
  ctx.save();
  circ(ctx, s, 0.5, 0.5, 0.42);
  ctx.clip();
  ctx.translate(s / 2, s / 2);
  for (let i = 0; i < 8; i++) {
    ctx.rotate(Math.PI / 4);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, s * 0.42, -0.2, 0.2);
    ctx.closePath();
    ctx.fillStyle = '#4fc83a';
    ctx.fill();
  }
  ctx.restore();
  circ(ctx, s, 0.5, 0.5, 0.1);
  paint(ctx, s, '#ffffff', 'rgba(31,122,42,0.4)', 0.012);
  ctx.fillStyle = rg(ctx, s, 0.5, 0.5, 0.45, [[0.6, 'rgba(0,0,0,0)'], [1, 'rgba(20,90,30,0.3)']]);
  circ(ctx, s, 0.5, 0.5, 0.44);
  ctx.fill();
  gloss(ctx, s);
  finish(ctx, s, ST);
}

function sugar(ctx: Ctx, s: number) {
  face(ctx, s, vg(ctx, s, '#ffffff', '#d8cbd6'), { ...ST, rad: 0.08 });
  const r = rng(3);
  for (let i = 0; i < 70; i++) {
    ctx.fillStyle = r() > 0.5 ? 'rgba(180, 160, 180, 0.35)' : 'rgba(255,255,255,0.9)';
    const z = s * (0.015 + r() * 0.02);
    ctx.fillRect(r() * s, r() * s, z, z);
  }
  finish(ctx, s, { ...ST, rad: 0.08, shine: 0.15 });
}

const DRAW: Record<Kind, (ctx: Ctx, s: number) => void> = {
  lolly,
  wrapped,
  bear,
  gumdrop,
  gem,
  worm,
  mint,
  stone: sugar,
};

const CONFETTI = ['#ff5fa2', '#2ed3c6', '#ffc23a', '#a66cff', '#6fdc5a', '#ffffff'];

const candy: SkinDef = {
  id: 'candy',
  name: { es: 'Candy', en: 'Candy' },
  description: {
    es: 'Piruletas, caramelos y gominolas brillantes. Explotan en confeti de azúcar.',
    en: 'Lollipops, sweets and shiny gummies. They burst into sugar confetti.',
  },
  price: 900,
  order: 5.2,
  blocks: [C.lolly, C.wrapped, C.bear, C.gumdrop, C.gem, C.worm, C.mint, C.stone],
  ui: {
    bg: '#ffd6ea',
    panel: 'rgba(255, 250, 253, 0.95)',
    panelBorder: '#ff9fc8',
    text: '#5a1a44',
    textDim: '#a0628a',
    accent: '#ff3d8f',
    accent2: '#1fbfb2',
    good: '#2fb36b',
    danger: '#e8263f',
    radius: 22,
    font: '"Segoe UI Rounded", "Arial Rounded MT Bold", "Nunito", "Segoe UI", system-ui, sans-serif',
    titleGlow: '0 3px 0 rgba(160, 20, 90, 0.3), 0 0 14px rgba(46, 211, 198, 0.6)',
  },
  blockMargin: 0.08,
  flash: '#ffffff',
  explosion: { power: 1.3, ring: '#ff9fc8', rings: 1 },

  drawBackground(ctx, w, h) {
    // rayas diagonales rosa/turquesa
    ctx.fillStyle = '#ffc6e0';
    ctx.fillRect(0, 0, w, h);
    const step = 46;
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate(-Math.PI / 4);
    const m = Math.hypot(w, h);
    for (let x = -m; x < m; x += step * 2) {
      ctx.fillStyle = 'rgba(120, 230, 220, 0.55)';
      ctx.fillRect(x, -m, step, m * 2);
    }
    ctx.restore();
    // lunares de azúcar
    const r = rng(11);
    for (let i = 0; i < (w * h) / 5000; i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.35 + r() * 0.4})`;
      ctx.beginPath();
      ctx.arc(r() * w, r() * h, 2 + r() * 4, 0, Math.PI * 2);
      ctx.fill();
    }
    const v = ctx.createRadialGradient(w / 2, h * 0.45, Math.min(w, h) * 0.3, w / 2, h * 0.45, Math.max(w, h) * 0.8);
    v.addColorStop(0, 'rgba(255,255,255,0.25)');
    v.addColorStop(1, 'rgba(200, 60, 140, 0.25)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, w, h);
  },

  drawBoard(ctx, size, cell) {
    const pad = cell * 0.26;
    // bandeja de bombonera con borde de bastón de caramelo
    ctx.save();
    ctx.shadowColor = 'rgba(160, 20, 90, 0.35)';
    ctx.shadowBlur = cell * 0.4;
    ctx.shadowOffsetY = cell * 0.1;
    roundRect(ctx, -pad, -pad, size + pad * 2, size + pad * 2, cell * 0.45);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.restore();
    ctx.save();
    roundRect(ctx, -pad, -pad, size + pad * 2, size + pad * 2, cell * 0.45);
    ctx.clip();
    ctx.translate(size / 2, size / 2);
    ctx.rotate(-Math.PI / 4);
    for (let x = -size * 1.5; x < size * 1.5; x += cell * 0.4) {
      ctx.fillStyle = '#ff5fa2';
      ctx.fillRect(x, -size * 1.5, cell * 0.2, size * 3);
    }
    ctx.restore();
    roundRect(ctx, -pad * 0.35, -pad * 0.35, size + pad * 0.7, size + pad * 0.7, cell * 0.3);
    ctx.fillStyle = '#fff4fa';
    ctx.fill();
    cells(ctx, cell, (x, y, px, py) => {
      const i = cell * 0.07;
      roundRect(ctx, px + i, py + i, cell - i * 2, cell - i * 2, cell * 0.24);
      ctx.fillStyle = (x + y) % 2 ? '#ffe2f0' : '#e2f8f5';
      ctx.fill();
      ctx.strokeStyle = 'rgba(200, 80, 150, 0.15)';
      ctx.lineWidth = Math.max(1, cell * 0.025);
      ctx.stroke();
    });
  },

  drawBlock(ctx, s, color, variant) {
    if (variant === 'ghost') return ghostTile(ctx, s, 0.14, 'rgba(255,95,162,0.22)', 'rgba(255,95,162,0.9)');
    DRAW[variant === 'stone' ? 'stone' : kindOf(color)](ctx, s);
  },

  drawGem(ctx, s) {
    drawGemIcon(ctx, s, '#ff9fc8', '#ffffff');
  },

  drawTarget(ctx, s) {
    // corazón de caramelo
    ctx.save();
    ctx.translate(s / 2, s * 0.52);
    ctx.beginPath();
    const k = s * 0.3;
    ctx.moveTo(0, k * 0.8);
    ctx.bezierCurveTo(-k * 1.3, -k * 0.1, -k * 0.6, -k * 1.1, 0, -k * 0.4);
    ctx.bezierCurveTo(k * 0.6, -k * 1.1, k * 1.3, -k * 0.1, 0, k * 0.8);
    ctx.closePath();
    ctx.shadowColor = 'rgba(120, 0, 60, 0.4)';
    ctx.shadowBlur = s * 0.06;
    ctx.fillStyle = '#ff3d8f';
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(1.5, s * 0.04);
    ctx.stroke();
    ctx.restore();
  },

  particles: {
    draw(ctx, s, color) {
      // confeti: tira rectangular de color con brillo de azúcar
      const c = color === C.stone ? CONFETTI[Math.floor(Math.random() * CONFETTI.length)] : color;
      ctx.fillStyle = shade(c, 0.05);
      ctx.fillRect(s * 0.1, s * 0.3, s * 0.8, s * 0.4);
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillRect(s * 0.1, s * 0.3, s * 0.8, s * 0.1);
    },
    perCell: 7,
    size: [0.14, 0.26],
    speed: [2.5, 7],
    gravity: 6,
    life: [0.7, 1.3],
    blend: 'normal',
    spin: true,
    shrink: false,
  },

  ambient: {
    count: 14,
    draw(ctx, s) {
      star(ctx, s / 2, s / 2, s * 0.5, s * 0.12, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    },
    size: [5, 11],
    speed: [-8, -18],
    alpha: [0.4, 0.8],
    blend: 'normal',
  },

  sound: {
    root: 67,
    scale: [0, 2, 4, 7, 9],
    blip: 'triangle',
    sparkle: 'sine',
    thump: 0.3,
    music: {
      bpm: 132,
      progression: [0, 3, 4, 2],
      pad: 'triangle',
      lead: 'square',
      bass: 'triangle',
      leadDensity: 0.5,
      padGain: 0.035,
      leadGain: 0.022,
      bassGain: 0.09,
      filter: 2600,
      reverb: 0.25,
      echo: 0.25,
      hats: true,
    },
  },
};

export default candy;
