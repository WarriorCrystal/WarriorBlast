/**
 * Modo Cascada: piezas de 4 bloques que caen en un pozo de 10×20.
 * Lógica pura (sin DOM), determinista con la semilla: la vista solo lee el estado
 * y consume `events` cada fotograma.
 *
 * - Bolsa de 7: cada tanda de 7 piezas trae una de cada tipo, en orden aleatorio.
 * - Rotación con "patadas" de pared estándar (si la rotación choca, prueba 4 desplazamientos).
 * - Reserva (una vez por pieza), sombra de caída, 5 piezas de vista previa.
 * - Retardo de bloqueo de 500 ms que se reinicia al mover/rotar (máx. 15 veces).
 * - Nivel = 1 + líneas/10; la gravedad acelera con el nivel.
 */
import { Rng } from './rng';
import type { EndReason } from './session';

export const COLS = 10;
export const ROWS = 20;
/** Filas ocultas por encima del pozo donde aparecen las piezas. */
export const HIDDEN = 2;
export const TOTAL_ROWS = ROWS + HIDDEN;

export const LOCK_DELAY_MS = 500;
export const MAX_LOCK_RESETS = 15;
export const CLEAR_DELAY_MS = 300;
export const LINES_PER_LEVEL = 10;
export const MAX_LEVEL = 20;
export const PREVIEW = 5;
export const SOFT_DROP_FACTOR = 20;
export const PERFECT_CLEAR_BONUS = 1000;

export type Kind = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';
export const KINDS: Kind[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

/** Color de skin (1..7) de cada tipo de pieza. */
export const KIND_COLOR: Record<Kind, number> = { I: 4, O: 7, T: 5, S: 3, Z: 1, J: 6, L: 2 };

type Cell = [number, number];

/** Forma en su caja de spawn (y hacia abajo). */
const SPAWN: Record<Kind, { n: number; cells: Cell[] }> = {
  I: { n: 4, cells: [[0, 1], [1, 1], [2, 1], [3, 1]] },
  O: { n: 2, cells: [[0, 0], [1, 0], [0, 1], [1, 1]] },
  T: { n: 3, cells: [[1, 0], [0, 1], [1, 1], [2, 1]] },
  S: { n: 3, cells: [[1, 0], [2, 0], [0, 1], [1, 1]] },
  Z: { n: 3, cells: [[0, 0], [1, 0], [1, 1], [2, 1]] },
  J: { n: 3, cells: [[0, 0], [0, 1], [1, 1], [2, 1]] },
  L: { n: 3, cells: [[2, 0], [0, 1], [1, 1], [2, 1]] },
};

/** SHAPES[kind][rot] = celdas relativas a la caja. rot 0..3 en sentido horario. */
export const SHAPES: Record<Kind, Cell[][]> = Object.fromEntries(
  KINDS.map((k) => {
    const { n, cells } = SPAWN[k];
    const rots: Cell[][] = [cells];
    for (let r = 1; r < 4; r++) rots.push(rots[r - 1].map(([x, y]) => [n - 1 - y, x] as Cell));
    return [k, rots];
  }),
) as Record<Kind, Cell[][]>;

export const BOX: Record<Kind, number> = Object.fromEntries(KINDS.map((k) => [k, SPAWN[k].n])) as Record<Kind, number>;

// Tablas de patadas (notación estándar con y hacia arriba; se invierte al usarlas).
const KICKS_JLSTZ: Record<string, Cell[]> = {
  '01': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '10': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '12': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '21': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '23': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  '32': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '30': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '03': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
};
const KICKS_I: Record<string, Cell[]> = {
  '01': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  '10': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  '12': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
  '21': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  '23': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  '32': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  '30': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  '03': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
};

export interface Active {
  kind: Kind;
  rot: number;
  x: number;
  y: number;
}

export interface ClearedRowCell {
  x: number;
  y: number;
  color: number;
}

export type CascadeEvent =
  | { type: 'spawn' }
  | { type: 'move' }
  | { type: 'rotate'; kicked: boolean }
  | { type: 'hold' }
  | { type: 'lock'; cells: Cell[]; color: number; drop: number }
  | {
      type: 'clear';
      rows: number[];
      cells: ClearedRowCell[];
      lines: number;
      points: number;
      combo: number;
      backToBack: boolean;
      perfect: boolean;
      praise: number | null;
    }
  | { type: 'collapse' }
  | { type: 'levelup'; level: number }
  | { type: 'end'; reason: EndReason };

/** Segundos por fila según el nivel (curva clásica del género). */
export function gravitySeconds(level: number): number {
  const l = Math.min(MAX_LEVEL, Math.max(1, level));
  return Math.pow(0.8 - (l - 1) * 0.007, l - 1);
}

/** Puntos base por líneas a la vez (antes de multiplicar por el nivel). */
export function cascadeLinePoints(lines: number): number {
  return [0, 100, 300, 500, 800][Math.min(4, lines)] ?? 0;
}

export class CascadeSession {
  readonly mode = 'cascade' as const;
  readonly grid = new Uint8Array(COLS * TOTAL_ROWS);
  readonly rng: Rng;
  active: Active | null = null;
  hold: Kind | null = null;
  holdUsed = false;
  queue: Kind[] = [];
  score = 0;
  lines = 0;
  level = 1;
  combo = 0;
  bestCombo = 0;
  maxLinesAtOnce = 0;
  perfectClears = 0;
  pieces = 0;
  ended: EndReason | null = null;
  /** Filas que se están limpiando (animación); el juego se detiene mientras tanto. */
  clearing: number[] | null = null;
  events: CascadeEvent[] = [];

  private softDropping = false;
  private fallAcc = 0;
  private lockTimer = 0;
  private lockResets = 0;
  private lowestY = 0;
  private clearTimer = 0;
  private lastWasQuad = false;

  constructor(seed: number) {
    this.rng = new Rng(seed);
    this.fillQueue();
    this.spawn();
  }

  // ---------- consultas ----------

  get(x: number, y: number): number {
    return this.grid[y * COLS + x];
  }

  cellsOf(kind: Kind, rot: number, x: number, y: number): Cell[] {
    return SHAPES[kind][rot & 3].map(([cx, cy]) => [x + cx, y + cy] as Cell);
  }

  fits(kind: Kind, rot: number, x: number, y: number): boolean {
    for (const [cx, cy] of SHAPES[kind][rot & 3]) {
      const gx = x + cx;
      const gy = y + cy;
      if (gx < 0 || gx >= COLS || gy >= TOTAL_ROWS) return false;
      if (gy >= 0 && this.grid[gy * COLS + gx]) return false;
    }
    return true;
  }

  /** Y donde quedaría la pieza activa si cayera del todo. */
  ghostY(): number {
    const a = this.active;
    if (!a) return 0;
    let y = a.y;
    while (this.fits(a.kind, a.rot, a.x, y + 1)) y++;
    return y;
  }

  get onGround(): boolean {
    const a = this.active;
    return !!a && !this.fits(a.kind, a.rot, a.x, a.y + 1);
  }

  get running(): boolean {
    return !this.ended && !this.clearing && !!this.active;
  }

  // ---------- acciones ----------

  move(dx: number): boolean {
    const a = this.active;
    if (!this.running || !a) return false;
    if (!this.fits(a.kind, a.rot, a.x + dx, a.y)) return false;
    a.x += dx;
    this.afterManipulation();
    this.events.push({ type: 'move' });
    return true;
  }

  rotate(dir: 1 | -1): boolean {
    const a = this.active;
    if (!this.running || !a || a.kind === 'O') return false;
    const from = a.rot & 3;
    const to = (from + dir + 4) & 3;
    const table = a.kind === 'I' ? KICKS_I : KICKS_JLSTZ;
    const kicks = table[`${from}${to}`];
    for (let i = 0; i < kicks.length; i++) {
      const [kx, ky] = kicks[i];
      const nx = a.x + kx;
      const ny = a.y - ky; // la tabla usa y hacia arriba
      if (this.fits(a.kind, to, nx, ny)) {
        a.rot = to;
        a.x = nx;
        a.y = ny;
        this.afterManipulation();
        this.events.push({ type: 'rotate', kicked: i > 0 });
        return true;
      }
    }
    return false;
  }

  setSoftDrop(on: boolean) {
    this.softDropping = on;
  }

  hardDrop() {
    const a = this.active;
    if (!this.running || !a) return;
    const gy = this.ghostY();
    const dist = gy - a.y;
    a.y = gy;
    this.score += dist * 2;
    this.lock(dist);
  }

  holdPiece(): boolean {
    const a = this.active;
    if (!this.running || !a || this.holdUsed) return false;
    const prev = this.hold;
    this.hold = a.kind;
    this.holdUsed = true;
    this.events.push({ type: 'hold' });
    this.spawn(prev ?? undefined);
    return true;
  }

  /** Avanza la simulación dtMs milisegundos. */
  update(dtMs: number) {
    if (this.ended) return;
    if (this.clearing) {
      this.clearTimer -= dtMs;
      if (this.clearTimer <= 0) this.finishClear();
      return;
    }
    const a = this.active;
    if (!a) return;
    const g = gravitySeconds(this.level) * 1000;
    const rowMs = this.softDropping ? Math.min(g, Math.max(16, g / SOFT_DROP_FACTOR)) : g;
    this.fallAcc += dtMs;
    while (this.fallAcc >= rowMs && this.active === a) {
      this.fallAcc -= rowMs;
      if (this.fits(a.kind, a.rot, a.x, a.y + 1)) {
        a.y++;
        if (this.softDropping) this.score += 1;
        if (a.y > this.lowestY) {
          // bajar a una fila nueva devuelve los reinicios de bloqueo
          this.lowestY = a.y;
          this.lockResets = 0;
          this.lockTimer = 0;
        }
      } else {
        this.fallAcc = 0;
        break;
      }
    }
    if (this.active === a && this.onGround) {
      this.lockTimer += dtMs;
      if (this.lockTimer >= LOCK_DELAY_MS) this.lock(0);
    }
  }

  abandon() {
    if (!this.ended) this.ended = 'gameover';
  }

  // ---------- internos ----------

  private afterManipulation() {
    if (this.onGround || this.lockTimer > 0) {
      if (this.lockResets < MAX_LOCK_RESETS) {
        this.lockResets++;
        this.lockTimer = 0;
      }
    }
  }

  private fillQueue() {
    while (this.queue.length < PREVIEW + 1) {
      const bag = KINDS.slice();
      for (let i = bag.length - 1; i > 0; i--) {
        const j = this.rng.int(i + 1);
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
      this.queue.push(...bag);
    }
  }

  private spawn(kind?: Kind) {
    const k = kind ?? this.queue.shift()!;
    this.fillQueue();
    const n = BOX[k];
    const x = Math.floor((COLS - n) / 2);
    // la fila inferior de la pieza aparece en la primera fila visible
    const y = HIDDEN - 1;
    this.active = { kind: k, rot: 0, x, y };
    this.fallAcc = 0;
    this.lockTimer = 0;
    this.lockResets = 0;
    this.lowestY = y;
    if (!this.fits(k, 0, x, y)) {
      this.active = null;
      this.end('gameover');
      return;
    }
    this.events.push({ type: 'spawn' });
  }

  private lock(drop: number) {
    const a = this.active!;
    const color = KIND_COLOR[a.kind];
    const cells = this.cellsOf(a.kind, a.rot, a.x, a.y);
    let allHidden = true;
    for (const [x, y] of cells) {
      if (y >= 0) this.grid[y * COLS + x] = color;
      if (y >= HIDDEN) allHidden = false;
    }
    this.active = null;
    this.pieces++;
    this.holdUsed = false;
    this.events.push({ type: 'lock', cells, color, drop });

    const rows: number[] = [];
    for (let y = 0; y < TOTAL_ROWS; y++) {
      let full = true;
      for (let x = 0; x < COLS; x++) if (!this.grid[y * COLS + x]) { full = false; break; }
      if (full) rows.push(y);
    }

    if (!rows.length) {
      this.combo = 0;
      if (allHidden) return this.end('gameover');
      this.spawn();
      return;
    }

    const n = rows.length;
    this.combo++;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    this.maxLinesAtOnce = Math.max(this.maxLinesAtOnce, n);
    const quad = n >= 4;
    const backToBack = quad && this.lastWasQuad;
    this.lastWasQuad = quad;
    let points = cascadeLinePoints(n) * this.level;
    if (backToBack) points = Math.floor(points * 1.5);
    points += 50 * Math.max(0, this.combo - 1) * this.level;

    // ¿quedará vacío el pozo?
    const rowSet = new Set(rows);
    let perfect = true;
    for (let y = 0; y < TOTAL_ROWS && perfect; y++) {
      if (rowSet.has(y)) continue;
      for (let x = 0; x < COLS; x++) if (this.grid[y * COLS + x]) { perfect = false; break; }
    }
    if (perfect) {
      points += PERFECT_CLEAR_BONUS * this.level;
      this.perfectClears++;
    }
    this.score += points;
    const cleared: ClearedRowCell[] = [];
    for (const y of rows) for (let x = 0; x < COLS; x++) cleared.push({ x, y, color: this.grid[y * COLS + x] });

    const praise = perfect ? 5 : n >= 4 ? (backToBack ? 4 : 3) : n === 3 ? 2 : n === 2 ? 1 : this.combo >= 3 ? 0 : null;
    this.events.push({ type: 'clear', rows, cells: cleared, lines: n, points, combo: this.combo, backToBack, perfect, praise });

    const prevLevel = this.level;
    this.lines += n;
    this.level = Math.min(MAX_LEVEL, 1 + Math.floor(this.lines / LINES_PER_LEVEL));
    if (this.level > prevLevel) this.events.push({ type: 'levelup', level: this.level });

    this.clearing = rows;
    this.clearTimer = CLEAR_DELAY_MS;
  }

  private finishClear() {
    const rows = this.clearing!;
    this.clearing = null;
    const keep: Uint8Array[] = [];
    const rowSet = new Set(rows);
    for (let y = 0; y < TOTAL_ROWS; y++) if (!rowSet.has(y)) keep.push(this.grid.slice(y * COLS, y * COLS + COLS));
    this.grid.fill(0);
    const offset = TOTAL_ROWS - keep.length;
    keep.forEach((r, i) => this.grid.set(r, (offset + i) * COLS));
    this.events.push({ type: 'collapse' });
    this.spawn();
  }

  private end(reason: EndReason) {
    this.ended = reason;
    this.events.push({ type: 'end', reason });
  }
}
