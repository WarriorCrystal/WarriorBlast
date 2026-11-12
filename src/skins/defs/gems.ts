import { drawGemIcon, roundRect, shade, star } from '../draw';
import type { SkinDef } from '../types';

/** JOYAS — bloques facetados tipo gema con destellos. */
const gems: SkinDef = {
  id: 'gems',
  name: { es: 'Joyas', en: 'Jewels' },
  description: { es: 'Gemas facetadas que destellan.', en: 'Faceted, sparkling gemstones.' },
  price: 800,
  order: 2,
  blocks: ['#e0115f', '#ff9f1c', '#12c46f', '#1f6fff', '#9b4dff', '#2fe0cf', '#f5d43a', '#6e6a86'],
  ui: {
    bg: '#0b0716',
    panel: 'rgba(26, 18, 44, 0.9)',
    panelBorder: 'rgba(245, 212, 58, 0.45)',
    text: '#fff8e8',
    textDim: '#b9a9cf',
    accent: '#f5d43a',
    accent2: '#e0115f',
    good: '#12c46f',
    danger: '#ff4d6d',
    radius: 14,
    font: 'Georgia, "Times New Roman", serif',
    titleGlow: '0 0 14px rgba(245,212,58,0.7)',
  },
  blockMargin: 0.15,
  flash: '#fff3c4',
  explosion: { power: 1.3, rings: 2 },

  drawBackground(ctx, w, h) {
    const g = ctx.createRadialGradient(w / 2, h * 0.35, 0, w / 2, h * 0.35, Math.max(w, h) * 0.8);
    g.addColorStop(0, '#2a1846');
    g.addColorStop(0.55, '#140c26');
    g.addColorStop(1, '#06040c');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // polvo de estrellas determinista
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 160; i++) {
      const x = rnd() * w;
      const y = rnd() * h;
      const r = rnd() * 1.4 + 0.3;
      ctx.fillStyle = `rgba(255, ${200 + rnd() * 55}, ${180 + rnd() * 75}, ${0.2 + rnd() * 0.6})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 14; i++) {
      const x = rnd() * w;
      const y = rnd() * h;
      ctx.fillStyle = 'rgba(255, 240, 200, 0.55)';
      star(ctx, x, y, 6 + rnd() * 6, 1.2, 4);
      ctx.fill();
    }
  },

  drawBoard(ctx, size, cell) {
    const pad = cell * 0.2;
    // marco dorado biselado
    roundRect(ctx, -pad, -pad, size + pad * 2, size + pad * 2, cell * 0.25);
    const frame = ctx.createLinearGradient(0, -pad, 0, size + pad);
    frame.addColorStop(0, '#f8e08e');
    frame.addColorStop(0.5, '#a07a24');
    frame.addColorStop(1, '#f0c95a');
    ctx.fillStyle = frame;
    ctx.fill();
    const t = cell * 0.08;
    roundRect(ctx, -pad + t, -pad + t, size + (pad - t) * 2, size + (pad - t) * 2, cell * 0.2);
    ctx.fillStyle = '#120b20';
    ctx.fill();
    for (let y = 0; y < 8; y++)
      for (let x = 0; x < 8; x++) {
        const i = cell * 0.05;
        roundRect(ctx, x * cell + i, y * cell + i, cell - i * 2, cell - i * 2, cell * 0.1);
        const g = ctx.createLinearGradient(0, y * cell, 0, (y + 1) * cell);
        g.addColorStop(0, 'rgba(0,0,0,0.45)');
        g.addColorStop(1, 'rgba(80,60,120,0.25)');
        ctx.fillStyle = g;
        ctx.fill();
      }
  },

  drawBlock(ctx, s, color, variant) {
    const i = s * 0.04;
    const w = s - i * 2;
    if (variant === 'ghost') {
      roundRect(ctx, i, i, w, w, s * 0.1);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.9;
      ctx.lineWidth = s * 0.05;
      ctx.stroke();
      ctx.globalAlpha = 1;
      return;
    }
    const x0 = i;
    const y0 = i;
    const x1 = s - i;
    const y1 = s - i;
    const k = s * 0.24; // inset de la tabla
    const tx0 = x0 + k;
    const ty0 = y0 + k;
    const tx1 = x1 - k;
    const ty1 = y1 - k;
    const facet = (pts: number[], fill: string | CanvasGradient) => {
      ctx.beginPath();
      ctx.moveTo(pts[0], pts[1]);
      for (let p = 2; p < pts.length; p += 2) ctx.lineTo(pts[p], pts[p + 1]);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
    };
    const sat = variant === 'stone' ? 0 : 1;
    facet([x0, y0, x1, y0, tx1, ty0, tx0, ty0], shade(color, 0.45 * sat + 0.1)); // arriba
    facet([x0, y0, tx0, ty0, tx0, ty1, x0, y1], shade(color, 0.15)); // izquierda
    facet([x1, y0, x1, y1, tx1, ty1, tx1, ty0], shade(color, -0.3)); // derecha
    facet([x0, y1, tx0, ty1, tx1, ty1, x1, y1], shade(color, -0.5)); // abajo
    // tabla central con degradado
    const tg = ctx.createLinearGradient(tx0, ty0, tx1, ty1);
    tg.addColorStop(0, shade(color, 0.3));
    tg.addColorStop(0.5, color);
    tg.addColorStop(1, shade(color, -0.2));
    facet([tx0, ty0, tx1, ty0, tx1, ty1, tx0, ty1], tg);
    // aristas
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = Math.max(1, s * 0.02);
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(tx0, ty0);
    ctx.moveTo(x1, y0);
    ctx.lineTo(tx1, ty0);
    ctx.moveTo(x0, y1);
    ctx.lineTo(tx0, ty1);
    ctx.moveTo(x1, y1);
    ctx.lineTo(tx1, ty1);
    ctx.stroke();
    ctx.strokeRect(tx0, ty0, tx1 - tx0, ty1 - ty0);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
    if (variant !== 'stone') {
      // destello
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      star(ctx, tx0 + s * 0.06, ty0 + s * 0.06, s * 0.12, s * 0.025, 4);
      ctx.fill();
    }
  },

  drawGem(ctx, s) {
    drawGemIcon(ctx, s, '#ffffff', '#fff3c4');
  },

  particles: {
    draw(ctx, s, color) {
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = s * 0.25;
      ctx.fillStyle = '#ffffff';
      star(ctx, s / 2, s / 2, s * 0.45, s * 0.1, 4);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.6;
      star(ctx, s / 2, s / 2, s * 0.3, s * 0.07, 4);
      ctx.fill();
    },
    perCell: 4,
    size: [0.25, 0.6],
    speed: [2, 6],
    gravity: 4,
    life: [0.5, 1.0],
    blend: 'add',
    spin: true,
    shrink: true,
  },

  ambient: {
    count: 18,
    draw(ctx, s) {
      ctx.fillStyle = 'rgba(255, 240, 200, 0.9)';
      star(ctx, s / 2, s / 2, s / 2, s * 0.1, 4);
      ctx.fill();
    },
    size: [5, 12],
    speed: [-3, -9],
    alpha: [0.2, 0.7],
    blend: 'add',
  },

  sound: {
    root: 62,
    scale: [0, 2, 4, 6, 7, 9, 11],
    blip: 'sine',
    sparkle: 'triangle',
    thump: 0.5,
    music: {
      bpm: 88,
      progression: [0, 1, 5, 4],
      pad: 'triangle',
      lead: 'sine',
      bass: 'sine',
      leadDensity: 0.3,
      padGain: 0.06,
      leadGain: 0.05,
      bassGain: 0.1,
      filter: 1400,
      reverb: 0.65,
      echo: 0.55,
      hats: false,
    },
  },
};

export default gems;
