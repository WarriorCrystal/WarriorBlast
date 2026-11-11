import { Board } from './board';
import { COLOR_COUNT, SHAPES, type Piece, type Shape } from './pieces';
import type { Rng } from './rng';

/**
 * Generador de piezas justo y progresivo.
 *
 * difficulty ∈ [0,1]:
 *  - 0: muchas piezas pequeñas/amables, casi siempre se garantiza que las 3 piezas
 *       se puedan colocar en algún orden, y a menudo aparece una pieza "salvavidas"
 *       que completa una línea.
 *  - 1: más piezas grandes e incómodas y menos ayudas.
 *
 * Garantía dura: si alguna forma del catálogo cabe en el tablero, al menos una pieza del set cabe.
 */
export interface DealOptions {
  difficulty: number;
  /** Probabilidad por pieza de llevar una gema (Aventura). */
  gemChance?: number;
  /** Ajustes finos (tests / niveles). */
  maxTier?: number;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export function tierFactor(tier: number, d: number): number {
  switch (tier) {
    case 0:
      return lerp(1.7, 0.75, d);
    case 1:
      return lerp(0.9, 1.05, d);
    case 2:
      return lerp(0.28, 1.15, d);
    default:
      return lerp(0.06, 1.25, d);
  }
}

export function shapeWeights(d: number, maxTier = 3): number[] {
  return SHAPES.map((s) => (s.tier > maxTier ? 0 : s.weight * tierFactor(s.tier, clamp01(d))));
}

function makePiece(shape: Shape, rng: Rng, used: Set<number>, gemChance: number): Piece {
  let color = 1 + rng.int(COLOR_COUNT);
  for (let tries = 0; tries < 6 && used.has(color); tries++) color = 1 + rng.int(COLOR_COUNT);
  used.add(color);
  const gems: number[] = [];
  if (gemChance > 0 && rng.next() < gemChance) gems.push(rng.int(shape.cells.length));
  return { shape, color, gems };
}

/** ¿Se pueden colocar todas las piezas en algún orden (simulando limpiezas)? */
export function solvable(board: Board, shapes: Shape[], budget = { n: 2500 }): boolean {
  if (shapes.length === 0) return true;
  for (let i = 0; i < shapes.length; i++) {
    const s = shapes[i];
    const rest = shapes.filter((_, j) => j !== i);
    for (const [x, y] of board.positionsFor(s)) {
      if (--budget.n < 0) return true; // presupuesto agotado: asumimos que sí (evita bloqueos de CPU)
      const b = board.clone();
      b.place(s, x, y, 1);
      b.clearLines(b.fullLines());
      if (solvable(b, rest, budget)) return true;
    }
  }
  return false;
}

/** Formas (tier ≤ 2) que en algún sitio completarían al menos una línea. */
export function helpfulShapes(board: Board): Shape[] {
  const out: Shape[] = [];
  for (const s of SHAPES) {
    if (s.tier > 2) continue;
    for (const [x, y] of board.positionsFor(s)) {
      const l = board.linesIfPlaced(s, x, y);
      if (l.rows.length + l.cols.length > 0) {
        out.push(s);
        break;
      }
    }
  }
  return out;
}

export function dealSet(board: Board, rng: Rng, opts: DealOptions): Piece[] {
  const d = clamp01(opts.difficulty);
  const gemChance = opts.gemChance ?? 0;
  const weights = shapeWeights(d, opts.maxTier);
  const fill = board.countFilled() / 64;

  // Probabilidad de exigir que el set completo sea colocable y de dar un "salvavidas".
  const requireSolvable = rng.next() < lerp(1, 0.6, d);
  const helpChance = clamp01(lerp(0.35, 0.1, d) + (fill > 0.5 ? 0.25 : 0));

  // Con dificultad baja se generan varios sets válidos y se elige el más "amable"
  // (más posiciones posibles); al subir la dificultad se coge el primero válido.
  const wanted = rng.next() < (1 - d) * (fill > 0.35 ? 1 : 0.6) ? 3 : 1;
  const candidates: Shape[][] = [];
  for (let attempt = 0; attempt < 30 && candidates.length < wanted; attempt++) {
    const shapes: Shape[] = [];
    for (let i = 0; i < 3; i++) shapes.push(SHAPES[rng.weighted(weights)]);

    if (attempt === 0 && fill > 0.25 && rng.next() < helpChance) {
      const help = helpfulShapes(board);
      if (help.length) shapes[rng.int(3)] = rng.pick(help);
    }

    if (!shapes.some((s) => board.fitsAnywhere(s))) continue;
    if (requireSolvable && attempt < 24 && !solvable(board, shapes)) continue;
    candidates.push(shapes);
  }
  if (candidates.length) {
    let best = candidates[0];
    if (candidates.length > 1) {
      const mobility = (set: Shape[]) => set.reduce((a, s) => a + Math.min(12, board.positionsFor(s).length), 0);
      best = candidates.reduce((a, b) => (mobility(b) > mobility(a) ? b : a));
    }
    const used = new Set<number>();
    return best.map((s) => makePiece(s, rng, used, gemChance));
  }

  // Último recurso: piezas que quepan, priorizando las más pequeñas.
  const fitting = SHAPES.filter((s) => board.fitsAnywhere(s)).sort((a, b) => a.cells.length - b.cells.length);
  const used = new Set<number>();
  const pool = fitting.length ? fitting.slice(0, Math.max(3, Math.ceil(fitting.length / 3))) : SHAPES.slice(0, 1);
  return [0, 1, 2].map(() => makePiece(rng.pick(pool), rng, used, gemChance));
}

/**
 * Secuencia pura (no depende del tablero): la usa el Desafío diario para que la
 * secuencia de piezas sea idéntica para todo el mundo ese día.
 */
export function dealPure(rng: Rng, difficulty: number): Piece[] {
  const weights = shapeWeights(difficulty);
  const used = new Set<number>();
  return [0, 1, 2].map(() => makePiece(SHAPES[rng.weighted(weights)], rng, used, 0));
}

/** Curva de dificultad del modo Clásico según la puntuación. */
export function classicDifficulty(score: number, moves: number): number {
  const byScore = Math.pow(clamp01(score / 16000), 0.75);
  const byMoves = clamp01(moves / 400) * 0.3;
  return clamp01(Math.max(byScore, byMoves));
}

/** ¿Alguna forma del catálogo cabe? (si no, ningún generador podría ayudar) */
export function anyShapeFits(board: Board): boolean {
  return SHAPES.some((s) => board.fitsAnywhere(s));
}
