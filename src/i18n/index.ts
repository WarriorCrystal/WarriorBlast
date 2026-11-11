import en from './en';
import es, { type Dict, type TKey } from './es';

export type LangCode = 'es' | 'en';
export type { TKey };

const DICTS: Record<LangCode, Dict> = { es, en };
export const LANGS: Array<{ code: LangCode; label: string }> = [
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'English' },
];

let current: LangCode = 'es';

export function detectLang(): LangCode {
  const list = (navigator.languages?.length ? navigator.languages : [navigator.language]) ?? [];
  for (const l of list) {
    const code = (l || '').slice(0, 2).toLowerCase();
    if (code in DICTS) return code as LangCode;
  }
  return 'en';
}

export function setLang(l: LangCode) {
  current = l in DICTS ? l : 'en';
  document.documentElement.lang = current;
}

export function getLang(): LangCode {
  return current;
}

/** Traduce una clave con parámetros {n}. */
export function t(key: TKey, params?: Record<string, string | number>): string {
  let s = DICTS[current][key] ?? DICTS.es[key] ?? key;
  if (params) for (const [k, v] of Object.entries(params)) s = s.split(`{${k}}`).join(String(v));
  return s;
}

export function fmt(n: number): string {
  return Math.round(n).toLocaleString(current === 'es' ? 'es-ES' : 'en-US');
}
