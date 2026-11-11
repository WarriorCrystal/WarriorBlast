import { CanvasSource, Texture } from 'pixi.js';
import { cheapBlur, drawGemIcon, drawTargetIcon, roundRect } from '../skins/draw';
import type { Ctx, SkinDef } from '../skins/types';

/** Crea una textura a partir de un dibujo Canvas2D en píxeles CSS. */
export function canvasTexture(w: number, h: number, res: number, draw: (ctx: Ctx) => void, nearest = false): Texture {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w * res));
  c.height = Math.max(1, Math.ceil(h * res));
  const ctx = c.getContext('2d')!;
  ctx.scale(res, res);
  if (nearest) ctx.imageSmoothingEnabled = false;
  draw(ctx);
  return textureFromCanvas(c, res, nearest);
}

export function textureFromCanvas(c: HTMLCanvasElement, res: number, nearest = false): Texture {
  const source = new CanvasSource({ resource: c, resolution: res, scaleMode: nearest ? 'nearest' : 'linear', autoGenerateMipmaps: false });
  return new Texture({ source });
}

/**
 * Juego de texturas de una skin para un tamaño de celda dado.
 * Índices de color: 1..7 colores, 8 piedra.
 */
export class SkinTextures {
  block: Texture[] = [];
  ghost: Texture[] = [];
  particle: Texture[] = [];
  gem!: Texture;
  target!: Texture;
  flash!: Texture;
  beam!: Texture;
  ring!: Texture;
  background!: Texture;
  board!: Texture;
  ambient?: Texture;
  bgCanvas!: HTMLCanvasElement;
  private all: Texture[] = [];

  constructor(
    readonly skin: SkinDef,
    readonly cell: number,
    readonly res: number,
  ) {
    const s = skin;
    const near = !!s.pixelated;
    const m = Math.ceil(cell * s.blockMargin);
    const full = cell + m * 2;
    for (let i = 0; i <= 8; i++) {
      const color = s.blocks[Math.max(0, i - 1)];
      const variant = i === 8 ? 'stone' : 'normal';
      this.block[i] = this.track(
        canvasTexture(full, full, res, (ctx) => {
          ctx.translate(m, m);
          s.drawBlock(ctx, cell, color, variant);
        }, near),
      );
      this.ghost[i] = this.track(
        canvasTexture(full, full, res, (ctx) => {
          ctx.translate(m, m);
          s.drawBlock(ctx, cell, color, 'ghost');
        }, near),
      );
      const ps = 32;
      this.particle[i] = this.track(canvasTexture(ps, ps, res, (ctx) => s.particles.draw(ctx, ps, color), near));
    }
    this.gem = this.track(canvasTexture(cell, cell, res, (ctx) => (s.drawGem ? s.drawGem(ctx, cell) : drawGemIcon(ctx, cell)), near));
    this.target = this.track(canvasTexture(cell, cell, res, (ctx) => (s.drawTarget ? s.drawTarget(ctx, cell) : drawTargetIcon(ctx, cell)), near));
    this.flash = this.track(
      canvasTexture(cell, cell, res, (ctx) => {
        roundRect(ctx, cell * 0.05, cell * 0.05, cell * 0.9, cell * 0.9, cell * 0.2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      }),
    );
    this.beam = this.track(
      canvasTexture(64, 32, res, (ctx) => {
        const g = ctx.createLinearGradient(0, 0, 0, 32);
        g.addColorStop(0, 'rgba(255,255,255,0)');
        g.addColorStop(0.5, 'rgba(255,255,255,1)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 64, 32);
      }),
    );
    this.ring = this.track(
      canvasTexture(64, 64, res, (ctx) => {
        ctx.beginPath();
        ctx.arc(32, 32, 26, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 6;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(32, 32, 14, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fill();
      }),
    );
    if (s.ambient) {
      const a = s.ambient;
      this.ambient = this.track(canvasTexture(64, 64, res, (ctx) => a.draw(ctx, 64), near));
    }
  }

  private track(t: Texture): Texture {
    this.all.push(t);
    return t;
  }

  /** Fondo a pantalla completa (y lo guarda para el efecto vidrio). */
  buildBackground(w: number, h: number) {
    if (this.background) this.destroyTex(this.background);
    const res = Math.min(this.res, 1.5);
    const c = document.createElement('canvas');
    c.width = Math.ceil(w * res);
    c.height = Math.ceil(h * res);
    const ctx = c.getContext('2d')!;
    ctx.scale(res, res);
    this.skin.drawBackground(ctx, w, h);
    this.bgCanvas = c;
    this.background = this.track(textureFromCanvas(c, res, !!this.skin.pixelated));
  }

  /** Tablero (marco + celdas). Con `frosted`, incluye el fondo desenfocado detrás. */
  buildBoard(boardX: number, boardY: number, size: number) {
    if (this.board) this.destroyTex(this.board);
    const s = this.skin;
    const pad = this.cell * 0.6;
    const res = this.res;
    let frosted: HTMLCanvasElement | null = null;
    if (s.frosted && this.bgCanvas) {
      const br = Math.min(this.res, 1.5); // resolución del canvas de fondo
      const crop = document.createElement('canvas');
      crop.width = Math.ceil((size + pad * 2) * br);
      crop.height = crop.width;
      crop.getContext('2d')!.drawImage(this.bgCanvas, -(boardX - pad) * br, -(boardY - pad) * br);
      frosted = cheapBlur(cheapBlur(crop, 12), 4);
    }
    this.board = this.track(
      canvasTexture(size + pad * 2, size + pad * 2, res, (ctx) => {
        ctx.translate(pad, pad);
        if (frosted) {
          ctx.save();
          const p2 = this.cell * 0.22;
          roundRect(ctx, -p2, -p2, size + p2 * 2, size + p2 * 2, this.cell * 0.55);
          ctx.clip();
          ctx.drawImage(frosted, -pad, -pad, size + pad * 2, size + pad * 2);
          ctx.restore();
        }
        s.drawBoard(ctx, size, this.cell);
      }, !!s.pixelated),
    );
    return pad;
  }

  private destroyTex(t: Texture) {
    this.all = this.all.filter((x) => x !== t);
    t.destroy(true);
  }

  destroy() {
    for (const t of this.all) t.destroy(true);
    this.all = [];
  }
}
