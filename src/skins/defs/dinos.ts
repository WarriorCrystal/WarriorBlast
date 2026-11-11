import { rgba, roundRect, shade } from '../draw';
import type { Ctx, SkinDef } from '../types';

/**
 * VALLE DE DINOSAURIOS — atardecer prehistórico con volcán, saurópodos y
 * pterosaurios en silueta. Los bloques son piel escamosa con manchas, las
 * "piedras" son roca con un fósil de amonite y la gema es una gota de ámbar.
 */

const BLOCKS: SkinDef['blocks'] = ['#5aa83a', '#e8862a', '#2f9aa8', '#8b5ac8', '#d2473a', '#e8c03a', '#9a6a3a', '#7a7268'];

/** Aleatorio determinista (mismo color = misma piel; fondo siempre igual). */
function rng(seed: number) {
  seed = Math.abs(seed) % 2147483646 || 1;
  return () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
}

function seedOf(color: string): number {
  let h = 17;
  for (let i = 0; i < color.length; i++) h = (h * 31 + color.charCodeAt(i)) | 0;
  return h;
}

/** Escamas: filas desplazadas de semicírculos con brillo arriba y sombra abajo. */
function scales(ctx: Ctx, s: number) {
  const r = s / 9;
  let row = 0;
  for (let y = -r; y < s + r; y += r * 1.25, row++) {
    for (let x = (row % 2 ? r : 0) - r; x < s + r; x += r * 2) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI);
      ctx.strokeStyle = rgba('#000000', 0.18);
      ctx.lineWidth = Math.max(1, s / 60);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y - r * 0.15, r * 0.55, Math.PI * 1.15, Math.PI * 1.85);
      ctx.strokeStyle = rgba('#ffffff', 0.16);
      ctx.stroke();
    }
  }
}

/** Manchas irregulares oscuras (como el lomo de un dinosaurio). */
function spots(ctx: Ctx, s: number, color: string) {
  const r = rng(seedOf(color));
  ctx.fillStyle = shade(color, -0.38);
  ctx.globalAlpha = 0.55;
  for (let i = 0; i < 4; i++) {
    const cx = s * (0.15 + r() * 0.7);
    const cy = s * (0.12 + r() * 0.55);
    const rad = s * (0.06 + r() * 0.07);
    ctx.beginPath();
    for (let a = 0; a < 7; a++) {
      const ang = (a / 7) * Math.PI * 2;
      const k = rad * (0.7 + r() * 0.5);
      const px = cx + Math.cos(ang) * k;
      const py = cy + Math.sin(ang) * k * 0.8;
      a === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** Roca con fósil de amonite. */
function fossilRock(ctx: Ctx, s: number, color: string) {
  const g = ctx.createLinearGradient(0, 0, s, s);
  g.addColorStop(0, shade(color, 0.18));
  g.addColorStop(1, shade(color, -0.35));
  roundRect(ctx, s * 0.04, s * 0.04, s * 0.92, s * 0.92, s * 0.12);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  const r = rng(99);
  for (let i = 0; i < 14; i++) {
    ctx.fillStyle = rgba(r() > 0.5 ? '#ffffff' : '#000000', 0.08 + r() * 0.08);
    ctx.beginPath();
    ctx.arc(r() * s, r() * s, s * (0.02 + r() * 0.05), 0, Math.PI * 2);
    ctx.fill();
  }
  // espiral de amonite
  const cx = s * 0.5;
  const cy = s * 0.52;
  ctx.lineCap = 'round';
  for (const [off, col, wdt] of [[1, 'rgba(255,255,255,0.35)', 0.05], [0, 'rgba(40,30,20,0.6)', 0.035]] as const) {
    ctx.beginPath();
    for (let t = 0; t < Math.PI * 5; t += 0.15) {
      const rad = s * 0.035 * Math.exp(t * 0.17);
      const x = cx + Math.cos(t) * rad + off;
      const y = cy + Math.sin(t) * rad + off;
      t === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.strokeStyle = col;
    ctx.lineWidth = s * wdt;
    ctx.stroke();
  }
  // costillas de la concha
  ctx.strokeStyle = 'rgba(40,30,20,0.35)';
  ctx.lineWidth = Math.max(1, s / 70);
  for (let t = Math.PI * 2.5; t < Math.PI * 5; t += 0.45) {
    const r0 = s * 0.035 * Math.exp((t - Math.PI * 2) * 0.17);
    const r1 = s * 0.035 * Math.exp(t * 0.17);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(t) * r0, cy + Math.sin(t) * r0);
    ctx.lineTo(cx + Math.cos(t) * r1, cy + Math.sin(t) * r1);
    ctx.stroke();
  }
  ctx.restore();
  roundRect(ctx, s * 0.04, s * 0.04, s * 0.92, s * 0.92, s * 0.12);
  ctx.strokeStyle = 'rgba(30,22,15,0.7)';
  ctx.lineWidth = Math.max(1, s / 30);
  ctx.stroke();
}

/** Huella de tres dedos centrada en (cx, cy). */
function footprint(ctx: Ctx, cx: number, cy: number, k: number) {
  ctx.beginPath();
  ctx.ellipse(cx, cy + k * 0.25, k * 0.28, k * 0.24, 0, 0, Math.PI * 2);
  ctx.fill();
  for (const a of [-0.55, 0, 0.55]) {
    ctx.save();
    ctx.translate(cx, cy + k * 0.1);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(-k * 0.1, 0);
    ctx.quadraticCurveTo(-k * 0.09, -k * 0.5, 0, -k * 0.72);
    ctx.quadraticCurveTo(k * 0.09, -k * 0.5, k * 0.1, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

/** Silueta de saurópodo (cuello largo) apoyada en (x, y) mirando a la derecha; h = altura del lomo. */
function sauropod(ctx: Ctx, x: number, y: number, h: number) {
  ctx.beginPath();
  ctx.moveTo(x - h * 2.2, y - h * 0.35); // punta de la cola
  ctx.quadraticCurveTo(x - h * 1.2, y - h * 0.6, x - h * 0.6, y - h * 0.95);
  ctx.quadraticCurveTo(x, y - h * 1.25, x + h * 0.7, y - h * 0.9);
  ctx.quadraticCurveTo(x + h * 1.1, y - h * 1.4, x + h * 1.35, y - h * 2.3); // cuello
  ctx.quadraticCurveTo(x + h * 1.45, y - h * 2.55, x + h * 1.75, y - h * 2.45); // cabeza
  ctx.lineTo(x + h * 1.72, y - h * 2.3);
  ctx.quadraticCurveTo(x + h * 1.52, y - h * 2.25, x + h * 1.5, y - h * 2.0);
  ctx.quadraticCurveTo(x + h * 1.3, y - h * 1.1, x + h * 0.95, y - h * 0.55);
  ctx.lineTo(x + h * 0.95, y); // pata delantera
  ctx.lineTo(x + h * 0.65, y);
  ctx.lineTo(x + h * 0.6, y - h * 0.45);
  ctx.lineTo(x - h * 0.25, y - h * 0.45);
  ctx.lineTo(x - h * 0.3, y); // pata trasera
  ctx.lineTo(x - h * 0.62, y);
  ctx.lineTo(x - h * 0.65, y - h * 0.55);
  ctx.quadraticCurveTo(x - h * 1.3, y - h * 0.45, x - h * 2.2, y - h * 0.35);
  ctx.closePath();
  ctx.fill();
}

/** Silueta de pterosaurio en vuelo. */
function pterosaur(ctx: Ctx, x: number, y: number, k: number) {
  ctx.beginPath();
  ctx.moveTo(x - k, y - k * 0.15);
  ctx.quadraticCurveTo(x - k * 0.5, y - k * 0.35, x - k * 0.1, y);
  ctx.lineTo(x + k * 0.25, y - k * 0.08); // pico
  ctx.lineTo(x + k * 0.05, y + k * 0.06);
  ctx.quadraticCurveTo(x + k * 0.5, y - k * 0.35, x + k, y - k * 0.2);
  ctx.quadraticCurveTo(x + k * 0.4, y - k * 0.05, x, y + k * 0.12);
  ctx.quadraticCurveTo(x - k * 0.4, y - k * 0.02, x - k, y - k * 0.15);
  ctx.closePath();
  ctx.fill();
  // cresta
  ctx.beginPath();
  ctx.moveTo(x - k * 0.05, y - k * 0.02);
  ctx.lineTo(x - k * 0.22, y - k * 0.14);
  ctx.lineTo(x + k * 0.02, y - k * 0.06);
  ctx.fill();
}

/** Helecho/palmera prehistórica en silueta. */
function cycad(ctx: Ctx, x: number, y: number, k: number) {
  ctx.lineCap = 'round';
  ctx.lineWidth = k * 0.08;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + k * 0.05, y - k * 0.5, x, y - k);
  ctx.stroke();
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i - 3) * 0.45;
    const len = k * (0.75 - Math.abs(i - 3) * 0.06);
    ctx.lineWidth = k * 0.05;
    ctx.beginPath();
    ctx.moveTo(x, y - k);
    const ex = x + Math.cos(a) * len;
    const ey = y - k + Math.sin(a) * len * 0.6 + len * 0.35;
    ctx.quadraticCurveTo(x + Math.cos(a) * len * 0.5, y - k + Math.sin(a) * len * 0.6, ex, ey);
    ctx.stroke();
    // foliolos
    for (let j = 1; j < 6; j++) {
      const t = j / 6;
      const fx = x + (ex - x) * t;
      const fy = y - k + (ey - (y - k)) * t - Math.sin(t * Math.PI) * len * 0.15;
      ctx.lineWidth = k * 0.025;
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.lineTo(fx, fy + k * 0.09);
      ctx.stroke();
    }
  }
}

const dinos: SkinDef = {
  id: 'dinos',
  name: { es: 'Valle de Dinosaurios', en: 'Dino Valley' },
  description: { es: 'Piel escamosa, fósiles y ámbar al atardecer.', en: 'Scaly hides, fossils and amber at sunset.' },
  price: 1000,
  order: 2.2,
  blocks: BLOCKS,
  ui: {
    bg: '#2a1a12',
    panel: 'rgba(48, 34, 22, 0.94)',
    panelBorder: 'rgba(232, 160, 58, 0.55)',
    text: '#fbeed6',
    textDim: '#c9ad8a',
    accent: '#e8a03a',
    accent2: '#7ec850',
    good: '#7ec850',
    danger: '#e0503a',
    radius: 14,
    font: '"Trebuchet MS", "Segoe UI", sans-serif',
    titleGlow: '0 2px 0 #4a2a14, 0 0 16px rgba(232, 140, 40, 0.55)',
  },
  blockMargin: 0,
  flash: '#ffe2a8',

  drawBackground(ctx, w, h) {
    // cielo de atardecer
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#3a1e3e');
    sky.addColorStop(0.35, '#a6443a');
    sky.addColorStop(0.62, '#f09a48');
    sky.addColorStop(1, '#f6cf7a');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    const m = Math.min(w, h);

    // sol
    const sx = w * 0.2;
    const sy = h * 0.12;
    const sr = m * 0.09;
    const sg = ctx.createRadialGradient(sx, sy, sr * 0.6, sx, sy, sr * 3);
    sg.addColorStop(0, 'rgba(255, 230, 160, 0.6)');
    sg.addColorStop(1, 'rgba(255, 200, 120, 0)');
    ctx.fillStyle = sg;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ffe6a0';
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();

    // volcán con humo y lava
    const vx = w * 0.78;
    const vy = h * 0.76;
    const vw = Math.max(w * 0.3, m * 0.5);
    const vh = h * 0.1;
    const r = rng(777);
    for (let i = 0; i < 9; i++) {
      const t = i / 8;
      ctx.fillStyle = `rgba(70, 50, 60, ${0.35 - t * 0.25})`;
      ctx.beginPath();
      ctx.arc(vx + Math.sin(i * 1.3) * vw * 0.06 - t * vw * 0.25, vy - vh - t * h * 0.3, m * (0.05 + t * 0.09) * (0.8 + r() * 0.4), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#5a3440';
    ctx.beginPath();
    ctx.moveTo(vx - vw * 0.5, vy + h * 0.05);
    ctx.lineTo(vx - vw * 0.08, vy - vh);
    ctx.lineTo(vx + vw * 0.08, vy - vh);
    ctx.lineTo(vx + vw * 0.5, vy + h * 0.05);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ff7a2a';
    ctx.lineWidth = Math.max(2, m * 0.008);
    ctx.lineJoin = 'round';
    ctx.shadowColor = '#ff8a2a';
    ctx.shadowBlur = m * 0.03;
    ctx.beginPath();
    ctx.moveTo(vx - vw * 0.02, vy - vh);
    ctx.lineTo(vx - vw * 0.06, vy - vh * 0.7);
    ctx.lineTo(vx - vw * 0.03, vy - vh * 0.45);
    ctx.lineTo(vx - vw * 0.1, vy - vh * 0.1);
    ctx.moveTo(vx + vw * 0.04, vy - vh);
    ctx.lineTo(vx + vw * 0.09, vy - vh * 0.6);
    ctx.stroke();
    ctx.fillStyle = '#ffb04a';
    ctx.fillRect(vx - vw * 0.08, vy - vh - 2, vw * 0.16, 3);
    ctx.shadowBlur = 0;

    // pterosaurios
    ctx.fillStyle = 'rgba(50, 20, 35, 0.75)';
    pterosaur(ctx, w * 0.62, h * 0.18, m * 0.05);
    pterosaur(ctx, w * 0.72, h * 0.24, m * 0.032);
    pterosaur(ctx, w * 0.14, h * 0.3, m * 0.025);

    // colinas lejanas con saurópodos
    const hill = (base: number, amp: number, freq: number, phase: number, col: string) => {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let x = 0; x <= w; x += 8) ctx.lineTo(x, h * base - Math.sin(x * freq + phase) * amp - Math.sin(x * freq * 2.7 + phase) * amp * 0.3);
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();
    };
    hill(0.72, h * 0.03, 0.006, 1, '#7a3a3a');
    ctx.fillStyle = '#5e2c30';
    sauropod(ctx, w * 0.2, h * 0.72, m * 0.05);
    sauropod(ctx, w * 0.47, h * 0.715, m * 0.035);
    hill(0.8, h * 0.025, 0.009, 3, '#4e2a26');

    // jungla en primer plano
    hill(0.9, h * 0.02, 0.014, 5, '#2a1a14');
    ctx.strokeStyle = '#2a1a14';
    const fr = rng(31);
    const n = Math.max(4, Math.round(w / 90));
    for (let i = 0; i < n; i++) {
      const x = ((i + fr() * 0.6) / n) * w;
      cycad(ctx, x, h * (0.9 + fr() * 0.04), m * (0.1 + fr() * 0.08));
    }
    ctx.fillStyle = '#20140f';
    ctx.fillRect(0, h * 0.94, w, h * 0.06);

    // viñeta
    const v = ctx.createRadialGradient(w / 2, h / 2, m * 0.3, w / 2, h / 2, Math.max(w, h) * 0.8);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(20,8,4,0.5)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, w, h);
  },

  drawBoard(ctx, size, cell) {
    const pad = cell * 0.32;
    // losa de piedra
    const g = ctx.createLinearGradient(0, -pad, 0, size + pad);
    g.addColorStop(0, '#7a6450');
    g.addColorStop(1, '#4a3a2c');
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = cell * 0.4;
    ctx.shadowOffsetY = cell * 0.1;
    roundRect(ctx, -pad, -pad, size + pad * 2, size + pad * 2, cell * 0.35);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
    roundRect(ctx, -pad, -pad, size + pad * 2, size + pad * 2, cell * 0.35);
    ctx.strokeStyle = 'rgba(255, 220, 170, 0.25)';
    ctx.lineWidth = Math.max(1, cell * 0.04);
    ctx.stroke();
    // huellas talladas en el marco
    ctx.fillStyle = 'rgba(30, 20, 12, 0.45)';
    footprint(ctx, -pad / 2, size * 0.25, pad * 0.7);
    footprint(ctx, size + pad / 2, size * 0.7, pad * 0.7);
    // celdas de tierra
    ctx.fillStyle = '#3a2a1e';
    ctx.fillRect(0, 0, size, size);
    const r = rng(5);
    for (let y = 0; y < 8; y++)
      for (let x = 0; x < 8; x++) {
        ctx.fillStyle = (x + y) % 2 ? '#3f2e21' : '#45332490';
        ctx.fillRect(x * cell, y * cell, cell, cell);
        for (let i = 0; i < 3; i++) {
          ctx.fillStyle = rgba(r() > 0.5 ? '#000000' : '#c9a070', 0.12);
          ctx.beginPath();
          ctx.arc(x * cell + r() * cell, y * cell + r() * cell, cell * (0.03 + r() * 0.04), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = Math.max(1, cell * 0.025);
        ctx.strokeRect(x * cell + 0.5, y * cell + 0.5, cell - 1, cell - 1);
      }
  },

  drawBlock(ctx, s, color, variant) {
    if (variant === 'stone') {
      fossilRock(ctx, s, color);
      return;
    }
    const inset = s * 0.04;
    const rad = s * 0.2;
    if (variant === 'ghost') {
      roundRect(ctx, inset, inset, s - inset * 2, s - inset * 2, rad);
      ctx.fillStyle = rgba(color, 0.28);
      ctx.fill();
      ctx.setLineDash([s * 0.1, s * 0.07]);
      ctx.strokeStyle = rgba(color, 0.9);
      ctx.lineWidth = Math.max(1.5, s * 0.05);
      ctx.stroke();
      ctx.setLineDash([]);
      return;
    }
    // piel: lomo oscuro, vientre claro
    const g = ctx.createLinearGradient(0, 0, 0, s);
    g.addColorStop(0, shade(color, -0.12));
    g.addColorStop(0.55, color);
    g.addColorStop(1, shade(color, 0.28));
    roundRect(ctx, inset, inset, s - inset * 2, s - inset * 2, rad);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.save();
    ctx.clip();
    spots(ctx, s, color);
    scales(ctx, s);
    // placas dorsales arriba
    ctx.fillStyle = shade(color, -0.3);
    for (let i = 0; i < 3; i++) {
      const cx = s * (0.3 + i * 0.2);
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.07, inset);
      ctx.lineTo(cx, inset + s * 0.1);
      ctx.lineTo(cx + s * 0.07, inset);
      ctx.closePath();
      ctx.fill();
    }
    // brillo y sombra interiores
    const hl = ctx.createLinearGradient(0, 0, 0, s * 0.5);
    hl.addColorStop(0, 'rgba(255,255,255,0.22)');
    hl.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hl;
    ctx.fillRect(0, 0, s, s * 0.5);
    ctx.restore();
    roundRect(ctx, inset, inset, s - inset * 2, s - inset * 2, rad);
    ctx.strokeStyle = shade(color, -0.5);
    ctx.lineWidth = Math.max(1, s * 0.045);
    ctx.stroke();
  },

  drawGem(ctx, s) {
    // gota de ámbar con un insecto atrapado
    const cx = s / 2;
    const cy = s * 0.53;
    const k = s * 0.3;
    ctx.save();
    ctx.shadowColor = 'rgba(255, 170, 40, 0.8)';
    ctx.shadowBlur = s * 0.15;
    ctx.beginPath();
    ctx.moveTo(cx, cy - k * 1.15);
    ctx.bezierCurveTo(cx + k * 0.9, cy - k * 0.2, cx + k, cy + k * 0.9, cx, cy + k * 0.9);
    ctx.bezierCurveTo(cx - k, cy + k * 0.9, cx - k * 0.9, cy - k * 0.2, cx, cy - k * 1.15);
    const g = ctx.createRadialGradient(cx - k * 0.3, cy - k * 0.1, k * 0.1, cx, cy, k * 1.1);
    g.addColorStop(0, '#ffe08a');
    g.addColorStop(0.6, '#f0a020');
    g.addColorStop(1, '#a85a10');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#5a2e08';
    ctx.lineWidth = Math.max(1, s * 0.03);
    ctx.stroke();
    // insecto
    ctx.fillStyle = 'rgba(60, 30, 10, 0.75)';
    ctx.beginPath();
    ctx.ellipse(cx + k * 0.05, cy + k * 0.25, k * 0.1, k * 0.2, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(60, 30, 10, 0.5)';
    ctx.lineWidth = Math.max(0.6, s * 0.012);
    ctx.beginPath();
    ctx.moveTo(cx, cy + k * 0.15);
    ctx.lineTo(cx - k * 0.3, cy);
    ctx.moveTo(cx + k * 0.08, cy + k * 0.15);
    ctx.lineTo(cx + k * 0.35, cy + k * 0.02);
    ctx.stroke();
    // reflejo
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath();
    ctx.ellipse(cx - k * 0.35, cy - k * 0.25, k * 0.1, k * 0.22, 0.5, 0, Math.PI * 2);
    ctx.fill();
  },

  drawTarget(ctx, s) {
    // huella en un círculo de piedra
    ctx.fillStyle = 'rgba(250, 235, 210, 0.9)';
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, s * 0.33, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#4a2a14';
    ctx.lineWidth = Math.max(1, s * 0.05);
    ctx.stroke();
    ctx.fillStyle = '#c0392b';
    footprint(ctx, s / 2, s * 0.55, s * 0.32);
  },

  particles: {
    draw(ctx, s, color) {
      // esquirla de roca/escama
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(s * 0.2, s * 0.3);
      ctx.lineTo(s * 0.65, s * 0.12);
      ctx.lineTo(s * 0.9, s * 0.55);
      ctx.lineTo(s * 0.55, s * 0.9);
      ctx.lineTo(s * 0.15, s * 0.7);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath();
      ctx.moveTo(s * 0.2, s * 0.3);
      ctx.lineTo(s * 0.65, s * 0.12);
      ctx.lineTo(s * 0.5, s * 0.45);
      ctx.closePath();
      ctx.fill();
    },
    perCell: 5,
    size: [0.14, 0.26],
    speed: [2.5, 6],
    gravity: 16,
    life: [0.5, 0.95],
    blend: 'normal',
    spin: true,
    shrink: true,
  },

  ambient: {
    // hojas y ceniza que caen
    count: 12,
    draw(ctx, s) {
      ctx.fillStyle = '#9ac850';
      ctx.beginPath();
      ctx.ellipse(s / 2, s / 2, s * 0.45, s * 0.2, 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(40, 70, 20, 0.7)';
      ctx.lineWidth = Math.max(0.5, s * 0.06);
      ctx.beginPath();
      ctx.moveTo(s * 0.15, s * 0.25);
      ctx.lineTo(s * 0.85, s * 0.75);
      ctx.stroke();
    },
    size: [6, 12],
    speed: [10, 22],
    alpha: [0.3, 0.6],
    blend: 'normal',
  },

  sound: {
    root: 45,
    scale: [0, 3, 5, 7, 10],
    blip: 'triangle',
    sparkle: 'sine',
    thump: 1,
    music: {
      bpm: 84,
      progression: [0, 3, 2, 4],
      pad: 'sawtooth',
      lead: 'triangle',
      bass: 'sine',
      leadDensity: 0.3,
      padGain: 0.04,
      leadGain: 0.05,
      bassGain: 0.11,
      filter: 900,
      reverb: 0.55,
      echo: 0.3,
      hats: true,
    },
  },
};

export default dinos;
