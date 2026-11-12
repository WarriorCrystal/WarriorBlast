import { drawGemIcon, roundRect, shade, star } from '../draw';
import { cells, circ, ell, face, finish, ghostTile, kinds, paint, rg, rng, vg } from '../tiles';
import type { Ctx, SkinDef } from '../types';

/**
 * CANDY — cada bloque es una golosina que llena todo el cuadrado:
 *   rosa → piruleta en espiral · turquesa → caramelo envuelto · amarillo → panal de caramelo
 *   rojo → bastón de caramelo a rayas · violeta → caramelo duro de corte cuadrado
 *   naranja → gomita azucarada · verde → tira ácida · piedra → tableta de chocolate
 * Fondo de rayas rosa y turquesa; explota en confeti de azúcar.
 */

const C = {
  lolly: '#ff5fa2',
  wrapped: '#2ed3c6',
  honey: '#ffc23a',
  cane: '#ff4757',
  cushion: '#a66cff',
  jelly: '#ff8f3a',
  belt: '#6fdc5a',
  stone: '#7a4a2a',
};
type Kind = keyof typeof C;
const kindOf = kinds(C, 'lolly');

const ST = { ink: 'rgba(110, 30, 80, 0.5)', depth: 'rgba(160, 40, 100, 0.22)', shine: 0.32, rad: 0.22, line: 0.026, soft: 0.12 };

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
  ctx.fillStyle = rg(ctx, s, 0.5, 0.5, 0.65, [[0, 'rgba(255,255,255,0)'], [1, 'rgba(160,20,90,0.2)']]);
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
    paint(ctx, s, vg(ctx, s, '#e0fffb', '#7ae6dc', 0.1, 0.9), 'rgba(15, 122, 114, 0.5)', 0.016);
    ctx.strokeStyle = 'rgba(15, 122, 114, 0.25)';
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
  paint(ctx, s, rg(ctx, s, 0.42, 0.4, 0.35, [[0, '#d8fffa'], [0.5, '#2ed3c6'], [1, '#128f86']]), 'rgba(15, 106, 100, 0.55)', 0.02);
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

/** Cristales de azúcar sueltos sobre toda la cara. */
function sugarCoat(ctx: Ctx, s: number, seed: number, n: number) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    ctx.save();
    ctx.translate(r() * s, r() * s);
    ctx.rotate(r() * Math.PI);
    const z = s * (0.014 + r() * 0.014);
    ctx.fillStyle = r() > 0.35 ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.45)';
    ctx.fillRect(-z / 2, -z / 2, z, z);
    ctx.restore();
  }
}

function honey(ctx: Ctx, s: number) {
  // panal de caramelo (honeycomb): celdas hexagonales a todo el cuadrado
  face(ctx, s, vg(ctx, s, '#ffd86a', '#d88a10'), ST);
  const R = 0.13;
  const W = Math.sqrt(3) * R;
  for (let row = -1; row < 7; row++)
    for (let col = -1; col < 6; col++) {
      const cx = col * W + (row % 2 ? W / 2 : 0);
      const cy = row * R * 1.5;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3 + Math.PI / 6;
        const x = (cx + Math.cos(a) * R * 0.78) * s;
        const y = (cy + Math.sin(a) * R * 0.78) * s;
        if (i) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = rg(ctx, s, cx + 0.03, cy + 0.04, R, [[0, '#a85a08'], [0.7, '#e8961a'], [1, '#ffcf5a']]);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 245, 200, 0.6)';
      ctx.lineWidth = s * 0.012;
      ctx.stroke();
    }
  gloss(ctx, s, 0.3, 0.24, 0.16);
  finish(ctx, s, ST);
}

function cane(ctx: Ctx, s: number) {
  // rayas de bastón de caramelo en diagonal con volumen
  face(ctx, s, '#ffffff', ST);
  ctx.save();
  ctx.translate(s / 2, s / 2);
  ctx.rotate(-Math.PI / 4);
  for (let x = -s; x < s; x += s * 0.28) {
    ctx.fillStyle = '#ff3a4a';
    ctx.fillRect(x, -s, s * 0.14, s * 2);
    ctx.fillStyle = 'rgba(255, 140, 150, 0.9)';
    ctx.fillRect(x + s * 0.17, -s, s * 0.035, s * 2);
  }
  ctx.restore();
  // volumen: brillo en una franja y sombra en el borde
  ctx.fillStyle = rg(ctx, s, 0.5, 0.5, 0.72, [[0.55, 'rgba(0,0,0,0)'], [1, 'rgba(140, 0, 30, 0.2)']]);
  ctx.fillRect(0, 0, s, s);
  ctx.save();
  ctx.translate(s / 2, s / 2);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillRect(-s, -s * 0.3, s * 2, s * 0.08);
  ctx.restore();
  finish(ctx, s, ST);
}

function cushion(ctx: Ctx, s: number) {
  // caramelo duro de corte cuadrado: biseles en los cuatro lados y mesa central
  face(ctx, s, '#7a3fe0', ST);
  const o = 0.05;
  const k = 0.27;
  const bevels: Array<[Array<[number, number]>, string]> = [
    [[[o, o], [1 - o, o], [1 - k, k], [k, k]], '#d8bfff'],
    [[[1 - o, o], [1 - o, 1 - o], [1 - k, 1 - k], [1 - k, k]], '#8a4ef0'],
    [[[1 - o, 1 - o], [o, 1 - o], [k, 1 - k], [1 - k, 1 - k]], '#5a24b0'],
    [[[o, 1 - o], [o, o], [k, k], [k, 1 - k]], '#b88aff'],
  ];
  for (const [pts, c] of bevels) {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * s, y * s) : ctx.moveTo(x * s, y * s)));
    ctx.closePath();
    ctx.fillStyle = c;
    ctx.fill();
    ctx.strokeStyle = 'rgba(60, 10, 120, 0.2)';
    ctx.lineWidth = s * 0.01;
    ctx.stroke();
  }
  roundRect(ctx, k * s, k * s, (1 - 2 * k) * s, (1 - 2 * k) * s, s * 0.03);
  ctx.fillStyle = rg(ctx, s, 0.42, 0.42, 0.35, [[0, '#f2e6ff'], [0.5, '#a66cff'], [1, '#7a3fe0']]);
  ctx.fill();
  // remolino interior translúcido
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = s * 0.02;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let t = 0; t <= 1; t += 0.05) {
    const a = t * Math.PI * 3;
    const r = t * s * 0.18;
    const x = s / 2 + Math.cos(a) * r;
    const y = s / 2 + Math.sin(a) * r;
    if (t === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  star(ctx, s * 0.2, s * 0.17, s * 0.06, s * 0.012, 4);
  ctx.fill();
  finish(ctx, s, ST);
}

function jelly(ctx: Ctx, s: number) {
  // gomita cuadrada de naranja, translúcida y azucarada
  face(ctx, s, rg(ctx, s, 0.45, 0.45, 0.75, [[0, '#ffd08a'], [0.5, '#ff8f3a'], [1, '#c8500a']]), ST);
  // núcleo luminoso y biseles suaves
  roundRect(ctx, s * 0.2, s * 0.2, s * 0.6, s * 0.6, s * 0.14);
  ctx.fillStyle = 'rgba(255, 230, 170, 0.35)';
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(0, 0, s, s * 0.12);
  ctx.fillRect(0, 0, s * 0.12, s);
  ctx.fillStyle = 'rgba(140, 40, 0, 0.25)';
  ctx.fillRect(0, s * 0.88, s, s * 0.12);
  ctx.fillRect(s * 0.88, 0, s * 0.12, s);
  sugarCoat(ctx, s, 17, 70);
  finish(ctx, s, ST);
}

function belt(ctx: Ctx, s: number) {
  // tira ácida en capas: verde, blanca y verde oscuro, cubierta de azúcar
  face(ctx, s, '#3fae3a', ST);
  const band = (y0: number, y1: number, top: string, bottom: string) => {
    ctx.beginPath();
    ctx.moveTo(0, y0 * s);
    for (let x = 0; x <= 1.0001; x += 0.1) ctx.lineTo(x * s, (y0 + Math.sin(x * 9) * 0.015) * s);
    ctx.lineTo(s, y1 * s);
    for (let x = 1; x >= -0.0001; x -= 0.1) ctx.lineTo(x * s, (y1 + Math.sin(x * 9) * 0.015) * s);
    ctx.closePath();
    ctx.fillStyle = vg(ctx, s, top, bottom, y0, y1);
    ctx.fill();
  };
  band(-0.05, 0.36, '#b8f59a', '#6fdc5a');
  band(0.36, 0.58, '#ffffff', '#f0f0e0');
  band(0.58, 1.05, '#5fd04a', '#2f8a2a');
  sugarCoat(ctx, s, 23, 60);
  finish(ctx, s, ST);
}

function chocolate(ctx: Ctx, s: number) {
  // tableta de chocolate: 2×2 onzas con biseles
  face(ctx, s, '#4a2410', { ...ST, rad: 0.12 });
  const g = 0.05;
  const q = (1 - g * 3) / 2;
  for (const [i, j] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
    const x = g + i * (q + g);
    const y = g + j * (q + g);
    roundRect(ctx, x * s, y * s, q * s, q * s, s * 0.04);
    ctx.fillStyle = vg(ctx, s, '#a8643a', '#5a2a10', y, y + q);
    ctx.fill();
    roundRect(ctx, (x + 0.06) * s, (y + 0.06) * s, (q - 0.12) * s, (q - 0.12) * s, s * 0.03);
    ctx.fillStyle = vg(ctx, s, '#7a4220', '#8a4a24', y, y + q);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 220, 190, 0.35)';
    ctx.fillRect((x + 0.04) * s, (y + 0.03) * s, (q - 0.08) * s, s * 0.02);
  }
  finish(ctx, s, { ...ST, rad: 0.12, shine: 0.16 });
}

const DRAW: Record<Kind, (ctx: Ctx, s: number) => void> = {
  lolly,
  wrapped,
  honey,
  cane,
  cushion,
  jelly,
  belt,
  stone: chocolate,
};

const CONFETTI = ['#ff5fa2', '#2ed3c6', '#ffc23a', '#a66cff', '#6fdc5a', '#ffffff'];

const candy: SkinDef = {
  id: 'candy',
  name: { es: 'Candy', en: 'Candy' },
  description: {
    es: 'Piruletas, caramelos, panal, gomitas, tiras ácidas y chocolate. Explotan en confeti de azúcar.',
    en: 'Lollipops, hard candy, honeycomb, gummies, sour belts and chocolate. They burst into sugar confetti.',
  },
  price: 900,
  order: 5.2,
  blocks: [C.lolly, C.wrapped, C.honey, C.cane, C.cushion, C.jelly, C.belt, C.stone],
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
    ctx.fillStyle = '#ffd3e7';
    ctx.fillRect(0, 0, w, h);
    const step = 56;
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate(-Math.PI / 4);
    const m = Math.hypot(w, h);
    for (let x = -m; x < m; x += step * 2) {
      ctx.fillStyle = 'rgba(150, 232, 224, 0.3)';
      ctx.fillRect(x, -m, step, m * 2);
    }
    ctx.restore();
    // lunares de azúcar
    const r = rng(11);
    for (let i = 0; i < (w * h) / 9000; i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.25 + r() * 0.3})`;
      ctx.beginPath();
      ctx.arc(r() * w, r() * h, 2 + r() * 4, 0, Math.PI * 2);
      ctx.fill();
    }
    const v = ctx.createRadialGradient(w / 2, h * 0.45, Math.min(w, h) * 0.3, w / 2, h * 0.45, Math.max(w, h) * 0.8);
    v.addColorStop(0, 'rgba(255,255,255,0.25)');
    v.addColorStop(1, 'rgba(200, 60, 140, 0.14)');
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
      ctx.fillStyle = '#ff8cbf';
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
      ctx.strokeStyle = 'rgba(200, 80, 150, 0.08)';
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
