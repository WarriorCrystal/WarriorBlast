import { roundRect, shade } from '../draw';
import { cells, circ, dots, ell, face, finish, ghostTile, kinds, paint, rg, rng, vg } from '../tiles';
import type { Ctx, SkinDef } from '../types';

/**
 * MATE Y ASADO — una tarde en el quincho. Cada bloque llena todo el cuadrado:
 *   verde → mate con bombilla · azul → termo · amarillo → medialuna
 *   rojo → choripán · naranja → cuenco de chimichurri · crema → empanada
 *   marrón → alfajor · piedra → carbón con brasas
 * Pared de ladrillo y parrilla de fondo; explota en chispas de brasa.
 * Sin marcas reales.
 */

const C = {
  mate: '#3d9440',
  termo: '#2f6fd0',
  medialuna: '#f2b33a',
  chori: '#c43a2e',
  chimi: '#d8662a',
  empanada: '#ead2a0',
  alfajor: '#6b3f24',
  stone: '#3a3330',
};
type Kind = keyof typeof C;
const kindOf = kinds(C, 'mate');

const INK = '#2a160a';
const ST = { ink: INK, depth: 'rgba(40, 15, 0, 0.45)', shine: 0.2 };

/** Mantel de quincho detrás de cada comida. */
function cloth(ctx: Ctx, s: number, tint: string) {
  face(ctx, s, vg(ctx, s, shade(tint, 0.6), shade(tint, 0.3)), ST);
}

function mate(ctx: Ctx, s: number) {
  // mate visto desde arriba: calabaza, virola de metal, yerba y bombilla
  face(ctx, s, rg(ctx, s, 0.45, 0.4, 0.75, [[0, '#a8743a'], [1, '#5a3410']]), ST);
  circ(ctx, s, 0.5, 0.5, 0.44);
  paint(ctx, s, vg(ctx, s, '#f0f2f4', '#9aa2aa', 0.06, 0.94), '#4a4f55', 0.025);
  // cincelado de la virola
  ctx.strokeStyle = 'rgba(80, 85, 95, 0.55)';
  ctx.lineWidth = s * 0.012;
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(s * (0.5 + Math.cos(a) * 0.37), s * (0.5 + Math.sin(a) * 0.37));
    ctx.lineTo(s * (0.5 + Math.cos(a) * 0.42), s * (0.5 + Math.sin(a) * 0.42));
    ctx.stroke();
  }
  // yerba
  circ(ctx, s, 0.5, 0.5, 0.35);
  ctx.fillStyle = rg(ctx, s, 0.5, 0.5, 0.35, [[0, '#8ccf55'], [0.7, '#3d9440'], [1, '#235a22']]);
  ctx.fill();
  // montañita de yerba seca y espuma
  ell(ctx, s, 0.36, 0.4, 0.17, 0.14, -0.4);
  ctx.fillStyle = '#b8c070';
  ctx.fill();
  dots(ctx, s, 6, 26, 'rgba(30, 60, 20, 0.5)', [0.006, 0.012], [0.2, 0.2, 0.8, 0.8]);
  dots(ctx, s, 7, 10, 'rgba(240, 250, 210, 0.7)', [0.008, 0.016], [0.45, 0.45, 0.78, 0.78]);
  // bombilla
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#5a6068';
  ctx.lineWidth = s * 0.08;
  ctx.beginPath();
  ctx.moveTo(s * 0.58, s * 0.58);
  ctx.lineTo(s * 0.98, s * 0.06);
  ctx.stroke();
  ctx.strokeStyle = '#e8ecf0';
  ctx.lineWidth = s * 0.05;
  ctx.stroke();
  circ(ctx, s, 0.58, 0.58, 0.06);
  paint(ctx, s, '#d0d6dc', '#4a4f55', 0.018);
  finish(ctx, s, ST);
}

function termo(ctx: Ctx, s: number) {
  cloth(ctx, s, '#2f6fd0');
  // termo acostado en diagonal que llena el bloque
  ctx.save();
  ctx.translate(s / 2, s / 2);
  ctx.rotate(-Math.PI / 4);
  const L = s * 0.62;
  const W = s * 0.4;
  roundRect(ctx, -L, -W / 2, L * 1.55, W, W * 0.3);
  paint(ctx, s, vg(ctx, s, '#6aa6ff', '#1a4aa0', -0.2, 0.2), INK, 0.028);
  // franja acero
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(-L, -W * 0.32, L * 1.55, W * 0.12);
  // pico vertedor y tapón
  roundRect(ctx, L * 0.52, -W * 0.38, L * 0.22, W * 0.76, W * 0.12);
  paint(ctx, s, vg(ctx, s, '#dfe4ea', '#8a939c', -0.2, 0.2), INK, 0.022);
  roundRect(ctx, L * 0.72, -W * 0.26, L * 0.2, W * 0.52, W * 0.12);
  paint(ctx, s, '#1a1d22', INK, 0.02);
  // manija
  ctx.strokeStyle = '#1a1d22';
  ctx.lineWidth = s * 0.05;
  ctx.beginPath();
  ctx.moveTo(-L * 0.1, W / 2);
  ctx.quadraticCurveTo(L * 0.15, W * 1.05, L * 0.4, W / 2);
  ctx.stroke();
  ctx.restore();
  finish(ctx, s, ST);
}

function medialuna(ctx: Ctx, s: number) {
  cloth(ctx, s, '#f2b33a');
  // medialuna enorme con capas
  ctx.save();
  ctx.translate(s * 0.5, s * 0.56);
  const seg = [
    [-0.42, 0.08, 0.12, 0.6],
    [-0.24, -0.12, 0.17, 0.3],
    [0, -0.2, 0.21, 0],
    [0.24, -0.12, 0.17, -0.3],
    [0.42, 0.08, 0.12, -0.6],
  ];
  for (const [x, y, r, a] of seg) {
    ctx.beginPath();
    ctx.ellipse(x * s, y * s, r * s * 1.15, r * s * 1.6, a, 0, Math.PI * 2);
    paint(ctx, s, rg(ctx, s, x - 0.04, y - 0.06, r * 1.6, [[0, '#ffd88a'], [0.6, '#e8962a'], [1, '#a85a10']]), '#6a3008', 0.024);
  }
  ctx.restore();
  // almíbar brillante
  ctx.strokeStyle = 'rgba(255, 245, 200, 0.75)';
  ctx.lineWidth = s * 0.025;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(s * 0.5, s * 0.75, s * 0.32, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();
  finish(ctx, s, ST);
}

function chori(ctx: Ctx, s: number) {
  cloth(ctx, s, '#c43a2e');
  // pan francés abierto
  ell(ctx, s, 0.5, 0.56, 0.54, 0.34, -0.5);
  paint(ctx, s, vg(ctx, s, '#f2c27a', '#b8742a', 0.2, 0.9), INK, 0.028);
  ell(ctx, s, 0.5, 0.56, 0.44, 0.22, -0.5);
  ctx.fillStyle = '#fff0cc';
  ctx.fill();
  // chorizo a la parrilla
  ctx.save();
  ctx.translate(s * 0.5, s * 0.52);
  ctx.rotate(-0.5);
  roundRect(ctx, -s * 0.48, -s * 0.13, s * 0.96, s * 0.26, s * 0.13);
  paint(ctx, s, vg(ctx, s, '#e8604a', '#8a1a12', -0.13, 0.13), INK, 0.028);
  // marcas de la parrilla
  ctx.strokeStyle = 'rgba(40, 10, 0, 0.65)';
  ctx.lineWidth = s * 0.03;
  for (const x of [-0.3, -0.12, 0.06, 0.24]) {
    ctx.beginPath();
    ctx.moveTo(s * x, -s * 0.12);
    ctx.lineTo(s * (x + 0.08), s * 0.12);
    ctx.stroke();
  }
  ctx.restore();
  // chimichurri por encima
  dots(ctx, s, 3, 18, '#2f7a1a', [0.012, 0.022], [0.2, 0.3, 0.8, 0.7]);
  dots(ctx, s, 4, 8, '#e8301a', [0.008, 0.014], [0.2, 0.3, 0.8, 0.7]);
  finish(ctx, s, ST);
}

function chimi(ctx: Ctx, s: number) {
  // cuenco de barro visto de arriba
  face(ctx, s, rg(ctx, s, 0.4, 0.35, 0.8, [[0, '#f29a5a'], [1, '#a8401a']]), ST);
  circ(ctx, s, 0.5, 0.5, 0.42);
  paint(ctx, s, rg(ctx, s, 0.5, 0.5, 0.42, [[0.85, '#c8541a'], [1, '#8a2e0a']]), INK, 0.025);
  circ(ctx, s, 0.5, 0.5, 0.35);
  ctx.fillStyle = rg(ctx, s, 0.45, 0.45, 0.35, [[0, '#b8a83a'], [1, '#6a6a1a']]);
  ctx.fill();
  // hierbas, ají y ajo en aceite
  const r = rng(12);
  ctx.save();
  circ(ctx, s, 0.5, 0.5, 0.34);
  ctx.clip();
  for (let i = 0; i < 50; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * 0.33;
    ctx.save();
    ctx.translate(s * (0.5 + Math.cos(a) * d), s * (0.5 + Math.sin(a) * d));
    ctx.rotate(r() * Math.PI);
    const k = r();
    ctx.fillStyle = k < 0.65 ? (r() > 0.5 ? '#2f7a1a' : '#4fa02a') : k < 0.88 ? '#e8301a' : '#fff6dc';
    ctx.fillRect(-s * 0.025, -s * 0.01, s * 0.05, s * 0.02);
    ctx.restore();
  }
  ctx.restore();
  // brillo de aceite y cucharita
  ell(ctx, s, 0.38, 0.36, 0.1, 0.04, -0.5);
  ctx.fillStyle = 'rgba(255, 250, 200, 0.6)';
  ctx.fill();
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#7a4a20';
  ctx.lineWidth = s * 0.06;
  ctx.beginPath();
  ctx.moveTo(s * 0.62, s * 0.62);
  ctx.lineTo(s * 1.0, s * 1.0);
  ctx.stroke();
  ell(ctx, s, 0.6, 0.6, 0.08, 0.05, Math.PI / 4);
  paint(ctx, s, '#9a6a30', INK, 0.018);
  finish(ctx, s, ST);
}

function empanada(ctx: Ctx, s: number) {
  cloth(ctx, s, '#c8a060');
  // media luna de masa llenando el bloque
  ctx.beginPath();
  ctx.moveTo(s * 0.02, s * 0.74);
  ctx.bezierCurveTo(s * 0.02, s * 0.0, s * 0.98, s * 0.0, s * 0.98, s * 0.74);
  ctx.quadraticCurveTo(s * 0.5, s * 0.88, s * 0.02, s * 0.74);
  ctx.closePath();
  paint(ctx, s, rg(ctx, s, 0.45, 0.35, 0.6, [[0, '#fff0c8'], [0.6, '#ead2a0'], [1, '#c8904a']]), INK, 0.028);
  // dorado del horno
  dots(ctx, s, 22, 7, 'rgba(190, 110, 30, 0.4)', [0.02, 0.045], [0.2, 0.2, 0.8, 0.6]);
  // repulgue
  for (let i = 0; i <= 11; i++) {
    const t = i / 11;
    const x = 0.06 + t * 0.88;
    const y = 0.74 + Math.sin(t * Math.PI) * 0.07;
    ell(ctx, s, x, y, 0.05, 0.07, 0.6);
    paint(ctx, s, vg(ctx, s, '#f2d8a0', '#c8864a', y - 0.06, y + 0.06), '#6a3a10', 0.016);
  }
  finish(ctx, s, ST);
}

function alfajor(ctx: Ctx, s: number) {
  cloth(ctx, s, '#8a5a3a');
  // vista lateral: dos tapas de chocolate con dulce de leche
  roundRect(ctx, s * 0.04, s * 0.14, s * 0.92, s * 0.3, s * 0.12);
  paint(ctx, s, vg(ctx, s, '#8a5232', '#4a2410', 0.14, 0.44), INK, 0.028);
  roundRect(ctx, s * 0.08, s * 0.42, s * 0.84, s * 0.14, s * 0.06);
  paint(ctx, s, vg(ctx, s, '#e8a050', '#b8641a', 0.42, 0.56), INK, 0.02);
  roundRect(ctx, s * 0.04, s * 0.54, s * 0.92, s * 0.32, s * 0.12);
  paint(ctx, s, vg(ctx, s, '#7a4428', '#3a1a08', 0.54, 0.86), INK, 0.028);
  // gotas de dulce de leche
  for (const [x, l] of [[0.3, 0.1], [0.62, 0.07]]) {
    ell(ctx, s, x, 0.56 + l / 2, 0.035, l / 2 + 0.02);
    ctx.fillStyle = '#d8883a';
    ctx.fill();
  }
  // brillo del baño de chocolate y grietas
  ell(ctx, s, 0.3, 0.22, 0.14, 0.03);
  ctx.fillStyle = 'rgba(255, 220, 190, 0.45)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(20, 8, 0, 0.5)';
  ctx.lineWidth = s * 0.012;
  ctx.beginPath();
  ctx.moveTo(s * 0.6, s * 0.62);
  ctx.lineTo(s * 0.66, s * 0.7);
  ctx.lineTo(s * 0.74, s * 0.68);
  ctx.stroke();
  finish(ctx, s, ST);
}

function charcoal(ctx: Ctx, s: number) {
  face(ctx, s, vg(ctx, s, '#4a4440', '#1a1614'), { ...ST, rad: 0.1 });
  // grietas al rojo vivo
  const r = rng(66);
  ctx.save();
  ctx.shadowColor = '#ff6a1a';
  ctx.shadowBlur = s * 0.08;
  ctx.strokeStyle = '#ff8a2a';
  ctx.lineWidth = s * 0.02;
  ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    let x = r() * s;
    let y = r() * s;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let k = 0; k < 4; k++) {
      x += (r() - 0.5) * s * 0.3;
      y += (r() - 0.5) * s * 0.3;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
  dots(ctx, s, 67, 12, 'rgba(200, 190, 180, 0.25)', [0.01, 0.02]);
  finish(ctx, s, { ...ST, rad: 0.1, shine: 0.08 });
}

const DRAW: Record<Kind, (ctx: Ctx, s: number) => void> = {
  mate,
  termo,
  medialuna,
  chori,
  chimi,
  empanada,
  alfajor,
  stone: charcoal,
};

function ember(ctx: Ctx, s: number) {
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, '#fff6c0');
  g.addColorStop(0.3, '#ffb02a');
  g.addColorStop(0.65, 'rgba(255, 80, 10, 0.6)');
  g.addColorStop(1, 'rgba(255, 40, 0, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
}

const mateSkin: SkinDef = {
  id: 'mate',
  name: { es: 'Mate y asado', en: 'Mate & BBQ' },
  description: {
    es: 'Mate, termo, medialunas, choripán, chimichurri, empanadas y alfajores en el quincho.',
    en: 'Mate, thermos, croissants, choripán, chimichurri, empanadas and alfajores by the grill.',
  },
  price: 1600,
  order: 5.5,
  blocks: [C.mate, C.termo, C.medialuna, C.chori, C.chimi, C.empanada, C.alfajor, C.stone],
  ui: {
    bg: '#3a1e12',
    panel: 'rgba(58, 32, 20, 0.94)',
    panelBorder: 'rgba(255, 170, 80, 0.5)',
    text: '#fff2e0',
    textDim: '#d0aa88',
    accent: '#ff9a3a',
    accent2: '#6fbf4a',
    good: '#6fbf4a',
    danger: '#ff5a3a',
    radius: 14,
    font: '"Georgia", "Palatino Linotype", serif',
    titleGlow: '0 0 14px rgba(255, 130, 40, 0.75), 0 2px 0 rgba(0,0,0,0.5)',
    swatches: [C.mate, C.termo, C.medialuna, C.chori, C.chimi, '#e8b060', '#b07848'],
  },
  blockMargin: 0.08,
  flash: '#ffd89a',
  explosion: { power: 1.25, ring: '#ff9a3a', rings: 1, screenFlash: true },

  drawBackground(ctx, w, h) {
    // pared de ladrillo del quincho con luz cálida
    ctx.fillStyle = '#5a2a18';
    ctx.fillRect(0, 0, w, h);
    const bw = 64;
    const bh = 26;
    const r = rng(19);
    for (let y = 0, row = 0; y < h; y += bh, row++) {
      for (let x = row % 2 ? -bw / 2 : 0; x < w; x += bw) {
        const t = r();
        ctx.fillStyle = t > 0.7 ? '#8a3e22' : t > 0.35 ? '#7a3420' : '#6a2c1a';
        ctx.fillRect(x + 2, y + 2, bw - 4, bh - 4);
      }
    }
    // resplandor de la parrilla desde abajo
    const glow = ctx.createLinearGradient(0, h, 0, h * 0.3);
    glow.addColorStop(0, 'rgba(255, 120, 30, 0.55)');
    glow.addColorStop(1, 'rgba(255, 120, 30, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
    // parrilla al pie
    const gy = h * 0.93;
    ctx.fillStyle = '#1a1210';
    ctx.fillRect(0, gy, w, h - gy);
    ctx.strokeStyle = '#3a2a24';
    ctx.lineWidth = 4;
    for (let x = 6; x < w; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x, gy);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    // viñeta
    const v = ctx.createRadialGradient(w / 2, h * 0.45, Math.min(w, h) * 0.3, w / 2, h * 0.45, Math.max(w, h) * 0.8);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(20, 5, 0, 0.6)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, w, h);
  },

  drawBoard(ctx, size, cell) {
    const pad = cell * 0.26;
    // tabla de asado de madera dura
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = cell * 0.5;
    ctx.shadowOffsetY = cell * 0.12;
    roundRect(ctx, -pad, -pad, size + pad * 2, size + pad * 2, cell * 0.3);
    ctx.fillStyle = '#7a4a24';
    ctx.fill();
    ctx.restore();
    ctx.save();
    roundRect(ctx, -pad, -pad, size + pad * 2, size + pad * 2, cell * 0.3);
    ctx.clip();
    const wg = ctx.createLinearGradient(0, -pad, 0, size + pad);
    wg.addColorStop(0, '#9a6234');
    wg.addColorStop(1, '#6a3e1a');
    ctx.fillStyle = wg;
    ctx.fillRect(-pad, -pad, size + pad * 2, size + pad * 2);
    ctx.strokeStyle = 'rgba(40, 18, 4, 0.3)';
    ctx.lineWidth = Math.max(1, cell * 0.03);
    const r = rng(2);
    for (let x = -pad; x < size + pad; x += cell * 0.2) {
      ctx.beginPath();
      ctx.moveTo(x, -pad);
      for (let y = -pad; y <= size + pad; y += cell) ctx.lineTo(x + (r() - 0.5) * cell * 0.06, y);
      ctx.stroke();
    }
    ctx.restore();
    cells(ctx, cell, (x, y, px, py) => {
      const i = cell * 0.07;
      roundRect(ctx, px + i, py + i, cell - i * 2, cell - i * 2, cell * 0.16);
      ctx.fillStyle = (x + y) % 2 ? 'rgba(40, 18, 4, 0.32)' : 'rgba(40, 18, 4, 0.24)';
      ctx.fill();
    });
  },

  drawBlock(ctx, s, color, variant) {
    if (variant === 'ghost') return ghostTile(ctx, s, 0.14, 'rgba(255,200,140,0.22)', 'rgba(255,190,120,0.9)');
    DRAW[variant === 'stone' ? 'stone' : kindOf(color)](ctx, s);
  },

  drawGem(ctx, s) {
    // brasa encendida
    ctx.save();
    ctx.shadowColor = '#ff7a1a';
    ctx.shadowBlur = s * 0.25;
    circ(ctx, s, 0.5, 0.5, 0.2);
    ctx.fillStyle = rg(ctx, s, 0.46, 0.44, 0.24, [[0, '#fff6c0'], [0.4, '#ffb02a'], [1, '#d8400a']]);
    ctx.fill();
    ctx.restore();
  },

  drawTarget(ctx, s) {
    // escarapela de fiesta (celeste y blanca)
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = s * 0.06;
    circ(ctx, s, 0.5, 0.5, 0.28);
    ctx.fillStyle = '#74b8e8';
    ctx.fill();
    ctx.restore();
    circ(ctx, s, 0.5, 0.5, 0.18);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    circ(ctx, s, 0.5, 0.5, 0.08);
    ctx.fillStyle = '#74b8e8';
    ctx.fill();
  },

  particles: {
    draw(ctx, s) {
      ember(ctx, s);
    },
    perCell: 7,
    size: [0.12, 0.3],
    speed: [2.5, 7.5],
    gravity: 2.5,
    life: [0.6, 1.3],
    blend: 'add',
    spin: false,
    shrink: true,
  },

  ambient: {
    count: 22,
    draw(ctx, s) {
      ember(ctx, s);
    },
    size: [3, 8],
    speed: [-20, -45],
    alpha: [0.4, 0.9],
    blend: 'add',
  },

  sound: {
    // aire de folclore: menor armónica, guitarra punteada (triangular) y bajo de bombo
    root: 57,
    scale: [0, 2, 3, 5, 7, 8, 11],
    blip: 'triangle',
    sparkle: 'triangle',
    thump: 0.55,
    music: {
      bpm: 96,
      progression: [0, 3, 4, 0],
      pad: 'sawtooth',
      lead: 'triangle',
      bass: 'triangle',
      leadDensity: 0.55,
      padGain: 0.025,
      leadGain: 0.045,
      bassGain: 0.12,
      filter: 900,
      reverb: 0.3,
      echo: 0.12,
      hats: false,
    },
  },
};

export default mateSkin;
