/**
 * Formato de nivel (modo Aventura). Ver docs/NIVELES.md para ejemplos.
 */
export type Goal =
  | { type: 'score'; target: number } // alcanzar X puntos
  | { type: 'lines'; target: number } // limpiar X líneas
  | { type: 'gems'; target: number } // recoger X gemas
  | { type: 'targets' } // limpiar todos los bloques objetivo (X en el tablero)
  | { type: 'combo'; target: number }; // conseguir un combo xN

export interface LevelDef {
  id: number;
  goals: Goal[];
  /** Límite de piezas colocadas (opcional). */
  moves?: number;
  /** Tablero inicial en ASCII, 8 filas de 8 caracteres. */
  board?: string[];
  /** Dificultad del generador 0..1 (por defecto 0.3). */
  difficulty?: number;
  /** Probabilidad de que una pieza traiga una gema. */
  gemChance?: number;
  /** Puntuación final para 2 y 3 estrellas (1 estrella = completar). */
  stars: [number, number];
  /** Sets de piezas fijos al principio (ids de forma o patrones 'ab/cd'); null = hueco vacío. */
  sets?: Array<Array<string | null>>;
  /** Semilla opcional (por defecto depende del id). */
  seed?: number;
}

export const MOVE_BONUS = 40; // puntos por cada movimiento sobrante al ganar

export function starsFor(level: LevelDef, finalScore: number): 1 | 2 | 3 {
  if (finalScore >= level.stars[1]) return 3;
  if (finalScore >= level.stars[0]) return 2;
  return 1;
}

/** Recompensa de monedas por estrellas (solo se paga la diferencia con el mejor resultado previo). */
export const COINS_PER_STAR = [0, 15, 25, 40] as const;
