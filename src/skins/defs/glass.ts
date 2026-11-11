import { drawGemIcon, rgba, roundRect, shade } from '../draw';
import type { SkinDef } from '../types';

/**
 * LIQUID GLASS — vidrio translúcido: bloques de cristal con refracción, brillos
 * especulares y bordes suaves sobre un fondo de colores difuminados.
 * El tablero usa `frosted` (desenfoque real del fondo detrás del panel).
 */
function blob(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, c: string) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, c);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

const glass: SkinDef = {
  id: 'glass',
  name: { es: 'Liquid Glass', en: 'Liquid Glass' },
  description: { es: 'Cristal translúcido con reflejos.', en: 'Translucent glass with reflections.' },
  price: 1200,
  order: 3,
  frosted: true,
  blocks: ['#ff5f8f', '#ffa53d', '#3fd98a', '#2fb7ff', '#8f7bff', '#ff6a4d', '#ffd84a', '#c9d3e6'],
  ui: {
    bg: '#5b6ee8',
    panel: 'rgba(255, 255, 255, 0.22)',
    panelBorder: 'rgba(255, 255, 255, 0.55)',
    text: '#ffffff',
    textDim: 'rgba(255,255,255,0.78)',
    accent: '#ffffff',
    accent2: '#ffd1e8',
    good: '#7dffb8',
    danger: '#ff8a9a',
    radius: 26,
    glass: true,
    titleGlow: '0 2px 18px rgba(255,255,255,0.65)',
  },
  blockMargin: 0.25,
  flash: '#ffffff',

  drawBackground(ctx, w, h) {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#4b5be0');
    g.addColorStop(0.5, '#8a6cf0');
    g.addColorStop(1, '#f07fb4');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    const m = Math.max(w, h);
    blob(ctx, w * 0.15, h * 0.12, m * 0.45, 'rgba(70, 220, 255, 0.75)');
    blob(ctx, w * 0.95, h * 0.3, m * 0.4, 'rgba(255, 170, 80, 0.7)');
    blob(ctx, w * 0.25, h * 0.75, m * 0.45, 'rgba(255, 90, 170, 0.6)');
    blob(ctx, w * 0.8, h * 0.95, m * 0.4, 'rgba(120, 255, 190, 0.55)');
    blob(ctx, w * 0.55, h * 0.5, m * 0.3, 'rgba(255, 255, 255, 0.25)');
  },

  drawBoard(ctx, size, cell) {
    const pad = cell * 0.22;
    const R = cell * 0.55;
    // panel de vidrio (el desenfoque del fondo lo pone el renderer debajo)
    roundRect(ctx, -pad, -pad, size + pad * 2, size + pad * 2, R);
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.fill();
    const rim = ctx.createLinearGradient(0, -pad, size, size + pad);
    rim.addColorStop(0, 'rgba(255,255,255,0.9)');
    rim.addColorStop(0.45, 'rgba(255,255,255,0.15)');
    rim.addColorStop(1, 'rgba(255,255,255,0.6)');
    ctx.strokeStyle = rim;
    ctx.lineWidth = Math.max(1.5, cell * 0.04);
    ctx.stroke();
    for (let y = 0; y < 8; y++)
      for (let x = 0; x < 8; x++) {
        const i = cell * 0.07;
        roundRect(ctx, x * cell + i, y * cell + i, cell - i * 2, cell - i * 2, cell * 0.26);
        ctx.fillStyle = 'rgba(255,255,255,0.10)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.18)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
  },

  drawBlock(ctx, s, color, variant) {
    const i = s * 0.06;
    const r = s * 0.28;
    const w = s - i * 2;
    if (variant === 'ghost') {
      roundRect(ctx, i, i, w, w, r);
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = s * 0.04;
      ctx.stroke();
      return;
    }
    // sombra suave
    ctx.save();
    ctx.shadowColor = rgba(color.startsWith('#') ? color : '#000000', 0.55);
    ctx.shadowBlur = s * 0.22;
    ctx.shadowOffsetY = s * 0.06;
    roundRect(ctx, i, i, w, w, r);
    ctx.fillStyle = rgba(color, 0.55);
    ctx.fill();
    ctx.restore();
    // cuerpo translúcido: más denso abajo (refracción)
    roundRect(ctx, i, i, w, w, r);
    const body = ctx.createLinearGradient(0, i, 0, s - i);
    body.addColorStop(0, rgba(color, 0.35));
    body.addColorStop(0.6, rgba(color, 0.62));
    body.addColorStop(1, shade(color, -0.1));
    ctx.fillStyle = body;
    ctx.fill();
    // cáustica: luz concentrada en el borde inferior
    ctx.save();
    roundRect(ctx, i, i, w, w, r);
    ctx.clip();
    const caus = ctx.createRadialGradient(s * 0.5, s * 1.02, 0, s * 0.5, s * 1.02, s * 0.55);
    caus.addColorStop(0, 'rgba(255,255,255,0.75)');
    caus.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = caus;
    ctx.fillRect(0, 0, s, s);
    // brillo especular superior (elipse)
    const spec = ctx.createLinearGradient(0, i, 0, s * 0.5);
    spec.addColorStop(0, 'rgba(255,255,255,0.95)');
    spec.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = spec;
    ctx.beginPath();
    ctx.ellipse(s * 0.5, s * 0.2, w * 0.42, s * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // borde de luz (arriba-izquierda brillante, abajo-derecha tenue)
    roundRect(ctx, i + 0.5, i + 0.5, w - 1, w - 1, r);
    const rim = ctx.createLinearGradient(i, i, s - i, s - i);
    rim.addColorStop(0, 'rgba(255,255,255,1)');
    rim.addColorStop(0.5, 'rgba(255,255,255,0.25)');
    rim.addColorStop(1, 'rgba(255,255,255,0.7)');
    ctx.strokeStyle = rim;
    ctx.lineWidth = s * 0.045;
    ctx.stroke();
    // destello puntual
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.beginPath();
    ctx.arc(s * 0.27, s * 0.24, s * 0.05, 0, Math.PI * 2);
    ctx.fill();
  },

  drawGem(ctx, s) {
    drawGemIcon(ctx, s, '#e9fbff');
  },

  particles: {
    draw(ctx, s, color) {
      // burbuja de cristal
      ctx.beginPath();
      ctx.arc(s / 2, s / 2, s * 0.42, 0, Math.PI * 2);
      ctx.fillStyle = rgba(color, 0.25);
      ctx.fill();
      ctx.lineWidth = s * 0.07;
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(s * 0.36, s * 0.34, s * 0.1, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    },
    perCell: 4,
    size: [0.2, 0.55],
    speed: [1.5, 5],
    gravity: -1.5,
    life: [0.6, 1.1],
    blend: 'normal',
    spin: false,
    shrink: false,
  },

  ambient: {
    count: 14,
    draw(ctx, s) {
      const g = ctx.createRadialGradient(s * 0.4, s * 0.35, 0, s / 2, s / 2, s / 2);
      g.addColorStop(0, 'rgba(255,255,255,0.5)');
      g.addColorStop(0.7, 'rgba(255,255,255,0.12)');
      g.addColorStop(0.95, 'rgba(255,255,255,0.45)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, s, s);
    },
    size: [18, 60],
    speed: [-6, -16],
    alpha: [0.25, 0.6],
    blend: 'normal',
  },

  sound: {
    root: 60,
    scale: [0, 2, 4, 5, 7, 9, 11],
    blip: 'sine',
    sparkle: 'sine',
    thump: 0.4,
    music: {
      bpm: 82,
      progression: [0, 3, 5, 4],
      pad: 'sine',
      lead: 'sine',
      bass: 'sine',
      leadDensity: 0.25,
      padGain: 0.08,
      leadGain: 0.05,
      bassGain: 0.1,
      filter: 1800,
      reverb: 0.75,
      echo: 0.5,
      hats: false,
    },
  },
};

export default glass;
