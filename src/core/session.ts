import { Board, MARK_GEM, MARK_TARGET, type ClearedCell } from './board';
import { classicDifficulty, dealSet } from './generator';
import { MOVE_BONUS, starsFor, type Goal, type LevelDef } from './level';
import { shapeFrom, type Piece } from './pieces';
import { Rng } from './rng';
import { advanceCombo, clearPoints, placePoints, praiseLevel } from './scoring';

export type ModeId = 'classic' | 'timeattack' | 'versus' | 'zen' | 'adventure' | 'tutorial' | 'cascade';
export type EndReason = 'gameover' | 'timeup' | 'finished' | 'win' | 'fail';

export const TIME_ATTACK_MS = 120_000;
export const TIME_PER_LINE_MS = 1_500;
export const TIME_PER_COMBO_MS = 700;
export const STUCK_PENALTY_MS = 8_000;

export interface SessionOptions {
  mode: ModeId;
  seed: number;
  level?: LevelDef;
}

export interface MoveResult {
  slot: number;
  piece: Piece;
  x: number;
  y: number;
  placed: number[];
  rows: number[];
  cols: number[];
  cleared: ClearedCell[];
  lines: number;
  points: number;
  placePts: number;
  clearPts: number;
  combo: number;
  mult: number;
  perfect: boolean;
  praise: number | null;
  gems: number;
  targets: number;
  timeBonusMs: number;
  /** Se repartió una bandeja nueva. */
  refilled: boolean;
  /** Atasco resuelto repartiendo nuevas piezas (Zen / Contrarreloj / Tutorial). */
  stuckRefresh: boolean;
  timePenaltyMs: number;
  ended: EndReason | null;
  /** Solo Aventura al ganar. */
  moveBonus: number;
  stars: 0 | 1 | 2 | 3;
}

interface Snapshot {
  cells: Uint8Array;
  marks: Uint8Array;
  tray: Array<Piece | null>;
  score: number;
  combo: number;
  movesSinceClear: number;
  moves: number;
  lines: number;
  gems: number;
  targetsCleared: number;
  bestCombo: number;
  rng: number;
  rounds: number;
}

export class GameSession {
  readonly mode: ModeId;
  readonly level?: LevelDef;
  board: Board;
  tray: Array<Piece | null> = [null, null, null];
  score = 0;
  combo = 0;
  movesSinceClear = 0;
  moves = 0;
  lines = 0;
  bestCombo = 0;
  maxLinesAtOnce = 0;
  perfectClears = 0;
  gems = 0;
  targetsTotal = 0;
  targetsCleared = 0;
  timeLeftMs = 0;
  rounds = 0;
  ended: EndReason | null = null;
  readonly rng: Rng;
  private undoStack: Snapshot[] = [];

  constructor(opts: SessionOptions) {
    this.mode = opts.mode;
    this.level = opts.level;
    this.rng = new Rng(opts.level?.seed ?? opts.seed);
    this.board = opts.level?.board ? Board.fromAscii(opts.level.board) : new Board();
    this.targetsTotal = this.board.countMark(MARK_TARGET);
    if (this.mode === 'timeattack') this.timeLeftMs = TIME_ATTACK_MS;
    this.refill();
    this.resolveStuck();
  }

  // ---------- consultas ----------

  get difficulty(): number {
    switch (this.mode) {
      case 'classic':
        return classicDifficulty(this.score, this.moves);
      case 'timeattack':
        return Math.min(0.9, classicDifficulty(this.score * 1.4, this.moves));
      case 'zen':
        return 0.2;
      case 'versus':
        return Math.min(0.85, 0.15 + classicDifficulty(this.score * 1.5, this.moves) * 0.7);
      default:
        return this.level?.difficulty ?? 0.3;
    }
  }

  get movesLeft(): number | null {
    return this.level?.moves != null ? Math.max(0, this.level.moves - this.moves) : null;
  }

  get canUndo(): boolean {
    return this.mode === 'zen' && this.undoStack.length > 0 && !this.ended;
  }

  canPlace(slot: number, x: number, y: number): boolean {
    const p = this.tray[slot];
    return !!p && !this.ended && this.board.canPlace(p.shape, x, y);
  }

  /** ¿Alguna pieza de la bandeja cabe? */
  hasMove(): boolean {
    return this.tray.some((p) => p && this.board.fitsAnywhere(p.shape));
  }

  goalProgress(goal: Goal): { current: number; target: number; done: boolean } {
    let current = 0;
    let target = 0;
    switch (goal.type) {
      case 'score':
        current = this.score;
        target = goal.target;
        break;
      case 'lines':
        current = this.lines;
        target = goal.target;
        break;
      case 'gems':
        current = this.gems;
        target = goal.target;
        break;
      case 'combo':
        current = this.bestCombo;
        target = goal.target;
        break;
      case 'targets':
        current = this.targetsCleared;
        target = this.targetsTotal;
        break;
    }
    return { current: Math.min(current, target), target, done: current >= target };
  }

  goalsDone(): boolean {
    return !!this.level && this.level.goals.every((g) => this.goalProgress(g).done);
  }

  // ---------- acciones ----------

  place(slot: number, x: number, y: number): MoveResult | null {
    if (!this.canPlace(slot, x, y)) return null;
    if (this.mode === 'zen') this.pushUndo();
    const piece = this.tray[slot]!;
    const placed = this.board.place(piece.shape, x, y, piece.color, piece.gems);
    this.tray[slot] = null;
    this.moves++;

    const lines = this.board.fullLines();
    const cleared = this.board.clearLines(lines);
    const nLines = lines.rows.length + lines.cols.length;
    const perfect = nLines > 0 && this.board.isEmpty();

    const c = advanceCombo({ combo: this.combo, movesSinceClear: this.movesSinceClear }, nLines);
    this.combo = c.combo;
    this.movesSinceClear = c.movesSinceClear;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    this.maxLinesAtOnce = Math.max(this.maxLinesAtOnce, nLines);
    if (perfect) this.perfectClears++;

    const placePts = placePoints(piece.shape.cells.length);
    const clearPts = clearPoints(nLines, c.mult, perfect);
    this.score += placePts + clearPts;
    this.lines += nLines;

    let gems = 0;
    let targets = 0;
    for (const cell of cleared) {
      if (cell.mark === MARK_GEM) gems++;
      if (cell.mark === MARK_TARGET) targets++;
    }
    this.gems += gems;
    this.targetsCleared += targets;

    let timeBonusMs = 0;
    if (this.mode === 'timeattack' && nLines > 0) {
      timeBonusMs = nLines * TIME_PER_LINE_MS + Math.max(0, this.combo - 1) * TIME_PER_COMBO_MS;
      this.timeLeftMs += timeBonusMs;
    }

    const res: MoveResult = {
      slot,
      piece,
      x,
      y,
      placed,
      rows: lines.rows,
      cols: lines.cols,
      cleared,
      lines: nLines,
      points: placePts + clearPts,
      placePts,
      clearPts,
      combo: this.combo,
      mult: c.mult,
      perfect,
      praise: praiseLevel(nLines, this.combo, perfect),
      gems,
      targets,
      timeBonusMs,
      refilled: false,
      stuckRefresh: false,
      timePenaltyMs: 0,
      ended: null,
      moveBonus: 0,
      stars: 0,
    };

    // Aventura: victoria o derrota por movimientos
    if (this.mode === 'adventure' && this.level) {
      if (this.goalsDone()) {
        res.moveBonus = (this.movesLeft ?? 0) * MOVE_BONUS;
        this.score += res.moveBonus;
        res.stars = starsFor(this.level, this.score);
        return this.finish(res, 'win');
      }
      if (this.movesLeft === 0) return this.finish(res, 'fail');
    }

    if (this.tray.every((p) => p === null)) {
      if (this.mode === 'tutorial' && this.rounds >= (this.level?.sets?.length ?? 0)) return this.finish(res, 'win');
      this.refill();
      res.refilled = true;
    }

    if (!this.hasMove()) {
      const stuck = this.resolveStuck();
      if (stuck === 'refreshed') {
        res.stuckRefresh = true;
        if (this.mode === 'timeattack') res.timePenaltyMs = STUCK_PENALTY_MS;
      } else {
        return this.finish(res, this.mode === 'adventure' ? 'fail' : 'gameover');
      }
    }
    return res;
  }

  /** Avanza el reloj (Contrarreloj). Devuelve el motivo de fin si se acabó el tiempo. */
  update(dtMs: number): EndReason | null {
    if (this.ended || this.mode !== 'timeattack') return null;
    this.timeLeftMs -= dtMs;
    if (this.timeLeftMs <= 0) {
      this.timeLeftMs = 0;
      this.ended = 'timeup';
      return 'timeup';
    }
    return null;
  }

  undo(): boolean {
    if (!this.canUndo) return false;
    const s = this.undoStack.pop()!;
    this.board = new Board(s.cells, s.marks);
    this.tray = s.tray.slice();
    this.score = s.score;
    this.combo = s.combo;
    this.movesSinceClear = s.movesSinceClear;
    this.moves = s.moves;
    this.lines = s.lines;
    this.gems = s.gems;
    this.targetsCleared = s.targetsCleared;
    this.bestCombo = s.bestCombo;
    this.rng.state = s.rng;
    this.rounds = s.rounds;
    return true;
  }

  /** Termina desde fuera (Versus: el rival ganó, se acabó el tiempo o la basura bloqueó el tablero). */
  forceEnd(reason: EndReason) {
    if (!this.ended) this.ended = reason;
  }

  /** Termina voluntariamente (p. ej. salir al menú). */
  abandon() {
    if (!this.ended) this.ended = 'gameover';
  }

  // ---------- internos ----------

  private finish(res: MoveResult, reason: EndReason): MoveResult {
    this.ended = reason;
    res.ended = reason;
    return res;
  }

  private pushUndo() {
    this.undoStack.push({
      cells: new Uint8Array(this.board.cells),
      marks: new Uint8Array(this.board.marks),
      tray: this.tray.slice(),
      score: this.score,
      combo: this.combo,
      movesSinceClear: this.movesSinceClear,
      moves: this.moves,
      lines: this.lines,
      gems: this.gems,
      targetsCleared: this.targetsCleared,
      bestCombo: this.bestCombo,
      rng: this.rng.state,
      rounds: this.rounds,
    });
    if (this.undoStack.length > 40) this.undoStack.shift();
  }

  private refill() {
    const fixed = this.level?.sets?.[this.rounds];
    if (fixed) {
      this.tray = [0, 1, 2].map((i) => {
        const id = fixed[i];
        return id ? { shape: shapeFrom(id), color: 1 + ((this.rounds * 3 + i * 2) % 7), gems: [] } : null;
      });
    } else {
      this.tray = dealSet(this.board, this.rng, {
        difficulty: this.difficulty,
        gemChance: this.level?.gemChance ?? 0,
      });
    }
    this.rounds++;
  }

  /**
   * Si no hay jugada posible: en Zen/Contrarreloj/Tutorial se reparten piezas nuevas
   * (el generador garantiza que al menos una quepa). En el resto, es fin de partida.
   */
  private resolveStuck(): 'ok' | 'refreshed' | 'stuck' {
    if (this.hasMove()) return 'ok';
    if (this.mode === 'zen' || this.mode === 'timeattack' || this.mode === 'tutorial') {
      this.tray = dealSet(this.board, this.rng, { difficulty: 0 });
      if (this.mode === 'timeattack') this.timeLeftMs = Math.max(0, this.timeLeftMs - STUCK_PENALTY_MS);
      return this.hasMove() ? 'refreshed' : 'stuck';
    }
    return 'stuck';
  }
}
