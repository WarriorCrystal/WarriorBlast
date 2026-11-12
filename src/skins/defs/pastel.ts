import { drawGemIcon, drawTargetIcon, rgba, roundRect, shade } from '../draw';
import type { SkinDef } from '../types';

/** PASTEL MINIMALISTA — colores suaves y formas redondeadas. */
const pastel: SkinDef = {
  id: 'pastel',
  name: { es: 'Pastel', en: 'Pastel' },
  description: { es: 'Suave, redondo y tranquilo.', en: 'Soft, round and calm.' },
  price: 300,
  order: 1,
  blocks: ['#ff9aa8', '#ffc38a', '#f4dc6b', '#97dba0', '#86cfe0', '#9db5ff', '#c4a8f5', '#d9cfc6'],
  ui: {
    bg: '#fbf1e6',
    panel: 'rgba(255, 255, 255, 0.92)',
    panelBorder: 'rgba(200, 170, 160, 0.45)',
    text: '#4b4358',
    textDim: '#8f8698',
    accent: '#ff8fa3',
    accent2: '#7cc4dd',
    good: '#5cbf74',
    danger: '#ef6f7f',
    radius: 24,
    titleGlow: '0 3px 0 rgba(255,143,163,0.35)',
  },
  blockMargin: 0.15,
  flash: '#ffffff',
  explosion: { power: 0.9, ring: '#ffb3d9' },

  drawBackground(ctx, w, h) {
    ctx.fillStyle = '#fbf1e6';
    ctx.fillRect(0, 0, w, h);
    const dots: Array<[number, number, number, string]> = [
      [0.1, 0.1, 0.35, 'rgba(255,170,190,0.45)'],
      [0.9, 0.2, 0.3, 'rgba(160,210,240,0.45)'],
      [0.2, 0.85, 0.35, 'rgba(190,230,190,0.45)'],
      [0.85, 0.85, 0.3, 'rgba(255,215,160,0.5)'],
    ];
    const m = Math.min(w, h);
    for (const [x, y, r, c] of dots) {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(x * w, y * h, r * m, 0, Math.PI * 2);
      ctx.fill();
    }
    // patrón de puntitos
    ctx.fillStyle = 'rgba(180,150,140,0.12)';
    for (let y = 12; y < h; y += 28)
      for (let x = (y / 28) % 2 ? 26 : 12; x < w; x += 28) {
        ctx.beginPath();
        ctx.arc(x, y, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
  },

  drawBoard(ctx, size, cell) {
    const pad = cell * 0.22;
    ctx.save();
    ctx.shadowColor = 'rgba(150, 110, 100, 0.25)';
    ctx.shadowBlur = cell * 0.5;
    ctx.shadowOffsetY = cell * 0.12;
    roundRect(ctx, -pad, -pad, size + pad * 2, size + pad * 2, cell * 0.5);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.restore();
    for (let y = 0; y < 8; y++)
      for (let x = 0; x < 8; x++) {
        const i = cell * 0.07;
        roundRect(ctx, x * cell + i, y * cell + i, cell - i * 2, cell - i * 2, cell * 0.3);
        ctx.fillStyle = '#f5ece4';
        ctx.fill();
      }
  },

  drawBlock(ctx, s, color, variant) {
    const i = s * 0.07;
    const w = s - i * 2;
    const r = s * 0.32;
    if (variant === 'ghost') {
      roundRect(ctx, i, i, w, w, r);
      ctx.fillStyle = rgba(color, 0.4);
      ctx.fill();
      return;
    }
    ctx.save();
    ctx.shadowColor = 'rgba(120, 90, 80, 0.22)';
    ctx.shadowBlur = s * 0.12;
    ctx.shadowOffsetY = s * 0.06;
    roundRect(ctx, i, i, w, w, r);
    ctx.fillStyle = shade(color, -0.12);
    ctx.fill();
    ctx.restore();
    // cara superior
    roundRect(ctx, i, i, w, w - s * 0.07, r);
    ctx.fillStyle = color;
    ctx.fill();
    // brillo
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    roundRect(ctx, s * 0.22, s * 0.17, s * 0.22, s * 0.1, s * 0.05);
    ctx.fill();
  },

  drawGem(ctx, s) {
    drawGemIcon(ctx, s, '#a8e8ff', '#ffffff');
  },
  drawTarget(ctx, s) {
    drawTargetIcon(ctx, s, '#7c6f86');
  },

  particles: {
    draw(ctx, s, color) {
      ctx.beginPath();
      ctx.arc(s / 2, s / 2, s * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    },
    perCell: 4,
    size: [0.15, 0.4],
    speed: [2, 5.5],
    gravity: 9,
    life: [0.5, 0.9],
    blend: 'normal',
    spin: false,
    shrink: true,
  },

  ambient: {
    count: 10,
    draw(ctx, s) {
      ctx.beginPath();
      ctx.arc(s / 2, s / 2, s * 0.48, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fill();
    },
    size: [6, 16],
    speed: [-5, -12],
    alpha: [0.3, 0.7],
    blend: 'normal',
  },

  sound: {
    root: 64,
    scale: [0, 2, 4, 5, 7, 9, 11],
    blip: 'triangle',
    sparkle: 'triangle',
    thump: 0.35,
    music: {
      bpm: 92,
      progression: [0, 5, 3, 4],
      pad: 'triangle',
      lead: 'triangle',
      bass: 'sine',
      leadDensity: 0.28,
      padGain: 0.05,
      leadGain: 0.055,
      bassGain: 0.1,
      filter: 1200,
      reverb: 0.5,
      echo: 0.3,
      hats: false,
    },
  },
};

export default pastel;
