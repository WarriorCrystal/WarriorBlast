import { audio, haptics } from '../audio/audio';
import type { Goal, LevelDef } from '../core/level';
import type { ModeId } from '../core/session';
import { DIFFICULTIES, DIFFICULTY_IDS, type Difficulty } from '../core/versus';
import { LANGS, fmt, getLang, setLang, t, type LangCode } from '../i18n';
import { randomTagline } from '../i18n/taglines';
import { LEVELS } from '../levels/levels';
import { lookupCode } from '../meta/codes';
import { ACHIEVEMENTS, levelsDone, totalStars, type AchievementDef, type Progress } from '../meta/progress';
import type { CascadeView } from '../render/CascadeView';
import type { GameView } from '../render/GameView';
import type { SaveStore } from '../save/save';
import { SKINS, getSkin } from '../skins';
import type { SkinDef } from '../skins/types';
import { CascadeController } from './CascadeController';
import { GameController, type EndInfo } from './GameController';
import { clearEl, coinIcon, countUp, h, icon } from './dom';

type ScreenName = 'home' | 'adventure' | 'shop' | 'achievements' | 'stats' | 'settings' | 'game';

const VERSION = __APP_VERSION__;

/** Luminancia relativa aproximada (0..1) de un color #rrggbb, #rgb o rgb(a). */
function luminance(color: string): number {
  let rgb: number[] = [];
  const m = color.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (m) {
    const hex = m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1];
    rgb = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  } else {
    rgb = (color.match(/[\d.]+/g) ?? ['0', '0', '0']).slice(0, 3).map(Number);
  }
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export class App {
  private screenHost = h('div.screens');
  private modalHost = h('div.modals');
  private toastHost = h('div.toasts');
  private current: ScreenName = 'home';
  private game: GameController;
  private cascade: CascadeController;
  /** Controlador de la partida en curso (bloques o Cascada). */
  private active: GameController | CascadeController;
  private modalStack: Array<{ el: HTMLElement; dismiss?: () => void }> = [];
  private toastQueue: AchievementDef[] = [];
  private toastBusy = false;

  constructor(
    root: HTMLElement,
    private view: GameView,
    private cview: CascadeView,
    private store: SaveStore,
    private progress: Progress,
  ) {
    root.append(this.screenHost, this.modalHost, this.toastHost);
    const hooks = {
      onEnd: (info: EndInfo) => this.showEnd(info),
      onPause: () => this.showPause(),
      onTutorialDone: () => {
        this.d.tutorialDone = true;
        this.store.save();
        this.startGame('classic');
      },
      onAchievements: (list: AchievementDef[]) => this.toast(list),
    };
    this.game = new GameController(view, progress, hooks);
    this.cascade = new CascadeController(view, cview, progress, hooks);
    this.active = this.game;
    window.addEventListener('popstate', () => this.onBack());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (this.current === 'game' && this.active.session && !this.active.session.ended && !this.active.paused) this.showPause();
        audio.suspend();
      } else audio.resume();
    });
    let rt = 0;
    window.addEventListener('resize', () => {
      clearTimeout(rt);
      rt = window.setTimeout(() => (this.current === 'game' ? this.active.updateInsets() : this.view.relayout()), 120);
    });
  }

  private get d() {
    return this.store.data;
  }

  // =============== skins ===============

  applySkin(id: string) {
    const s = getSkin(id);
    const r = document.documentElement.style;
    const u = s.ui;
    r.setProperty('--bg', u.bg);
    r.setProperty('--panel', u.panel);
    r.setProperty('--panel-border', u.panelBorder);
    r.setProperty('--text', u.text);
    r.setProperty('--text-dim', u.textDim);
    r.setProperty('--accent', u.accent);
    r.setProperty('--accent2', u.accent2);
    r.setProperty('--good', u.good);
    r.setProperty('--danger', u.danger);
    r.setProperty('--radius', `${u.radius}px`);
    r.setProperty('--title-glow', u.titleGlow ?? 'none');
    // texto legible sobre los colores de acento (botón principal, nodos del mapa, insignias)
    const ink = luminance(u.bg) < luminance(u.text) ? u.bg : u.text;
    const onColor = (c: string) => {
      const l = luminance(c);
      const ratio = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      return ratio(l, 1) >= ratio(l, luminance(ink)) ? '#ffffff' : ink;
    };
    r.setProperty('--on-accent', onColor(u.accent));
    r.setProperty('--on-accent2', onColor(u.accent2));
    if (u.font) r.setProperty('--font', u.font);
    else r.removeProperty('--font');
    (u.swatches ?? s.blocks.slice(0, 7)).forEach((c, i) => r.setProperty(`--c${i + 1}`, c));
    document.body.classList.toggle('glass', !!u.glass);
    document.body.classList.toggle('pixel', !!s.pixelated);
    document.body.dataset.skin = s.id;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', u.bg);
    this.view.setSkin(s);
    this.cview.setSkin(s);
    audio.setSkin(s.sound);
  }

  // =============== navegación ===============

  start() {
    this.applySkin(this.d.skin);
    const test = new URLSearchParams(location.search).has('testLevel') ? localStorage.getItem('warriorblast.testLevel') : null;
    if (test) {
      // nivel enviado desde editor.html
      this.closeAllModals();
      this.game.start('adventure', undefined, JSON.parse(test) as LevelDef);
      this.show('game', this.game.root);
      requestAnimationFrame(() => this.game.updateInsets());
    } else if (!this.d.tutorialDone) this.startGame('tutorial');
    else {
      this.show('home');
      this.maybeDailyReward();
    }
  }

  private show(name: ScreenName, el?: HTMLElement) {
    const prev = this.current;
    this.current = name;
    clearEl(this.screenHost);
    const screen = el ?? this.render(name);
    screen.classList.add('enter');
    this.screenHost.appendChild(screen);
    if (name !== 'game') this.view.showBoard(false);
    if (name !== 'home' && prev === 'home') history.pushState({ wb: 1 }, '');
    if (name !== 'game') audio.startMusic(1);
  }

  private onBack() {
    if (this.modalStack.length) {
      const top = this.modalStack[this.modalStack.length - 1];
      if (top.dismiss) top.dismiss();
      if (this.current !== 'home') history.pushState({ wb: 1 }, '');
      return;
    }
    if (this.current === 'game') {
      history.pushState({ wb: 1 }, '');
      this.showPause();
      return;
    }
    if (this.current === 'adventure' || this.current !== 'home') this.goHome();
  }

  private goHome() {
    this.closeAllModals();
    this.active.leave();
    this.show('home');
  }

  private render(name: ScreenName): HTMLElement {
    switch (name) {
      case 'adventure':
        return this.renderAdventure();
      case 'shop':
        return this.renderShop();
      case 'achievements':
        return this.renderAchievements();
      case 'stats':
        return this.renderStats();
      case 'settings':
        return this.renderSettings();
      default:
        return this.renderHome();
    }
  }

  private rerender() {
    if (this.current !== 'game') this.show(this.current);
  }

  startGame(mode: ModeId, levelId?: number, difficulty?: Difficulty) {
    this.closeAllModals();
    if (this.active !== (mode === 'cascade' ? this.cascade : this.game)) this.active.leave();
    if (mode === 'cascade') {
      this.active = this.cascade;
      this.cascade.start();
    } else {
      this.active = this.game;
      this.game.start(mode, levelId, undefined, difficulty);
    }
    this.show('game', this.active.root);
    requestAnimationFrame(() => this.active.updateInsets());
  }

  // =============== piezas comunes ===============

  private coinsPill(): HTMLElement {
    const el = h('button.coins-pill', { onclick: () => this.current !== 'shop' && this.show('shop'), 'aria-label': t('menu.shop') }, coinIcon(), h('span.coins-n', fmt(this.d.coins)));
    return el;
  }

  private refreshCoins(animateFrom?: number) {
    document.querySelectorAll<HTMLElement>('.coins-n').forEach((el) => {
      if (animateFrom != null) countUp(el, animateFrom, this.d.coins, 700, fmt);
      else el.textContent = fmt(this.d.coins);
    });
  }

  private topbar(title: string): HTMLElement {
    return h(
      'div.topbar',
      h('button.icon-btn', { onclick: () => history.back(), 'aria-label': t('menu.back') }, icon('back')),
      h('h2', title),
      this.coinsPill(),
    );
  }

  private btn(label: string | HTMLElement, onclick: () => void, cls = ''): HTMLElement {
    return h(`button.btn${cls ? '.' + cls.split(' ').join('.') : ''}`, {
      onclick: () => {
        audio.play('click');
        haptics.vibrate(6);
        onclick();
      },
    }, label);
  }

  // =============== INICIO ===============

  private logo(): HTMLElement {
    // W de 5x5 hecha de bloques (0 = hueco)
    const W = [
      1, 0, 0, 0, 5,
      1, 0, 0, 0, 5,
      2, 0, 3, 0, 6,
      2, 0, 3, 0, 6,
      0, 7, 0, 4, 0,
    ];
    const blocks = h('div.logo-blocks', ...W.map((c) => h(c ? `i.c${c}` : 'i.empty')));
    // frase aleatoria bajo el título; al tocarla sale otra
    const sub = h('button.logo-sub', { onclick: () => (sub.textContent = randomTagline()) }, randomTagline());
    return h('div.logo', blocks, h('h1.logo-word', h('span', 'WARRIOR'), h('span.blast', 'BLAST')), sub);
  }

  private renderHome(): HTMLElement {
    const d = this.d;
    const card = (mode: ModeId, ic: string, metaIc: string, meta: string, cls = '') =>
      h(
        `button.mode-card.m-${mode}${cls ? '.' + cls : ''}`,
        {
          onclick: () => {
            audio.play('click');
            haptics.vibrate(6);
            if (mode === 'adventure') this.show('adventure');
            else if (mode === 'versus') this.showVersusSetup();
            else this.startGame(mode);
          },
        },
        h('div.mc-head', h('div.mc-icon', icon(ic)), h('div.mc-meta', icon(metaIc), h('span', meta))),
        h('div.mc-text', h('div.mc-title', t(`mode.${mode}` as never)), h('div.mc-desc', t(`mode.${mode}.desc` as never))),
      );
    const vsWins = d.versus.wins.easy + d.versus.wins.medium + d.versus.wins.hard;
    const stars = totalStars(d);
    return h(
      'div.screen.menu.home',
      h('div.home-top', h('button.icon-btn', { onclick: () => this.show('settings'), 'aria-label': t('menu.settings') }, icon('gear')), this.coinsPill()),
      this.logo(),
      h(
        'div.home-main',
        h(
          'button.play-btn',
          { onclick: () => (audio.play('click'), this.startGame('classic')) },
          h(
            'span.play-txt',
            h('small', t('menu.play')),
            h('b', t('mode.classic')),
            h('span.play-best', icon('trophy'), t('menu.best', { n: fmt(d.best.classic) })),
          ),
          h('span.play-ico', icon('play')),
        ),
        h(
          'div.mode-grid',
          card('adventure', 'map', 'star', `${stars}/${LEVELS.length * 3}`, 'adv'),
          card('timeattack', 'clock', 'trophy', fmt(d.best.timeattack)),
          card('versus', 'swords', 'trophy', fmt(vsWins)),
          card('zen', 'leaf', 'trophy', fmt(d.best.zen)),
          card('cascade', 'cascade', 'trophy', fmt(d.best.cascade), 'wide'),
        ),
      ),
      h(
        'nav.bottom-nav',
        this.navBtn('bag', t('menu.shop'), () => this.show('shop')),
        this.navBtn('trophy', t('menu.achievements'), () => this.show('achievements'), ACHIEVEMENTS.filter((a) => d.achievements[a.id]).length + '/' + ACHIEVEMENTS.length),
        this.navBtn('chart', t('menu.stats'), () => this.show('stats')),
      ),
    );
  }

  private navBtn(ic: string, label: string, fn: () => void, badge?: string) {
    return h('button.nav-btn', { onclick: () => (audio.play('click'), fn()) }, icon(ic), h('span', label), badge ? h('em', badge) : null);
  }

  // =============== AVENTURA ===============

  private renderAdventure(): HTMLElement {
    const unlocked = this.progress.unlockedLevel();
    const map = h('div.map');
    const n = LEVELS.length;
    const stepY = 96;
    const H = n * stepY + 60;
    map.style.height = `${H}px`;
    const pts: Array<[number, number]> = [];
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('class', 'map-path');
    svg.setAttribute('viewBox', `0 0 100 ${H}`);
    svg.setAttribute('preserveAspectRatio', 'none');
    LEVELS.forEach((lv, i) => {
      // nivel 1 abajo: se "sube" por el mapa
      const y = H - 60 - i * stepY;
      const x = 50 + Math.sin(i * 0.85) * 30;
      pts.push([x, y]);
      const st = this.d.levels[String(lv.id)]?.stars ?? 0;
      const locked = lv.id > unlocked;
      const node = h(
        `button.map-node${locked ? '.locked' : ''}${lv.id === unlocked && !st ? '.current' : ''}${st ? '.cleared' : ''}`,
        {
          style: { left: `${x}%`, top: `${y}px` },
          onclick: () => {
            if (locked) {
              haptics.vibrate(20);
              return;
            }
            audio.play('click');
            this.showLevelIntro(lv);
          },
        },
        locked ? icon('lock') : h('b', String(lv.id)),
        h('div.node-stars', ...[1, 2, 3].map((k) => icon('star', k <= st ? 'on' : ''))),
      );
      map.appendChild(node);
    });
    const path = document.createElementNS(svgNS, 'path');
    let dPath = '';
    pts.forEach(([x, y], i) => {
      if (i === 0) dPath += `M${x} ${y}`;
      else {
        const [px, py] = pts[i - 1];
        const my = (py + y) / 2;
        dPath += ` C${px} ${my} ${x} ${my} ${x} ${y}`;
      }
    });
    path.setAttribute('d', dPath);
    path.setAttribute('vector-effect', 'non-scaling-stroke');
    svg.appendChild(path);
    map.prepend(svg);
    const scroller = h('div.map-scroll', map);
    const screen = h(
      'div.screen.menu.adventure',
      this.topbar(t('mode.adventure')),
      h('div.adv-summary', icon('star', 'on'), `${totalStars(this.d)}/${LEVELS.length * 3}`, h('span.dim', ` · ${levelsDone(this.d)}/${LEVELS.length}`)),
      scroller,
    );
    requestAnimationFrame(() => {
      const target = H - 60 - (unlocked - 1) * stepY;
      scroller.scrollTop = target - scroller.clientHeight / 2;
    });
    return screen;
  }

  private goalText(g: Goal): string {
    switch (g.type) {
      case 'score':
        return t('goal.score', { n: fmt(g.target) });
      case 'lines':
        return t('goal.lines', { n: g.target });
      case 'gems':
        return t('goal.gems', { n: g.target });
      case 'combo':
        return t('goal.combo', { n: g.target });
      default:
        return t('goal.targets');
    }
  }

  private goalList(lv: LevelDef) {
    const ic: Record<string, string> = { score: 'star', lines: 'lines', gems: 'gem', targets: 'target', combo: 'bolt' };
    return h(
      'ul.goal-list',
      ...lv.goals.map((g) => h('li', icon(ic[g.type]), this.goalText(g))),
      lv.moves ? h('li.dim', icon('grid'), t('level.movesLimit', { n: lv.moves })) : null,
    );
  }

  private showLevelIntro(lv: LevelDef) {
    const st = this.d.levels[String(lv.id)]?.stars ?? 0;
    const close = this.modal(
      h(
        'div.panel.level-intro',
        h('h2', t('level.title', { n: lv.id })),
        h('div.big-stars', ...[1, 2, 3].map((k) => icon('star', k <= st ? 'on' : ''))),
        h('h3', t('level.goals')),
        this.goalList(lv),
        h('div.btn-row', this.btn(t('menu.back'), () => close(), 'ghost'), this.btn(t('level.start'), () => this.startGame('adventure', lv.id), 'primary')),
      ),
      true,
    );
  }

  // =============== TIENDA ===============

  private skinPreview(s: SkinDef): HTMLCanvasElement {
    const W = 220;
    const H = 120;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const c = document.createElement('canvas');
    c.width = W * dpr;
    c.height = H * dpr;
    c.style.width = '100%';
    c.style.aspectRatio = `${W}/${H}`;
    const ctx = c.getContext('2d')!;
    ctx.scale(dpr, dpr);
    s.drawBackground(ctx, W, H);
    const cell = 26;
    const ox = 32;
    const oy = 20;
    ctx.save();
    ctx.translate(ox, oy);
    s.drawBoard(ctx, cell * 3, cell);
    ctx.restore();
    const cells: Array<[number, number, number]> = [
      [0, 0, 1], [1, 0, 1], [0, 1, 4], [2, 2, 3], [1, 2, 3], [2, 1, 3],
    ];
    for (const [x, y, col] of cells) {
      ctx.save();
      ctx.translate(ox + x * cell, oy + y * cell);
      s.drawBlock(ctx, cell, s.blocks[col - 1], 'normal');
      ctx.restore();
    }
    const piece: Array<[number, number, number]> = [[0, 0, 5], [1, 0, 5], [1, 1, 5], [0, 2, 2], [1, 2, 7], [0, 1, 6]];
    for (const [x, y, col] of piece) {
      ctx.save();
      ctx.translate(140 + x * cell, 20 + y * cell);
      s.drawBlock(ctx, cell, s.blocks[col - 1], 'normal');
      ctx.restore();
    }
    return c;
  }

  private renderShop(): HTMLElement {
    const grid = h('div.shop-grid');
    for (const s of [...SKINS].sort((a, b) => a.price - b.price)) {
      const owned = this.d.ownedSkins.includes(s.id);
      const equipped = this.d.skin === s.id;
      let action: HTMLElement;
      if (equipped) action = h('div.btn.small.equipped', icon('check'), t('shop.owned'));
      else if (owned) action = this.btn(t('shop.equip'), () => this.equip(s.id), 'small primary');
      else {
        const can = this.d.coins >= s.price;
        action = this.btn(h('span.price', coinIcon(), fmt(s.price)), () => this.buy(s), `small ${can ? 'buy' : 'disabled'}`);
      }
      grid.appendChild(
        h(
          `div.skin-card${equipped ? '.equipped' : ''}`,
          h('div.skin-preview', this.skinPreview(s)),
          h('div.skin-info', h('b', s.name[getLang()]), h('small', s.description[getLang()])),
          action,
        ),
      );
    }
    return h('div.screen.menu.shop', this.topbar(t('shop.title')), h('div.scroll', grid));
  }

  private equip(id: string) {
    this.d.skin = id;
    this.store.save();
    this.applySkin(id);
    this.rerender();
  }

  private buy(s: SkinDef) {
    if (this.d.coins < s.price) {
      haptics.vibrate([20, 40, 20]);
      this.notice(t('shop.notEnough', { n: fmt(s.price - this.d.coins) }));
      return;
    }
    const before = this.d.coins;
    if (this.progress.buySkin(s.id, s.price)) {
      audio.play('unlock');
      haptics.vibrate([20, 30, 50]);
      const ach = this.progress.checkAchievements();
      this.store.save();
      this.equip(s.id);
      this.refreshCoins(before);
      this.notice(t('shop.bought'));
      if (ach.length) this.toast(ach);
    }
  }

  // =============== LOGROS / ESTADÍSTICAS ===============

  private renderAchievements(): HTMLElement {
    const list = h('div.ach-list');
    for (const a of ACHIEVEMENTS) {
      const got = !!this.d.achievements[a.id];
      const v = Math.min(a.target, a.value(this.d));
      list.appendChild(
        h(
          `div.ach${got ? '.got' : ''}`,
          h('div.ach-ico', icon(got ? 'trophy' : 'lock')),
          h(
            'div.ach-body',
            h('b', t(`ach.${a.id}.name` as never)),
            h('small', t(`ach.${a.id}.desc` as never)),
            got ? null : h('div.progress', h('i', { style: { width: `${(v / a.target) * 100}%` } }), h('span', t('ach.progress', { a: fmt(v), b: fmt(a.target) }))),
          ),
          h('div.ach-reward', coinIcon(), `${a.reward}`),
        ),
      );
    }
    return h('div.screen.menu.achievements', this.topbar(t('ach.title')), h('div.scroll', list));
  }

  private renderStats(): HTMLElement {
    const d = this.d;
    const row = (k: string, v: string | number) => h('div.stat-row', h('span', k), h('b', typeof v === 'number' ? fmt(v) : v));
    return h(
      'div.screen.menu.stats',
      this.topbar(t('stats.title')),
      h(
        'div.scroll',
        h(
          'div.panel.flat',
          h('h3', t('stats.best')),
          row(t('mode.classic'), d.best.classic),
          row(t('mode.timeattack'), d.best.timeattack),
          row(t('mode.zen'), d.best.zen),
          row(t('mode.cascade'), d.best.cascade),
        ),
        h(
          'div.panel.flat',
          h('h3', t('stats.versus')),
          ...DIFFICULTY_IDS.map((id) => row(t(`vs.${id}` as never), t('vs.wins', { n: fmt(d.versus.wins[id]) }))),
          row(t('stats.versusPlayed'), d.versus.played),
          row(t('stats.versusStreak'), d.versus.bestStreak),
        ),
        h(
          'div.panel.flat',
          row(t('stats.games'), d.stats.games),
          row(t('stats.lines'), d.stats.lines),
          row(t('stats.pieces'), d.stats.pieces),
          row(t('stats.bestCombo'), `x${d.stats.bestCombo}`),
          row(t('stats.perfect'), d.stats.perfect),
          row(t('stats.levels'), `${levelsDone(d)}/${LEVELS.length}`),
          row(t('stats.stars'), `${totalStars(d)}/${LEVELS.length * 3}`),
          row(t('stats.coinsEarned'), d.stats.coinsEarned),
        ),
      ),
    );
  }

  // =============== AJUSTES ===============

  private toggle(label: string, ic: string, value: boolean, onChange: (v: boolean) => void, note?: string): HTMLElement {
    const input = h('input', { type: 'checkbox', role: 'switch' }) as HTMLInputElement;
    input.checked = value;
    input.addEventListener('change', () => {
      onChange(input.checked);
      audio.play('click');
    });
    return h('label.set-row', icon(ic), h('span', label, note ? h('small', note) : null), h('span.switch', input, h('i')));
  }

  private renderSettings(): HTMLElement {
    const s = this.d.settings;
    const langSeg = h(
      'div.segment',
      ...LANGS.map((l) =>
        h(`button${getLang() === l.code ? '.on' : ''}`, {
          onclick: () => {
            s.lang = l.code as LangCode;
            setLang(l.code);
            this.store.save();
            audio.play('click');
            this.rerender();
          },
        }, l.label),
      ),
    );
    const offline = navigator.serviceWorker?.controller ? h('p.dim.center', icon('check'), ' ', t('settings.offline')) : null;
    return h(
      'div.screen.menu.settings',
      this.topbar(t('settings.title')),
      h(
        'div.scroll',
        h(
          'div.panel.flat',
          this.toggle(t('settings.music'), 'music', s.music, (v) => {
            s.music = v;
            audio.setEnabled(s.music, s.sfx);
            this.store.save();
          }),
          this.toggle(t('settings.sfx'), 'volume', s.sfx, (v) => {
            s.sfx = v;
            audio.setEnabled(s.music, s.sfx);
            this.store.save();
          }),
          this.toggle(t('settings.vibration'), 'vibrate', s.vibration, (v) => {
            s.vibration = v;
            haptics.enabled = v;
            if (v) haptics.vibrate(30);
            this.store.save();
          }, haptics.supported ? undefined : t('settings.noVibration')),
          h('div.set-row', icon('globe'), h('span', t('settings.language')), langSeg),
        ),
        h(
          'div.panel.flat.stack',
          this.btn(t('settings.tutorial'), () => this.startGame('tutorial'), 'ghost'),
          this.btn(t('settings.reset'), () => this.confirmReset(), 'danger'),
        ),
        this.codeBox(),
        offline,
        h('p.dim.center', t('settings.version', { v: VERSION })),
      ),
    );
  }

  private codeBox(): HTMLElement {
    const input = h('input.code-input', {
      type: 'text',
      placeholder: t('settings.codePlaceholder'),
      autocomplete: 'off',
      autocapitalize: 'off',
      spellcheck: 'false',
      maxlength: 32,
    }) as HTMLInputElement;
    const redeem = () => {
      const reward = lookupCode(input.value);
      if (!reward) {
        haptics.vibrate([20, 40, 20]);
        this.notice(t('settings.codeInvalid'));
        return;
      }
      const before = this.d.coins;
      if (reward.coins) this.d.coins += reward.coins;
      this.store.save();
      audio.play('coin');
      haptics.vibrate([20, 30, 50]);
      this.refreshCoins(before);
      input.value = '';
      this.notice(t('settings.codeOk', { n: fmt(reward.coins ?? 0) }));
    };
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') redeem();
    });
    return h(
      'div.panel.flat',
      h('div.set-row', icon('gem'), h('span', t('settings.codes'))),
      h('div.code-row', input, this.btn(t('settings.codeRedeem'), redeem, 'primary')),
    );
  }

  private confirmReset() {
    const close = this.modal(
      h(
        'div.panel',
        h('h2', t('settings.reset')),
        h('p', t('settings.resetConfirm')),
        h(
          'div.btn-row',
          this.btn(t('settings.cancel'), () => close(), 'ghost'),
          this.btn(t('settings.resetYes'), () => {
            this.store.reset();
            location.reload();
          }, 'danger'),
        ),
      ),
      true,
    );
  }

  // =============== MODALES ===============

  modal(content: HTMLElement, dismissable: boolean, onClose?: () => void): () => void {
    const back = h('div.modal-back');
    const wrap = h('div.modal', back, content);
    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      wrap.classList.add('leaving');
      this.modalStack = this.modalStack.filter((m) => m.el !== wrap);
      setTimeout(() => wrap.remove(), 200);
      onClose?.();
    };
    if (dismissable) back.addEventListener('click', close);
    this.modalHost.appendChild(wrap);
    this.modalStack.push({ el: wrap, dismiss: dismissable ? close : undefined });
    return close;
  }

  private closeAllModals() {
    for (const m of this.modalStack) m.el.remove();
    this.modalStack = [];
  }

  private notice(text: string) {
    const el = h('div.notice', text);
    this.toastHost.appendChild(el);
    setTimeout(() => el.classList.add('leaving'), 1800);
    setTimeout(() => el.remove(), 2100);
  }

  private showPause() {
    if (this.modalStack.length || !this.active.session || this.active.session.ended) return;
    this.active.pause();
    const s = this.d.settings;
    const quick = h(
      'div.quick-toggles',
      this.toggle(t('settings.music'), 'music', s.music, (v) => {
        s.music = v;
        audio.setEnabled(s.music, s.sfx);
        this.store.save();
      }),
      this.toggle(t('settings.sfx'), 'volume', s.sfx, (v) => {
        s.sfx = v;
        audio.setEnabled(s.music, s.sfx);
        this.store.save();
      }),
    );
    const close = this.modal(
      h(
        'div.panel.pause',
        h('h2', t('pause.title')),
        h(
          'div.stack',
          this.btn(h('span', icon('play'), t('pause.resume')), () => close(), 'primary big'),
          this.btn(h('span', icon('restart'), t('pause.restart')), () => {
            close();
            this.active.restart();
          }, 'ghost'),
          this.btn(h('span', icon('home'), t('pause.home')), () => {
            close();
            this.goHome();
          }, 'ghost'),
        ),
        quick,
      ),
      true,
      () => this.active.resume(),
    );
  }

  private showEnd(info: EndInfo) {
    if (info.mode === 'adventure') return this.showLevelEnd(info);
    if (info.versus) return this.showVersusEnd(info);
    const s = info.session;
    const r = info.reward;
    const title =
      info.mode === 'cascade' ? t('over.topout') : info.reason === 'timeup' ? t('over.timeup') : info.reason === 'finished' ? t('over.finished') : t('over.title');
    const scoreEl = h('div.final-score', '0');
    const panel = h(
      'div.panel.gameover',
      h('h2', title),
      h('div.dim.upper', t('over.score')),
      scoreEl,
      r.newBest ? h('div.badge-best', t('over.newBest')) : h('div.dim', `${t('over.best')}: ${fmt(r.best)}`),
      h(
        'div.over-stats',
        h('div', h('small', t('over.lines')), h('b', fmt(s.lines))),
        'level' in s
          ? h('div', h('small', t('over.level')), h('b', String(s.level)))
          : h('div', h('small', t('over.bestCombo')), h('b', `x${s.bestCombo}`)),
      ),
      r.coins > 0 ? h('div.coins-won', coinIcon(), t('over.coins', { n: r.coins })) : null,
      h(
        'div.btn-row',
        this.btn(h('span', icon('home'), t('over.home')), () => this.goHome(), 'ghost'),
        this.btn(h('span', icon('restart'), t('over.again')), () => this.startGame(info.mode), 'primary'),
      ),
    );
    this.modal(panel, false);
    countUp(scoreEl, 0, s.score, 900, fmt);
    if (r.newBest) setTimeout(() => audio.play('unlock'), 500);
    if (r.coins > 0) setTimeout(() => audio.play('coin'), 950);
  }

  private showLevelEnd(info: EndInfo) {
    const lv = info.level!;
    const r = info.reward;
    const won = info.reason === 'win';
    const stars = h('div.big-stars.animated', ...[1, 2, 3].map(() => icon('star')));
    const next = LEVELS.find((l) => l.id === lv.id + 1);
    const panel = h(
      `div.panel.level-end${won ? '.won' : '.lost'}`,
      h('h2', won ? t('level.win') : t('level.fail')),
      h('div.dim', t('level.title', { n: lv.id })),
      won ? stars : null,
      h('div.final-score', fmt(info.session.score)),
      !won ? this.goalList(lv) : null,
      r.coins > 0 ? h('div.coins-won', coinIcon(), t('over.coins', { n: r.coins })) : null,
      h(
        'div.btn-row',
        this.btn(h('span', icon('map'), t('level.map')), () => {
          this.game.leave();
          this.closeAllModals();
          this.show('adventure');
        }, 'ghost'),
        this.btn(h('span', icon('restart'), t('level.retry')), () => this.startGame('adventure', lv.id), won ? 'ghost' : 'primary'),
        won && next ? this.btn(h('span', t('level.next'), icon('play')), () => this.startGame('adventure', next.id), 'primary') : null,
      ),
    );
    this.modal(panel, false);
    if (won) {
      const n = r.stars ?? 1;
      [...stars.children].forEach((el, i) => {
        if (i < n)
          setTimeout(() => {
            el.classList.add('on', 'pop');
            audio.play('coin');
            haptics.vibrate(15);
          }, 350 + i * 330);
      });
    }
  }

  // =============== VERSUS ===============

  /** Elegir dificultad del bot antes de empezar. */
  private showVersusSetup() {
    let pick: Difficulty = this.d.versus.difficulty;
    const opts = DIFFICULTY_IDS.map((id) => {
      const def = DIFFICULTIES[id];
      const el = h(
        `button.diff-opt.d-${id}${id === pick ? '.on' : ''}`,
        {
          onclick: () => {
            pick = id;
            audio.play('click');
            haptics.vibrate(6);
            opts.forEach((o) => o.classList.toggle('on', o === el));
          },
          'aria-pressed': String(id === pick),
        },
        h('div.diff-text', h('b', t(`vs.${id}` as never)), h('small', t(`vs.${id}.desc` as never))),
        h('div.diff-side', h('span.diff-mult', coinIcon(), `x${def.mult}`), h('small', t('vs.wins', { n: fmt(this.d.versus.wins[id]) }))),
      );
      return el;
    });
    const close = this.modal(
      h(
        'div.panel.versus-setup',
        h('h2', t('vs.pick')),
        h('div.diff-list', ...opts),
        h('p.dim.vs-rules', t('vs.rules')),
        h(
          'div.btn-row',
          this.btn(t('menu.back'), () => close(), 'ghost'),
          this.btn(h('span', icon('swords'), t('vs.start')), () => {
            this.d.versus.difficulty = pick;
            this.store.save();
            this.startGame('versus', undefined, pick);
          }, 'primary'),
        ),
      ),
      true,
    );
  }

  private showVersusEnd(info: EndInfo) {
    const v = info.versus!;
    const s = info.session;
    const r = info.reward;
    const title = v.outcome === 'win' ? t('over.win') : v.outcome === 'lose' ? t('over.lose') : t('over.draw');
    const scoreEl = h('div.final-score', '0');
    const panel = h(
      `div.panel.gameover.vs-end.${v.outcome}`,
      h('h2', title),
      h('div.dim.upper', `${t('mode.versus')} · ${t(`vs.${v.difficulty}` as never)}`),
      h(
        'div.vs-scores',
        h('div', h('small', t('vs.you')), scoreEl),
        h('span.vs-vs', 'VS'),
        h('div', h('small', t('vs.bot')), h('div.final-score.bot', fmt(v.botScore))),
      ),
      h(
        'div.over-stats',
        h('div', h('small', t('over.lines')), h('b', fmt(s.lines))),
        h('div', h('small', t('over.bestCombo')), h('b', `x${s.bestCombo}`)),
      ),
      r.coins > 0 ? h('div.coins-won', coinIcon(), t('over.coins', { n: r.coins }), h('span.mult-tag', `x${v.mult}`)) : null,
      h(
        'div.btn-row',
        this.btn(h('span', icon('home'), t('over.home')), () => this.goHome(), 'ghost'),
        this.btn(h('span', icon('restart'), t('over.again')), () => this.startGame('versus', undefined, v.difficulty), 'primary'),
      ),
    );
    this.modal(panel, false);
    countUp(scoreEl, 0, s.score, 900, fmt);
    if (v.outcome === 'win') setTimeout(() => audio.play('unlock'), 500);
    if (r.coins > 0) setTimeout(() => audio.play('coin'), 950);
  }

  // =============== recompensas / toasts ===============

  private maybeDailyReward() {
    const pending = this.progress.pendingLoginReward();
    if (!pending) return;
    const close = this.modal(
      h(
        'div.panel.daily-reward',
        h('div.reward-burst', coinIcon('huge')),
        h('h2', t('daily.rewardTitle')),
        h('p', t('daily.rewardText', { n: pending.streak })),
        h('div.streak-row', ...[1, 2, 3, 4, 5, 6, 7].map((k) => h(`i${k <= Math.min(7, pending.streak) ? '.on' : ''}`, String(k)))),
        this.btn(h('span', coinIcon(), t('daily.claim', { n: pending.coins })), () => {
          const before = this.d.coins;
          this.progress.claimLoginReward();
          audio.play('coin');
          haptics.vibrate([15, 30, 15]);
          this.refreshCoins(before);
          close();
        }, 'primary big'),
      ),
      false,
    );
  }

  toast(list: AchievementDef[]) {
    this.toastQueue.push(...list);
    if (!this.toastBusy) this.nextToast();
  }

  private nextToast() {
    const a = this.toastQueue.shift();
    if (!a) {
      this.toastBusy = false;
      return;
    }
    this.toastBusy = true;
    const el = h(
      'div.toast',
      h('div.ach-ico', icon('trophy')),
      h('div', h('small', t('ach.unlocked')), h('b', t(`ach.${a.id}.name` as never))),
      h('div.ach-reward', coinIcon(), `+${a.reward}`),
    );
    this.toastHost.appendChild(el);
    audio.play('unlock');
    setTimeout(() => el.classList.add('leaving'), 2600);
    setTimeout(() => {
      el.remove();
      this.refreshCoins();
      this.nextToast();
    }, 2950);
  }
}
