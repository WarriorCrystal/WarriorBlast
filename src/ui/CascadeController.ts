import { audio } from '../audio/audio';
import { CascadeSession } from '../core/cascade';
import { fmt, t } from '../i18n';
import type { GameReward, Progress } from '../meta/progress';
import type { CascadeView } from '../render/CascadeView';
import type { GameView } from '../render/GameView';
import type { ControllerHooks } from './GameController';
import { countUp, h, icon } from './dom';

/** Retardo antes de la repetición automática y su intervalo (ms). */
const DAS_MS = 170;
const ARR_MS = 45;

/** Lee env(safe-area-inset-bottom) en px. */
function safeAreaBottom(): number {
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;left:0;bottom:0;width:0;height:0;visibility:hidden;padding-bottom:env(safe-area-inset-bottom,0px)';
  document.body.appendChild(el);
  const v = parseFloat(getComputedStyle(el).paddingBottom) || 0;
  el.remove();
  return v;
}

/** Modo Cascada: piezas que caen. Misma interfaz pública que GameController para App. */
export class CascadeController {
  session: CascadeSession | null = null;
  paused = false;
  readonly root: HTMLElement;
  private hud!: HTMLElement;
  private pad!: HTMLElement;
  private scoreEl!: HTMLElement;
  private subEl!: HTMLElement;
  private comboEl!: HTMLElement;
  private shownScore = 0;
  private shownSub = '';
  private bestAtStart = 0;
  private bannerShown = false;
  private ending = false;
  private raf = 0;
  private lastT = 0;
  private lastPieces = 0;
  private lastLines = 0;
  private lastPerfect = 0;
  /** Dirección horizontal mantenida (-1, 0, 1) y su temporizador de repetición. */
  private held: Array<-1 | 1> = [];
  private repeatT = 0;
  private repeating = false;
  private softSources = new Set<string>();

  constructor(
    private view: GameView,
    private cview: CascadeView,
    private progress: Progress,
    private hooks: ControllerHooks,
  ) {
    this.root = h('div.screen.game-screen.cascade-screen');
    window.addEventListener('keydown', (e) => this.onKey(e, true));
    window.addEventListener('keyup', (e) => this.onKey(e, false));
    window.addEventListener('blur', () => this.releaseAll());
  }

  start() {
    this.stopLoop();
    this.session = new CascadeSession((Date.now() ^ (Math.random() * 1e9)) >>> 0);
    this.paused = false;
    this.ending = false;
    this.bannerShown = false;
    this.shownScore = 0;
    this.shownSub = '';
    this.lastPieces = this.lastLines = this.lastPerfect = 0;
    this.releaseAll();
    this.bestAtStart = this.progress.d.best.cascade;
    this.buildHud();
    this.view.showBoard(false);
    this.updateInsets();
    this.cview.attach(this.session, {
      move: (dx) => this.act(() => this.session!.move(dx)),
      rotate: (d) => this.act(() => this.session!.rotate(d)),
      softDrop: (on) => this.setSoft('touch', on),
      hardDrop: () => this.act(() => this.session!.hardDrop()),
      hold: () => this.act(() => this.session!.holdPiece()),
    });
    audio.startMusic(1.05);
    audio.duck(false);
    this.startLoop();
  }

  restart() {
    this.start();
  }

  leave() {
    this.stopLoop();
    this.releaseAll();
    this.session = null;
    this.cview.attach(null, null);
  }

  pause() {
    if (!this.session || this.session.ended || this.paused) return;
    this.paused = true;
    this.releaseAll();
    audio.duck(true);
  }

  resume() {
    this.paused = false;
    this.lastT = performance.now();
    audio.duck(false);
  }

  updateInsets() {
    const r = this.hud?.getBoundingClientRect();
    // la ayuda de teclado (solo con ratón) va encima de los botones: el pozo empieza por encima de ella
    const keys = this.root.querySelector<HTMLElement>('.cascade-keys');
    const k = keys?.getBoundingClientRect();
    const p = k && k.height ? k : this.pad?.getBoundingClientRect();
    const top = r ? r.bottom + 10 : 100;
    const bottom = p && p.height ? window.innerHeight - p.top + 12 : safeAreaBottom() + 14;
    this.cview.setInsets(top, bottom);
    this.cview.relayout();
  }

  // ---------------- HUD y controles ----------------

  private buildHud() {
    this.root.innerHTML = '';
    const pauseBtn = h('button.icon-btn.hud-pause', { 'aria-label': t('pause.title'), onclick: () => this.hooks.onPause() }, icon('pause'));
    this.scoreEl = h('div.hud-score', '0');
    this.subEl = h('div.hud-sub');
    this.comboEl = h('div.combo-badge.hidden');
    this.hud = h(
      'div.hud',
      h('div.hud-row', pauseBtn, h('div.hud-center', h('div.hud-label', t('mode.cascade')), this.scoreEl, this.subEl), h('div.hud-right', this.comboEl)),
    );

    const btn = (ic: string, label: string, cls: string, down: () => void, up?: () => void) => {
      const b = h(`button.pad-btn.${cls}`, { 'aria-label': label }, icon(ic));
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        audio.unlock();
        b.setPointerCapture(e.pointerId);
        b.classList.add('on');
        down();
      });
      const release = () => {
        if (!b.classList.contains('on')) return;
        b.classList.remove('on');
        up?.();
      };
      b.addEventListener('pointerup', release);
      b.addEventListener('pointercancel', release);
      b.addEventListener('lostpointercapture', release);
      b.addEventListener('contextmenu', (e) => e.preventDefault());
      return b;
    };
    this.pad = h(
      'div.cascade-pad',
      btn('hold', t('cascade.hold'), 'p-hold', () => this.act(() => this.session!.holdPiece())),
      btn('left', t('cascade.left'), 'p-left', () => this.pressDir(-1), () => this.releaseDir(-1)),
      btn('right', t('cascade.right'), 'p-right', () => this.pressDir(1), () => this.releaseDir(1)),
      btn('down', t('cascade.soft'), 'p-soft', () => this.setSoft('pad', true), () => this.setSoft('pad', false)),
      btn('drop', t('cascade.drop'), 'p-drop', () => this.act(() => this.session!.hardDrop())),
      btn('rotate', t('cascade.rotate'), 'p-rot', () => this.act(() => this.session!.rotate(1))),
    );
    const keys = h('div.cascade-keys', t('cascade.keys'));
    this.root.append(this.hud, h('div.cascade-spacer'), keys, this.pad);
    this.refreshHud();
  }

  private refreshHud() {
    const s = this.session;
    if (!s) return;
    if (s.score !== this.shownScore) {
      countUp(this.scoreEl, this.shownScore, s.score, 350, fmt);
      if (s.score - this.shownScore >= 100) this.bump(this.scoreEl);
      this.shownScore = s.score;
    }
    const sub = `${t('cascade.level', { n: s.level })} · ${t('cascade.lines', { n: s.lines })}`;
    if (sub !== this.shownSub) {
      this.subEl.textContent = sub;
      this.shownSub = sub;
    }
    if (s.combo >= 2) {
      const txt = `x${s.combo}`;
      if (this.comboEl.textContent !== txt) {
        this.comboEl.innerHTML = '';
        this.comboEl.append(h('span.combo-x', txt));
        this.comboEl.classList.remove('hidden');
        this.comboEl.style.setProperty('--heat', String(Math.min(1, (s.combo - 2) / 8)));
        this.bump(this.comboEl);
      }
    } else if (!this.comboEl.classList.contains('hidden')) {
      this.comboEl.classList.add('hidden');
      this.comboEl.textContent = '';
    }
  }

  private bump(el: HTMLElement) {
    el.classList.remove('bump');
    void el.offsetWidth;
    el.classList.add('bump');
  }

  // ---------------- entrada ----------------

  private get canAct() {
    return !!this.session && !this.paused && !this.ending && !this.session.ended;
  }

  private act(fn: () => unknown) {
    if (this.canAct) fn();
  }

  private pressDir(d: -1 | 1) {
    this.held = this.held.filter((x) => x !== d);
    this.held.push(d);
    this.repeatT = 0;
    this.repeating = false;
    this.act(() => this.session!.move(d));
  }

  private releaseDir(d: -1 | 1) {
    this.held = this.held.filter((x) => x !== d);
    this.repeatT = 0;
    this.repeating = false;
  }

  private setSoft(src: string, on: boolean) {
    if (on) this.softSources.add(src);
    else this.softSources.delete(src);
    this.session?.setSoftDrop(this.softSources.size > 0 && this.canAct);
  }

  private releaseAll() {
    this.held = [];
    this.softSources.clear();
    this.session?.setSoftDrop(false);
    this.root.querySelectorAll('.pad-btn.on').forEach((b) => b.classList.remove('on'));
  }

  private onKey(e: KeyboardEvent, down: boolean) {
    if (!this.session || !this.root.isConnected) return;
    const k = e.code;
    const handled = ['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', 'Space', 'KeyX', 'KeyZ', 'KeyC', 'KeyA', 'KeyD', 'KeyS', 'KeyW', 'ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight', 'Escape', 'KeyP'];
    if (!handled.includes(k)) return;
    // no robar teclas a los modales (pausa / fin de partida)
    if (document.querySelector('.modal')) return;
    e.preventDefault();
    if (k === 'Escape' || k === 'KeyP') {
      if (down && !e.repeat && !this.session.ended) this.hooks.onPause();
      return;
    }
    audio.unlock();
    if (k === 'ArrowLeft' || k === 'KeyA' || k === 'ArrowRight' || k === 'KeyD') {
      const d = k === 'ArrowLeft' || k === 'KeyA' ? -1 : 1;
      if (down && !e.repeat) this.pressDir(d);
      else if (!down) this.releaseDir(d);
      return;
    }
    if (k === 'ArrowDown' || k === 'KeyS') {
      if (!e.repeat) this.setSoft('key', down);
      return;
    }
    if (!down || e.repeat) return;
    if (k === 'ArrowUp' || k === 'KeyX' || k === 'KeyW') this.act(() => this.session!.rotate(1));
    else if (k === 'KeyZ' || k === 'ControlLeft' || k === 'ControlRight') this.act(() => this.session!.rotate(-1));
    else if (k === 'Space') this.act(() => this.session!.hardDrop());
    else if (k === 'KeyC' || k === 'ShiftLeft' || k === 'ShiftRight') this.act(() => this.session!.holdPiece());
  }

  // ---------------- bucle ----------------

  private startLoop() {
    this.lastT = performance.now();
    const loop = (now: number) => {
      this.raf = requestAnimationFrame(loop);
      const dt = Math.min(100, now - this.lastT);
      this.lastT = now;
      const s = this.session;
      if (!s || this.paused || this.ending) return;
      // repetición automática al mantener izquierda/derecha
      const d = this.held[this.held.length - 1];
      if (d) {
        this.repeatT += dt;
        const wait = this.repeating ? ARR_MS : DAS_MS;
        while (this.repeatT >= wait && this.canAct) {
          this.repeatT -= this.repeating ? ARR_MS : DAS_MS;
          this.repeating = true;
          if (!s.move(d)) {
            this.repeatT = 0;
            break;
          }
        }
      }
      s.setSoftDrop(this.softSources.size > 0);
      s.update(dt);
      this.afterTick();
    };
    this.raf = requestAnimationFrame(loop);
  }

  private stopLoop() {
    cancelAnimationFrame(this.raf);
  }

  /** Estadísticas, récord en vivo y fin de partida. */
  private afterTick() {
    const s = this.session!;
    if (s.pieces !== this.lastPieces) {
      // estadísticas por diferencia de contadores (independiente del orden de eventos)
      const newPieces = s.pieces - this.lastPieces;
      for (let i = 0; i < newPieces; i++) this.progress.recordMove(0, 0, false, 'cascade');
      const st = this.progress.d.stats;
      st.lines += s.lines - this.lastLines;
      st.perfect += s.perfectClears - this.lastPerfect;
      st.bestCombo = Math.max(st.bestCombo, s.bestCombo);
      st.maxLinesAtOnce = Math.max(st.maxLinesAtOnce, s.maxLinesAtOnce);
      this.lastPieces = s.pieces;
      this.lastLines = s.lines;
      this.lastPerfect = s.perfectClears;
      const ach = this.progress.liveUpdate(s);
      if (ach.length) this.hooks.onAchievements(ach);
      if (!this.bannerShown && this.bestAtStart > 0 && s.score > this.bestAtStart) {
        this.bannerShown = true;
        setTimeout(() => {
          this.view.popText(t('fx.newBest'), this.view.app.screen.width / 2, this.hud.getBoundingClientRect().bottom + 30, 26, getComputedStyle(document.documentElement).getPropertyValue('--good').trim() || '#39ff7a', { big: true, dur: 1500 });
          audio.play('unlock');
        }, 600);
      }
    }
    this.refreshHud();
    if (s.ended) void this.end();
  }

  private async end() {
    const s = this.session!;
    if (this.ending) return;
    this.ending = true;
    this.releaseAll();
    await this.view.tweens.wait(250);
    if (this.session !== s) return;
    audio.duck(true);
    await this.cview.animateGameOver();
    if (this.session !== s) return;
    const reward: GameReward = this.progress.finishGame(s, this.bestAtStart);
    this.hooks.onEnd({ mode: 'cascade', reason: s.ended ?? 'gameover', session: s, reward });
    if (reward.achievements.length) this.hooks.onAchievements(reward.achievements);
  }
}
