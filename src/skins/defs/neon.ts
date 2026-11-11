import { drawGemIcon, rgba, roundRect, shade, softDot } from '../draw';
import type { SkinDef } from '../types';

/** NEÓN — skin gratuita por defecto: noche profunda, bloques que brillan. */
const neon: SkinDef = {
  id: 'neon',
  name: { es: 'Neón', en: 'Neon' },
  description: { es: 'Luces brillantes sobre la noche.', en: 'Bright lights in the night.' },
  price: 0,
  order: 0,
  blocks: ['#ff2e88', '#ffae00', '#39ff7a', '#20d6ff', '#8a5cff', '#ff5532', '#f7f34a', '#4c4a6e'],
  ui: {
    bg: '#07051a',
    panel: 'rgba(20, 16, 52, 0.86)',
    panelBorder: 'rgba(120, 100, 255, 0.45)',
    text: '#f2f0ff',
    textDim: '#9c97c9',
    accent: '#20d6ff',
    accent2: '#ff2e88',
    good: '#39ff7a',
    danger: '#ff4d6d',
    radius: 18,
    titleGlow: '0 0 12px #20d6ff, 0 0 28px #ff2e88',
  },
  blockMargin: 0.4,
  flash: '#bff4ff',

  drawBackground(ctx, w, h) {
    ctx.fillStyle = '#07051a';
    ctx.fillRect(0, 0, w, h);
    const g1 = ctx.createRadialGradient(w * 0.2, h * 0.08, 0, w * 0.2, h * 0.08, Math.max(w, h) * 0.7);
    g1.addColorStop(0, 'rgba(138, 92, 255, 0.35)');
    g1.addColorStop(1, 'rgba(138, 92, 255, 0)');
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, w, h);
    const g2 = ctx.createRadialGradient(w * 0.85, h * 0.95, 0, w * 0.85, h * 0.95, Math.max(w, h) * 0.6);
    g2.addColorStop(0, 'rgba(255, 46, 136, 0.28)');
    g2.addColorStop(1, 'rgba(255, 46, 136, 0)');
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, w, h);
    // rejilla en perspectiva en la parte inferior
    const horizon = h * 0.72;
    ctx.save();
    ctx.strokeStyle = 'rgba(32, 214, 255, 0.10)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 14; i++) {
      const t = i / 13;
      const y = horizon + Math.pow(t, 2) * (h - horizon);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    for (let i = -12; i <= 12; i++) {
      ctx.beginPath();
      ctx.moveTo(w / 2 + i * w * 0.02, horizon);
      ctx.lineTo(w / 2 + i * w * 0.16, h);
      ctx.stroke();
    }
    ctx.restore();
    // viñeta
    const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.8);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, w, h);
  },

  drawBoard(ctx, size, cell) {
    const pad = cell * 0.18;
    ctx.save();
    ctx.shadowColor = 'rgba(32, 214, 255, 0.45)';
    ctx.shadowBlur = cell * 0.5;
    roundRect(ctx, -pad, -pad, size + pad * 2, size + pad * 2, cell * 0.35);
    ctx.fillStyle = '#0c0a24';
    ctx.fill();
    ctx.restore();
    roundRect(ctx, -pad, -pad, size + pad * 2, size + pad * 2, cell * 0.35);
    ctx.strokeStyle = 'rgba(32, 214, 255, 0.55)';
    ctx.lineWidth = Math.max(1.5, cell * 0.035);
    ctx.stroke();
    for (let y = 0; y < 8; y++)
      for (let x = 0; x < 8; x++) {
        const i = cell * 0.06;
        roundRect(ctx, x * cell + i, y * cell + i, cell - i * 2, cell - i * 2, cell * 0.16);
        ctx.fillStyle = 'rgba(70, 60, 150, 0.16)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(120, 110, 220, 0.16)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
  },

  drawBlock(ctx, s, color, variant) {
    const i = s * 0.07;
    const r = s * 0.2;
    if (variant === 'ghost') {
      roundRect(ctx, i, i, s - i * 2, s - i * 2, r);
      ctx.fillStyle = rgba(color, 0.16);
      ctx.fill();
      ctx.setLineDash([s * 0.12, s * 0.08]);
      ctx.strokeStyle = rgba(color, 0.85);
      ctx.lineWidth = s * 0.05;
      ctx.stroke();
      return;
    }
    // resplandor exterior
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = s * (variant === 'stone' ? 0.1 : 0.38);
    roundRect(ctx, i, i, s - i * 2, s - i * 2, r);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
    // cuerpo con degradado
    roundRect(ctx, i, i, s - i * 2, s - i * 2, r);
    const g = ctx.createLinearGradient(0, i, 0, s - i);
    g.addColorStop(0, shade(color, 0.35));
    g.addColorStop(0.5, color);
    g.addColorStop(1, shade(color, -0.35));
    ctx.fillStyle = g;
    ctx.fill();
    // núcleo oscuro: efecto tubo de neón
    const k = s * 0.2;
    roundRect(ctx, k, k, s - k * 2, s - k * 2, r * 0.6);
    ctx.fillStyle = rgba('#000000', variant === 'stone' ? 0.15 : 0.32);
    ctx.fill();
    roundRect(ctx, k, k, s - k * 2, s - k * 2, r * 0.6);
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = s * 0.035;
    ctx.stroke();
    // brillo superior
    ctx.beginPath();
    ctx.moveTo(i + r, i + s * 0.05);
    ctx.lineTo(s - i - r, i + s * 0.05);
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = s * 0.04;
    ctx.lineCap = 'round';
    ctx.stroke();
  },

  drawGem(ctx, s) {
    drawGemIcon(ctx, s, '#9ffcff');
  },

  particles: {
    draw: (ctx, s, color) => softDot(ctx, s, color, 0.2),
    perCell: 5,
    size: [0.22, 0.5],
    speed: [2.5, 7],
    gravity: 6,
    life: [0.45, 0.9],
    blend: 'add',
    spin: false,
    shrink: true,
  },

  ambient: {
    count: 26,
    draw: (ctx, s) => softDot(ctx, s, '#7a6cff', 0.15),
    size: [4, 14],
    speed: [-8, -22],
    alpha: [0.15, 0.5],
    blend: 'add',
  },

  sound: {
    root: 57,
    scale: [0, 2, 3, 5, 7, 8, 10],
    blip: 'triangle',
    sparkle: 'sawtooth',
    thump: 0.8,
    music: {
      bpm: 100,
      progression: [0, 5, 2, 6],
      pad: 'sawtooth',
      lead: 'square',
      bass: 'triangle',
      leadDensity: 0.32,
      padGain: 0.05,
      leadGain: 0.035,
      bassGain: 0.12,
      filter: 900,
      reverb: 0.45,
      echo: 0.35,
      hats: true,
    },
  },
};

export default neon;
