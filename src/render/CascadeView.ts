import { Container, Sprite, Text, TextStyle, Texture } from 'pixi.js';
import { audio, haptics } from '../audio/audio';
import { COLS, HIDDEN, KIND_COLOR, PREVIEW, ROWS, SHAPES, type CascadeEvent, type CascadeSession, type Kind } from '../core/cascade';
import { STONE_COLOR } from '../core/board';
import { t } from '../i18n';
import { cheapBlur } from '../skins/draw';
import type { SkinDef } from '../skins/types';
import type { GameView } from './GameView';
import { Particles } from './particles';
import { SkinTextures, textureFromCanvas } from './textures';
import { ease } from './tween';

/** Gestos sobre el pozo (tocar = rotar, arrastrar = mover, deslizar abajo = soltar). */
export interface CascadeInput {
  move(dx: number): void;
  rotate(dir: 1 | -1): void;
  softDrop(on: boolean): void;
  hardDrop(): void;
  hold(): void;
}

interface Layout {
  W: number;
  H: number;
  cell: number;
  /** Esquina superior izquierda del pozo visible (px de pantalla). */
  wx: number;
  wy: number;
  /** Columna lateral (reserva + siguientes). */
  sx: number;
  side: number;
}

const SYSTEM_FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const SIDE_CELLS = 3.4;
const PREVIEW_SCALE = 0.58;

/**
 * Construye el pozo rectangular a partir del tablero cuadrado de la skin:
 * esquinas y bordes se copian tal cual y el interior se repite en bloques de 4 celdas
 * (conserva cuadrículas alternas y marcos redondeados de cualquier skin).
 */
function buildWell(skin: SkinDef, cell: number, res: number, cols: number, rows: number, bg?: HTMLCanvasElement, at?: { x: number; y: number }) {
  const pad = cell * 0.6;
  const S = cell * 8;
  const src = document.createElement('canvas');
  src.width = Math.ceil((S + pad * 2) * res);
  src.height = src.width;
  const sctx = src.getContext('2d')!;
  sctx.scale(res, res);
  if (skin.pixelated) sctx.imageSmoothingEnabled = false;
  sctx.translate(pad, pad);
  skin.drawBoard(sctx, S, cell);

  const dw = cols * cell + pad * 2;
  const dh = rows * cell + pad * 2;
  const dst = document.createElement('canvas');
  dst.width = Math.ceil(dw * res);
  dst.height = Math.ceil(dh * res);
  const ctx = dst.getContext('2d')!;
  ctx.imageSmoothingEnabled = !skin.pixelated;

  if (skin.frosted && bg && at) {
    const br = Math.min(res, 1.5);
    const crop = document.createElement('canvas');
    crop.width = Math.ceil(dw * br);
    crop.height = Math.ceil(dh * br);
    crop.getContext('2d')!.drawImage(bg, -(at.x - pad) * br, -(at.y - pad) * br);
    const blurred = cheapBlur(cheapBlur(crop, 12), 4);
    ctx.save();
    const r = cell * 0.55 * res;
    const inset = (pad - cell * 0.22) * res;
    ctx.beginPath();
    ctx.roundRect(inset, inset, dst.width - inset * 2, dst.height - inset * 2, r);
    ctx.clip();
    ctx.drawImage(blurred, 0, 0, dst.width, dst.height);
    ctx.restore();
  }

  // tramos por eje en píxeles de dispositivo: [destino, origen, largo]
  const segs = (n: number): Array<[number, number, number]> => {
    const srcLen = src.width;
    const edge = Math.round((pad + cell * 2) * res);
    const chunk = Math.round(cell * 4 * res);
    const dstLen = Math.ceil((n * cell + pad * 2) * res);
    const out: Array<[number, number, number]> = [[0, 0, edge]];
    let d = edge;
    const tailStart = dstLen - edge;
    while (d < tailStart) {
      const len = Math.min(chunk, tailStart - d);
      out.push([d, edge, len]);
      d += len;
    }
    out.push([tailStart, srcLen - edge, edge]);
    return out;
  };
  const xs = segs(cols);
  const ys = segs(rows);
  for (const [dy, sy, lh] of ys)
    for (const [dx, sx, lw] of xs) if (lw > 0 && lh > 0) ctx.drawImage(src, sx, sy, lw, lh, dx, dy, lw, lh);
  return { tex: textureFromCanvas(dst, res, !!skin.pixelated), pad };
}

export class CascadeView {
  readonly root = new Container();
  private wellSprite = new Sprite();
  private grid = new Container();
  private blocks: Sprite[] = [];
  private activeSprites: Sprite[] = [];
  private ghostSprites: Sprite[] = [];
  private fx = new Container();
  private fxPool: Sprite[] = [];
  private side = new Container();
  private holdBox = new Container();
  private nextBox = new Container();
  private labels: Text[] = [];
  private particles = new Particles(500);
  private skin!: SkinDef;
  private tex?: SkinTextures;
  private wellTex?: Texture;
  private L!: Layout;
  private insets = { top: 100, bottom: 100 };
  private session: CascadeSession | null = null;
  private input: CascadeInput | null = null;
  private dirty = true;
  private shownHold: string | null = '';
  private shownQueue = '';
  private shakeT = 0;
  private shakeAmp = 0;
  private hiddenRows = new Set<number>();
  private pointer: { id: number; x0: number; y0: number; t0: number; stepX: number; moved: boolean; soft: boolean } | null = null;

  constructor(private view: GameView) {
    const app = view.app;
    // bajo la capa de GameView: así sus textos emergentes quedan por encima
    app.stage.addChildAt(this.root, Math.max(0, app.stage.children.length - 1));
    this.root.visible = false;
    this.root.addChild(this.wellSprite, this.grid, this.fx, this.side, this.particles.layer);
    this.side.addChild(this.holdBox, this.nextBox);
    for (let i = 0; i < COLS * ROWS; i++) {
      const s = new Sprite();
      s.anchor.set(0.5);
      s.visible = false;
      this.blocks.push(s);
      this.grid.addChild(s);
    }
    for (let i = 0; i < 4; i++) {
      const g = new Sprite();
      g.anchor.set(0.5);
      g.visible = false;
      this.ghostSprites.push(g);
      this.grid.addChild(g);
    }
    for (let i = 0; i < 4; i++) {
      const a = new Sprite();
      a.anchor.set(0.5);
      a.visible = false;
      this.activeSprites.push(a);
      this.grid.addChild(a);
    }
    app.ticker.add((tk) => this.tick(tk.deltaMS));
    const canvas = app.canvas;
    canvas.addEventListener('pointerdown', (e) => this.onDown(e));
    window.addEventListener('pointermove', (e) => this.onMove(e), { passive: true });
    window.addEventListener('pointerup', (e) => this.onUp(e));
    window.addEventListener('pointercancel', (e) => this.onUp(e));
  }

  setSkin(skin: SkinDef) {
    this.skin = skin;
    if (this.root.visible) this.relayout(true);
  }

  setInsets(top: number, bottom: number) {
    this.insets = { top, bottom };
  }

  attach(session: CascadeSession | null, input: CascadeInput | null) {
    this.session = session;
    this.input = input;
    this.pointer = null;
    this.root.visible = !!session;
    this.hiddenRows.clear();
    this.fxPool.forEach((s) => (s.visible = false));
    this.particles.clear();
    this.shownHold = '';
    this.shownQueue = '';
    this.dirty = true;
    if (session) {
      this.relayout(true);
      this.root.alpha = 0;
      this.view.tweens.to(this.root, { alpha: 1 }, 250);
    }
  }

  relayout(force = false) {
    if (!this.skin) return;
    const app = this.view.app;
    const W = app.screen.width;
    const H = app.screen.height;
    const availH = H - this.insets.top - this.insets.bottom;
    const cell = Math.max(10, Math.floor(Math.min((W - 28) / (COLS + SIDE_CELLS + 0.6), availH / (ROWS + 0.8), 40)));
    const side = Math.round(cell * SIDE_CELLS);
    const total = COLS * cell + cell * 0.6 + side;
    const wx = Math.round((W - total) / 2);
    // el hueco sobrante va sobre todo arriba: el pozo queda cerca de los pulgares
    const wy = Math.round(this.insets.top + Math.max(0, (availH - ROWS * cell) * 0.7));
    const prev = this.L;
    this.L = { W, H, cell, wx, wy, sx: wx + COLS * cell + Math.round(cell * 0.6), side };
    const res = app.renderer.resolution;
    if (force || !this.tex || this.tex.cell !== cell || this.tex.skin !== this.skin || this.tex.res !== res) {
      for (const s of [...this.blocks, ...this.activeSprites, ...this.ghostSprites, ...this.fxPool]) {
        this.view.tweens.kill(s);
        s.texture = Texture.EMPTY;
      }
      this.particles.clear();
      this.clearSide();
      this.tex?.destroy();
      this.tex = new SkinTextures(this.skin, cell, res);
      // el fondo lo dibuja GameView; aquí solo hace falta para el efecto esmerilado
      if (this.skin.frosted) this.tex.buildBackground(W, H);
    }
    if (force || !prev || prev.cell !== cell || prev.wx !== wx || prev.wy !== wy || !this.wellTex) {
      this.wellTex?.destroy(true);
      const well = buildWell(this.skin, cell, res, COLS, ROWS, this.tex.bgCanvas, { x: wx, y: wy });
      this.wellTex = well.tex;
      this.wellSprite.texture = well.tex;
      this.wellSprite.position.set(wx - well.pad, wy - well.pad);
    }
    this.grid.position.set(wx, wy);
    this.fx.position.set(wx, wy);
    for (let i = 0; i < COLS * ROWS; i++) this.blocks[i].position.set((i % COLS) * cell + cell / 2, Math.floor(i / COLS) * cell + cell / 2);
    this.buildLabels();
    this.dirty = true;
    this.shownHold = '';
    this.shownQueue = '';
    this.sync();
  }

  private clearSide() {
    for (const box of [this.holdBox, this.nextBox]) box.removeChildren().forEach((c) => c.destroy({ children: true }));
  }

  private buildLabels() {
    this.labels.forEach((l) => l.destroy());
    this.labels = [];
    const L = this.L;
    const style = new TextStyle({
      fontFamily: this.skin.ui.font ?? SYSTEM_FONT,
      fontSize: Math.max(10, Math.round(L.cell * 0.42)),
      fontWeight: '700',
      fill: this.skin.ui.textDim,
      letterSpacing: 1.5,
    });
    const mk = (str: string, y: number) => {
      const tx = new Text({ text: str.toUpperCase(), style });
      tx.position.set(L.sx, y);
      this.side.addChild(tx);
      this.labels.push(tx);
    };
    mk(t('cascade.hold'), L.wy);
    mk(t('cascade.next'), L.wy + L.cell * 3.6);
  }

  /** Celdas de una pieza en miniatura, centrada en (cx, cy). */
  private miniPiece(kind: Kind, cx: number, cy: number, scale: number, dim = false): Container {
    const c = new Container();
    const cell = this.L.cell;
    const cells = SHAPES[kind][0];
    const xs = cells.map((p) => p[0]);
    const ys = cells.map((p) => p[1]);
    const w = Math.max(...xs) - Math.min(...xs) + 1;
    const h = Math.max(...ys) - Math.min(...ys) + 1;
    for (const [x, y] of cells) {
      const s = new Sprite(this.tex!.block[dim ? STONE_COLOR : KIND_COLOR[kind]]);
      s.anchor.set(0.5);
      s.position.set((x - Math.min(...xs)) * cell + cell / 2, (y - Math.min(...ys)) * cell + cell / 2);
      c.addChild(s);
    }
    c.pivot.set((w * cell) / 2, (h * cell) / 2);
    c.scale.set(scale);
    c.position.set(cx, cy);
    return c;
  }

  private syncSide() {
    const s = this.session;
    if (!s || !this.tex) return;
    const L = this.L;
    const holdKey = `${s.hold ?? '-'}${s.holdUsed ? '*' : ''}`;
    if (holdKey !== this.shownHold) {
      this.shownHold = holdKey;
      this.holdBox.removeChildren().forEach((c) => c.destroy({ children: true }));
      if (s.hold) this.holdBox.addChild(this.miniPiece(s.hold, L.sx + L.side / 2, L.wy + L.cell * 1.95, PREVIEW_SCALE, s.holdUsed));
    }
    const q = s.queue.slice(0, PREVIEW);
    const qKey = q.join('');
    if (qKey !== this.shownQueue) {
      const first = !this.shownQueue;
      this.shownQueue = qKey;
      this.nextBox.removeChildren().forEach((c) => c.destroy({ children: true }));
      q.forEach((k, i) => {
        const sc = i === 0 ? PREVIEW_SCALE * 1.08 : PREVIEW_SCALE * 0.86;
        const y = L.wy + L.cell * (5.6 + (i === 0 ? 0 : 0.55 + i * 2.05));
        const p = this.miniPiece(k, L.sx + L.side / 2, y, sc);
        if (!first && i === q.length - 1) {
          p.alpha = 0;
          this.view.tweens.to(p, { alpha: 1 }, 200);
        }
        this.nextBox.addChild(p);
      });
    }
  }

  private syncGrid() {
    const s = this.session;
    for (let y = 0; y < ROWS; y++)
      for (let x = 0; x < COLS; x++) {
        const sp = this.blocks[y * COLS + x];
        const c = s ? s.get(x, y + HIDDEN) : 0;
        sp.visible = c > 0 && !this.hiddenRows.has(y + HIDDEN);
        if (c && this.tex) sp.texture = this.tex.block[c];
      }
  }

  private syncActive() {
    const s = this.session;
    const a = s?.active;
    const cell = this.L.cell;
    if (!s || !a || !this.tex || s.ended) {
      this.activeSprites.forEach((sp) => (sp.visible = false));
      this.ghostSprites.forEach((sp) => (sp.visible = false));
      return;
    }
    const color = KIND_COLOR[a.kind];
    const gy = s.ghostY();
    const cells = SHAPES[a.kind][a.rot];
    // al apoyarse, la pieza parpadea levemente hasta bloquearse
    const pulse = s.onGround ? 0.82 + 0.18 * Math.cos(performance.now() / 70) : 1;
    cells.forEach(([cx, cy], i) => {
      const x = a.x + cx;
      const y = a.y + cy - HIDDEN;
      const sp = this.activeSprites[i];
      sp.texture = this.tex!.block[color];
      sp.visible = y >= 0;
      sp.alpha = pulse;
      sp.position.set(x * cell + cell / 2, y * cell + cell / 2);
      const g = this.ghostSprites[i];
      const gyy = gy + cy - HIDDEN;
      g.texture = this.tex!.ghost[color];
      g.visible = gy !== a.y && gyy >= 0;
      g.position.set(x * cell + cell / 2, gyy * cell + cell / 2);
    });
  }

  sync() {
    if (this.dirty) {
      this.syncGrid();
      this.dirty = false;
    }
    this.syncActive();
    this.syncSide();
  }

  // ======================= eventos =======================

  private drain() {
    const s = this.session;
    if (!s || !s.events.length) return;
    const evs = s.events.splice(0);
    for (const e of evs) this.onEvent(e);
  }

  private onEvent(e: CascadeEvent) {
    const L = this.L;
    const cell = L.cell;
    switch (e.type) {
      case 'move':
        break;
      case 'rotate':
        audio.play('pick');
        break;
      case 'hold':
        audio.play('drop');
        haptics.vibrate(8);
        break;
      case 'lock': {
        this.dirty = true;
        audio.play('place');
        haptics.vibrate(e.drop > 0 ? 16 : 10);
        const amp = e.drop > 0 ? Math.min(cell * 0.35, 2 + e.drop * 0.6) : 1.5;
        this.grid.y = L.wy + amp;
        this.view.tweens.to(this.grid, { y: L.wy }, 160, { ease: ease.outBack });
        if (e.drop > 1 && this.tex) {
          for (const [x, y] of e.cells) {
            if (y < HIDDEN) continue;
            this.particles.burst(L.wx + x * cell + cell / 2, L.wy + (y - HIDDEN) * cell + cell * 0.85, 1, this.tex.particle[e.color], { ...this.skin.particles, speed: [0.6, 1.5], life: [0.25, 0.4], gravity: 2 }, cell, 1, 0.1);
          }
        }
        break;
      }
      case 'clear':
        this.animateClear(e);
        break;
      case 'collapse':
        this.hiddenRows.clear();
        this.dirty = true;
        break;
      case 'levelup':
        this.view.popText(t('cascade.level', { n: e.level }), L.wx + (COLS * cell) / 2, L.wy + cell * 5, cell * 0.9, this.skin.ui.good, { big: true, dur: 1300, delay: 250 });
        this.view.tweens.delay(250, () => audio.play('unlock'));
        break;
      case 'spawn':
      case 'end':
        break;
    }
  }

  private getFx(): Sprite {
    let s = this.fxPool.find((f) => !f.visible);
    if (!s) {
      s = new Sprite();
      s.anchor.set(0.5);
      this.fx.addChild(s);
      this.fxPool.push(s);
    }
    this.view.tweens.kill(s);
    s.visible = true;
    s.alpha = 1;
    s.scale.set(1);
    s.rotation = 0;
    s.tint = 0xffffff;
    s.blendMode = 'normal';
    return s;
  }

  private animateClear(e: Extract<CascadeEvent, { type: 'clear' }>) {
    const tex = this.tex;
    if (!tex) return;
    const L = this.L;
    const cell = L.cell;
    const tw = this.view.tweens;
    const intensity = e.lines + Math.max(0, e.combo - 1) * 0.6;
    for (const y of e.rows) this.hiddenRows.add(y);
    this.dirty = true;
    for (const c of e.cells) {
      const vy = c.y - HIDDEN;
      if (vy < 0) continue;
      const px = c.x * cell + cell / 2;
      const py = vy * cell + cell / 2;
      const delay = Math.abs(c.x - (COLS - 1) / 2) * 18;
      const s = this.getFx();
      s.texture = tex.block[c.color];
      s.position.set(px, py);
      const fl = this.getFx();
      fl.texture = tex.flash;
      fl.tint = this.skin.flash;
      fl.blendMode = 'add';
      fl.position.set(px, py);
      fl.alpha = 0;
      const pw = this.skin.explosion?.power ?? 1;
      fl.scale.set(1.5 * pw);
      tw.to(fl, { alpha: 1 }, 60, { delay, onComplete: () => tw.to(fl, { alpha: 0, scale: 2.6 * pw }, 300, { onComplete: () => (fl.visible = false) }) });
      tw.to(s, { scale: 1.35 }, 80, {
        delay,
        onComplete: () => {
          const n = Math.round((this.skin.particles.perCell * 1.5 + Math.min(5, Math.floor(intensity * 1.2))) * pw);
          this.particles.burst(L.wx + px, L.wy + py, n, tex.particle[c.color], this.skin.particles, cell, (1.3 + Math.min(0.8, intensity * 0.1)) * Math.sqrt(pw));
          this.particles.burst(L.wx + px, L.wy + py, Math.round(2 * pw), tex.particle[c.color], { ...this.skin.particles, blend: 'add', speed: [4, 8], life: [0.35, 0.6], size: [0.12, 0.26], gravity: this.skin.particles.gravity * 0.4, shrink: true }, cell, 1, 0.2);
          tw.to(s, { scale: 0, alpha: 0 }, 220, { ease: ease.inCubic, onComplete: () => (s.visible = false) });
        },
      });
    }
    for (const y of e.rows) {
      const vy = y - HIDDEN;
      if (vy < 0) continue;
      const b = this.getFx();
      b.texture = tex.beam;
      b.tint = this.skin.flash;
      b.blendMode = 'add';
      const len = COLS * cell + cell;
      b.position.set((COLS * cell) / 2, vy * cell + cell / 2);
      b.scale.set((len / 64) * 0.2, (cell * 0.9) / 32);
      tw.to(b, { scaleX: len / 64 }, 140);
      tw.to(b, { scaleY: (cell * 2.2) / 32, alpha: 0 }, 380, { delay: 100, ease: ease.outQuad, onComplete: () => (b.visible = false) });
    }
    audio.play('clear', { lines: e.lines, combo: e.combo });
    if (e.combo >= 2) tw.delay(110, () => audio.play('combo', { combo: e.combo }));
    haptics.vibrate(e.lines >= 4 || e.combo >= 3 ? [25, 40, 35] : 22);
    if (e.lines >= 2 || e.perfect) this.shake(Math.min(20, (3 + intensity * 3) * (this.skin.explosion?.power ?? 1)));

    const midX = L.wx + (COLS * cell) / 2;
    const rowY = L.wy + (e.rows[e.rows.length - 1] - HIDDEN) * cell;
    this.view.popText(`+${e.points}`, midX, rowY, cell * 0.62, this.skin.ui.text, { rise: cell * 1.4, dur: 900, delay: 120 });
    const textY = L.wy + ROWS * cell * 0.32;
    if (e.praise != null) {
      const label = e.lines >= 4 && !e.perfect ? t('cascade.quad') : t(`praise.${e.praise}` as never);
      this.view.popText(label, midX, textY, cell * (e.praise >= 3 ? 1.0 : 0.85), this.skin.ui.accent, { big: true, dur: 1200, delay: 80 });
      audio.play('praise', { level: e.praise });
    }
    if (e.backToBack) this.view.popText(t('cascade.b2b'), midX, textY - cell * 1.1, cell * 0.5, this.skin.ui.accent2, { big: true, dur: 1100, delay: 140 });
    if (e.combo >= 2) this.view.popText(t('fx.combo', { n: e.combo }), midX, textY + cell * 1.05, cell * 0.6, this.skin.ui.accent2, { big: true, dur: 1050, delay: 170 });
  }

  private shake(amp: number) {
    this.shakeAmp = amp;
    this.shakeT = 280;
  }

  /** Fin: el pozo se apaga fila a fila desde abajo. */
  async animateGameOver(): Promise<void> {
    audio.play('gameover');
    haptics.vibrate([40, 60, 80]);
    this.shake(6);
    this.syncActive();
    const s = this.session;
    const tw = this.view.tweens;
    if (s && this.tex) {
      for (let y = ROWS - 1; y >= 0; y--) {
        tw.delay((ROWS - 1 - y) * 35, () => {
          for (let x = 0; x < COLS; x++) {
            const sp = this.blocks[y * COLS + x];
            if (!sp.visible || !this.tex) continue;
            sp.texture = this.tex.block[STONE_COLOR];
            sp.scale.set(1.12);
            tw.to(sp, { scale: 1, alpha: 0.55 }, 240);
          }
        });
      }
    }
    await tw.wait(ROWS * 35 + 400);
  }

  // ======================= gestos =======================

  private local(e: PointerEvent) {
    const r = this.view.app.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private onDown(e: PointerEvent) {
    if (!this.root.visible || !this.input || this.pointer || !this.session?.running && !this.session?.clearing) return;
    const { x, y } = this.local(e);
    const L = this.L;
    // toque en la reserva
    if (x >= L.sx && x <= L.sx + L.side && y >= L.wy && y <= L.wy + L.cell * 3.4) {
      this.input.hold();
      return;
    }
    if (x < L.wx - L.cell || x > L.wx + COLS * L.cell + L.cell || y < L.wy - L.cell || y > L.wy + ROWS * L.cell + L.cell) return;
    e.preventDefault();
    this.pointer = { id: e.pointerId, x0: x, y0: y, t0: performance.now(), stepX: x, moved: false, soft: false };
  }

  private onMove(e: PointerEvent) {
    const p = this.pointer;
    if (!p || e.pointerId !== p.id || !this.input) return;
    const { x, y } = this.local(e);
    const step = this.L.cell * 0.9;
    while (x - p.stepX >= step) {
      this.input.move(1);
      p.stepX += step;
      p.moved = true;
    }
    while (p.stepX - x >= step) {
      this.input.move(-1);
      p.stepX -= step;
      p.moved = true;
    }
    const dy = y - p.y0;
    const soft = dy > this.L.cell * 1.2 && Math.abs(dy) > Math.abs(x - p.x0);
    if (soft !== p.soft) {
      p.soft = soft;
      this.input.softDrop(soft);
      if (soft) p.moved = true;
    }
  }

  private onUp(e: PointerEvent) {
    const p = this.pointer;
    if (!p || e.pointerId !== p.id || !this.input) return;
    this.pointer = null;
    const { x, y } = this.local(e);
    const dt = performance.now() - p.t0;
    const dy = y - p.y0;
    if (p.soft) this.input.softDrop(false);
    if (e.type === 'pointercancel') return;
    // deslizamiento rápido hacia abajo = caída instantánea
    if (dy > this.L.cell * 2 && dt < 260 && dy > Math.abs(x - p.x0) * 1.5) {
      this.input.hardDrop();
      return;
    }
    if (!p.moved && Math.hypot(x - p.x0, dy) < this.L.cell * 0.5) this.input.rotate(x < this.L.wx + (COLS * this.L.cell) / 4 ? -1 : 1);
  }

  // ======================= bucle =======================

  private tick(dtMs: number) {
    if (!this.root.visible) return;
    const dt = Math.min(dtMs, 50);
    this.drain();
    this.sync();
    this.particles.update(dt / 1000);
    if (this.shakeT > 0) {
      this.shakeT -= dt;
      const k = Math.max(0, this.shakeT / 280);
      const a = this.shakeAmp * k * k;
      this.root.position.set((Math.random() - 0.5) * 2 * a, (Math.random() - 0.5) * 2 * a);
      if (this.shakeT <= 0) this.root.position.set(0, 0);
    }
  }
}
