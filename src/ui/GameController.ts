import { audio, haptics } from '../audio/audio';
import type { Goal, LevelDef } from '../core/level';
import { SIZE, STONE_COLOR } from '../core/board';
import type { CascadeSession } from '../core/cascade';
import { GameSession, type EndReason, type ModeId, type MoveResult } from '../core/session';
import { CHARGE_MAX, VersusMatch, type Difficulty, type ModifierEvent, type Outcome, type Side } from '../core/versus';
import { fmt, t } from '../i18n';
import { LEVELS, TUTORIAL } from '../levels/levels';
import type { GameReward, Progress } from '../meta/progress';
import type { GameView } from '../render/GameView';
import { countUp, h, icon } from './dom';

export interface EndInfo {
  mode: ModeId;
  reason: EndReason;
  session: GameSession | CascadeSession;
  reward: GameReward;
  level?: LevelDef;
  versus?: { outcome: Outcome; botScore: number; difficulty: Difficulty; mult: number };
}

export interface ControllerHooks {
  onEnd(info: EndInfo): void;
  onPause(): void;
  onTutorialDone(): void;
  onAchievements(list: GameReward['achievements']): void;
}

/** Lee env(safe-area-inset-bottom) en px (las variables CSS con env() no se resuelven por JS). */
let probeEl: HTMLElement | null = null;
function safeAreaBottom(): number {
  if (!probeEl) {
    probeEl = document.createElement('div');
    probeEl.style.cssText = 'position:fixed;left:0;bottom:0;width:0;height:0;visibility:hidden;padding-bottom:env(safe-area-inset-bottom,0px)';
    document.body.appendChild(probeEl);
  }
  return parseFloat(getComputedStyle(probeEl).paddingBottom) || 0;
}

const GOAL_ICON: Record<Goal['type'], string> = { score: 'star', lines: 'lines', gems: 'gem', targets: 'target', combo: 'bolt' };

export class GameController {
  session: GameSession | null = null;
  paused = false;
  readonly root: HTMLElement;
  private hud!: HTMLElement;
  private scoreEl!: HTMLElement;
  private subEl!: HTMLElement;
  private comboEl!: HTMLElement;
  private rightEl!: HTMLElement;
  private timerEl?: HTMLElement;
  private timerBar?: HTMLElement;
  private goalsEl?: HTMLElement;
  private tipEl?: HTMLElement;
  private shownScore = 0;
  private bestAtStart = 0;
  private bannerShown = false;
  private lastTickSec = -1;
  private raf = 0;
  private lastT = 0;
  private ending = false;
  // ---- Versus ----
  private match: VersusMatch | null = null;
  private botWait = 0;
  private vs?: {
    mini: HTMLCanvasElement;
    botScore: HTMLElement;
    pips: Record<Side, HTMLElement[]>;
    shield: Record<Side, HTMLElement>;
    side: Record<Side, HTMLElement>;
  };

  constructor(
    private view: GameView,
    private progress: Progress,
    private hooks: ControllerHooks,
  ) {
    this.root = h('div.screen.game-screen');
  }

  // ---------------- ciclo de vida ----------------

  private custom?: LevelDef;

  /** customLevel: nivel de prueba enviado desde el editor. */
  start(mode: ModeId, levelId?: number, customLevel?: LevelDef, difficulty: Difficulty = 'medium') {
    this.stopLoop();
    if (customLevel) this.custom = customLevel;
    else if (levelId !== this.custom?.id) this.custom = undefined;
    const level = mode === 'adventure' ? this.custom ?? LEVELS.find((l) => l.id === levelId) : mode === 'tutorial' ? TUTORIAL : undefined;
    const seed = level ? level.seed ?? level.id * 7919 + 13 : (Date.now() ^ (Math.random() * 1e9)) >>> 0;
    if (mode === 'versus') {
      this.match = new VersusMatch(difficulty, seed);
      this.session = this.match.player.session;
      this.botWait = 1600 + this.match.botDelay() * 0.5;
    } else {
      this.match = null;
      this.session = new GameSession({ mode, seed, level });
    }
    this.paused = false;
    this.ending = false;
    this.bannerShown = false;
    this.shownScore = 0;
    const d = this.progress.d;
    this.bestAtStart = mode === 'classic' || mode === 'timeattack' || mode === 'zen' ? d.best[mode] : 0;
    this.buildHud();
    this.view.showBoard(true);
    this.view.inputEnabled = true;
    this.updateInsets();
    this.view.attach(this.session, { tryPlace: (s, x, y) => this.tryPlace(s, x, y) });
    audio.startMusic(mode === 'zen' ? 0.8 : mode === 'timeattack' || mode === 'versus' ? 1.12 : 1);
    audio.duck(false);
    this.startLoop();
    // la pista del tutorial se coloca en updateInsets(), cuando el HUD ya está medido
  }

  restart() {
    const s = this.session;
    if (!s) return;
    this.start(s.mode, s.level?.id, undefined, this.match?.difficulty);
  }

  leave() {
    this.stopLoop();
    this.session = null;
    this.match = null;
    this.view.attach(null, null);
    this.view.showBoard(false);
  }

  pause() {
    if (!this.session || this.session.ended || this.paused) return;
    this.paused = true;
    this.view.inputEnabled = false;
    this.view.cancelDrag();
    audio.duck(true);
  }

  resume() {
    this.paused = false;
    this.view.inputEnabled = true;
    this.lastT = performance.now();
    audio.duck(false);
  }

  /** Recalcula el espacio libre entre HUD y borde inferior. */
  updateInsets() {
    const r = this.hud?.getBoundingClientRect();
    const top = r ? r.bottom + 8 : 100;
    const bottom = safeAreaBottom() + 14;
    this.view.setInsets(top, bottom);
    this.view.relayout();
    if (this.session?.mode === 'tutorial' && !this.ending) this.tutorialStep();
  }

  // ---------------- HUD ----------------

  private buildHud() {
    const s = this.session!;
    this.root.innerHTML = '';
    this.timerEl = this.timerBar = this.goalsEl = this.tipEl = undefined;
    this.vs = undefined;
    const pauseBtn = h('button.icon-btn.hud-pause', { 'aria-label': t('pause.title'), onclick: () => this.hooks.onPause() }, icon('pause'));
    this.scoreEl = h('div.hud-score', '0');
    this.subEl = h('div.hud-sub');
    this.comboEl = h('div.combo-badge.hidden');
    this.rightEl = h('div.hud-right');
    const label =
      s.mode === 'adventure'
        ? t('hud.level', { n: s.level!.id })
        : s.mode === 'tutorial'
          ? t('mode.tutorial')
          : s.mode === 'versus' && this.match
            ? `${t('mode.versus')} · ${t(`vs.${this.match.difficulty}` as never)}`
            : t(`mode.${s.mode}` as never);
    this.hud = h(
      'div.hud',
      h('div.hud-row', pauseBtn, h('div.hud-center', h('div.hud-label', label), this.scoreEl, this.subEl), this.rightEl),
    );
    if (s.mode === 'tutorial') pauseBtn.style.visibility = 'hidden';
    if (s.mode === 'timeattack') {
      this.timerBar = h('div.timer-fill');
      this.timerEl = h('div.timer-text');
      this.hud.appendChild(h('div.timer', this.timerBar, this.timerEl));
    }
    if (s.mode === 'versus') this.hud.appendChild(this.buildVersusPanel());
    if (s.mode === 'adventure') {
      this.goalsEl = h('div.goals');
      this.hud.appendChild(this.goalsEl);
    }
    if (s.mode === 'zen') {
      const undo = h('button.icon-btn.undo-btn', { 'aria-label': t('hud.undo'), onclick: () => this.undo() }, icon('undo'));
      this.rightEl.appendChild(undo);
    }
    if (s.mode === 'tutorial') {
      this.tipEl = h('div.tip');
      const skip = h('button.chip-btn', { onclick: () => this.finishTutorial() }, t('tut.skip'));
      this.rightEl.appendChild(skip);
      this.hud.appendChild(this.tipEl);
    }
    this.rightEl.appendChild(this.comboEl);
    this.root.appendChild(this.hud);
    this.refreshHud();
  }

  private refreshHud(res?: MoveResult) {
    const s = this.session;
    if (!s) return;
    // puntos (contador animado)
    if (s.score !== this.shownScore) {
      countUp(this.scoreEl, this.shownScore, s.score, 450, fmt);
      this.shownScore = s.score;
      if (res && res.lines > 0) this.bump(this.scoreEl);
    } else this.scoreEl.textContent = fmt(s.score);

    // línea secundaria
    switch (s.mode) {
      case 'versus':
        this.updateClock();
        break;
      case 'adventure': {
        const ml = s.movesLeft;
        this.subEl.textContent = ml != null ? `${t('hud.moves')}: ${ml}` : '';
        this.subEl.classList.toggle('warn', ml != null && ml <= 5);
        break;
      }
      case 'tutorial':
        this.subEl.textContent = '';
        break;
      default:
        this.subEl.textContent = `${t('hud.best')} ${fmt(Math.max(this.bestAtStart, s.score))}`;
    }

    // combo: multiplicador visible y creciente + jugadas de gracia restantes
    if (s.combo >= 2) {
      const grace = 3 - s.movesSinceClear;
      this.comboEl.innerHTML = '';
      this.comboEl.append(
        h('span.combo-x', `x${s.combo}`),
        h('span.combo-dots', ...[0, 1, 2].map((i) => h(i < grace ? 'i.on' : 'i'))),
      );
      this.comboEl.classList.remove('hidden');
      this.comboEl.style.setProperty('--heat', String(Math.min(1, (s.combo - 2) / 8)));
      if (res && res.lines > 0) this.bump(this.comboEl);
    } else this.comboEl.classList.add('hidden');

    // objetivos de nivel
    if (this.goalsEl && s.level) {
      this.goalsEl.innerHTML = '';
      for (const g of s.level.goals) {
        const p = s.goalProgress(g);
        this.goalsEl.appendChild(
          h(`div.goal${p.done ? '.done' : ''}`, icon(p.done ? 'check' : GOAL_ICON[g.type]), h('span', g.type === 'score' ? `${fmt(p.current)}/${fmt(p.target)}` : `${p.current}/${p.target}`)),
        );
      }
    }
  }

  private bump(el: HTMLElement) {
    el.classList.remove('bump');
    void el.offsetWidth;
    el.classList.add('bump');
  }

  // ---------------- jugadas ----------------

  private tryPlace(slot: number, x: number, y: number): MoveResult | null {
    const s = this.session;
    if (!s || this.paused || this.ending) return null;
    const res = s.place(slot, x, y);
    if (!res) return null;
    this.progress.recordMove(res.lines, res.combo, res.perfect, s.mode);
    // récord y logros al instante (sin esperar al final de la partida)
    if (s.mode !== 'tutorial') {
      const ach = this.progress.liveUpdate(s);
      if (ach.length) this.hooks.onAchievements(ach);
    }
    if (this.match) {
      const m = this.match;
      const ev = m.afterMove('player', res);
      if (ev) setTimeout(() => this.match === m && this.applyEvent(ev), res.lines ? 380 : 120);
      this.refreshVersus();
      if (m.check()) {
        this.refreshHud(res);
        void this.endVersus(res.lines ? 750 : 300);
        return res;
      }
    }
    this.refreshHud(res);
    // aviso de nuevo récord en mitad de la partida
    if (!this.bannerShown && this.bestAtStart > 0 && s.score > this.bestAtStart && (s.mode === 'classic' || s.mode === 'timeattack')) {
      this.bannerShown = true;
      setTimeout(() => {
        this.view.banner(t('fx.newBest'));
        audio.play('unlock');
      }, 600);
    }
    if (s.mode === 'tutorial') setTimeout(() => this.tutorialStep(), res.lines ? 650 : 150);
    if (res.ended) this.end(res.ended, res);
    return res;
  }

  private undo() {
    const s = this.session;
    if (!s || this.paused || !s.undo()) {
      haptics.vibrate(30);
      return;
    }
    audio.play('drop');
    this.view.syncBoard();
    this.view.syncTray(false);
    this.shownScore = s.score;
    this.refreshHud();
  }

  private async end(reason: EndReason, res?: MoveResult) {
    const s = this.session!;
    if (this.ending) return;
    if (this.match) return void this.endVersus();
    this.ending = true;
    this.view.inputEnabled = false;
    if (s.mode === 'tutorial') {
      await this.view.tweens.wait(700);
      this.finishTutorial(true);
      return;
    }
    await this.view.tweens.wait(res && res.lines ? 750 : 250);
    if (this.session !== s) return;
    audio.duck(true);
    if (reason === 'win') await this.view.animateWin();
    else await this.view.animateGameOver();
    if (this.session !== s) return;
    const reward =
      s.mode === 'adventure' ? this.progress.finishLevel(s, reason === 'win', res?.stars ?? 0) : this.progress.finishGame(s, this.bestAtStart);
    this.hooks.onEnd({ mode: s.mode, reason, session: s, reward, level: s.level });
    if (reward.achievements.length) this.hooks.onAchievements(reward.achievements);
  }

  // ---------------- tutorial ----------------

  private tutorialStep() {
    const s = this.session;
    if (!s || s.mode !== 'tutorial' || !this.tipEl || s.ended) return;
    const round = s.rounds - 1;
    const hints = TUTORIAL.hints[round] ?? [];
    // índice de la pieza pendiente dentro de la ronda
    const slots = s.tray.map((p, i) => (p ? i : -1)).filter((i) => i >= 0);
    const fixed = TUTORIAL.sets![round] ?? [];
    const order = fixed.map((id, i) => (id ? i : -1)).filter((i) => i >= 0);
    const nextSlot = slots[0];
    const hintIdx = order.indexOf(nextSlot);
    this.tipEl.textContent = t(`tut.${Math.min(3, round + 1)}` as never);
    if (nextSlot != null && hints[hintIdx]) this.view.hint(nextSlot, hints[hintIdx][0], hints[hintIdx][1]);
  }

  private finishTutorial(completed = false) {
    this.view.clearHint();
    if (completed && this.tipEl) {
      this.tipEl.textContent = t('tut.done');
      this.view.banner(t('praise.5'));
      setTimeout(() => this.hooks.onTutorialDone(), 1900);
    } else this.hooks.onTutorialDone();
  }

  // ---------------- reloj ----------------

  private startLoop() {
    this.lastT = performance.now();
    const loop = (now: number) => {
      this.raf = requestAnimationFrame(loop);
      const dt = Math.min(100, now - this.lastT);
      this.lastT = now;
      const s = this.session;
      if (s && this.match) return this.versusTick(dt);
      if (!s || s.mode !== 'timeattack') return;
      if (!this.paused && !this.ending) {
        const r = s.update(dt);
        if (r) void this.end(r);
      }
      const sec = Math.ceil(s.timeLeftMs / 1000);
      if (this.timerEl) {
        this.timerEl.textContent = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
        const frac = Math.min(1, s.timeLeftMs / 120000);
        this.timerBar!.style.transform = `scaleX(${frac})`;
        this.timerEl.parentElement!.classList.toggle('low', sec <= 10);
      }
      if (sec <= 10 && sec !== this.lastTickSec && !this.paused && !s.ended) {
        this.lastTickSec = sec;
        audio.play('tick');
        if (sec <= 5) haptics.vibrate(10);
      }
    };
    this.raf = requestAnimationFrame(loop);
  }

  private stopLoop() {
    cancelAnimationFrame(this.raf);
  }

  // ---------------- Versus ----------------

  private buildVersusPanel(): HTMLElement {
    const pips = () => Array.from({ length: CHARGE_MAX }, () => h('i'));
    const p = { player: pips(), bot: pips() };
    const shield = { player: h('span.vs-shield', icon('shield')), bot: h('span.vs-shield', icon('shield')) };
    const mini = h('canvas.vs-mini') as HTMLCanvasElement;
    const botScore = h('b.vs-score', '0');
    const me = h('div.vs-side.me', h('div.vs-name', t('vs.you'), shield.player), h('div.vs-pips', ...p.player));
    const bot = h('div.vs-side.bot', mini, h('div.vs-bot-info', h('div.vs-name', t('vs.bot'), shield.bot), botScore, h('div.vs-pips', ...p.bot)));
    this.vs = { mini, botScore, pips: p, shield, side: { player: me, bot } };
    requestAnimationFrame(() => this.drawMini());
    return h('div.vs-panel', me, h('div.vs-vs', 'VS'), bot);
  }

  private refreshVersus() {
    const m = this.match;
    const v = this.vs;
    if (!m || !v) return;
    for (const side of ['player', 'bot'] as Side[]) {
      const f = m.fighter(side);
      v.pips[side].forEach((el, i) => el.classList.toggle('on', i < f.charge));
      v.shield[side].classList.toggle('on', f.shield);
    }
    v.botScore.textContent = fmt(m.bot.session.score);
  }

  /** Dibuja el tablero del bot en miniatura con los colores de la skin. */
  private drawMini() {
    const m = this.match;
    const c = this.vs?.mini;
    if (!m || !c) return;
    const css = getComputedStyle(document.documentElement);
    const size = c.clientWidth || 56;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (c.width !== Math.round(size * dpr)) {
      c.width = Math.round(size * dpr);
      c.height = Math.round(size * dpr);
    }
    const ctx = c.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    const cell = size / SIZE;
    const colors = [1, 2, 3, 4, 5, 6, 7].map((i) => css.getPropertyValue(`--c${i}`).trim() || '#888');
    const stone = css.getPropertyValue('--text-dim').trim() || '#777';
    const empty = css.getPropertyValue('--text').trim() || '#fff';
    const b = m.bot.session.board;
    for (let k = 0; k < SIZE * SIZE; k++) {
      const x = (k % SIZE) * cell;
      const y = Math.floor(k / SIZE) * cell;
      const v = b.cells[k];
      ctx.globalAlpha = v ? 1 : 0.08;
      ctx.fillStyle = !v ? empty : v >= STONE_COLOR ? stone : colors[(v - 1) % 7];
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x + 0.6, y + 0.6, cell - 1.2, cell - 1.2, cell * 0.22);
      else ctx.rect(x + 0.6, y + 0.6, cell - 1.2, cell - 1.2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private updateClock() {
    const m = this.match;
    if (!m) return;
    const sec = Math.ceil(m.timeLeftMs / 1000);
    this.subEl.textContent = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
    this.subEl.classList.toggle('warn', sec <= 15);
    if (sec <= 10 && sec !== this.lastTickSec && !this.paused && !m.outcome) {
      this.lastTickSec = sec;
      audio.play('tick');
    }
  }

  private versusTick(dt: number) {
    const m = this.match!;
    if (!this.paused && !this.ending) {
      this.botWait -= dt;
      if (this.botWait <= 0) {
        this.botWait = m.botDelay();
        this.botStep();
      }
      if (!this.ending && m.update(dt)) void this.endVersus(400);
    }
    this.updateClock();
  }

  private botStep() {
    const m = this.match!;
    const r = m.botMove();
    if (r) {
      const ev = m.afterMove('bot', r);
      if (ev) this.applyEvent(ev);
      if (r.lines && this.vs) this.bump(this.vs.side.bot);
    }
    this.drawMini();
    this.refreshVersus();
    if (m.bot.session.ended && !m.player.session.ended) this.view.banner(t('vs.botStuck'), this.view.skinUi.good);
    if (m.check()) void this.endVersus(600);
  }

  /** Muestra (y aplica en la vista) un modificador que acaba de dispararse. */
  private applyEvent(ev: ModifierEvent) {
    const m = this.match;
    if (!m || this.ending) return;
    const ui = this.view.skinUi;
    const name = t(`vs.mod.${ev.mod}` as never);
    if (ev.target === 'player') {
      if (ev.blocked) this.view.banner(t('vs.blocked'), ui.accent);
      else {
        if (ev.mod === 'junk') this.view.dropJunk(ev.cells);
        else if (ev.mod === 'heavy') this.view.swapTray();
        else if (ev.mod === 'cleanse') this.view.vanishCells(ev.cells);
        this.view.banner(name, ev.from === 'player' ? ui.good : ui.danger);
      }
    } else {
      // golpe al bot: aviso pequeño en su panel
      const side = this.vs?.side.bot;
      if (side) {
        const tag = h(`div.vs-hit${ev.blocked ? '.blocked' : ''}`, ev.blocked ? t('vs.blocked') : name);
        side.appendChild(tag);
        setTimeout(() => tag.remove(), 1400);
        side.classList.remove('hit');
        void side.offsetWidth;
        side.classList.add('hit');
      }
      if (ev.from === 'player') {
        this.view.banner(name, ui.good);
        audio.play('combo', { combo: 4 });
      }
    }
    this.drawMini();
    this.refreshVersus();
    if (m.check()) void this.endVersus(900);
  }

  private async endVersus(delay = 500) {
    const m = this.match;
    const s = this.session;
    if (!m || !s || this.ending) return;
    m.check();
    const outcome = m.outcome ?? 'lose';
    this.ending = true;
    this.view.inputEnabled = false;
    this.refreshVersus();
    await this.view.tweens.wait(delay);
    if (this.match !== m) return;
    audio.duck(true);
    if (outcome === 'win') await this.view.animateWin();
    else await this.view.animateGameOver();
    if (this.match !== m) return;
    const reward = this.progress.finishGame(s, 0, { difficulty: m.difficulty, outcome, mult: m.mult });
    this.hooks.onEnd({
      mode: 'versus',
      reason: outcome === 'win' ? 'win' : outcome === 'lose' ? 'fail' : 'finished',
      session: s,
      reward,
      versus: { outcome, botScore: m.bot.session.score, difficulty: m.difficulty, mult: m.mult },
    });
    if (reward.achievements.length) this.hooks.onAchievements(reward.achievements);
  }
}

