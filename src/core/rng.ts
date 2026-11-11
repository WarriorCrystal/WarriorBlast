/**
 * Generador pseudoaleatorio determinista (mulberry32) con estado serializable.
 * Se usa en todos los modos para que el desafío diario y los niveles sean reproducibles
 * y para poder deshacer jugadas (modo Zen) restaurando el estado exacto.
 */
export class Rng {
  state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /** Número en [0, 1). */
  next(): number {
    let t = (this.state = (this.state + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Entero en [0, n). */
  int(n: number): number {
    return Math.floor(this.next() * n);
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  pick<T>(arr: readonly T[]): T {
    return arr[this.int(arr.length)];
  }

  /** Elige un índice según pesos (no hace falta que sumen 1). */
  weighted(weights: readonly number[]): number {
    let total = 0;
    for (const w of weights) total += Math.max(0, w);
    if (total <= 0) return this.int(weights.length);
    let r = this.next() * total;
    for (let i = 0; i < weights.length; i++) {
      r -= Math.max(0, weights[i]);
      if (r < 0) return i;
    }
    return weights.length - 1;
  }

  clone(): Rng {
    return new Rng(this.state);
  }
}

/** Hash de texto a entero de 32 bits (FNV-1a + mezcla final). */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  return h >>> 0;
}

/** Clave de fecha local 'AAAA-MM-DD'. */
export function dateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Semilla del desafío diario: misma fecha => misma semilla en cualquier dispositivo, sin red. */
export function dailySeed(d: Date = new Date()): number {
  return hashString(`warrior-blast-daily-${dateKey(d)}`);
}

/** Días transcurridos entre dos claves de fecha (b - a). */
export function daysBetween(a: string, b: string): number {
  const pa = a.split('-').map(Number);
  const pb = b.split('-').map(Number);
  const ta = Date.UTC(pa[0], pa[1] - 1, pa[2]);
  const tb = Date.UTC(pb[0], pb[1] - 1, pb[2]);
  return Math.round((tb - ta) / 86400000);
}
