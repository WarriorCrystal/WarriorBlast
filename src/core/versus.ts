import { Board, SIZE, STONE_COLOR } from './board';
import { dealSet } from './generator';
import { shapeFrom, type Shape } from './pieces';
import { Rng } from './rng';
import { GameSession, type MoveResult } from './session';

/**
 * Modo Versus: el jugador y un bot juegan a la vez, cada uno en su tablero.
 * Limpiar líneas carga un medidor; al llenarse se dispara un modificador
 * (bloques basura al rival, piezas pesadas al rival, escudo o limpieza propia).
 * Gana quien deje al rival sin jugadas o tenga más puntos al acabar el tiempo.
 */

export type Difficulty = 'easy' | 'medium' | 'hard';
export type Side = 'player' | 'bot';
export type Outcome = 'win' | 'lose' | 'draw';
export type ModifierId = 'junk' | 'heavy' | 'shield' | 'cleanse';

export interface DifficultyDef {
  id: Difficulty;
  /** Multiplicador de monedas al terminar. */
  mult: number;
  /** Tiempo que "piensa" el bot entre jugadas (ms). */
  think: [number, number];
}

export const DIFFICULTIES: Record<Difficulty, DifficultyDef> = {
  easy: { id: 'easy', mult: 1, think: [2600, 3800] },
  medium: { id: 'medium', mult: 1.5, think: [1500, 2300] },
  hard: { id: 'hard', mult: 2, think: [850, 1350] },
};
export const DIFFICULTY_IDS: Difficulty[] = ['easy', 'medium', 'hard'];

export const VERSUS_MS = 180_000;
export const CHARGE_MAX = 4;
export const JUNK_COUNT = 4;
export const CLEANSE_COUNT = 6;
/** Monedas extra (antes del multiplicador) por ganar. */
export const WIN_BONUS = 25;

/** Carga que aporta una jugada al medidor de modificadores. */
export function chargeFor(r: Pick<MoveResult, 'lines' | 'combo' | 'perfect'>): number {
  if (r.lines <= 0) return 0;
  return r.lines + (r.combo >= 3 ? 1 : 0) + (r.perfect ? 2 : 0);
}

/** ¿Llenar esta celda completaría una fila o columna? */
function completesLine(b: Board, k: number): boolean {
  const x = k % SIZE;
  const y = Math.floor(k / SIZE);
  let row = true;
  let col = true;
  for (let i = 0; i < SIZE; i++) {
    if (i !== x && !b.cells[y * SIZE + i]) row = false;
    if (i !== y && !b.cells[i * SIZE + x]) col = false;
  }
  return row || col;
}

/** Deja caer bloques de piedra en celdas vacías (sin completar líneas). Devuelve los índices. */
export function addJunk(b: Board, n: number, rng: Rng): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const free: number[] = [];
    for (let k = 0; k < SIZE * SIZE; k++) if (!b.cells[k] && !completesLine(b, k)) free.push(k);
    if (!free.length) break;
    const k = rng.pick(free);
    b.cells[k] = STONE_COLOR;
    b.marks[k] = 0;
    out.push(k);
  }
  return out;
}

/** Retira hasta n bloques de piedra. Devuelve los índices. */
export function removeJunk(b: Board, n: number, rng: Rng): number[] {
  const stones: number[] = [];
  for (let k = 0; k < SIZE * SIZE; k++) if (b.cells[k] === STONE_COLOR) stones.push(k);
  const out: number[] = [];
  while (out.length < n && stones.length) {
    const k = stones.splice(rng.int(stones.length), 1)[0];
    b.cells[k] = 0;
    b.marks[k] = 0;
    out.push(k);
  }
  return out;
}

export function countJunk(b: Board): number {
  let n = 0;
  for (let k = 0; k < SIZE * SIZE; k++) if (b.cells[k] === STONE_COLOR) n++;
  return n;
}

/** Cambia las piezas que quedan en la bandeja por otras grandes (al menos una cabe). */
export function makeHeavy(s: GameSession, rng: Rng): boolean {
  const slots = s.tray.map((p, i) => (p ? i : -1)).filter((i) => i >= 0);
  if (!slots.length) return false;
  for (let attempt = 0; attempt < 8; attempt++) {
    const set = dealSet(s.board, rng, { difficulty: 1 });
    const big = set.filter((p) => p.shape.cells.length >= 4);
    if (big.length < slots.length) continue;
    const next = s.tray.slice();
    slots.forEach((slot, i) => (next[slot] = big[i]));
    if (next.some((p) => p && s.board.fitsAnywhere(p.shape))) {
      s.tray = next;
      return true;
    }
  }
  return false;
}

// ======================= bot =======================

const PROBES: Shape[] = ['###/###/###', '#####', '#/#/#/#/#', '###/###', '##/##'].map(shapeFrom);

/** Valoración heurística de un tablero (más alto = mejor para quien juega en él). */
export function evaluateBoard(b: Board): number {
  const c = b.cells;
  let filled = 0;
  let holes = 0;
  let edges = 0;
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++) {
      const k = y * SIZE + x;
      const f = c[k] !== 0;
      if (f) filled++;
      // transiciones lleno/vacío: un tablero "liso" deja sitio a piezas grandes
      if (x < SIZE - 1 && f !== (c[k + 1] !== 0)) edges++;
      if (y < SIZE - 1 && f !== (c[k + SIZE] !== 0)) edges++;
      if (!f) {
        let walls = 0;
        if (x === 0 || c[k - 1]) walls++;
        if (x === SIZE - 1 || c[k + 1]) walls++;
        if (y === 0 || c[k - SIZE]) walls++;
        if (y === SIZE - 1 || c[k + SIZE]) walls++;
        if (walls >= 4) holes += 2;
        else if (walls === 3) holes++;
      }
    }
  let room = 0;
  for (const p of PROBES) if (b.fitsAnywhere(p)) room++;
  return -filled * 0.6 - holes * 4 - edges * 0.5 + room * 6;
}

export interface BotMove {
  slot: number;
  x: number;
  y: number;
}

/** Elige la jugada del bot según su dificultad. */
export function chooseBotMove(s: GameSession, difficulty: Difficulty, rng: Rng): BotMove | null {
  const all: Array<BotMove & { score: number }> = [];
  s.tray.forEach((p, slot) => {
    if (!p) return;
    for (const [x, y] of s.board.positionsFor(p.shape)) all.push({ slot, x, y, score: 0 });
  });
  if (!all.length) return null;
  if (difficulty === 'easy' && rng.next() < 0.45) return rng.pick(all);

  for (const m of all) {
    const p = s.tray[m.slot]!;
    const b = s.board.clone();
    b.place(p.shape, m.x, m.y, p.color);
    const lines = b.fullLines();
    const n = lines.rows.length + lines.cols.length;
    b.clearLines(lines);
    let score = n * 22 + (n > 1 ? n * 10 : 0) + (b.isEmpty() ? 80 : 0);
    if (difficulty !== 'easy') score += evaluateBoard(b);
    if (difficulty === 'hard') {
      // que las otras piezas de la bandeja sigan cabiendo
      s.tray.forEach((q, i) => {
        if (q && i !== m.slot && !b.fitsAnywhere(q.shape)) score -= 60;
      });
      if (s.combo >= 1 && n > 0) score += 8 * s.combo;
    }
    const noise = difficulty === 'easy' ? 30 : difficulty === 'medium' ? 9 : 1.5;
    m.score = score + rng.range(-noise, noise);
  }
  all.sort((a, b) => b.score - a.score);
  return all[0];
}

// ======================= partida =======================

export interface Fighter {
  side: Side;
  session: GameSession;
  charge: number;
  shield: boolean;
}

export interface ModifierEvent {
  from: Side;
  /** A quién afecta. */
  target: Side;
  mod: ModifierId;
  /** Bloqueado por escudo. */
  blocked: boolean;
  /** Celdas afectadas (basura añadida o retirada). */
  cells: number[];
}

export class VersusMatch {
  readonly difficulty: Difficulty;
  readonly player: Fighter;
  readonly bot: Fighter;
  timeLeftMs = VERSUS_MS;
  outcome: Outcome | null = null;
  readonly rng: Rng;
  private botRng: Rng;

  constructor(difficulty: Difficulty, seed: number) {
    this.difficulty = difficulty;
    this.rng = new Rng(seed ^ 0x5eed);
    this.botRng = new Rng(seed ^ 0xb07);
    this.player = { side: 'player', session: new GameSession({ mode: 'versus', seed }), charge: 0, shield: false };
    this.bot = { side: 'bot', session: new GameSession({ mode: 'versus', seed: (seed * 2654435761) >>> 0 }), charge: 0, shield: false };
  }

  get mult(): number {
    return DIFFICULTIES[this.difficulty].mult;
  }

  fighter(side: Side): Fighter {
    return side === 'player' ? this.player : this.bot;
  }

  other(side: Side): Fighter {
    return side === 'player' ? this.bot : this.player;
  }

  /** Milisegundos hasta la próxima jugada del bot. */
  botDelay(): number {
    const [a, b] = DIFFICULTIES[this.difficulty].think;
    return this.botRng.range(a, b);
  }

  /** El bot hace una jugada. Devuelve el resultado o null si no puede. */
  botMove(): MoveResult | null {
    const s = this.bot.session;
    if (s.ended || this.outcome) return null;
    const m = chooseBotMove(s, this.difficulty, this.botRng);
    if (!m) {
      s.forceEnd('gameover');
      return null;
    }
    return s.place(m.slot, m.x, m.y);
  }

  /** Tras una jugada: suma carga y, si se llena, dispara un modificador. */
  afterMove(side: Side, r: MoveResult): ModifierEvent | null {
    const me = this.fighter(side);
    me.charge += chargeFor(r);
    if (me.charge < CHARGE_MAX || this.outcome) return null;
    me.charge = 0;
    return this.fire(side, this.pickModifier(me));
  }

  private pickModifier(me: Fighter): ModifierId {
    const w: Record<ModifierId, number> = {
      junk: 45,
      heavy: 30,
      shield: me.shield ? 0 : 12,
      cleanse: countJunk(me.session.board) >= 3 ? 25 : 0,
    };
    const ids = Object.keys(w) as ModifierId[];
    return ids[this.rng.weighted(ids.map((k) => w[k]))];
  }

  /** Aplica un modificador lanzado por `from`. */
  fire(from: Side, mod: ModifierId): ModifierEvent {
    const me = this.fighter(from);
    const foe = this.other(from);
    const selfMod = mod === 'shield' || mod === 'cleanse';
    const target = selfMod ? me : foe;
    const ev: ModifierEvent = { from, target: target.side, mod, blocked: false, cells: [] };
    if (mod === 'shield') me.shield = true;
    else if (mod === 'cleanse') ev.cells = removeJunk(me.session.board, CLEANSE_COUNT, this.rng);
    else if (foe.shield) {
      foe.shield = false;
      ev.blocked = true;
    } else if (mod === 'junk') {
      ev.cells = addJunk(foe.session.board, JUNK_COUNT, this.rng);
    } else if (mod === 'heavy') {
      makeHeavy(foe.session, this.rng);
    }
    // la basura o las piezas pesadas pueden dejar al rival sin jugadas
    if (!ev.blocked && !selfMod && !foe.session.ended && !foe.session.hasMove()) foe.session.forceEnd('gameover');
    return ev;
  }

  /** Avanza el reloj; devuelve el resultado si la partida ha terminado. */
  update(dtMs: number): Outcome | null {
    if (this.outcome) return this.outcome;
    this.timeLeftMs = Math.max(0, this.timeLeftMs - dtMs);
    return this.check();
  }

  /** Comprueba fin de partida (alguien sin jugadas o tiempo agotado). */
  check(): Outcome | null {
    if (this.outcome) return this.outcome;
    const p = this.player.session;
    const b = this.bot.session;
    if (p.ended && b.ended) this.outcome = p.score > b.score ? 'win' : p.score < b.score ? 'lose' : 'draw';
    else if (p.ended) this.outcome = 'lose';
    else if (b.ended) this.outcome = 'win';
    else if (this.timeLeftMs <= 0) this.outcome = p.score > b.score ? 'win' : p.score < b.score ? 'lose' : 'draw';
    if (this.outcome) {
      if (!p.ended) p.forceEnd('finished');
      if (!b.ended) b.forceEnd('finished');
    }
    return this.outcome;
  }
}

