import { drawGemIcon, rgba, roundRect, shade, softDot } from '../draw';
import type { Ctx, SkinDef } from '../types';

/**
 * CÁMARA DE PRUEBAS — laboratorio de pruebas científicas: paneles blancos,
 * superficies negras donde no se pueden abrir portales y una IA que lo vigila todo.
 * Cada color de bloque es un personaje u objeto del laboratorio:
 *   rosa → cubo de compañía · azul → portal azul · naranja → portal naranja
 *   celeste → núcleo de personalidad · amarillo → la IA central
 *   rojo → torreta centinela · marrón → la tarta prometida
 * Las "piedras" son paneles negros no portalizables.
 */

const PINK = '#f06aa8';
const BLUE = '#2f8cff';
const ORANGE = '#ff8a1f';
const CYAN = '#5ad2ff';
const YELLOW = '#ffd23a';
const RED = '#ff3b3b';
const CAKE = '#9a5a34';
const STONE = '#3a3f46';

const BLOCKS: SkinDef['blocks'] = [PINK, BLUE, ORANGE, CYAN, YELLOW, RED, CAKE, STONE];

const WHITE = '#eef1f4';
const STEEL = '#c3c9d0';
const DARK = '#23272d';

/** Aleatorio determinista (el fondo siempre igual). */
function rng(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
}

function circle(ctx: Ctx, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
}

function ellipse(ctx: Ctx, x: number, y: number, rx: number, ry: number) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
}

/** Ojo luminoso: halo, iris de color y pupila clara. */
function eye(ctx: Ctx, x: number, y: number, r: number, color: string) {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = r * 2.2;
  circle(ctx, x, y, r);
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.35, shade(color, 0.45));
  g.addColorStop(1, color);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
}

/** Baldosa base: panel de laboratorio con el color del bloque. */
function tile(ctx: Ctx, s: number, color: string, dark = false) {
  const i = s * 0.04;
  roundRect(ctx, i, i, s - i * 2, s - i * 2, s * 0.12);
  const g = ctx.createLinearGradient(0, i, 0, s - i);
  if (dark) {
    g.addColorStop(0, '#2c3138');
    g.addColorStop(1, '#16191d');
  } else {
    g.addColorStop(0, shade(color, 0.55));
    g.addColorStop(1, shade(color, 0.05));
  }
  ctx.fillStyle = g;
  ctx.fill();
  roundRect(ctx, i, i, s - i * 2, s - i * 2, s * 0.12);
  ctx.lineWidth = s * 0.045;
  ctx.strokeStyle = dark ? rgba(color, 0.85) : shade(color, -0.35);
  ctx.stroke();
  // bisel superior
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.fillRect(s * 0.16, s * 0.075, s * 0.68, s * 0.035);
}

/**
 * Cara del bloque: todo el bloque es el objeto (como un cubo visto de frente).
 * Rellena un cuadrado redondeado con degradado y deja el recorte activo para los detalles.
 * Hay que llamar a ctx.restore() al terminar.
 */
function face(ctx: Ctx, s: number, top: string, bottom: string, r = 0.1) {
  const i = s * 0.05;
  ctx.save();
  roundRect(ctx, i, i, s - i * 2, s - i * 2, s * r);
  const g = ctx.createLinearGradient(0, i, s, s - i);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();
}

/** Borde y brillo comunes, después del recorte. */
function finish(ctx: Ctx, s: number, r = 0.1) {
  ctx.restore();
  const i = s * 0.05;
  roundRect(ctx, i, i, s - i * 2, s - i * 2, s * r);
  ctx.lineWidth = s * 0.025;
  ctx.strokeStyle = 'rgba(20, 22, 26, 0.55)';
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(s * 0.16, s * 0.09, s * 0.22, s * 0.03);
}

/** Esquineras en L, como las del cubo. */
function corners(ctx: Ctx, s: number, color: string, c = 0.27, k = 0.08) {
  const i = s * 0.05;
  ctx.fillStyle = color;
  const C = s * c;
  const K = s * k;
  for (const [x, y, sx, sy] of [[i, i, 1, 1], [s - i, i, -1, 1], [i, s - i, 1, -1], [s - i, s - i, -1, -1]]) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + sx * C, y);
    ctx.lineTo(x + sx * C, y + sy * K);
    ctx.lineTo(x + sx * K, y + sy * K);
    ctx.lineTo(x + sx * K, y + sy * C);
    ctx.lineTo(x, y + sy * C);
    ctx.closePath();
    ctx.fill();
  }
}

/** Marcas de color a media arista (las rayas rosas del cubo). */
function edgeMarks(ctx: Ctx, s: number, color: string, sides: Array<'t' | 'b' | 'l' | 'r'> = ['t', 'b', 'l', 'r']) {
  const i = s * 0.05;
  const m = s * 0.12;
  ctx.fillStyle = color;
  for (const side of sides) {
    if (side === 't') ctx.fillRect(s * 0.44, i, m, m);
    if (side === 'b') ctx.fillRect(s * 0.44, s - i - m, m, m);
    if (side === 'l') ctx.fillRect(i, s * 0.44, m, m);
    if (side === 'r') ctx.fillRect(s - i - m, s * 0.44, m, m);
  }
}

/** Cubo de compañía: cara gris con esquineras, rayas rosas y corazón. */
function companionCube(ctx: Ctx, s: number) {
  face(ctx, s, '#e2e5e9', '#9ea5ae');
  corners(ctx, s, '#5a616b');
  edgeMarks(ctx, s, PINK);
  circle(ctx, s / 2, s / 2, s * 0.22);
  ctx.fillStyle = '#c9ced4';
  ctx.fill();
  ctx.lineWidth = s * 0.04;
  ctx.strokeStyle = '#5a616b';
  ctx.stroke();
  const cx = s / 2;
  const cy = s * 0.52;
  const r = s * 0.13;
  ctx.shadowColor = PINK;
  ctx.shadowBlur = s * 0.08;
  ctx.beginPath();
  ctx.moveTo(cx, cy + r * 0.95);
  ctx.bezierCurveTo(cx - r * 1.5, cy, cx - r * 0.9, cy - r * 1.1, cx, cy - r * 0.45);
  ctx.bezierCurveTo(cx + r * 0.9, cy - r * 1.1, cx + r * 1.5, cy, cx, cy + r * 0.95);
  ctx.fillStyle = PINK;
  ctx.fill();
  ctx.shadowBlur = 0;
  finish(ctx, s);
}

/** Portal: el bloque entero es la boca del portal, con borde luminoso. */
function portal(ctx: Ctx, s: number, color: string) {
  face(ctx, s, '#30353c', '#15181c');
  const cx = s / 2;
  const cy = s / 2;
  const rx = s * 0.35;
  const ry = s * 0.4;
  // luz del portal sobre la pared
  const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, s * 0.7);
  halo.addColorStop(0, rgba(color, 0.35));
  halo.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, s, s);
  // interior
  ellipse(ctx, cx, cy, rx, ry);
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, ry);
  g.addColorStop(0, rgba(color, 0.25));
  g.addColorStop(0.65, rgba(color, 0.55));
  g.addColorStop(1, color);
  ctx.fillStyle = g;
  ctx.fill();
  // remolino
  ctx.save();
  ellipse(ctx, cx, cy, rx, ry);
  ctx.clip();
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = s * 0.03;
  for (let k = 0; k < 4; k++) {
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx * (0.2 + k * 0.2), ry * (0.2 + k * 0.2), 0, k * 1.3, k * 1.3 + Math.PI * 1.1);
    ctx.stroke();
  }
  ctx.restore();
  // borde
  ctx.shadowColor = color;
  ctx.shadowBlur = s * 0.2;
  ellipse(ctx, cx, cy, rx, ry);
  ctx.lineWidth = s * 0.08;
  ctx.strokeStyle = color;
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.lineWidth = s * 0.028;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();
  finish(ctx, s);
}

/** Núcleo de personalidad: placa del núcleo con asas arriba y abajo y un gran ojo azul. */
function core(ctx: Ctx, s: number) {
  face(ctx, s, '#eef1f4', '#a7aeb7', 0.22);
  const cx = s / 2;
  const cy = s / 2;
  // asas (barras oscuras arriba y abajo)
  ctx.fillStyle = '#5a616b';
  roundRect(ctx, s * 0.2, s * 0.02, s * 0.6, s * 0.12, s * 0.05);
  ctx.fill();
  roundRect(ctx, s * 0.2, s * 0.86, s * 0.6, s * 0.12, s * 0.05);
  ctx.fill();
  edgeMarks(ctx, s, CYAN, ['l', 'r']);
  // costuras horizontales
  ctx.strokeStyle = 'rgba(70, 76, 84, 0.6)';
  ctx.lineWidth = s * 0.022;
  ctx.beginPath();
  ctx.moveTo(0, cy);
  ctx.lineTo(s, cy);
  ctx.stroke();
  // anillo del ojo
  circle(ctx, cx, cy, s * 0.31);
  ctx.fillStyle = '#c9ced4';
  ctx.fill();
  ctx.lineWidth = s * 0.035;
  ctx.strokeStyle = '#5a616b';
  ctx.stroke();
  circle(ctx, cx, cy, s * 0.23);
  ctx.fillStyle = '#23272d';
  ctx.fill();
  eye(ctx, cx, cy, s * 0.13, '#3aa8ff');
  // párpado superior
  ctx.fillStyle = '#7b838d';
  ctx.beginPath();
  ctx.arc(cx, cy, s * 0.235, Math.PI * 1.08, Math.PI * 1.92);
  ctx.closePath();
  ctx.fill();
  finish(ctx, s, 0.22);
}

/** La IA central: placa blanca de la cabeza con visera negra alargada y ojo amarillo. */
function centralAi(ctx: Ctx, s: number) {
  face(ctx, s, '#f4f6f8', '#aab1ba');
  // conector del cable arriba
  ctx.fillStyle = '#3a3f46';
  ctx.fillRect(s * 0.38, 0, s * 0.24, s * 0.13);
  ctx.fillStyle = YELLOW;
  ctx.fillRect(s * 0.44, s * 0.13, s * 0.12, s * 0.035);
  // costuras de las placas
  ctx.strokeStyle = 'rgba(70, 76, 84, 0.55)';
  ctx.lineWidth = s * 0.02;
  ctx.beginPath();
  ctx.moveTo(0, s * 0.27);
  ctx.lineTo(s, s * 0.22);
  ctx.moveTo(s * 0.72, s * 0.24);
  ctx.lineTo(s * 0.78, s);
  ctx.stroke();
  // visera alargada que cruza la cara
  ctx.beginPath();
  ctx.moveTo(s * 0.04, s * 0.4);
  ctx.quadraticCurveTo(s * 0.3, s * 0.3, s * 0.96, s * 0.42);
  ctx.lineTo(s * 0.96, s * 0.62);
  ctx.quadraticCurveTo(s * 0.3, s * 0.8, s * 0.04, s * 0.68);
  ctx.closePath();
  ctx.fillStyle = '#1b1e22';
  ctx.fill();
  // ranuras de la visera
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  for (let k = 0; k < 3; k++) ctx.fillRect(s * (0.56 + k * 0.12), s * 0.47, s * 0.07, s * 0.1);
  // ojo
  circle(ctx, s * 0.3, s * 0.53, s * 0.13);
  ctx.fillStyle = '#3a3f46';
  ctx.fill();
  eye(ctx, s * 0.3, s * 0.53, s * 0.085, '#ffc21a');
  // placas laterales abajo
  ctx.fillStyle = '#7b838d';
  ctx.fillRect(s * 0.2, s * 0.84, s * 0.4, s * 0.04);
  edgeMarks(ctx, s, YELLOW, ['b']);
  finish(ctx, s);
}

/** Torreta centinela: frente blanco con la ranura central, ojo rojo y cañones a los lados. */
function turret(ctx: Ctx, s: number) {
  face(ctx, s, '#f4f6f8', '#a9b0b9', 0.3);
  const cx = s / 2;
  // ranura central
  ctx.fillStyle = '#2a2f36';
  ctx.fillRect(cx - s * 0.04, 0, s * 0.08, s);
  // paneles de los cañones
  for (const x of [s * 0.08, s * 0.72]) {
    roundRect(ctx, x, s * 0.36, s * 0.2, s * 0.32, s * 0.05);
    ctx.fillStyle = '#d5dade';
    ctx.fill();
    ctx.lineWidth = s * 0.02;
    ctx.strokeStyle = '#5a616b';
    ctx.stroke();
    ctx.fillStyle = '#1b1e22';
    for (const y of [0.44, 0.56]) {
      circle(ctx, x + s * 0.1, s * y, s * 0.035);
      ctx.fill();
    }
  }
  // ojo
  circle(ctx, cx, s * 0.27, s * 0.11);
  ctx.fillStyle = '#1b1e22';
  ctx.fill();
  eye(ctx, cx, s * 0.27, s * 0.07, RED);
  // luces rojas abajo
  edgeMarks(ctx, s, RED, ['b']);
  finish(ctx, s, 0.3);
}

/** La tarta: corte de bizcocho de chocolate con capas de crema, nata, cerezas y vela. */
function cake(ctx: Ctx, s: number) {
  face(ctx, s, '#7c4222', '#3e1f0e');
  // capas de crema
  ctx.fillStyle = 'rgba(255, 236, 214, 0.7)';
  ctx.fillRect(0, s * 0.55, s, s * 0.06);
  ctx.fillRect(0, s * 0.77, s, s * 0.06);
  // migas
  const r = rng(77);
  ctx.fillStyle = 'rgba(30, 12, 4, 0.35)';
  for (let k = 0; k < 18; k++) {
    circle(ctx, r() * s, s * (0.4 + r() * 0.6), s * (0.012 + r() * 0.015));
    ctx.fill();
  }
  // glaseado con chorreones
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(s, 0);
  ctx.lineTo(s, s * 0.36);
  for (let k = 5; k >= 0; k--) {
    const x = (k / 5) * s;
    const drip = k % 2 ? 0.5 : 0.4;
    ctx.quadraticCurveTo(x + s * 0.1, s * drip, x, s * 0.36);
  }
  ctx.closePath();
  ctx.fillStyle = '#3a1a0a';
  ctx.fill();
  // nata y cerezas en el borde
  for (let k = 0; k < 4; k++) {
    const x = s * (0.16 + k * 0.227);
    circle(ctx, x, s * 0.34, s * 0.07);
    ctx.fillStyle = '#fff4e6';
    ctx.fill();
    circle(ctx, x, s * 0.27, s * 0.045);
    ctx.fillStyle = '#d0202a';
    ctx.fill();
  }
  // vela
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(s * 0.47, s * 0.17, s * 0.06, s * 0.12);
  ctx.fillStyle = '#ff5a8a';
  ctx.fillRect(s * 0.47, s * 0.2, s * 0.06, s * 0.025);
  ctx.fillRect(s * 0.47, s * 0.25, s * 0.06, s * 0.025);
  ctx.shadowColor = '#ffb020';
  ctx.shadowBlur = s * 0.1;
  ctx.beginPath();
  ctx.moveTo(s * 0.5, s * 0.07);
  ctx.quadraticCurveTo(s * 0.56, s * 0.14, s * 0.5, s * 0.17);
  ctx.quadraticCurveTo(s * 0.44, s * 0.14, s * 0.5, s * 0.07);
  ctx.fillStyle = '#ffd23a';
  ctx.fill();
  ctx.shadowBlur = 0;
  finish(ctx, s);
}

/** Panel negro no portalizable (bloque "piedra"). */
function blackPanel(ctx: Ctx, s: number) {
  const i = s * 0.04;
  roundRect(ctx, i, i, s - i * 2, s - i * 2, s * 0.06);
  const g = ctx.createLinearGradient(0, 0, s, s);
  g.addColorStop(0, '#454b54');
  g.addColorStop(1, '#1d2025');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = s * 0.03;
  ctx.strokeStyle = '#121417';
  ctx.stroke();
  // cuatro sub-paneles
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = s * 0.025;
  ctx.beginPath();
  ctx.moveTo(s / 2, i);
  ctx.lineTo(s / 2, s - i);
  ctx.moveTo(i, s / 2);
  ctx.lineTo(s - i, s / 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(i * 2, i * 2, s * 0.4, s * 0.025);
  ctx.fillRect(s / 2 + i, i * 2, s * 0.4, s * 0.025);
}

const DESIGNS: Record<string, (ctx: Ctx, s: number) => void> = {
  [PINK]: companionCube,
  [BLUE]: (ctx, s) => portal(ctx, s, BLUE),
  [ORANGE]: (ctx, s) => portal(ctx, s, ORANGE),
  [CYAN]: core,
  [YELLOW]: centralAi,
  [RED]: turret,
  [CAKE]: cake,
};

const testlab: SkinDef = {
  id: 'testlab',
  name: { es: 'Cámara de Pruebas', en: 'Test Chamber' },
  description: {
    es: 'Portales, cubos de compañía, torretas e IAs vigilantes. Hay tarta.',
    en: 'Portals, companion cubes, turrets and watchful AIs. There is cake.',
  },
  price: 1000,
  order: 2.5,
  blocks: BLOCKS,
  ui: {
    bg: '#15181c',
    panel: 'rgba(30, 34, 40, 0.94)',
    panelBorder: 'rgba(238, 241, 244, 0.35)',
    text: '#f2f4f6',
    textDim: '#a3abb5',
    accent: ORANGE,
    accent2: BLUE,
    good: '#5ad28a',
    danger: RED,
    radius: 8,
    font: '"Segoe UI", "Helvetica Neue", Arial, sans-serif',
    titleGlow: '-3px 0 12px rgba(47, 140, 255, 0.6), 3px 0 12px rgba(255, 138, 31, 0.6)',
  },
  blockMargin: 0.2,
  flash: '#ffffff',

  drawBackground(ctx, w, h) {
    ctx.fillStyle = '#15181c';
    ctx.fillRect(0, 0, w, h);
    const m = Math.min(w, h);
    // paneles de pared (algunos blancos, la mayoría en penumbra)
    const p = Math.max(48, m / 7);
    const r = rng(1337);
    for (let y = 0; y < h; y += p) {
      for (let x = 0; x < w; x += p) {
        const lit = r();
        ctx.fillStyle = lit > 0.86 ? '#3a4048' : lit > 0.5 ? '#22262c' : '#1c2025';
        ctx.fillRect(x + 2, y + 2, p - 4, p - 4);
      }
    }
    // haz de luz desde el techo
    const beam = ctx.createLinearGradient(0, 0, 0, h);
    beam.addColorStop(0, 'rgba(230, 240, 255, 0.16)');
    beam.addColorStop(1, 'rgba(230, 240, 255, 0)');
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(w * 0.42, 0);
    ctx.lineTo(w * 0.58, 0);
    ctx.lineTo(w * 0.78, h);
    ctx.lineTo(w * 0.22, h);
    ctx.closePath();
    ctx.fill();
    // un par de portales en las paredes
    const portalBg = (x: number, y: number, color: string) => {
      const rx = m * 0.07;
      const ry = m * 0.12;
      const g = ctx.createRadialGradient(x, y, 0, x, y, ry * 2.2);
      g.addColorStop(0, rgba(color, 0.35));
      g.addColorStop(1, rgba(color, 0));
      ctx.fillStyle = g;
      ctx.fillRect(x - ry * 2.5, y - ry * 2.5, ry * 5, ry * 5);
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = m * 0.05;
      ellipse(ctx, x, y, rx, ry);
      ctx.fillStyle = rgba(color, 0.18);
      ctx.fill();
      ctx.lineWidth = m * 0.012;
      ctx.strokeStyle = color;
      ctx.stroke();
      ctx.restore();
    };
    portalBg(w * 0.08, h * 0.55, BLUE);
    portalBg(w * 0.92, h * 0.3, ORANGE);
    // franjas de peligro en el suelo
    const sh = Math.max(10, m * 0.025);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, h - sh, w, sh);
    ctx.clip();
    ctx.fillStyle = '#d8b21a';
    ctx.fillRect(0, h - sh, w, sh);
    ctx.fillStyle = '#1a1a1a';
    for (let x = -sh; x < w + sh; x += sh * 2) {
      ctx.beginPath();
      ctx.moveTo(x, h);
      ctx.lineTo(x + sh, h - sh);
      ctx.lineTo(x + sh * 2, h - sh);
      ctx.lineTo(x + sh, h);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    // viñeta
    const v = ctx.createRadialGradient(w / 2, h / 2, m * 0.35, w / 2, h / 2, Math.max(w, h) * 0.8);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, w, h);
  },

  drawBoard(ctx, size, cell) {
    const pad = cell * 0.2;
    // marco blanco de laboratorio
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = cell * 0.5;
    roundRect(ctx, -pad, -pad, size + pad * 2, size + pad * 2, cell * 0.14);
    const g = ctx.createLinearGradient(0, -pad, 0, size + pad);
    g.addColorStop(0, WHITE);
    g.addColorStop(1, STEEL);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
    // franjas de portal en el marco (azul arriba-izquierda, naranja abajo-derecha)
    ctx.fillStyle = BLUE;
    ctx.fillRect(-pad * 0.6, size * 0.15, pad * 0.25, size * 0.25);
    ctx.fillStyle = ORANGE;
    ctx.fillRect(size + pad * 0.35, size * 0.6, pad * 0.25, size * 0.25);
    // superficie de pruebas
    ctx.fillStyle = DARK;
    ctx.fillRect(0, 0, size, size);
    for (let y = 0; y < 8; y++)
      for (let x = 0; x < 8; x++) {
        const i = cell * 0.05;
        ctx.fillStyle = (x + y) % 2 ? '#2b3037' : '#272b31';
        ctx.fillRect(x * cell + i, y * cell + i, cell - i * 2, cell - i * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        ctx.fillRect(x * cell + i, y * cell + i, cell - i * 2, cell * 0.04);
      }
  },

  drawBlock(ctx, s, color, variant) {
    if (variant === 'ghost') {
      const i = s * 0.06;
      roundRect(ctx, i, i, s - i * 2, s - i * 2, s * 0.12);
      ctx.fillStyle = rgba(color, 0.14);
      ctx.fill();
      ctx.setLineDash([s * 0.1, s * 0.07]);
      ctx.strokeStyle = rgba(color, 0.9);
      ctx.lineWidth = s * 0.05;
      ctx.stroke();
      return;
    }
    if (variant === 'stone') return blackPanel(ctx, s);
    const d = DESIGNS[color];
    if (d) d(ctx, s);
    else tile(ctx, s, color);
  },

  drawGem(ctx, s) {
    drawGemIcon(ctx, s, CYAN);
  },

  drawTarget(ctx, s) {
    // botón de suelo rojo visto desde arriba
    const cx = s / 2;
    const cy = s / 2;
    circle(ctx, cx, cy, s * 0.32);
    ctx.fillStyle = 'rgba(30, 33, 38, 0.85)';
    ctx.fill();
    ctx.lineWidth = s * 0.03;
    ctx.strokeStyle = '#d5dade';
    ctx.stroke();
    ctx.save();
    ctx.shadowColor = RED;
    ctx.shadowBlur = s * 0.15;
    circle(ctx, cx, cy, s * 0.2);
    const g = ctx.createRadialGradient(cx - s * 0.06, cy - s * 0.06, 0, cx, cy, s * 0.2);
    g.addColorStop(0, '#ff9a9a');
    g.addColorStop(1, '#c81e24');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
  },

  particles: {
    // anillos de portal y chispas
    draw(ctx, s, color) {
      softDot(ctx, s, color, 0.15);
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = s * 0.2;
      ellipse(ctx, s / 2, s / 2, s * 0.22, s * 0.34);
      ctx.lineWidth = s * 0.08;
      ctx.strokeStyle = color;
      ctx.stroke();
      ctx.restore();
    },
    perCell: 4,
    size: [0.25, 0.5],
    speed: [2.5, 6.5],
    gravity: 6,
    life: [0.45, 0.85],
    blend: 'add',
    spin: true,
    shrink: true,
  },

  ambient: {
    count: 18,
    // motas de polvo en el haz de luz
    draw(ctx, s) {
      softDot(ctx, s, '#e6eeff', 0.2);
    },
    size: [2, 5],
    speed: [-12, -4],
    alpha: [0.15, 0.45],
    blend: 'add',
  },

  sound: {
    root: 57,
    scale: [0, 2, 3, 5, 7, 8, 10],
    blip: 'square',
    sparkle: 'triangle',
    thump: 0.7,
    music: {
      bpm: 96,
      progression: [0, 5, 2, 6],
      pad: 'triangle',
      lead: 'square',
      bass: 'triangle',
      leadDensity: 0.3,
      padGain: 0.05,
      leadGain: 0.03,
      bassGain: 0.1,
      filter: 1600,
      reverb: 0.55,
      echo: 0.35,
      hats: true,
    },
  },
};

export default testlab;
