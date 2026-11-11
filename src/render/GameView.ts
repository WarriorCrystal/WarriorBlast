import { Application, Container, Sprite, Text, TextStyle, Texture } from 'pixi.js';
import { audio, haptics } from '../audio/audio';
import { MARK_GEM, MARK_TARGET, SIZE, STONE_COLOR } from '../core/board';
import type { Piece } from '../core/pieces';
import type { GameSession, MoveResult } from '../core/session';
import { t } from '../i18n';
import type { SkinDef } from '../skins/types';
import { Ambient, Particles } from './particles';
import { SkinTextures } from './textures';
import { Tweens, ease } from './tween';

export interface ViewHost {
  tryPlace(slot: number, x: number, y: number): MoveResult | null;
  onPick?(slot: number): void;
}

interface Layout {
  W: number;
  H: number;
  cell: number;
  size: number;
  bx: number;
  by: number;
  trayY: number;
  trayH: number;
  slotW: number;
  trayScale: number;
}

interface Drag {
  slot: number;
  pointerId: number;
  piece: Container;
  touch: boolean;
  gx: number;
  gy: number;
  valid: boolean;
  px: number;
  py: number;
}

const SYSTEM_FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export class GameView {
  readonly app: Application;
  readonly tweens = new Tweens();
  private particles = new Particles();
  private ambient = new Ambient();
  private world = new Container();
  private bg = new Sprite();
  private boardLayer = new Container();
  private boardSprite = new Sprite();
  private blocks: Sprite[] = [];
  private marks: Sprite[] = [];
  private ghosts: Sprite[] = [];
  private lineGlows: Sprite[] = [];
  private fxLayer = new Container();
  private fxPool: Sprite[] = [];
  private trayLayer = new Container();
  private trayPieces: Array<Container | null> = [null, null, null];
  private dragLayer = new Container();
  private textLayer = new Container();
  private hintLayer = new Container();
  private hintToken = 0;

  private skin!: SkinDef;
  private tex!: SkinTextures;
  private L!: Layout;
  private insets = { top: 90, bottom: 16 };
  private session: GameSession | null = null;
  private host: ViewHost | null = null;
  private drag: Drag | null = null;
  private hiCells: number[] = [];
  private shakeT = 0;
  private shakeDur = 0;
  private shakeAmp = 0;
  private time = 0;
  inputEnabled = true;
  private boardShown = false;

  constructor(app: Application) {
    this.app = app;
    const stage = app.stage;
    stage.addChild(this.bg, this.ambient.layer, this.world);
    this.world.addChild(this.boardLayer, this.trayLayer, this.particles.layer, this.dragLayer, this.textLayer, this.hintLayer);
    this.boardLayer.addChild(this.boardSprite);
    const blockLayer = new Container();
    const markLayer = new Container();
    const ghostLayer = new Container();
    const glowLayer = new Container();
    this.boardLayer.addChild(glowLayer, blockLayer, markLayer, ghostLayer, this.fxLayer);
    for (let i = 0; i < SIZE * SIZE; i++) {
      const b = new Sprite();
      b.anchor.set(0.5);
      b.visible = false;
      blockLayer.addChild(b);
      this.blocks.push(b);
      const m = new Sprite();
      m.anchor.set(0.5);
      m.visible = false;
      markLayer.addChild(m);
      this.marks.push(m);
    }
    for (let i = 0; i < 9; i++) {
      const g = new Sprite();
      g.anchor.set(0.5);
      g.visible = false;
      ghostLayer.addChild(g);
      this.ghosts.push(g);
    }
    for (let i = 0; i < 16; i++) {
      const g = new Sprite();
      g.anchor.set(0.5);
      g.visible = false;
      g.blendMode = 'add';
      glowLayer.addChild(g);
      this.lineGlows.push(g);
    }
    this.boardLayer.visible = false;
    this.trayLayer.visible = false;

    app.ticker.add((tk) => this.tick(tk.deltaMS));
    const canvas = app.canvas;
    canvas.addEventListener('pointerdown', (e) => this.onDown(e));
    window.addEventListener('pointermove', (e) => this.onMove(e), { passive: true });
    window.addEventListener('pointerup', (e) => this.onUp(e));
    window.addEventListener('pointercancel', (e) => this.onUp(e, true));
  }

  // ======================= configuración =======================

  setInsets(top: number, bottom: number) {
    this.insets = { top, bottom };
  }

  setSkin(skin: SkinDef) {
    this.skin = skin;
    this.relayout(true);
  }

  /** Recalcula tamaños; regenera texturas si cambian la celda o la skin. */
  relayout(force = false) {
    const W = this.app.screen.width;
    const H = this.app.screen.height;
    const availH = H - this.insets.top - this.insets.bottom;
    let size = Math.min(W - 26, 620, availH / 1.5);
    const cell = Math.max(16, Math.floor(size / 8));
    size = cell * 8;
    const trayH = Math.max(cell * 2.9, size * 0.36);
    const total = size + cell * 0.7 + trayH;
    const by = Math.round(this.insets.top + Math.max(0, (availH - total) * 0.22));
    const bx = Math.round((W - size) / 2);
    const slotW = Math.min(W - 8, size * 1.16) / 3;
    const trayScale = Math.min(0.66, (slotW * 0.94) / (5 * cell), (trayH * 0.9) / (5 * cell));
    const prev = this.L;
    this.L = { W, H, cell, size, bx, by, trayY: by + size + cell * 0.7 + trayH / 2, trayH, slotW, trayScale };

    const res = this.app.renderer.resolution;
    if (force || !this.tex || this.tex.cell !== cell || this.tex.skin !== this.skin || this.tex.res !== res) {
      if (this.tex) this.releaseTextures();
      this.tex?.destroy();
      this.tex = new SkinTextures(this.skin, cell, res);
      this.fxPool.forEach((s) => (s.texture = this.tex.flash));
    }
    if (force || !prev || prev.W !== W || prev.H !== H || prev.bx !== bx || prev.by !== by || this.tex.background === undefined) {
      this.tex.buildBackground(W, H);
      this.bg.texture = this.tex.background;
      this.bg.width = W;
      this.bg.height = H;
      this.ambient.set(this.tex.ambient, this.skin.ambient, W, H);
    }
    const pad = this.tex.buildBoard(bx, by, size);
    this.boardSprite.texture = this.tex.board;
    this.boardSprite.position.set(-pad, -pad);
    this.boardLayer.position.set(bx, by);

    for (let i = 0; i < SIZE * SIZE; i++) {
      const x = (i % SIZE) * cell + cell / 2;
      const y = Math.floor(i / SIZE) * cell + cell / 2;
      this.blocks[i].position.set(x, y);
      this.marks[i].position.set(x, y);
    }
    this.syncBoard();
    this.syncTray(false);
  }

  /** Quita referencias a texturas que se van a destruir (evita dibujar texturas liberadas). */
  private releaseTextures() {
    this.particles.clear();
    this.particles.layer.children.forEach((c) => ((c as Sprite).texture = Texture.EMPTY));
    for (const s of [...this.blocks, ...this.marks, ...this.ghosts, ...this.lineGlows, ...this.fxPool]) {
      this.tweens.kill(s);
      s.texture = Texture.EMPTY;
      s.visible = false;
    }
    this.cancelDrag();
    this.clearHint();
    for (const c of this.trayPieces) if (c) {
      this.tweens.kill(c);
      c.destroy({ children: true });
    }
    this.trayPieces = [null, null, null];
    this.ambient.set(undefined, undefined, 0, 0);
    this.bg.texture = Texture.EMPTY;
    this.boardSprite.texture = Texture.EMPTY;
  }

  /** Muestra u oculta tablero+bandeja (en los menús solo se ve el fondo animado). */
  showBoard(on: boolean) {
    this.boardShown = on;
    this.boardLayer.visible = on;
    this.trayLayer.visible = on;
    if (!on) {
      this.cancelDrag();
      this.clearHint();
      this.textLayer.removeChildren().forEach((c) => c.destroy());
      this.particles.clear();
    }
  }

  attach(session: GameSession | null, host: ViewHost | null) {
    this.cancelDrag();
    this.session = session;
    this.host = host;
    this.clearHint();
    this.textLayer.removeChildren().forEach((c) => c.destroy());
    this.fxLayer.children.forEach((c) => (c.visible = false));
    this.syncBoard();
    this.syncTray(!!session);
    if (session) this.introBoard();
  }

  get layout() {
    return this.L;
  }

  // ======================= sincronización =======================

  private cellTex(color: number) {
    return this.tex.block[Math.min(color, STONE_COLOR)];
  }

  syncBoard() {
    const b = this.session?.board;
    for (let i = 0; i < SIZE * SIZE; i++) {
      const s = this.blocks[i];
      const c = b ? b.cells[i] : 0;
      s.visible = c > 0;
      s.alpha = 1;
      s.scale.set(1);
      if (c) s.texture = this.cellTex(c);
      const m = this.marks[i];
      const mk = b ? b.marks[i] : 0;
      m.visible = c > 0 && mk > 0;
      if (mk === MARK_GEM) m.texture = this.tex.gem;
      else if (mk === MARK_TARGET) m.texture = this.tex.target;
      m.scale.set(1);
      m.alpha = 1;
    }
    this.hiCells = [];
  }

  private buildPiece(p: Piece, ghost = false): Container {
    const c = new Container();
    const cell = this.L.cell;
    p.shape.cells.forEach(([x, y], i) => {
      const s = new Sprite(ghost ? this.tex.ghost[p.color] : this.tex.block[p.color]);
      s.anchor.set(0.5);
      s.position.set(x * cell + cell / 2, y * cell + cell / 2);
      c.addChild(s);
      if (p.gems.includes(i)) {
        const g = new Sprite(this.tex.gem);
        g.anchor.set(0.5);
        g.position.copyFrom(s.position);
        c.addChild(g);
      }
    });
    c.pivot.set((p.shape.w * cell) / 2, (p.shape.h * cell) / 2);
    return c;
  }

  /** Escala de una pieza en la bandeja: las pequeñas se ven algo más grandes. */
  private pieceScale(p: Piece) {
    const L = this.L;
    const fit = Math.min((L.slotW * 0.92) / (p.shape.w * L.cell), (L.trayH * 0.88) / (p.shape.h * L.cell));
    return Math.min(0.68, Math.max(L.trayScale, fit * 0.78));
  }

  private slotPos(i: number) {
    return { x: this.L.W / 2 + (i - 1) * this.L.slotW, y: this.L.trayY };
  }

  syncTray(animate: boolean) {
    for (const c of this.trayPieces) if (c) {
      this.tweens.kill(c);
      c.destroy({ children: true });
    }
    this.trayPieces = [null, null, null];
    const s = this.session;
    if (!s) return;
    s.tray.forEach((p, i) => {
      if (!p) return;
      if (this.drag?.slot === i) return;
      const c = this.buildPiece(p);
      const pos = this.slotPos(i);
      c.position.set(pos.x, pos.y);
      const sc = this.pieceScale(p);
      c.scale.set(sc);
      this.trayLayer.addChild(c);
      this.trayPieces[i] = c;
      if (animate) {
        c.scale.set(0);
        c.alpha = 0;
        this.tweens.to(c, { scale: sc, alpha: 1 }, 380, { delay: 60 + i * 80, ease: ease.outBack });
        c.y += this.L.cell * 0.6;
        this.tweens.to(c, { y: pos.y }, 380, { delay: 60 + i * 80, ease: ease.outCubic });
      }
    });
    this.updateTrayFit();
  }

  /** Atenúa las piezas que no caben en ningún sitio. */
  updateTrayFit() {
    const s = this.session;
    if (!s) return;
    this.trayPieces.forEach((c, i) => {
      const p = s.tray[i];
      if (!c || !p) return;
      const fits = s.board.fitsAnywhere(p.shape);
      this.tweens.to(c, { alpha: fits ? 1 : 0.32 }, 200, { delay: 120 });
    });
  }

  // ======================= entrada =======================

  private toLocal(e: PointerEvent) {
    const r = this.app.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private onDown(e: PointerEvent) {
    audio.unlock();
    if (!this.inputEnabled || !this.session || this.session.ended || this.drag || !this.boardShown) return;
    const { x, y } = this.toLocal(e);
    const L = this.L;
    if (y < L.trayY - L.trayH / 2 - L.cell * 0.4 || y > L.trayY + L.trayH / 2 + L.cell * 1.2) return;
    let slot = -1;
    let best = Infinity;
    for (let i = 0; i < 3; i++) {
      if (!this.session.tray[i] || !this.trayPieces[i]) continue;
      const sp = this.slotPos(i);
      const d = Math.abs(sp.x - x);
      if (d < L.slotW * 0.62 && d < best) {
        best = d;
        slot = i;
      }
    }
    if (slot < 0) return;
    e.preventDefault();
    const piece = this.trayPieces[slot]!;
    this.trayPieces[slot] = null;
    this.tweens.kill(piece);
    piece.alpha = 1;
    this.dragLayer.addChild(piece);
    const touch = e.pointerType !== 'mouse';
    this.drag = { slot, pointerId: e.pointerId, piece, touch, gx: -99, gy: -99, valid: false, px: x, py: y };
    this.tweens.to(piece, { scale: 1 }, 140, { ease: ease.outBack });
    this.positionDrag(x, y, true);
    this.clearHint();
    audio.play('pick');
    haptics.vibrate(8);
    this.host?.onPick?.(slot);
  }

  private onMove(e: PointerEvent) {
    const d = this.drag;
    if (!d || e.pointerId !== d.pointerId) return;
    const { x, y } = this.toLocal(e);
    this.positionDrag(x, y, false);
  }

  private positionDrag(x: number, y: number, instant: boolean) {
    const d = this.drag!;
    const p = this.session!.tray[d.slot]!;
    const L = this.L;
    const h = p.shape.h * L.cell;
    const w = p.shape.w * L.cell;
    const lift = d.touch ? L.cell * 1.25 + h / 2 : 0;
    const tx = x;
    const ty = y - lift;
    d.px = x;
    d.py = y;
    if (instant) this.tweens.to(d.piece, { x: tx, y: ty }, 90, { ease: ease.outQuad });
    else {
      this.tweens.kill(d.piece);
      d.piece.scale.set(1);
      d.piece.position.set(tx, ty);
    }
    const gx = Math.round((tx - w / 2 - L.bx) / L.cell);
    const gy = Math.round((ty - h / 2 - L.by) / L.cell);
    if (gx !== d.gx || gy !== d.gy) {
      d.gx = gx;
      d.gy = gy;
      d.valid = this.session!.canPlace(d.slot, gx, gy);
      this.updateGhost();
    }
  }

  private updateGhost() {
    const d = this.drag;
    this.ghosts.forEach((g) => (g.visible = false));
    this.lineGlows.forEach((g) => {
      g.visible = false;
      this.tweens.kill(g);
    });
    // restaurar celdas resaltadas
    const b = this.session?.board;
    for (const k of this.hiCells) {
      const s = this.blocks[k];
      this.tweens.kill(s);
      s.scale.set(1);
      if (b && b.cells[k]) s.texture = this.cellTex(b.cells[k]);
    }
    this.hiCells = [];
    if (!d || !d.valid || !b) return;
    const p = this.session!.tray[d.slot]!;
    const cell = this.L.cell;
    const lines = b.linesIfPlaced(p.shape, d.gx, d.gy);
    const completes = lines.rows.length + lines.cols.length > 0;
    p.shape.cells.forEach(([cx, cy], i) => {
      const g = this.ghosts[i];
      g.texture = completes ? this.tex.block[p.color] : this.tex.ghost[p.color];
      g.alpha = completes ? 0.8 : 1;
      g.position.set((d.gx + cx) * cell + cell / 2, (d.gy + cy) * cell + cell / 2);
      g.visible = true;
    });
    if (!completes) return;
    const set = new Set<number>();
    for (const r of lines.rows) for (let x = 0; x < SIZE; x++) set.add(r * SIZE + x);
    for (const c of lines.cols) for (let y = 0; y < SIZE; y++) set.add(y * SIZE + c);
    for (const k of set) {
      if (!b.cells[k]) continue;
      const s = this.blocks[k];
      s.texture = this.tex.block[p.color];
      this.hiCells.push(k);
    }
    // brillo de línea pulsante
    let gi = 0;
    const glow = (horizontal: boolean, idx: number) => {
      const g = this.lineGlows[gi++];
      if (!g) return;
      g.texture = this.tex.beam;
      g.tint = this.skin.flash;
      g.rotation = horizontal ? 0 : Math.PI / 2;
      // escala en ejes locales (la rotación convierte el haz horizontal en vertical)
      g.scale.set((this.L.size + cell * 0.4) / 64, (cell * 1.5) / 32);
      const pos = idx * cell + cell / 2;
      g.position.set(horizontal ? this.L.size / 2 : pos, horizontal ? pos : this.L.size / 2);
      g.alpha = 0.25;
      g.visible = true;
      const pulse = () => {
        if (!g.visible) return;
        this.tweens.to(g, { alpha: 0.5 }, 380, { ease: ease.inOutCubic, onComplete: () => g.visible && this.tweens.to(g, { alpha: 0.2 }, 380, { ease: ease.inOutCubic, onComplete: pulse }) });
      };
      pulse();
    };
    lines.rows.forEach((r) => glow(true, r));
    lines.cols.forEach((c) => glow(false, c));
  }

  private onUp(e: PointerEvent, cancel = false) {
    const d = this.drag;
    if (!d || e.pointerId !== d.pointerId) return;
    if (!cancel) {
      // usa la posición final aunque no haya llegado ningún pointermove
      const { x, y } = this.toLocal(e);
      if (x !== d.px || y !== d.py) this.positionDrag(x, y, false);
    }
    this.drag = null;
    const valid = !cancel && d.valid && this.session && !this.session.ended;
    let res: MoveResult | null = null;
    if (valid) res = this.host?.tryPlace(d.slot, d.gx, d.gy) ?? null;
    this.updateGhost();
    if (res) {
      d.piece.destroy({ children: true });
      this.animateMove(res);
    } else {
      this.returnPiece(d);
    }
  }

  private returnPiece(d: Drag) {
    const pos = this.slotPos(d.slot);
    const piece = d.piece;
    this.tweens.kill(piece);
    audio.play('drop');
    const p = this.session?.tray[d.slot];
    this.tweens.to(piece, { x: pos.x, y: pos.y, scale: p ? this.pieceScale(p) : this.L.trayScale }, 220, {
      ease: ease.outBack,
      onComplete: () => {
        if (piece.destroyed) return;
        if (this.session?.tray[d.slot] && !this.trayPieces[d.slot]) {
          this.trayLayer.addChild(piece);
          this.trayPieces[d.slot] = piece;
          this.updateTrayFit();
        } else piece.destroy({ children: true });
      },
    });
  }

  cancelDrag() {
    if (!this.drag) return;
    const d = this.drag;
    this.drag = null;
    this.updateGhost();
    d.piece.destroy({ children: true });
    this.syncTray(false);
  }

  // ======================= animaciones =======================

  private cellCenter(x: number, y: number) {
    const c = this.L.cell;
    return { x: this.L.bx + x * c + c / 2, y: this.L.by + y * c + c / 2 };
  }

  private getFx(): Sprite {
    let s = this.fxPool.find((f) => !f.visible);
    if (!s) {
      s = new Sprite(this.tex.flash);
      s.anchor.set(0.5);
      this.fxLayer.addChild(s);
      this.fxPool.push(s);
    }
    this.tweens.kill(s);
    s.visible = true;
    s.alpha = 1;
    s.scale.set(1);
    s.rotation = 0;
    s.tint = 0xffffff;
    s.blendMode = 'normal';
    return s;
  }

  private releaseFx(s: Sprite) {
    s.visible = false;
  }

  animateMove(r: MoveResult) {
    const cell = this.L.cell;
    const b = this.session!.board;
    const clearedSet = new Set(r.cleared.map((c) => c.y * SIZE + c.x));

    // 1) colocar: las celdas aparecen con un "pop"
    let cx = 0;
    let cy = 0;
    r.placed.forEach((k, i) => {
      const x = k % SIZE;
      const y = Math.floor(k / SIZE);
      cx += x;
      cy += y;
      if (clearedSet.has(k)) return;
      const s = this.blocks[k];
      s.texture = this.cellTex(b.cells[k]);
      s.visible = true;
      s.scale.set(1.28);
      this.tweens.to(s, { scale: 1 }, 260, { delay: i * 12, ease: ease.outBack });
      const m = this.marks[k];
      m.visible = b.marks[k] > 0;
      if (m.visible) m.texture = b.marks[k] === MARK_GEM ? this.tex.gem : this.tex.target;
    });
    cx /= r.placed.length;
    cy /= r.placed.length;
    audio.play('place');
    haptics.vibrate(12);
    for (const k of r.placed) {
      if (clearedSet.has(k)) continue;
      const p = this.cellCenter(k % SIZE, Math.floor(k / SIZE));
      this.particles.burst(p.x, p.y + cell * 0.35, 1, this.tex.particle[r.piece.color], { ...this.skin.particles, speed: [0.6, 1.5], life: [0.25, 0.4], gravity: 2 }, cell, 1, 0.1);
    }
    this.kick(2.5, 120);

    // 2) limpiar
    if (r.lines > 0) this.animateClear(r, cx, cy);
    else this.updateTrayFit();

    // 3) textos
    if (r.lines > 0) {
      const cc = r.cleared.reduce((a, c) => ({ x: a.x + c.x, y: a.y + c.y }), { x: 0, y: 0 });
      const pc = this.cellCenter(cc.x / r.cleared.length, cc.y / r.cleared.length);
      this.popText(`+${r.points}`, pc.x, pc.y, cell * 0.62, this.skin.ui.text, { rise: cell * 1.4, dur: 900, delay: 120 });
      const midY = this.L.by + this.L.size * 0.38;
      if (r.praise != null) {
        this.popText(t(`praise.${r.praise}` as never), this.L.W / 2, midY, cell * (r.praise >= 4 ? 1.05 : 0.9), this.skin.ui.accent, { big: true, dur: 1250, delay: 90 });
        audio.play('praise', { level: r.praise });
      }
      if (r.combo >= 2) {
        this.popText(t('fx.combo', { n: r.combo }), this.L.W / 2, midY + cell * (r.praise != null ? 1.05 : 0), cell * 0.62, this.skin.ui.accent2, { big: true, dur: 1100, delay: 170 });
      }
      if (r.timeBonusMs > 0) this.popText(t('fx.time', { n: (r.timeBonusMs / 1000).toFixed(1).replace('.0', '') }), this.L.W / 2, this.L.by - cell * 0.15, cell * 0.5, this.skin.ui.good, { rise: cell * 0.8, dur: 900, delay: 200 });
    }

    // 4) nueva bandeja / atasco
    if (r.refilled || r.stuckRefresh) {
      this.tweens.delay(r.lines > 0 ? 260 : 120, () => {
        if (this.session?.ended && !r.ended) return;
        this.syncTray(true);
        if (r.stuckRefresh) {
          audio.play('refresh');
          const msg = r.timePenaltyMs ? t('fx.penalty', { n: r.timePenaltyMs / 1000 }) : t('fx.refresh');
          this.popText(msg, this.L.W / 2, this.L.trayY - this.L.trayH / 2 - cell * 0.2, cell * 0.45, r.timePenaltyMs ? this.skin.ui.danger : this.skin.ui.textDim, { dur: 1400, rise: cell * 0.5 });
        }
      });
    }
  }

  private animateClear(r: MoveResult, ox: number, oy: number) {
    const cell = this.L.cell;
    const flashColor = this.skin.flash;
    const intensity = r.lines + Math.max(0, r.combo - 1) * 0.8;
    // ocultar bloques reales y sustituirlos por sprites de efecto
    r.cleared.forEach((c) => {
      const k = c.y * SIZE + c.x;
      this.blocks[k].visible = false;
      this.marks[k].visible = false;
      const p = { x: c.x * cell + cell / 2, y: c.y * cell + cell / 2 };
      const dist = Math.hypot(c.x - ox, c.y - oy);
      const delay = 40 + dist * 32;
      const s = this.getFx();
      s.texture = this.cellTex(c.color);
      s.position.set(p.x, p.y);
      const fl = this.getFx();
      fl.texture = this.tex.flash;
      fl.tint = flashColor;
      fl.blendMode = 'add';
      fl.position.set(p.x, p.y);
      fl.alpha = 0;
      this.tweens.to(fl, { alpha: 0.95 }, 70, {
        delay,
        ease: ease.outQuad,
        onComplete: () => this.tweens.to(fl, { alpha: 0, scale: 1.35 }, 260, { ease: ease.outCubic, onComplete: () => this.releaseFx(fl) }),
      });
      this.tweens.to(s, { scale: 1.18 }, 90, {
        delay,
        ease: ease.outQuad,
        onComplete: () => {
          const g = this.cellCenter(c.x, c.y);
          this.particles.burst(g.x, g.y, this.skin.particles.perCell + Math.min(4, Math.floor(intensity)), this.tex.particle[Math.min(c.color, 8)], this.skin.particles, cell, 1 + Math.min(0.8, intensity * 0.08));
          this.tweens.to(s, { scale: 0, alpha: 0, rotation: (Math.random() - 0.5) * 0.8 }, 240, { ease: ease.inCubic, onComplete: () => this.releaseFx(s) });
        },
      });
      if (c.mark === MARK_GEM) this.flyGem(p.x, p.y, delay);
      if (c.mark === MARK_TARGET) this.tweens.delay(delay, () => this.ringBurst(p.x, p.y, this.skin.ui.good));
    });
    // haces de luz por línea
    const beam = (horizontal: boolean, idx: number) => {
      const s = this.getFx();
      s.texture = this.tex.beam;
      s.tint = flashColor;
      s.blendMode = 'add';
      const len = this.L.size + cell * 1.2;
      const pos = idx * cell + cell / 2;
      s.position.set(horizontal ? this.L.size / 2 : pos, horizontal ? pos : this.L.size / 2);
      s.rotation = horizontal ? 0 : Math.PI / 2;
      s.scale.set((len / 64) * 0.2, (cell * 0.9) / 32);
      s.alpha = 1;
      this.tweens.to(s, { scaleX: len / 64 }, 160, { ease: ease.outCubic });
      this.tweens.to(s, { scaleY: (cell * 2.4) / 32, alpha: 0 }, 420, { delay: 120, ease: ease.outQuad, onComplete: () => this.releaseFx(s) });
    };
    r.rows.forEach((y) => beam(true, y));
    r.cols.forEach((x) => beam(false, x));

    audio.play('clear', { lines: r.lines, combo: r.combo });
    if (r.combo >= 2) this.tweens.delay(110, () => audio.play('combo', { combo: r.combo }));
    if (r.gems > 0) this.tweens.delay(200, () => audio.play('gem'));
    haptics.vibrate(r.lines >= 3 || r.combo >= 3 ? [25, 40, 35] : 22);
    if (intensity >= 2 || r.perfect) this.shake(Math.min(16, 3 + intensity * 2.4), 260 + intensity * 40);
    if (r.perfect) this.perfectFx();
    this.tweens.delay(450, () => this.updateTrayFit());
  }

  private flyGem(x: number, y: number, delay: number) {
    const s = this.getFx();
    s.texture = this.tex.gem;
    s.position.set(x, y);
    s.alpha = 1;
    this.tweens.to(s, { scale: 1.6 }, 160, { delay, ease: ease.outBack });
    this.tweens.to(s, { x: this.L.W / 2 - this.L.bx, y: -this.L.by + this.insets.top * 0.55, scale: 0.6, alpha: 0.2 }, 520, {
      delay: delay + 180,
      ease: ease.inCubic,
      onComplete: () => this.releaseFx(s),
    });
  }

  private ringBurst(x: number, y: number, color: string) {
    const s = this.getFx();
    s.texture = this.tex.ring;
    s.tint = color;
    s.blendMode = 'add';
    s.position.set(x, y);
    s.scale.set(0.2);
    this.tweens.to(s, { scale: (this.L.cell * 1.8) / 64, alpha: 0 }, 450, { ease: ease.outCubic, onComplete: () => this.releaseFx(s) });
  }

  private perfectFx() {
    const cell = this.L.cell;
    for (let i = 0; i < 4; i++) {
      this.tweens.delay(i * 110, () => {
        const s = this.getFx();
        s.texture = this.tex.ring;
        s.tint = this.skin.ui.accent;
        s.blendMode = 'add';
        s.position.set(this.L.size / 2, this.L.size / 2);
        s.scale.set(0.3);
        this.tweens.to(s, { scale: (this.L.size * 1.4) / 64, alpha: 0 }, 800, { ease: ease.outCubic, onComplete: () => this.releaseFx(s) });
        for (let k = 0; k < 7; k++) {
          const c = this.cellCenter(Math.random() * 8 - 0.5, Math.random() * 8 - 0.5);
          this.particles.burst(c.x, c.y, 4, this.tex.particle[1 + ((i + k) % 7)], this.skin.particles, cell, 1.4);
        }
      });
    }
  }

  /** Texto emergente (elogios, puntos, avisos). */
  popText(str: string, x: number, y: number, size: number, color: string, o: { big?: boolean; rise?: number; dur?: number; delay?: number } = {}) {
    const font = this.skin.ui.font ?? SYSTEM_FONT;
    const style = new TextStyle({
      fontFamily: font,
      fontSize: Math.round(size),
      fontWeight: '900',
      fill: color,
      align: 'center',
      stroke: { color: o.big ? '#0a0614' : '#000000', width: Math.max(3, size * (o.big ? 0.16 : 0.12)), join: 'round' },
      dropShadow: o.big ? { color, blur: size * 0.35, distance: 0, alpha: 0.85, angle: 0 } : { color: '#000000', blur: 4, distance: 2, alpha: 0.5, angle: Math.PI / 2 },
      letterSpacing: o.big ? 1 : 0,
    });
    const txt = new Text({ text: str, style });
    txt.anchor.set(0.5);
    txt.position.set(x, y);
    txt.alpha = 0;
    // no salir de pantalla
    const maxW = this.L.W - 24;
    this.textLayer.addChild(txt);
    const fit = txt.width > maxW ? maxW / txt.width : 1;
    const dur = o.dur ?? 1000;
    const delay = o.delay ?? 0;
    if (o.big) {
      txt.scale.set(0.2 * fit);
      this.tweens.to(txt, { alpha: 1 }, 120, { delay });
      this.tweens.to(txt, { scale: fit }, 520, { delay, ease: ease.outElastic });
      txt.rotation = (Math.random() - 0.5) * 0.12;
      this.tweens.to(txt, { y: y - size * 0.8, alpha: 0, scale: fit * 1.1 }, 360, {
        delay: delay + dur * 0.72,
        ease: ease.inQuad,
        onComplete: () => txt.destroy(),
      });
    } else {
      txt.scale.set(0.7 * fit);
      this.tweens.to(txt, { alpha: 1, scale: fit }, 160, { delay, ease: ease.outBack });
      this.tweens.to(txt, { y: y - (o.rise ?? size) }, dur, { delay, ease: ease.outCubic });
      this.tweens.to(txt, { alpha: 0 }, dur * 0.35, { delay: delay + dur * 0.65, onComplete: () => txt.destroy() });
    }
  }

  banner(str: string, color?: string) {
    this.popText(str, this.L.W / 2, this.L.by - this.L.cell * 0.2, this.L.cell * 0.62, color ?? this.skin.ui.good, { big: true, dur: 1500 });
  }

  /** Sacudida de pantalla. */
  shake(amp: number, dur: number) {
    if (amp >= this.shakeAmp * (this.shakeT / Math.max(1, this.shakeDur))) {
      this.shakeAmp = amp;
      this.shakeDur = dur;
      this.shakeT = dur;
    }
  }

  private kick(amp: number, dur: number) {
    this.boardLayer.y = this.L.by + amp;
    this.tweens.to(this.boardLayer, { y: this.L.by }, dur, { ease: ease.outBack });
  }

  /** Entrada del tablero al empezar partida. */
  private introBoard() {
    const b = this.session?.board;
    if (!b) return;
    for (let i = 0; i < SIZE * SIZE; i++) {
      const s = this.blocks[i];
      if (!s.visible) continue;
      const d = (Math.floor(i / SIZE) + (i % SIZE)) * 25;
      s.scale.set(0);
      this.tweens.to(s, { scale: 1 }, 320, { delay: 150 + d, ease: ease.outBack });
      const m = this.marks[i];
      if (m.visible) {
        m.scale.set(0);
        this.tweens.to(m, { scale: 1 }, 320, { delay: 250 + d, ease: ease.outBack });
      }
    }
    this.boardLayer.alpha = 0;
    this.tweens.to(this.boardLayer, { alpha: 1 }, 250);
  }

  /** Animación de fin: el tablero se apaga fila a fila. Resuelve al terminar. */
  async animateGameOver(): Promise<void> {
    this.cancelDrag();
    audio.play('gameover');
    haptics.vibrate([40, 60, 80]);
    this.shake(6, 300);
    const b = this.session!.board;
    for (let y = SIZE - 1; y >= 0; y--) {
      const row = SIZE - 1 - y;
      this.tweens.delay(row * 70, () => {
        for (let x = 0; x < SIZE; x++) {
          const k = y * SIZE + x;
          const s = this.blocks[k];
          if (!b.cells[k]) continue;
          s.texture = this.tex.block[STONE_COLOR];
          s.scale.set(1.15);
          this.tweens.to(s, { scale: 1, alpha: 0.55 }, 260, { ease: ease.outCubic });
        }
      });
    }
    this.trayPieces.forEach((c) => c && this.tweens.to(c, { alpha: 0.15 }, 400));
    await this.tweens.wait(SIZE * 70 + 450);
  }

  /** Celebración de victoria (Aventura). */
  async animateWin(): Promise<void> {
    audio.play('win');
    haptics.vibrate([20, 40, 20, 40, 60]);
    const b = this.session!.board;
    for (let i = 0; i < SIZE * SIZE; i++) {
      if (!b.cells[i]) continue;
      const s = this.blocks[i];
      const d = (Math.floor(i / SIZE) + (i % SIZE)) * 30;
      this.tweens.delay(d, () => {
        const c = this.cellCenter(i % SIZE, Math.floor(i / SIZE));
        this.particles.burst(c.x, c.y, 3, this.tex.particle[b.cells[i]], this.skin.particles, this.L.cell, 1.2);
        this.tweens.to(s, { scale: 0, alpha: 0 }, 260, { ease: ease.inBack });
      });
    }
    this.perfectFx();
    await this.tweens.wait(900);
  }

  // ======================= pistas (tutorial) =======================

  /** Muestra un "dedo" que arrastra desde la bandeja hasta la celda indicada. */
  hint(slot: number, gx: number, gy: number) {
    this.clearHint();
    const token = ++this.hintToken;
    const p = this.session?.tray[slot];
    if (!p) return;
    const cell = this.L.cell;
    const from = this.slotPos(slot);
    const to = { x: this.L.bx + (gx + p.shape.w / 2) * cell, y: this.L.by + (gy + p.shape.h / 2) * cell };
    const ghost = this.buildPiece(p, true);
    ghost.position.set(to.x, to.y);
    ghost.alpha = 0.0;
    const dot = new Sprite(this.tex.ring);
    dot.anchor.set(0.5);
    dot.scale.set((cell * 0.9) / 64);
    this.hintLayer.addChild(ghost, dot);
    const loop = () => {
      if (token !== this.hintToken) return;
      dot.position.set(from.x, from.y + cell * 0.2);
      dot.alpha = 0;
      this.tweens.to(dot, { alpha: 0.95 }, 250);
      this.tweens.to(ghost, { alpha: 0.75 }, 400, { delay: 500 });
      this.tweens.to(dot, { x: to.x, y: to.y + cell * 0.6 }, 900, { delay: 300, ease: ease.inOutCubic });
      this.tweens.to(dot, { alpha: 0 }, 300, { delay: 1300 });
      this.tweens.to(ghost, { alpha: 0.15 }, 300, { delay: 1400, onComplete: () => this.tweens.delay(300, loop) });
    };
    loop();
  }

  clearHint() {
    this.hintToken++;
    this.hintLayer.removeChildren().forEach((c) => {
      this.tweens.kill(c);
      c.destroy({ children: true });
    });
  }

  // ======================= bucle =======================

  private tick(dtMs: number) {
    const dt = Math.min(dtMs, 50);
    this.time += dt / 1000;
    this.tweens.update(dt);
    this.particles.update(dt / 1000);
    this.ambient.update(dt / 1000, this.time);
    if (this.shakeT > 0) {
      this.shakeT -= dt;
      const k = Math.max(0, this.shakeT / this.shakeDur);
      const a = this.shakeAmp * k * k;
      this.world.position.set((Math.random() - 0.5) * 2 * a, (Math.random() - 0.5) * 2 * a);
      if (this.shakeT <= 0) {
        this.world.position.set(0, 0);
        this.shakeAmp = 0;
      }
    }
  }
}
