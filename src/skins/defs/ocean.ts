import { roundRect, star } from '../draw';
import { cells, circ, ell, face, finish, ghostTile, kinds, paint, rg, rng, vg } from '../tiles';
import type { Ctx, SkinDef } from '../types';

/**
 * OCÉANO — cada bloque es una textura o un objeto marino que llena TODO el cuadrado:
 *   naranja → escamas de pez dorado · amarillo → cofre del tesoro · rosa → concha de vieira
 *   rojo → coral rojo · violeta → tentáculo de pulpo con ventosas · azul → olas
 *   verde → caparazón de tortuga · piedra → roca con percebes
 * Fondo azul profundo con rayos de luz; las piezas estallan en burbujas que suben.
 */

const C = {
  scales: '#ff8a2a',
  chest: '#ffd23a',
  scallop: '#ff6fb5',
  redcoral: '#e8433f',
  tentacle: '#a070e0',
  waves: '#3a86ff',
  turtle: '#3fbf7a',
  stone: '#5f6f7a',
};
type Kind = keyof typeof C;
const kindOf = kinds(C, 'scales');

const INK = '#0b2238';
const ST = { ink: INK, depth: 'rgba(0, 20, 50, 0.45)', shine: 0.22 };

function scales(ctx: Ctx, s: number) {
  face(ctx, s, '#c8500a', ST);
  // filas de escamas de abajo hacia arriba: cada fila tapa la base de la anterior
  const R = 0.13;
  for (let row = 9; row >= 0; row--) {
    const y = -0.08 + row * 0.12;
    const off = row % 2 ? R : 0;
    for (let x = -off; x < 1.2; x += R * 2) {
      circ(ctx, s, x, y, R);
      ctx.fillStyle = rg(ctx, s, x - R * 0.3, y - R * 0.5, R * 1.4, [[0, '#ffe2a0'], [0.45, '#ffa040'], [1, '#d85a10']]);
      ctx.fill();
      ctx.strokeStyle = 'rgba(120, 40, 0, 0.55)';
      ctx.lineWidth = s * 0.016;
      ctx.stroke();
      // brillo nacarado
      ctx.beginPath();
      ctx.arc(x * s, y * s, R * s * 0.7, Math.PI * 1.15, Math.PI * 1.55);
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = s * 0.012;
      ctx.stroke();
    }
  }
  // reflejo iridiscente
  ctx.fillStyle = rg(ctx, s, 0.3, 0.25, 0.6, [[0, 'rgba(255, 250, 220, 0.35)'], [1, 'rgba(255, 250, 220, 0)']]);
  ctx.fillRect(0, 0, s, s);
  finish(ctx, s, ST);
}

function chest(ctx: Ctx, s: number) {
  face(ctx, s, '#4a2a12', ST);
  const plank = (y0: number, y1: number, light: string, dark: string) => {
    ctx.fillStyle = vg(ctx, s, light, dark, y0, y1);
    ctx.fillRect(0, y0 * s, s, (y1 - y0) * s);
    ctx.strokeStyle = 'rgba(40, 18, 4, 0.7)';
    ctx.lineWidth = s * 0.014;
    ctx.beginPath();
    ctx.moveTo(0, y1 * s);
    ctx.lineTo(s, y1 * s);
    ctx.stroke();
  };
  // tapa abombada (dos tablones) y cuerpo (tres tablones)
  plank(0, 0.18, '#b8743a', '#8a4a1a');
  plank(0.18, 0.36, '#a8642a', '#7a3e14');
  // tesoro asomando por la tapa entreabierta
  ctx.fillStyle = vg(ctx, s, '#fff2a0', '#e8a810', 0.36, 0.48);
  ctx.fillRect(0, 0.36 * s, s, 0.12 * s);
  for (const [x, y] of [[0.12, 0.42], [0.3, 0.4], [0.5, 0.43], [0.68, 0.4], [0.88, 0.42], [0.2, 0.46], [0.6, 0.47], [0.8, 0.46]]) {
    ell(ctx, s, x, y, 0.07, 0.04);
    paint(ctx, s, '#ffd23a', '#8a5a00', 0.012);
  }
  plank(0.48, 0.66, '#b8743a', '#8a4a1a');
  plank(0.66, 0.84, '#a8642a', '#7a3e14');
  plank(0.84, 1.0, '#98582a', '#6a3410');
  // herrajes dorados
  for (const x of [0.12, 0.88]) {
    ctx.fillStyle = vg(ctx, s, '#ffe680', '#c8900a', 0, 1);
    ctx.fillRect((x - 0.05) * s, 0, 0.1 * s, s);
    ctx.fillStyle = 'rgba(90, 50, 0, 0.6)';
    for (const y of [0.1, 0.28, 0.58, 0.76, 0.92]) {
      circ(ctx, s, x, y, 0.016);
      ctx.fill();
    }
  }
  // cerradura
  roundRect(ctx, s * 0.38, s * 0.48, s * 0.24, s * 0.26, s * 0.05);
  paint(ctx, s, vg(ctx, s, '#ffe680', '#c8900a', 0.48, 0.74), '#5a3a00', 0.02);
  circ(ctx, s, 0.5, 0.57, 0.035);
  ctx.fillStyle = '#3a2200';
  ctx.fill();
  ctx.fillRect(s * 0.485, s * 0.57, s * 0.03, s * 0.09);
  // destellos del oro
  ctx.fillStyle = '#ffffff';
  star(ctx, s * 0.36, s * 0.41, s * 0.05, s * 0.01, 4);
  ctx.fill();
  star(ctx, s * 0.76, s * 0.43, s * 0.035, s * 0.008, 4);
  ctx.fill();
  finish(ctx, s, ST);
}

function scallop(ctx: Ctx, s: number) {
  // concha de vieira a todo el cuadrado: costillas en abanico desde abajo hasta los bordes
  face(ctx, s, '#c8306a', ST);
  const ox = 0.5;
  const oy = 1.02;
  const n = 9;
  const a0 = Math.PI * 1.04;
  const a1 = Math.PI * 1.96;
  const far = 1.3;
  for (let i = 0; i < n; i++) {
    const t0 = a0 + ((a1 - a0) * i) / n;
    const t1 = a0 + ((a1 - a0) * (i + 1)) / n;
    ctx.beginPath();
    ctx.moveTo(ox * s, oy * s);
    ctx.lineTo((ox + Math.cos(t0) * far) * s, (oy + Math.sin(t0) * far) * s);
    ctx.lineTo((ox + Math.cos(t1) * far) * s, (oy + Math.sin(t1) * far) * s);
    ctx.closePath();
    // costilla con volumen: clara en el centro, oscura en los surcos
    const g = ctx.createLinearGradient(
      (ox + Math.cos(t0) * 0.5) * s,
      (oy + Math.sin(t0) * 0.5) * s,
      (ox + Math.cos(t1) * 0.5) * s,
      (oy + Math.sin(t1) * 0.5) * s,
    );
    g.addColorStop(0, '#d8407a');
    g.addColorStop(0.5, i % 2 ? '#ffc0dc' : '#ffa8cc');
    g.addColorStop(1, '#c8306a');
    ctx.fillStyle = g;
    ctx.fill();
  }
  // líneas de crecimiento concéntricas
  ctx.strokeStyle = 'rgba(140, 20, 70, 0.3)';
  ctx.lineWidth = s * 0.014;
  for (let r = 0.3; r < 1.4; r += 0.14) {
    ctx.beginPath();
    ctx.arc(ox * s, oy * s, r * s, a0, a1);
    ctx.stroke();
  }
  // surcos entre costillas
  ctx.strokeStyle = 'rgba(110, 10, 50, 0.55)';
  ctx.lineWidth = s * 0.018;
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    ctx.beginPath();
    ctx.moveTo(ox * s, oy * s);
    ctx.lineTo((ox + Math.cos(a) * far) * s, (oy + Math.sin(a) * far) * s);
    ctx.stroke();
  }
  // bisagra abajo al centro
  ctx.beginPath();
  ctx.ellipse(ox * s, s * 1.0, s * 0.16, s * 0.1, 0, Math.PI, Math.PI * 2);
  ctx.closePath();
  paint(ctx, s, vg(ctx, s, '#ffb0d0', '#d8407a', 0.9, 1), '#6a0a36', 0.018);
  // reflejo nacarado
  ctx.fillStyle = rg(ctx, s, 0.35, 0.3, 0.5, [[0, 'rgba(255, 255, 255, 0.35)'], [1, 'rgba(255,255,255,0)']]);
  ctx.fillRect(0, 0, s, s);
  finish(ctx, s, ST);
}

function redcoral(ctx: Ctx, s: number) {
  // coral rojo ramificado que llena el bloque, sobre agua profunda
  face(ctx, s, vg(ctx, s, '#1a5a9a', '#0a2a5a'), ST);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // ramas: [x0, y0, x1, y1, grosor]
  const br: Array<[number, number, number, number, number]> = [];
  const grow = (x: number, y: number, a: number, len: number, w: number, depth: number) => {
    const x1 = x + Math.cos(a) * len;
    const y1 = y + Math.sin(a) * len;
    br.push([x, y, x1, y1, w]);
    if (depth === 0) return;
    grow(x1, y1, a - 0.5, len * 0.78, w * 0.72, depth - 1);
    grow(x1, y1, a + 0.45, len * 0.74, w * 0.72, depth - 1);
  };
  grow(0.5, 1.05, -Math.PI / 2, 0.3, 0.13, 4);
  grow(0.12, 1.05, -Math.PI / 2 - 0.35, 0.22, 0.09, 3);
  grow(0.9, 1.05, -Math.PI / 2 + 0.4, 0.22, 0.09, 3);
  for (const pass of [0, 1, 2]) {
    for (const [x0, y0, x1, y1, w] of br) {
      const dx = pass === 2 ? -w * 0.15 : 0;
      ctx.beginPath();
      ctx.moveTo((x0 + dx) * s, y0 * s);
      ctx.lineTo((x1 + dx) * s, y1 * s);
      ctx.strokeStyle = pass === 0 ? '#4a0808' : pass === 1 ? '#e8433f' : 'rgba(255, 170, 150, 0.6)';
      ctx.lineWidth = s * (pass === 0 ? w + 0.025 : pass === 1 ? w : w * 0.3);
      ctx.stroke();
    }
  }
  // pólipos en las puntas
  for (const [, , x1, y1, w] of br) {
    if (w > 0.05) continue;
    circ(ctx, s, x1, y1, Math.max(0.025, w * 0.6));
    ctx.fillStyle = '#ff8a7a';
    ctx.fill();
    circ(ctx, s, x1, y1, Math.max(0.01, w * 0.25));
    ctx.fillStyle = '#ffe0d8';
    ctx.fill();
  }
  // burbujas
  for (const [x, y, r] of [[0.84, 0.18, 0.03], [0.9, 0.08, 0.02], [0.16, 0.24, 0.025]]) {
    circ(ctx, s, x, y, r);
    ctx.strokeStyle = 'rgba(200, 235, 255, 0.75)';
    ctx.lineWidth = s * 0.012;
    ctx.stroke();
  }
  finish(ctx, s, ST);
}

function tentacle(ctx: Ctx, s: number) {
  face(ctx, s, vg(ctx, s, '#2a2a6a', '#140a3a'), ST);
  // curva del tentáculo (bezier cúbica) que cruza todo el bloque y se enrosca
  const P = [[-0.1, 1.1], [0.1, 0.1], [1.15, 0.25], [0.62, 0.62]];
  const at = (t: number): [number, number] => {
    const u = 1 - t;
    const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
    return [a * P[0][0] + b * P[1][0] + c * P[2][0] + d * P[3][0], a * P[0][1] + b * P[1][1] + c * P[2][1] + d * P[3][1]];
  };
  const rad = (t: number) => 0.2 * (1 - t * 0.78);
  // contorno y cuerpo
  for (const pass of [0, 1]) {
    for (let t = 0; t <= 1.0001; t += 0.012) {
      const [x, y] = at(t);
      circ(ctx, s, x, y, rad(t) + (pass === 0 ? 0.018 : 0));
      ctx.fillStyle = pass === 0 ? INK : rg(ctx, s, x - rad(t) * 0.3, y - rad(t) * 0.4, rad(t) * 1.3, [[0, '#d6b0ff'], [0.6, '#a070e0'], [1, '#6a3ab0']]);
      ctx.fill();
    }
  }
  // ventosas en el lado interior
  for (let t = 0.06; t < 0.95; t += 0.09) {
    const [x, y] = at(t);
    const [x2, y2] = at(t + 0.01);
    const dx = x2 - x;
    const dy = y2 - y;
    const l = Math.hypot(dx, dy) || 1;
    const nx = dy / l;
    const ny = -dx / l;
    const r = rad(t);
    const sx = x + nx * r * 0.45;
    const sy = y + ny * r * 0.45;
    circ(ctx, s, sx, sy, r * 0.38);
    paint(ctx, s, '#ffc8e6', '#7a3a90', 0.012);
    circ(ctx, s, sx, sy, r * 0.17);
    ctx.fillStyle = '#c87ab0';
    ctx.fill();
  }
  // burbujitas
  for (const [x, y, r] of [[0.82, 0.86, 0.04], [0.9, 0.72, 0.025], [0.2, 0.2, 0.03]]) {
    circ(ctx, s, x, y, r);
    ctx.strokeStyle = 'rgba(200, 230, 255, 0.7)';
    ctx.lineWidth = s * 0.012;
    ctx.stroke();
  }
  finish(ctx, s, ST);
}

function waves(ctx: Ctx, s: number) {
  face(ctx, s, '#1f5fc8', ST);
  // patrón de olas en abanico (filas que se superponen)
  const R = 0.2;
  const rings = ['#ffffff', '#3a86ff', '#bfe0ff', '#2a6ae0', '#ffffff', '#1f5fc8'];
  for (let row = 0; row < 8; row++) {
    const y = row * 0.15;
    const off = row % 2 ? R : 0;
    for (let x = -off; x < 1.3; x += R * 2) {
      rings.forEach((c, i) => {
        circ(ctx, s, x, y, R * (1 - i * 0.16));
        ctx.fillStyle = c;
        ctx.fill();
      });
      circ(ctx, s, x, y, R);
      ctx.strokeStyle = 'rgba(10, 40, 110, 0.5)';
      ctx.lineWidth = s * 0.012;
      ctx.stroke();
    }
  }
  finish(ctx, s, ST);
}

function turtle(ctx: Ctx, s: number) {
  face(ctx, s, '#1f5a2a', ST);
  // escudos hexagonales del caparazón, de cerca
  const R = 0.24;
  const W = Math.sqrt(3) * R;
  for (let row = -1; row < 4; row++) {
    for (let col = -1; col < 4; col++) {
      const cx = col * W + (row % 2 ? W / 2 : 0);
      const cy = row * R * 1.5 + 0.12;
      for (let k = 0; k < 3; k++) {
        const r = R * (0.92 - k * 0.24);
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i * Math.PI) / 3 + Math.PI / 6;
          const x = (cx + Math.cos(a) * r) * s;
          const y = (cy + Math.sin(a) * r) * s;
          if (i) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
        }
        ctx.closePath();
        ctx.fillStyle = k === 0 ? rg(ctx, s, cx - 0.06, cy - 0.06, R, [[0, '#9ae68a'], [1, '#3a9a4a']]) : k === 1 ? 'rgba(140, 110, 40, 0.35)' : 'rgba(200, 230, 140, 0.45)';
        ctx.fill();
        if (k === 0) {
          ctx.strokeStyle = '#143a1a';
          ctx.lineWidth = s * 0.03;
          ctx.stroke();
        }
      }
    }
  }
  finish(ctx, s, ST);
}

function rock(ctx: Ctx, s: number) {
  face(ctx, s, vg(ctx, s, '#7f8f98', '#3a4650'), { ...ST, rad: 0.1 });
  // vetas
  ctx.strokeStyle = 'rgba(30, 40, 50, 0.35)';
  ctx.lineWidth = s * 0.02;
  ctx.beginPath();
  ctx.moveTo(0, s * 0.3);
  ctx.lineTo(s * 0.4, s * 0.42);
  ctx.lineTo(s, s * 0.36);
  ctx.moveTo(0, s * 0.74);
  ctx.lineTo(s * 0.6, s * 0.68);
  ctx.lineTo(s, s * 0.8);
  ctx.stroke();
  // algas pegadas
  const r = rng(31);
  for (let i = 0; i < 8; i++) {
    circ(ctx, s, r(), r(), 0.04 + r() * 0.04);
    ctx.fillStyle = 'rgba(70, 150, 90, 0.4)';
    ctx.fill();
  }
  // percebes (conos con abertura)
  for (const [x, y] of [[0.26, 0.22], [0.7, 0.18], [0.5, 0.52], [0.2, 0.8], [0.78, 0.74]]) {
    circ(ctx, s, x, y, 0.085);
    paint(ctx, s, rg(ctx, s, x - 0.03, y - 0.03, 0.1, [[0, '#f4ece0'], [1, '#b0a898']]), '#3a3a3a', 0.014);
    ell(ctx, s, x, y, 0.035, 0.02);
    ctx.fillStyle = '#4a4a4a';
    ctx.fill();
  }
  finish(ctx, s, { ...ST, rad: 0.1, shine: 0.12 });
}

const DRAW: Record<Kind, (ctx: Ctx, s: number) => void> = {
  scales,
  chest,
  scallop,
  redcoral,
  tentacle,
  waves,
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
    es: 'Escamas, tesoros, conchas, corales, pulpos, olas y tortugas. ¡Explotan en burbujas!',
    en: 'Scales, treasure, shells, coral, octopus, waves and turtles. They pop into bubbles!',
  },
  price: 1100,
  order: 5.1,
  blocks: [C.scales, C.chest, C.scallop, C.redcoral, C.tentacle, C.waves, C.turtle, C.stone],
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
    radius: 18,
    glass: true,
    font: '"Segoe UI Rounded", "Arial Rounded MT Bold", "Nunito", "Segoe UI", system-ui, sans-serif',
    titleGlow: '0 0 14px rgba(80, 200, 255, 0.8)',
  },
  blockMargin: 0.08,
  flash: '#d8f6ff',
  explosion: { power: 1.15, ring: '#bff0ff', rings: 2, screenFlash: false },

  drawBackground(ctx, w, h) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#1ab0e0');
    g.addColorStop(0.4, '#0a6aa8');
    g.addColorStop(1, '#021a38');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // rayos de luz
    ctx.globalCompositeOperation = 'lighter';
    for (const [x, sp, a] of [[0.12, 0.1, 0.16], [0.36, 0.16, 0.22], [0.58, 0.06, 0.14], [0.82, 0.14, 0.2]]) {
      const lg = ctx.createLinearGradient(0, 0, 0, h * 0.9);
      lg.addColorStop(0, `rgba(210, 248, 255, ${a})`);
      lg.addColorStop(1, 'rgba(210, 248, 255, 0)');
      ctx.fillStyle = lg;
      ctx.beginPath();
      ctx.moveTo(w * (x - 0.025), 0);
      ctx.lineTo(w * (x + 0.035), 0);
      ctx.lineTo(w * (x + sp + 0.12), h * 0.9);
      ctx.lineTo(w * (x + sp - 0.06), h * 0.9);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    // superficie ondulada con cáusticas
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.lineWidth = 2;
    for (let y = 10; y < h * 0.14; y += 12) {
      ctx.beginPath();
      for (let x = 0; x <= w; x += 12) ctx.lineTo(x, y + Math.sin(x * 0.045 + y * 0.7) * 4);
      ctx.stroke();
    }
    // kelp: cintas onduladas rellenas
    const r = rng(14);
    for (let i = 0; i < 7; i++) {
      const x0 = (i / 6) * w + (r() - 0.5) * 40;
      const top = h * (0.55 + r() * 0.2);
      const col = i % 2 ? '#1f7a4a' : '#2a9a5a';
      ctx.beginPath();
      ctx.moveTo(x0 - 7, h);
      for (let y = h; y > top; y -= 10) ctx.lineTo(x0 - 7 + Math.sin(y * 0.03 + i) * 12, y);
      for (let y = top; y < h; y += 10) ctx.lineTo(x0 + 7 + Math.sin(y * 0.03 + i) * 12, y);
      ctx.closePath();
      ctx.fillStyle = col;
      ctx.globalAlpha = 0.75;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    // arena con ondas
    const sandY = h * 0.93;
    const sg = ctx.createLinearGradient(0, sandY, 0, h);
    sg.addColorStop(0, '#d8b878');
    sg.addColorStop(1, '#a8884a');
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 16) ctx.lineTo(x, sandY + Math.sin(x * 0.02) * 6);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(120, 90, 40, 0.3)';
    ctx.lineWidth = 2;
    for (let k = 1; k < 4; k++) {
      ctx.beginPath();
      for (let x = 0; x <= w; x += 16) ctx.lineTo(x, sandY + k * 10 + Math.sin(x * 0.04 + k) * 3);
      ctx.stroke();
    }
    // burbujas fijas
    for (let i = 0; i < 26; i++) {
      ctx.beginPath();
      ctx.arc(r() * w, r() * h * 0.85, 2 + r() * 5, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(220, 245, 255, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  },

  drawBoard(ctx, size, cell) {
    const pad = cell * 0.24;
    // pecera: marco de bronce con remaches y vidrio azulado
    ctx.save();
    ctx.shadowColor = 'rgba(0, 20, 50, 0.55)';
    ctx.shadowBlur = cell * 0.5;
    ctx.shadowOffsetY = cell * 0.1;
    roundRect(ctx, -pad, -pad, size + pad * 2, size + pad * 2, cell * 0.28);
    ctx.fillStyle = '#8a5a2a';
    ctx.fill();
    ctx.restore();
    const brass = ctx.createLinearGradient(-pad, -pad, size + pad, size + pad);
    brass.addColorStop(0, '#f0c070');
    brass.addColorStop(0.5, '#b07a30');
    brass.addColorStop(1, '#6a4010');
    roundRect(ctx, -pad, -pad, size + pad * 2, size + pad * 2, cell * 0.28);
    ctx.fillStyle = brass;
    ctx.fill();
    for (const [x, y] of [[-pad / 2, -pad / 2], [size + pad / 2, -pad / 2], [-pad / 2, size + pad / 2], [size + pad / 2, size + pad / 2], [size / 2, -pad / 2], [size / 2, size + pad / 2], [-pad / 2, size / 2], [size + pad / 2, size / 2]]) {
      ctx.beginPath();
      ctx.arc(x, y, cell * 0.05, 0, Math.PI * 2);
      ctx.fillStyle = '#ffe0a0';
      ctx.fill();
    }
    roundRect(ctx, -pad * 0.2, -pad * 0.2, size + pad * 0.4, size + pad * 0.4, cell * 0.12);
    ctx.fillStyle = '#063a66';
    ctx.fill();
    cells(ctx, cell, (x, y, px, py) => {
      const i = cell * 0.06;
      roundRect(ctx, px + i, py + i, cell - i * 2, cell - i * 2, cell * 0.16);
      ctx.fillStyle = (x + y) % 2 ? '#0c5590' : '#0a4c84';
      ctx.fill();
      ctx.strokeStyle = 'rgba(180, 235, 255, 0.14)';
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
