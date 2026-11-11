import type { SkinDef } from './types';

/**
 * Registro automático: cualquier archivo en ./defs/*.ts que exporte `default` una SkinDef
 * aparece en la tienda. No hay que tocar nada más.
 */
const modules = import.meta.glob<{ default: SkinDef }>('./defs/*.ts', { eager: true });

export const SKINS: SkinDef[] = Object.values(modules)
  .map((m) => m.default)
  .filter((s) => validateSkin(s))
  .sort((a, b) => a.order - b.order);

export const DEFAULT_SKIN = 'neon';

export function getSkin(id: string): SkinDef {
  return SKINS.find((s) => s.id === id) ?? SKINS.find((s) => s.id === DEFAULT_SKIN) ?? SKINS[0];
}

function validateSkin(s: SkinDef): boolean {
  const ok = !!s && typeof s.id === 'string' && Array.isArray(s.blocks) && s.blocks.length === 8 && typeof s.drawBlock === 'function';
  if (!ok) console.warn('[skins] definición inválida ignorada:', s?.id);
  return ok;
}
