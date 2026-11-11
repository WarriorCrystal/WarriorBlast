import { drawGemIcon, roundRect, rgba, shade } from '../draw';
import type { Ctx, SkinDef } from '../types';

/**
 * MASITA — una gata blanca de ojos azules. Un color de bloque es su cara (orejas,
 * ojos azules, naricita rosa y bigotes), otro lleva el "logo" de una pata rosa y el
 * resto son mantas de pelaje blanco y gris claro mezclados de distintas formas.
 */

const C = {
  face: '#fdfdff',
  paw: '#f7f3f5',
  white: '#ffffff',
  grey: '#dde1e8',
  patch: '#f4f5f8',
  stripes: '#eceef2',
  blend: '#e6e9ee',
  stone: '#aab0ba',
};

const FUR_GREY = '#c4cad4';
const FUR_GREY_DARK = '#b1b8c3';
const PINK = '#f490b6';
const PINK_DARK = '#de6f99';
const EYE_BLUE = '#3f93e3';

type Kind = 'face' | 'paw' | 'white' | 'grey' | 'patch' | 'stripes' | 'blend' | 'stone';

const KIND: Record<string, Kind> = {
  [C.face]: 'face',
  [C.paw]: 'paw',
  [C.white]: 'white',
  [C.grey]: 'grey',
  [C.patch]: 'patch',
  [C.stripes]: 'stripes',
  [C.blend]: 'blend',
  [C.stone]: 'stone',
};

const kindOf = (color: string): Kind => KIND[color.toLowerCase()] ?? 'white';

/** Generador pseudoaleatorio con semilla: el pelaje sale igual cada vez que se dibuja. */
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

const seedOf = (str: string) => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
};

function heart(ctx: Ctx, cx: number, cy: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(cx, cy + r * 0.85);
  ctx.bezierCurveTo(cx - r * 1.25, cy + r * 0.05, cx - r * 0.85, cy - r * 0.95, cx, cy - r * 0.35);
  ctx.bezierCurveTo(cx + r * 0.85, cy - r * 0.95, cx + r * 1.25, cy + r * 0.05, cx, cy + r * 0.85);
  ctx.closePath();
}

/** Huella de gata: almohadilla grande y cuatro deditos. Centrada en (cx, cy), tamaño ≈ 2r. */
function pawPrint(ctx: Ctx, cx: number, cy: number, r: number) {
  // almohadilla principal (forma de "montañita" redondeada)
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.62, cy + r * 0.62);
  ctx.bezierCurveTo(cx - r * 0.95, cy + r * 0.62, cx - r * 0.8, cy + r * 0.05, cx - r * 0.42, cy - r * 0.02);
  ctx.bezierCurveTo(cx - r * 0.18, cy - r * 0.08, cx + r * 0.18, cy - r * 0.08, cx + r * 0.42, cy - r * 0.02);
  ctx.bezierCurveTo(cx + r * 0.8, cy + r * 0.05, cx + r * 0.95, cy + r * 0.62, cx + r * 0.62, cy + r * 0.62);
  ctx.bezierCurveTo(cx + r * 0.3, cy + r * 0.62, cx + r * 0.2, cy + r * 0.48, cx, cy + r * 0.48);
  ctx.bezierCurveTo(cx - r * 0.2, cy + r * 0.48, cx - r * 0.3, cy + r * 0.62, cx - r * 0.62, cy + r * 0.62);
  ctx.closePath();
  // deditos (judías)
  const toes: Array<[number, number, number]> = [
    [-0.72, -0.32, -0.45],
    [-0.27, -0.7, -0.12],
    [0.27, -0.7, 0.12],
    [0.72, -0.32, 0.45],
  ];
  for (const [dx, dy, rot] of toes) {
    ctx.moveTo(cx + dx * r + r * 0.2, cy + dy * r);
    ctx.ellipse(cx + dx * r, cy + dy * r, r * 0.2, r * 0.26, rot, 0, Math.PI * 2);
  }
}

/**
 * Cojín de pelaje: base suave con luz arriba-izquierda, cientos de pelitos cortos
 * y, según el tipo, manchas o rayas grises. Ocupa el rectángulo (x, y, w, h).
 */
function fur(ctx: Ctx, s: number, kind: Kind, x: number, y: number, w: number, h: number, r: number) {
  const base = kind === 'grey' ? C.grey : kind === 'stone' ? C.stone : '#ffffff';
  const rand = rng(seedOf(kind));
  ctx.save();
  // sombra de apoyo
  roundRect(ctx, x + s * 0.01, y + s * 0.03, w, h, r);
  ctx.fillStyle = 'rgba(40, 50, 80, 0.22)';
  ctx.fill();
  roundRect(ctx, x, y, w, h, r);
  const g = ctx.createRadialGradient(x + w * 0.32, y + h * 0.28, 0, x + w * 0.5, y + h * 0.5, Math.max(w, h) * 0.78);
  g.addColorStop(0, shade(base, 0.35));
  g.addColorStop(0.65, base);
  g.addColorStop(1, shade(base, -0.13));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();

  // dibujos del pelaje
  if (kind === 'patch') {
    ctx.fillStyle = FUR_GREY;
    ctx.beginPath();
    ctx.ellipse(x + w * 0.76, y + h * 0.22, w * 0.38, h * 0.3, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + w * 0.12, y + h * 0.9, w * 0.2, h * 0.16, 0.4, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'stripes') {
    ctx.strokeStyle = rgba(FUR_GREY_DARK, 0.75);
    ctx.lineCap = 'round';
    ctx.lineWidth = s * 0.09;
    for (const t of [0.22, 0.5, 0.78]) {
      ctx.beginPath();
      ctx.moveTo(x - w * 0.05, y + h * (t - 0.12));
      ctx.quadraticCurveTo(x + w * 0.5, y + h * (t + 0.1), x + w * 1.05, y + h * (t - 0.12));
      ctx.stroke();
    }
  } else if (kind === 'blend') {
    const b = ctx.createLinearGradient(x, y, x + w, y + h);
    b.addColorStop(0, 'rgba(255,255,255,0)');
    b.addColorStop(0.45, rgba(FUR_GREY, 0.25));
    b.addColorStop(1, rgba(FUR_GREY_DARK, 0.95));
    ctx.fillStyle = b;
    ctx.fillRect(x, y, w, h);
  } else if (kind === 'grey' || kind === 'stone') {
    // pecho blanco que asoma desde abajo
    const b = ctx.createRadialGradient(x + w * 0.5, y + h * 1.05, 0, x + w * 0.5, y + h * 1.05, h * 0.55);
    b.addColorStop(0, kind === 'stone' ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.9)');
    b.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = b;
    ctx.fillRect(x, y, w, h);
  }

  // pelitos: trazos cortos y finos, claros y oscuros, todos peinados hacia abajo-derecha
  ctx.lineCap = 'round';
  const n = Math.round(70 + s * 0.4);
  for (let i = 0; i < n; i++) {
    const px = x + rand() * w;
    const py = y + rand() * h;
    const a = 1.05 + (rand() - 0.5) * 0.9;
    const len = s * (0.05 + rand() * 0.07);
    const light = rand() < 0.55;
    ctx.strokeStyle = light ? 'rgba(255,255,255,0.75)' : 'rgba(120,130,150,0.16)';
    ctx.lineWidth = Math.max(0.6, s * (light ? 0.013 : 0.01));
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.quadraticCurveTo(px + Math.cos(a - 0.3) * len * 0.6, py + Math.sin(a - 0.3) * len * 0.6, px + Math.cos(a) * len, py + Math.sin(a) * len);
    ctx.stroke();
  }
  ctx.restore();

  // contorno suave para que el blanco se lea sobre cualquier fondo
  roundRect(ctx, x, y, w, h, r);
  ctx.strokeStyle = rgba('#7d879c', 0.45);
  ctx.lineWidth = Math.max(1, s * 0.018);
  ctx.stroke();
  // brillo de mullido arriba-izquierda
  ctx.save();
  roundRect(ctx, x, y, w, h, r);
  ctx.clip();
  const hl = ctx.createRadialGradient(x + w * 0.28, y + h * 0.2, 0, x + w * 0.28, y + h * 0.2, w * 0.45);
  hl.addColorStop(0, 'rgba(255,255,255,0.55)');
  hl.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = hl;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

function ear(ctx: Ctx, s: number, flip: boolean) {
  const X = (v: number) => (flip ? 1 - v : v) * s;
  const Y = (v: number) => v * s;
  ctx.save();
  ctx.lineJoin = 'round';
  // oreja blanca con contorno
  ctx.beginPath();
  ctx.moveTo(X(0.05), Y(0.48));
  ctx.lineTo(X(0.11), Y(0.03));
  ctx.lineTo(X(0.46), Y(0.22));
  ctx.closePath();
  ctx.fillStyle = '#f7f8fb';
  ctx.strokeStyle = rgba('#7d879c', 0.5);
  ctx.lineWidth = Math.max(1, s * 0.03);
  ctx.stroke();
  ctx.fill();
  // interior rosa
  ctx.beginPath();
  ctx.moveTo(X(0.13), Y(0.36));
  ctx.lineTo(X(0.15), Y(0.11));
  ctx.lineTo(X(0.36), Y(0.24));
  ctx.closePath();
  ctx.fillStyle = '#f9b8cf';
  ctx.strokeStyle = '#f9b8cf';
  ctx.lineWidth = Math.max(1, s * 0.03);
  ctx.stroke();
  ctx.fill();
  ctx.restore();
}

function eye(ctx: Ctx, s: number, cx: number, cy: number) {
  const rx = s * 0.12;
  const ry = s * 0.105;
  // contorno oscuro (delineado natural de los gatos)
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx + s * 0.016, ry + s * 0.016, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#2b2f3a';
  ctx.fill();
  // iris azul
  const g = ctx.createRadialGradient(cx, cy - ry * 0.35, 0, cx, cy, rx);
  g.addColorStop(0, '#bfe5ff');
  g.addColorStop(0.45, '#6db6f2');
  g.addColorStop(0.85, EYE_BLUE);
  g.addColorStop(1, '#1f5aa8');
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  // pupila rasgada
  ctx.beginPath();
  ctx.ellipse(cx, cy + s * 0.005, s * 0.03, ry * 0.78, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#121419';
  ctx.fill();
  // brillos
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath();
  ctx.arc(cx - rx * 0.38, cy - ry * 0.38, s * 0.03, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + rx * 0.35, cy + ry * 0.4, s * 0.013, 0, Math.PI * 2);
  ctx.fill();
}

/** La cara de Masita. */
function face(ctx: Ctx, s: number) {
  ear(ctx, s, false);
  ear(ctx, s, true);
  fur(ctx, s, 'face', s * 0.04, s * 0.15, s * 0.92, s * 0.81, s * 0.3);
  // mejillas
  for (const x of [0.19, 0.81]) {
    const b = ctx.createRadialGradient(s * x, s * 0.7, 0, s * x, s * 0.7, s * 0.09);
    b.addColorStop(0, rgba(PINK, 0.45));
    b.addColorStop(1, rgba(PINK, 0));
    ctx.fillStyle = b;
    ctx.fillRect(s * (x - 0.1), s * 0.6, s * 0.2, s * 0.2);
  }
  eye(ctx, s, s * 0.31, s * 0.53);
  eye(ctx, s, s * 0.69, s * 0.53);
  // bigotes
  ctx.strokeStyle = 'rgba(130,138,155,0.85)';
  ctx.lineWidth = Math.max(0.8, s * 0.012);
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (const flip of [false, true]) {
    const X = (v: number) => (flip ? 1 - v : v) * s;
    ctx.moveTo(X(0.32), s * 0.7);
    ctx.lineTo(X(0.07), s * 0.655);
    ctx.moveTo(X(0.32), s * 0.735);
    ctx.lineTo(X(0.07), s * 0.755);
  }
  ctx.stroke();
  // naricita rosa
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(s * 0.455, s * 0.665);
  ctx.lineTo(s * 0.545, s * 0.665);
  ctx.lineTo(s * 0.5, s * 0.715);
  ctx.closePath();
  ctx.fillStyle = PINK;
  ctx.strokeStyle = PINK;
  ctx.lineWidth = Math.max(1, s * 0.02);
  ctx.stroke();
  ctx.fill();
  ctx.restore();
  // boquita en "w"
  ctx.strokeStyle = '#8a92a3';
  ctx.lineWidth = Math.max(0.8, s * 0.016);
  ctx.beginPath();
  ctx.moveTo(s * 0.5, s * 0.72);
  ctx.lineTo(s * 0.5, s * 0.755);
  ctx.moveTo(s * 0.43, s * 0.75);
  ctx.quadraticCurveTo(s * 0.465, s * 0.79, s * 0.5, s * 0.755);
  ctx.quadraticCurveTo(s * 0.535, s * 0.79, s * 0.57, s * 0.75);
  ctx.stroke();
}

function block(ctx: Ctx, s: number, kind: Kind) {
  if (kind === 'face') return face(ctx, s);
  const i = s * 0.035;
  fur(ctx, s, kind, i, i, s - i * 2, s - i * 2, s * 0.24);
  if (kind === 'paw') {
    ctx.save();
    ctx.shadowColor = rgba(PINK_DARK, 0.35);
    ctx.shadowBlur = s * 0.04;
    ctx.shadowOffsetY = s * 0.015;
    pawPrint(ctx, s * 0.5, s * 0.55, s * 0.3);
    const g = ctx.createLinearGradient(0, s * 0.25, 0, s * 0.8);
    g.addColorStop(0, '#f9b0cb');
    g.addColorStop(1, PINK_DARK);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
    // brillito en la almohadilla
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath();
    ctx.ellipse(s * 0.43, s * 0.58, s * 0.06, s * 0.03, -0.3, 0, Math.PI * 2);
    ctx.fill();
  }
}

const masita: SkinDef = {
  id: 'masita',
  name: { es: 'Masita', en: 'Masita' },
  description: {
    es: 'Una gata blanca de ojos azules, patitas rosas y pelaje suavecito.',
    en: 'A white cat with blue eyes, pink paws and the softest fur.',
  },
  price: 2000,
  order: 4,
  blocks: [C.face, C.paw, C.white, C.grey, C.patch, C.stripes, C.blend, C.stone],
  ui: {
    bg: '#e7ecf5',
    panel: 'rgba(255, 255, 255, 0.93)',
    panelBorder: '#cbd5e8',
    text: '#2a3142',
    textDim: '#687287',
    accent: EYE_BLUE,
    accent2: PINK,
    good: '#4fb987',
    danger: '#de5470',
    radius: 20,
    font: '"Segoe UI Rounded", "Arial Rounded MT Bold", "Nunito", "Segoe UI", system-ui, sans-serif',
    titleGlow: '0 2px 10px rgba(244, 144, 182, 0.55)',
    // los bloques son casi todos blancos: la interfaz usa los ojos azules, el rosa de la pata y grises
    swatches: [EYE_BLUE, PINK_DARK, '#8a96ad', '#7d8aa5', '#5fa7e6', '#c97fa8', '#9aa6bb'],
  },
  blockMargin: 0.08,
  flash: '#ffe3ee',

  drawBackground(ctx, w, h) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#f4f6fb');
    g.addColorStop(1, '#dbe2ef');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // huellitas repartidas por el fondo, como si Masita hubiera paseado por ahí
    const rand = rng(77);
    const step = 74;
    let row = 0;
    for (let y = step * 0.4; y < h + step; y += step * 0.8, row++) {
      for (let x = (row % 2) * step * 0.5 + step * 0.3; x < w + step; x += step) {
        ctx.save();
        ctx.translate(x + (rand() - 0.5) * 14, y + (rand() - 0.5) * 14);
        ctx.rotate((rand() - 0.5) * 0.9);
        pawPrint(ctx, 0, 0, 10 + rand() * 4);
        ctx.fillStyle = rand() < 0.35 ? rgba(PINK, 0.16) : 'rgba(110, 125, 160, 0.08)';
        ctx.fill();
        ctx.restore();
      }
    }
  },

  drawBoard(ctx, size, cell) {
    const pad = cell * 0.22;
    // camita acolchada azul lavanda
    ctx.save();
    ctx.shadowColor = 'rgba(60, 70, 110, 0.3)';
    ctx.shadowBlur = cell * 0.4;
    ctx.shadowOffsetY = cell * 0.12;
    roundRect(ctx, -pad, -pad, size + pad * 2, size + pad * 2, cell * 0.45);
    ctx.fillStyle = '#9aa9c9';
    ctx.fill();
    ctx.restore();
    roundRect(ctx, -pad * 0.45, -pad * 0.45, size + pad * 0.9, size + pad * 0.9, cell * 0.32);
    ctx.fillStyle = '#7a8ab0';
    ctx.fill();
    // costura del borde
    ctx.save();
    ctx.setLineDash([cell * 0.12, cell * 0.1]);
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = Math.max(1, cell * 0.035);
    roundRect(ctx, -pad * 0.72, -pad * 0.72, size + pad * 1.44, size + pad * 1.44, cell * 0.38);
    ctx.stroke();
    ctx.restore();
    for (let y = 0; y < 8; y++)
      for (let x = 0; x < 8; x++) {
        const i = cell * 0.06;
        roundRect(ctx, x * cell + i, y * cell + i, cell - i * 2, cell - i * 2, cell * 0.22);
        const g = ctx.createLinearGradient(0, y * cell, 0, (y + 1) * cell);
        g.addColorStop(0, '#6c7ca3');
        g.addColorStop(1, '#8191b6');
        ctx.fillStyle = g;
        ctx.fill();
      }
  },

  drawBlock(ctx, s, color, variant) {
    if (variant === 'ghost') {
      const i = s * 0.05;
      roundRect(ctx, i, i, s - i * 2, s - i * 2, s * 0.24);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.lineWidth = Math.max(1.5, s * 0.045);
      ctx.stroke();
      return;
    }
    if (variant === 'stone') return block(ctx, s, 'stone');
    block(ctx, s, kindOf(color));
  },

  drawGem(ctx, s) {
    // cristal azul como los ojos de Masita
    drawGemIcon(ctx, s, '#8fd0ff', '#ffffff');
  },

  drawTarget(ctx, s) {
    // corazón rosa
    ctx.save();
    ctx.shadowColor = 'rgba(180, 60, 110, 0.4)';
    ctx.shadowBlur = s * 0.06;
    heart(ctx, s / 2, s / 2, s * 0.3);
    ctx.fillStyle = PINK;
    ctx.fill();
    ctx.restore();
    heart(ctx, s / 2, s / 2, s * 0.3);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(1.5, s * 0.045);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.ellipse(s * 0.4, s * 0.43, s * 0.05, s * 0.03, -0.6, 0, Math.PI * 2);
    ctx.fill();
  },

  particles: {
    draw(ctx, s, color) {
      // motitas de pelo que salen volando (con un corazoncito en las de la pata y la cara)
      const k = kindOf(color);
      if (k === 'paw' || k === 'face') {
        heart(ctx, s / 2, s / 2, s * 0.42);
        ctx.fillStyle = PINK;
        ctx.fill();
        return;
      }
      const base = k === 'grey' || k === 'stone' ? FUR_GREY : '#ffffff';
      ctx.fillStyle = rgba('#7d879c', 0.35);
      for (const [dx, dy, r] of [
        [0.38, 0.45, 0.24],
        [0.62, 0.42, 0.22],
        [0.5, 0.62, 0.24],
      ]) {
        ctx.beginPath();
        ctx.arc(s * dx, s * dy + s * 0.03, s * r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = base;
      for (const [dx, dy, r] of [
        [0.38, 0.45, 0.24],
        [0.62, 0.42, 0.22],
        [0.5, 0.62, 0.24],
      ]) {
        ctx.beginPath();
        ctx.arc(s * dx, s * dy, s * r, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    perCell: 4,
    size: [0.2, 0.34],
    speed: [2, 5],
    gravity: 4,
    life: [0.7, 1.2],
    blend: 'normal',
    spin: true,
    shrink: false,
  },

  ambient: {
    count: 9,
    draw(ctx, s) {
      heart(ctx, s / 2, s / 2, s * 0.42);
      ctx.fillStyle = PINK;
      ctx.fill();
    },
    size: [8, 16],
    speed: [-6, -14],
    alpha: [0.25, 0.55],
    blend: 'normal',
  },

  sound: {
    root: 67,
    scale: [0, 2, 4, 7, 9],
    blip: 'sine',
    sparkle: 'triangle',
    thump: 0.35,
    music: {
      bpm: 86,
      progression: [0, 3, 4, 2],
      pad: 'sine',
      lead: 'triangle',
      bass: 'sine',
      leadDensity: 0.28,
      padGain: 0.05,
      leadGain: 0.032,
      bassGain: 0.08,
      filter: 1500,
      reverb: 0.55,
      echo: 0.35,
      hats: false,
    },
  },
};

export default masita;
