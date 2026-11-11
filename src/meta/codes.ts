// Códigos secretos que se canjean en Ajustes.
// Para añadir uno nuevo, agrega una entrada a CODES (la clave va en minúsculas).

export interface CodeReward {
  coins?: number;
}

const CODES: Record<string, CodeReward> = {
  test: { coins: 1_000_000 },
};

/** Devuelve la recompensa del código, o null si no existe. No distingue mayúsculas ni espacios extremos. */
export function lookupCode(input: string): CodeReward | null {
  return CODES[input.trim().toLowerCase()] ?? null;
}
