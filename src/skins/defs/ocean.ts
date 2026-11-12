import { roundRect, shade, star } from '../draw';
import { cells, circ, dots, ell, face, finish, ghostTile, kinds, paint, poly, rg, vg } from '../tiles';
import type { Ctx, SkinDef } from '../types';

/**
 * OCÉANO — cada bloque es una criatura o tesoro marino que llena todo el cuadrado:
 *   naranja → pez payaso · amarillo → pez globo · rosa → medusa · rojo → estrella de mar
 *   violeta → concha · azul → pulpo · verde → tortuga marina · piedra → roca con percebes
 * Fondo azul profundo con rayos de luz; las piezas estallan en burbujas que suben.
 */

const C = {
  clown: '#ff8a2a',
  puffer: '#ffd23a',
  jelly: '#ff6fb5',
  starfish: '#e8433f',
  shell: '#a070e0',
  octopus: '#3a86ff',
  turtle: '#3fbf7a',
  stone: '#5f6f7a',
};
type Kind = keyof typeof C;
const kindOf = kinds(C, 'clown');

const INK = '#0b2238';
const ST = { ink: INK, depth: 'rgba(0, 20, 50, 0.45)', shine: 0.25 };

/** Agua de fondo de cada baldosa, teñida. */
function water(ctx: Ctx, s: number, tint: string) {
  face(ctx, s, vg(ctx, s, shade(tint, 0.55), shade(tint, 0.15)), ST);
}

function eye(ctx: Ctx, s: number, x: number, y: number, r: number) {
  circ(ctx, s, x, y, r);
  paint(ctx, s, '#ffffff', INK, 0.015);
  circ(ctx, s, x + r * 0.15, y + r * 0.1, r * 0.55);
  ctx.fillStyle = INK;
  ctx.fill();
  circ(ctx, s, x - r * 0.15, y - r * 0.2, r * 0.22);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
}

function clown(ctx: Ctx, s: number) {
  water(ctx, s, '#4fb8e8');
  // cuerpo enorme que casi llena el bloque
  ctx.beginPath();
  ctx.moveTo(0.08 * s, 0.5 * s);
  ctx.bezierCurveTo(0.12 * s, 0.1 * s, 0.7 * s, 0.08 * s, 0.82 * s, 0.5 * s);
  ctx.bezierCurveTo(0.7 * s, 0.92 * s, 0.12 * s, 0.9 * s, 0.08 * s, 0.5 * s);
  ctx.closePath();
  ctx.save();
  paint(ctx, s, vg(ctx, s, '#ffb35a', '#f06a10', 0.1, 0.9), INK, 0.03);
  ctx.clip();
  // franjas blancas con borde negro
  for (const x of [0.28, 0.52, 0.74]) {
    ctx.beginPath();
    ctx.moveTo((x - 0.06) * s, 0);
    ctx.quadraticCurveTo((x + 0.04) * s, 0.5 * s, (x - 0.06) * s, s);
    ctx.lineTo((x + 0.06) * s, s);
    ctx.quadraticCurveTo((x + 0.14) * s, 0.5 * s, (x + 0.06) * s, 0);
    ctx.closePath();
    paint(ctx, s, '#ffffff', INK, 0.025);
  }
  ctx.restore();
  // cola
  poly(ctx, s, [[0.8, 0.5], [0.98, 0.3], [0.98, 0.7]]);
  paint(ctx, s, '#f06a10', INK, 0.025);
  ctx.fillStyle = '#ffffff';
  poly(ctx, s, [[0.93, 0.36], [0.98, 0.3], [0.98, 0.7], [0.93, 0.64]]);
  ctx.fill();
  eye(ctx, s, 0.2, 0.42, 0.07);
  // aleta
  ell(ctx, s, 0.42, 0.66, 0.08, 0.04, 0.5);
  paint(ctx, s, '#ffb35a', INK, 0.02);
  finish(ctx, s, ST);
}

function puffer(ctx: Ctx, s: number) {
  water(ctx, s, '#35a6c8');
  // espinas
  ctx.save();
  ctx.translate(s * 0.5, s * 0.52);
  ctx.fillStyle = '#c99a10';
  for (let i = 0; i < 18; i++) {
    ctx.rotate((Math.PI * 2) / 18);
    ctx.beginPath();
    ctx.moveTo(-s * 0.035, -s * 0.38);
    ctx.lineTo(0, -s * 0.5);
    ctx.lineTo(s * 0.035, -s * 0.38);
    ctx.fill();
  }
  ctx.restore();
  circ(ctx, s, 0.5, 0.52, 0.4);
  paint(ctx, s, rg(ctx, s, 0.4, 0.38, 0.5, [[0, '#fff2a0'], [0.6, '#ffd23a'], [1, '#d9a010']]), INK, 0.03);
  // panza clara y manchas
  ell(ctx, s, 0.5, 0.74, 0.26, 0.14);
  ctx.fillStyle = 'rgba(255, 252, 230, 0.8)';
  ctx.fill();
  dots(ctx, s, 4, 8, 'rgba(160, 110, 10, 0.5)', [0.015, 0.025], [0.25, 0.2, 0.75, 0.5]);
  eye(ctx, s, 0.36, 0.44, 0.075);
  eye(ctx, s, 0.64, 0.44, 0.075);
  // boquita
  circ(ctx, s, 0.5, 0.64, 0.045);
  paint(ctx, s, '#ff8a6a', INK, 0.02);
  finish(ctx, s, ST);
}

function jelly(ctx: Ctx, s: number) {
  face(ctx, s, vg(ctx, s, '#2a5aa8', '#0e2c66'), ST);
  // tentáculos ondulados
  ctx.lineCap = 'round';
  for (let i = 0; i < 7; i++) {
    const x = 0.2 + i * 0.1;
    ctx.beginPath();
    ctx.moveTo(x * s, 0.5 * s);
    for (let k = 1; k <= 5; k++) ctx.quadraticCurveTo((x + (k % 2 ? 0.05 : -0.05)) * s, (0.5 + k * 0.1 - 0.05) * s, x * s, (0.5 + k * 0.1) * s);
    ctx.strokeStyle = i % 2 ? 'rgba(255, 180, 220, 0.85)' : 'rgba(255, 120, 190, 0.85)';
    ctx.lineWidth = s * (i % 2 ? 0.025 : 0.04);
    ctx.stroke();
  }
  // campana grande
  ctx.save();
  ctx.shadowColor = '#ff8fd0';
  ctx.shadowBlur = s * 0.2;
  ctx.beginPath();
  ctx.moveTo(0.06 * s, 0.56 * s);
  ctx.bezierCurveTo(0.04 * s, 0.0, 0.96 * s, 0.0, 0.94 * s, 0.56 * s);
  for (let i = 0; i < 6; i++) {
    const x0 = 0.94 - i * 0.147;
    ctx.quadraticCurveTo((x0 - 0.073) * s, 0.64 * s, (x0 - 0.147) * s, 0.56 * s);
  }
  ctx.closePath();
  ctx.fillStyle = rg(ctx, s, 0.5, 0.3, 0.55, [[0, 'rgba(255, 230, 245, 0.95)'], [0.6, 'rgba(255, 111, 181, 0.9)'], [1, 'rgba(200, 50, 140, 0.9)']]);
  ctx.fill();
  ctx.restore();
  // órganos internos
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.lineWidth = s * 0.025;
  for (const x of [0.36, 0.5, 0.64]) {
    ctx.beginPath();
    ctx.arc(x * s, 0.38 * s, s * 0.05, 0, Math.PI * 2);
    ctx.stroke();
  }
  ell(ctx, s, 0.32, 0.2, 0.1, 0.04, -0.5);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fill();
  finish(ctx, s, { ...ST, shine: 0.12 });
}

function starfish(ctx: Ctx, s: number) {
  // sobre arena
  face(ctx, s, vg(ctx, s, '#f6dfa8', '#d9b46a'), ST);
  dots(ctx, s, 13, 18, 'rgba(160, 120, 60, 0.35)', [0.006, 0.012]);
  ctx.save();
  ctx.translate(s * 0.5, s * 0.53);
  ctx.rotate(-0.15);
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 0.52 : 0.2;
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    const x = Math.cos(a) * r * s;
    const y = Math.sin(a) * r * s;
    if (i === 0) ctx.moveTo(x, y);
    else {
      const pa = ((i - 0.5) * Math.PI) / 5 - Math.PI / 2;
      const pr = 0.3 * s;
      ctx.quadraticCurveTo(Math.cos(pa) * pr, Math.sin(pa) * pr, x, y);
    }
  }
  ctx.closePath();
  ctx.fillStyle = rg(ctx, s, 0, 0, 0.5, [[0, '#ff8a6a'], [1, '#c82a2a']]);
  ctx.fill();
  ctx.strokeStyle = '#7a1414';
  ctx.lineWidth = s * 0.028;
  ctx.lineJoin = 'round';
  ctx.stroke();
  // bolitas en cada brazo
  ctx.fillStyle = '#ffd0b0';
  for (let i = 0; i < 5; i++) {
    const a = (i * 2 * Math.PI) / 5 - Math.PI / 2;
    for (const r of [0.12, 0.22, 0.32]) {
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r * s, Math.sin(a) * r * s, s * (0.03 - r * 0.04), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
  finish(ctx, s, ST);
}

function shell(ctx: Ctx, s: number) {
  face(ctx, s, vg(ctx, s, '#f6dfa8', '#d9b46a'), ST);
  // vieira abierta en abanico, ocupando todo
  const cx = 0.5;
  const cy = 0.86;
  ctx.beginPath();
  ctx.moveTo(cx * s, cy * s);
  for (let i = 0; i <= 9; i++) {
    const a = Math.PI + (i / 9) * Math.PI;
    const r = 0.74;
    const x = cx + Math.cos(a) * r * 0.66;
    const y = cy + Math.sin(a) * r;
    const pa = Math.PI + ((i - 0.5) / 9) * Math.PI;
    if (i === 0) ctx.lineTo(x * s, y * s);
    else ctx.quadraticCurveTo((cx + Math.cos(pa) * r * 0.74) * s, (cy + Math.sin(pa) * r * 1.08) * s, x * s, y * s);
  }
  ctx.closePath();
  paint(ctx, s, rg(ctx, s, 0.5, 0.3, 0.7, [[0, '#f2dcff'], [0.5, '#b88af0'], [1, '#6f3fc0']]), '#3a1a6a', 0.03);
  // costillas
  ctx.strokeStyle = 'rgba(70, 30, 130, 0.55)';
  ctx.lineWidth = s * 0.02;
  for (let i = 1; i < 9; i++) {
    const a = Math.PI + (i / 9) * Math.PI;
    ctx.beginPath();
    ctx.moveTo(cx * s, cy * s);
    ctx.lineTo((cx + Math.cos(a) * 0.66 * 0.74) * s, (cy + Math.sin(a) * 0.74) * s);
    ctx.stroke();
  }
  // bisagra
  poly(ctx, s, [[0.36, 0.98], [0.4, 0.82], [0.6, 0.82], [0.64, 0.98]]);
  paint(ctx, s, '#9a6ad8', '#3a1a6a', 0.025);
  // perla
  circ(ctx, s, 0.5, 0.78, 0.07);
  ctx.fillStyle = rg(ctx, s, 0.48, 0.76, 0.08, [[0, '#ffffff'], [1, '#e6dcf0']]);
  ctx.fill();
  finish(ctx, s, ST);
}

function octopus(ctx: Ctx, s: number) {
  water(ctx, s, '#2a7fd0');
  // tentáculos
  ctx.lineCap = 'round';
  for (let i = 0; i < 6; i++) {
    const x = 0.14 + i * 0.145;
    ctx.beginPath();
    ctx.moveTo(x * s, 0.55 * s);
    ctx.bezierCurveTo((x + (i % 2 ? 0.12 : -0.12)) * s, 0.75 * s, (x - (i % 2 ? 0.1 : -0.1)) * s, 0.85 * s, (x + (i < 3 ? -0.08 : 0.08)) * s, 1.0 * s);
    ctx.strokeStyle = INK;
    ctx.lineWidth = s * 0.12;
    ctx.stroke();
    ctx.strokeStyle = '#4f7fe8';
    ctx.lineWidth = s * 0.08;
    ctx.stroke();
  }
  // cabeza grande
  ell(ctx, s, 0.5, 0.4, 0.38, 0.34);
  paint(ctx, s, rg(ctx, s, 0.4, 0.28, 0.5, [[0, '#9cc0ff'], [0.6, '#3a6fe0'], [1, '#2448a8']]), INK, 0.03);
  dots(ctx, s, 8, 6, 'rgba(20, 40, 120, 0.4)', [0.02, 0.035], [0.3, 0.12, 0.7, 0.3]);
  eye(ctx, s, 0.38, 0.46, 0.075);
  eye(ctx, s, 0.62, 0.46, 0.075);
  // mejillas
  ell(ctx, s, 0.26, 0.58, 0.05, 0.03);
  ctx.fillStyle = 'rgba(255, 140, 190, 0.6)';
  ctx.fill();
  ell(ctx, s, 0.74, 0.58, 0.05, 0.03);
  ctx.fill();
  finish(ctx, s, ST);
}

function turtle(ctx: Ctx, s: number) {
  water(ctx, s, '#3fb8c8');
  // aletas
  for (const [x, y, a] of [[0.16, 0.3, -0.7], [0.84, 0.3, 0.7], [0.2, 0.8, 0.6], [0.8, 0.8, -0.6]]) {
    ell(ctx, s, x, y, 0.15, 0.07, a);
    paint(ctx, s, '#9adf8a', INK, 0.022);
  }
  // cabeza
  ell(ctx, s, 0.5, 0.1, 0.1, 0.1);
  paint(ctx, s, '#9adf8a', INK, 0.022);
  // caparazón grande
  ell(ctx, s, 0.5, 0.55, 0.36, 0.4);
  paint(ctx, s, rg(ctx, s, 0.42, 0.4, 0.5, [[0, '#8ae0a8'], [0.6, '#3fbf7a'], [1, '#22804a']]), INK, 0.03);
  // placas hexagonales
  ctx.strokeStyle = 'rgba(15, 70, 40, 0.7)';
  ctx.lineWidth = s * 0.02;
  const hex = (x: number, y: number, r: number) => {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3 + Math.PI / 6;
      const px = (x + Math.cos(a) * r) * s;
      const py = (y + Math.sin(a) * r) * s;
      if (i) ctx.lineTo(px, py);
      else ctx.moveTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(200, 240, 160, 0.35)';
    ctx.fill();
    ctx.stroke();
  };
  hex(0.5, 0.55, 0.11);
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    hex(0.5 + Math.cos(a) * 0.2, 0.55 + Math.sin(a) * 0.22, 0.08);
  }
  finish(ctx, s, ST);
}

function rock(ctx: Ctx, s: number) {
  face(ctx, s, vg(ctx, s, '#7f8f98', '#3f4c55'), { ...ST, rad: 0.1 });
  // musgo y percebes
  dots(ctx, s, 31, 10, 'rgba(70, 140, 90, 0.45)', [0.03, 0.06]);
  const r = [[0.3, 0.3], [0.68, 0.42], [0.42, 0.7], [0.75, 0.75]];
  for (const [x, y] of r) {
    circ(ctx, s, x, y, 0.065);
    paint(ctx, s, '#d8d0c0', '#3a3a3a', 0.015);
    circ(ctx, s, x, y, 0.025);
    ctx.fillStyle = '#4a4a4a';
    ctx.fill();
  }
  finish(ctx, s, { ...ST, rad: 0.1, shine: 0.12 });
}

const DRAW: Record<Kind, (ctx: Ctx, s: number) => void> = {
  clown,
  puffer,
  jelly,
  starfish,
  shell,
  octopus,
  turtle,
  stone: rock,
};

function bubble(ctx: Ctx, s: number, alpha = 0.35) {
  ctx.beginPath();
  ctx.arc(s / 2, s / 2, s * 0.42, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(200, 240, 255, ${alpha})`;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  ctx.lineWidth = Math.max(1, s * 0.07);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(s * 0.36, s * 0.34, s * 0.1, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
}

const ocean: SkinDef = {
  id: 'ocean',
  name: { es: 'Océano', en: 'Ocean' },
  description: {
    es: 'Peces, medusas, estrellas de mar y conchas en el fondo del mar. ¡Explotan en burbujas!',
    en: 'Fish, jellyfish, starfish and shells under the sea. They pop into bubbles!',
  },
  price: 1100,
  order: 5.1,
  blocks: [C.clown, C.puffer, C.jelly, C.starfish, C.shell, C.octopus, C.turtle, C.stone],
  ui: {
    bg: '#062a4a',
    panel: 'rgba(8, 48, 84, 0.9)',
    panelBorder: 'rgba(120, 210, 255, 0.45)',
    text: '#eaf8ff',
    textDim: '#9cc6de',
    accent: '#ffd23a',
    accent2: '#4fd6ff',
    good: '#4fe0a0',
    danger: '#ff6a5a',
    radius: 20,
    glass: true,
    font: '"Segoe UI Rounded", "Arial Rounded MT Bold", "Nunito", "Segoe UI", system-ui, sans-serif',
    titleGlow: '0 0 14px rgba(80, 200, 255, 0.8)',
  },
  blockMargin: 0.08,
  flash: '#d8f6ff',
  explosion: { power: 1.15, ring: '#bff0ff', rings: 2, screenFlash: false },

  drawBackground(ctx, w, h) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#1aa0d8');
    g.addColorStop(0.45, '#0a5a96');
    g.addColorStop(1, '#03203f');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // rayos de luz
    ctx.globalCompositeOperation = 'lighter';
    for (const [x, sp] of [[0.15, 0.1], [0.4, 0.14], [0.62, 0.08], [0.85, 0.12]]) {
      const lg = ctx.createLinearGradient(0, 0, 0, h * 0.85);
      lg.addColorStop(0, 'rgba(200, 245, 255, 0.22)');
      lg.addColorStop(1, 'rgba(200, 245, 255, 0)');
      ctx.fillStyle = lg;
      ctx.beginPath();
      ctx.moveTo(w * (x - 0.03), 0);
      ctx.lineTo(w * (x + 0.03), 0);
      ctx.lineTo(w * (x + sp + 0.1), h * 0.85);
      ctx.lineTo(w * (x + sp - 0.06), h * 0.85);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    // cáusticas en la superficie
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 2;
    for (let y = 12; y < h * 0.15; y += 14) {
      ctx.beginPath();
      for (let x = 0; x <= w; x += 20) ctx.lineTo(x, y + Math.sin(x * 0.05 + y) * 4);
      ctx.stroke();
    }
    // arena y algas
    const sandY = h * 0.92;
    ctx.fillStyle = '#c9a868';
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 24) ctx.lineTo(x, sandY + Math.sin(x * 0.02) * 8);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
    ctx.lineCap = 'round';
    for (let i = 0; i < 9; i++) {
      const x = ((i * 137) % 100) / 100 * w;
      ctx.strokeStyle = i % 2 ? 'rgba(40, 140, 80, 0.75)' : 'rgba(60, 170, 90, 0.75)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(x, h);
      for (let k = 1; k <= 6; k++) ctx.lineTo(x + Math.sin(k + i) * 10, h - k * h * 0.035);
      ctx.stroke();
    }
  },

  drawBoard(ctx, size, cell) {
    const pad = cell * 0.22;
    ctx.save();
    ctx.shadowColor = 'rgba(0, 20, 50, 0.5)';
    ctx.shadowBlur = cell * 0.5;
    roundRect(ctx, -pad, -pad, size + pad * 2, size + pad * 2, cell * 0.45);
    ctx.fillStyle = 'rgba(4, 36, 70, 0.75)';
    ctx.fill();
    ctx.restore();
    roundRect(ctx, -pad, -pad, size + pad * 2, size + pad * 2, cell * 0.45);
    ctx.strokeStyle = 'rgba(160, 230, 255, 0.5)';
    ctx.lineWidth = Math.max(1.5, cell * 0.05);
    ctx.stroke();
    cells(ctx, cell, (x, y, px, py) => {
      const i = cell * 0.06;
      roundRect(ctx, px + i, py + i, cell - i * 2, cell - i * 2, cell * 0.2);
      ctx.fillStyle = (x + y) % 2 ? 'rgba(20, 90, 140, 0.55)' : 'rgba(14, 76, 124, 0.55)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(180, 235, 255, 0.12)';
      ctx.lineWidth = Math.max(1, cell * 0.02);
      ctx.stroke();
    });
  },

  drawBlock(ctx, s, color, variant) {
    if (variant === 'ghost') return ghostTile(ctx, s, 0.14, 'rgba(200,240,255,0.22)', 'rgba(230,250,255,0.9)');
    DRAW[variant === 'stone' ? 'stone' : kindOf(color)](ctx, s);
  },

  drawGem(ctx, s) {
    // perla brillante
    ctx.save();
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = s * 0.2;
    circ(ctx, s, 0.5, 0.5, 0.2);
    ctx.fillStyle = rg(ctx, s, 0.44, 0.42, 0.24, [[0, '#ffffff'], [0.6, '#f0e8ff'], [1, '#b8b0d8']]);
    ctx.fill();
    ctx.restore();
  },

  drawTarget(ctx, s) {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = s * 0.06;
    star(ctx, s / 2, s / 2, s * 0.3, s * 0.13, 5);
    ctx.fillStyle = '#ffd23a';
    ctx.fill();
    ctx.restore();
    star(ctx, s / 2, s / 2, s * 0.3, s * 0.13, 5);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(1.5, s * 0.04);
    ctx.lineJoin = 'round';
    ctx.stroke();
  },

  particles: {
    draw(ctx, s) {
      bubble(ctx, s, 0.3);
    },
    perCell: 6,
    size: [0.14, 0.34],
    speed: [1.5, 4.5],
    gravity: -5,
    life: [0.7, 1.3],
    blend: 'normal',
    spin: false,
    shrink: false,
  },

  ambient: {
    count: 20,
    draw(ctx, s) {
      bubble(ctx, s, 0.2);
    },
    size: [4, 12],
    speed: [-18, -40],
    alpha: [0.3, 0.7],
    blend: 'normal',
  },

  sound: {
    root: 62,
    scale: [0, 2, 4, 7, 9],
    blip: 'sine',
    sparkle: 'sine',
    thump: 0.25,
    music: {
      bpm: 84,
      progression: [0, 3, 1, 4],
      pad: 'triangle',
      lead: 'sine',
      bass: 'sine',
      leadDensity: 0.3,
      padGain: 0.05,
      leadGain: 0.03,
      bassGain: 0.08,
      filter: 1100,
      reverb: 0.55,
      echo: 0.4,
      hats: false,
    },
  },
};

export default ocean;
