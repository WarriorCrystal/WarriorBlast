import type { LangCode } from '../i18n';

/**
 * Guardado local versionado.
 * - Cambia SAVE_VERSION cuando cambie la forma de los datos y añade una migración
 *   en MIGRATIONS[versiónAnterior] que transforme los datos a la versión siguiente.
 * - Los campos nuevos con valor por defecto no necesitan migración: se rellenan con
 *   defaults() al cargar (mergeDefaults).
 */
export const SAVE_VERSION = 1;
const KEY = 'warriorblast.save';

export type BestMode = 'classic' | 'timeattack' | 'zen';

export interface SaveData {
  version: number;
  coins: number;
  skin: string;
  ownedSkins: string[];
  settings: { music: boolean; sfx: boolean; vibration: boolean; lang: LangCode | null };
  tutorialDone: boolean;
  best: Record<BestMode, number>;
  daily: { lastDate: string | null; todayScore: number; streak: number; bestStreak: number; history: Record<string, number> };
  login: { lastDate: string | null; streak: number };
  levels: Record<string, { stars: number; best: number }>;
  stats: {
    games: number;
    lines: number;
    pieces: number;
    bestCombo: number;
    perfect: number;
    coinsEarned: number;
    maxLinesAtOnce: number;
    zenMoves: number;
    skinsBought: number;
  };
  achievements: Record<string, number>;
}

export function defaults(): SaveData {
  return {
    version: SAVE_VERSION,
    coins: 0,
    skin: 'neon',
    ownedSkins: ['neon'],
    settings: { music: true, sfx: true, vibration: true, lang: null },
    tutorialDone: false,
    best: { classic: 0, timeattack: 0, zen: 0 },
    daily: { lastDate: null, todayScore: 0, streak: 0, bestStreak: 0, history: {} },
    login: { lastDate: null, streak: 0 },
    levels: {},
    stats: { games: 0, lines: 0, pieces: 0, bestCombo: 0, perfect: 0, coinsEarned: 0, maxLinesAtOnce: 0, zenMoves: 0, skinsBought: 0 },
    achievements: {},
  };
}

/** Migraciones: MIGRATIONS[n] convierte datos de versión n a n+1. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const MIGRATIONS: Record<number, (d: any) => any> = {
  // Ejemplo para el futuro:
  // 1: (d) => ({ ...d, nuevoCampo: 0, version: 2 }),
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mergeDefaults(base: any, data: any): any {
  if (Array.isArray(base)) return Array.isArray(data) ? data : base;
  if (base && typeof base === 'object') {
    const out: Record<string, unknown> = { ...base };
    if (data && typeof data === 'object') {
      for (const k of Object.keys(data)) {
        out[k] = k in base ? mergeDefaults(base[k], data[k]) : data[k];
      }
    }
    return out;
  }
  return data === undefined || (typeof data !== typeof base && base !== null) ? base : data;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function migrate(raw: any): SaveData {
  let d = raw && typeof raw === 'object' ? raw : {};
  let v = typeof d.version === 'number' ? d.version : SAVE_VERSION;
  while (v < SAVE_VERSION) {
    const m = MIGRATIONS[v];
    d = m ? m(d) : d;
    v++;
    d.version = v;
  }
  const merged = mergeDefaults(defaults(), d) as SaveData;
  merged.version = SAVE_VERSION;
  if (!merged.ownedSkins.includes('neon')) merged.ownedSkins.unshift('neon');
  return merged;
}

export interface Storage {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

function safeStorage(): Storage | null {
  try {
    const s = globalThis.localStorage;
    const probe = '__wb_probe';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

export class SaveStore {
  data: SaveData;
  private storage: Storage | null;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(storage: Storage | null = safeStorage()) {
    this.storage = storage;
    this.data = this.load();
  }

  load(): SaveData {
    try {
      const raw = this.storage?.getItem(KEY);
      return raw ? migrate(JSON.parse(raw)) : defaults();
    } catch (e) {
      console.warn('[save] datos corruptos, se usan valores por defecto', e);
      return defaults();
    }
  }

  /** Guarda con un pequeño retardo para agrupar cambios. */
  save(immediate = false) {
    if (this.timer) clearTimeout(this.timer);
    const write = () => {
      this.timer = null;
      try {
        this.storage?.setItem(KEY, JSON.stringify(this.data));
      } catch (e) {
        console.warn('[save] no se pudo guardar', e);
      }
    };
    if (immediate) write();
    else this.timer = setTimeout(write, 250);
  }

  reset() {
    const keepLang = this.data.settings.lang;
    this.data = defaults();
    this.data.settings.lang = keepLang;
    this.data.tutorialDone = false;
    this.save(true);
  }
}
