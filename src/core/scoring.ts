/**
 * Reglas de puntuación y combos.
 *
 * - Colocar: +1 punto por celda.
 * - Limpiar L líneas en una jugada: base = 80·L + 40·L·(L-1)  (1→80, 2→240, 3→480, 4→800…)
 * - Combo: cada jugada que limpia sube la racha; la racha sobrevive hasta COMBO_GRACE
 *   jugadas seguidas sin limpiar. El multiplicador de la jugada = racha actual (x1, x2, x3…).
 * - Tablero vacío (limpieza perfecta): +PERFECT_BONUS × multiplicador.
 */
export const COMBO_GRACE = 3;
export const PERFECT_BONUS = 1000;

export function placePoints(cells: number): number {
  return cells;
}

export function linesBase(lines: number): number {
  if (lines <= 0) return 0;
  return 80 * lines + 40 * lines * (lines - 1);
}

export interface ComboState {
  combo: number;
  movesSinceClear: number;
}

/** Avanza el estado de combo tras una jugada; devuelve el nuevo estado y el multiplicador aplicado. */
export function advanceCombo(s: ComboState, linesCleared: number): ComboState & { mult: number } {
  if (linesCleared > 0) {
    const combo = s.combo + 1;
    return { combo, movesSinceClear: 0, mult: combo };
  }
  const moves = s.movesSinceClear + 1;
  if (moves >= COMBO_GRACE) return { combo: 0, movesSinceClear: moves, mult: 1 };
  return { combo: s.combo, movesSinceClear: moves, mult: 1 };
}

export function clearPoints(lines: number, mult: number, perfect: boolean): number {
  return linesBase(lines) * mult + (perfect ? PERFECT_BONUS * Math.max(1, mult) : 0);
}

/**
 * Nivel de elogio 0..5 (null si no hay). Depende de líneas simultáneas y del combo.
 * Los textos están en i18n (praise.0 … praise.5).
 */
export function praiseLevel(lines: number, combo: number, perfect: boolean): number | null {
  if (perfect) return 5;
  if (lines <= 0) return null;
  const score = lines + Math.max(0, combo - 1) * 0.75;
  if (score >= 6) return 4;
  if (score >= 4.5) return 3;
  if (score >= 3) return 2;
  if (score >= 2) return 1;
  if (lines === 1 && combo <= 1) return null;
  return 0;
}

/** Monedas al terminar una partida (no Aventura). */
export function coinsForScore(score: number, bestCombo: number): number {
  return Math.floor(score / 150) + Math.max(0, bestCombo - 2) * 2;
}
