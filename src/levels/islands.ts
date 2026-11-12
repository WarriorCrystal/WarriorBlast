/* Islas del modo Aventura: cada una agrupa niveles consecutivos, tiene su
   ambientación (colores del terreno + decoración) y un capítulo de historia. */
import { LEVELS } from './levels';

export type IslandTheme = 'beach' | 'jungle' | 'snow' | 'volcano' | 'sky';

export interface IslandDef {
  /** índice 0.. (también se usa para las claves i18n island.N.*) */
  idx: number;
  theme: IslandTheme;
  /** ids de nivel, de abajo hacia arriba */
  levels: number[];
}

export const LEVELS_PER_ISLAND = 6;
const THEMES: IslandTheme[] = ['beach', 'jungle', 'snow', 'volcano', 'sky'];

/** Reparte los niveles en islas de 6; si hubiera más niveles, van a la última. */
export const ISLANDS: IslandDef[] = THEMES.map((theme, idx) => ({ idx, theme, levels: [] as number[] }));
for (const lv of LEVELS) {
  const i = Math.min(Math.floor((lv.id - 1) / LEVELS_PER_ISLAND), ISLANDS.length - 1);
  ISLANDS[i].levels.push(lv.id);
}
while (ISLANDS.length && !ISLANDS[ISLANDS.length - 1].levels.length) ISLANDS.pop();

export const islandOf = (levelId: number): IslandDef =>
  ISLANDS.find((is) => is.levels.includes(levelId)) ?? ISLANDS[ISLANDS.length - 1];

// ---------- decoración (SVG 48×48, colores fijos) ----------
const SH = '<ellipse cx="24" cy="45" rx="11" ry="2.4" fill="rgba(0,0,0,.16)"/>';

export const DECOR: Record<string, string> = {
  palm:
    SH +
    '<path d="M25 45c1.5-9 .5-17-3.5-25" stroke="#8a5a2b" stroke-width="3.6" fill="none" stroke-linecap="round"/>' +
    '<path d="M22 19c-6-6-14-5-19-.5 6-1.5 12-.5 19 .5z" fill="#2c9c4a"/><path d="M22 19c3-8 11-11 18-9-6 2-12 5-18 9z" fill="#3cbf5c"/>' +
    '<path d="M22 19c-2-7-8-11-15-11 6 3 10 6 15 11z" fill="#47c967"/><path d="M22 19c6-3 14-1.5 19 3.5-6-1.5-12-2.5-19-3.5z" fill="#2c9c4a"/>' +
    '<circle cx="21" cy="21.5" r="2.2" fill="#6b4220"/><circle cx="24.5" cy="21" r="2.2" fill="#7d4f28"/>',
  starfish:
    '<path d="M24 12l3.4 8.2 8.6.6-6.6 5.6 2.2 8.6L24 30.2 16.4 35l2.2-8.6-6.6-5.6 8.6-.6z" fill="#ff8a5c" stroke="#e0603a" stroke-width="1.4" stroke-linejoin="round"/>' +
    '<circle cx="24" cy="24" r="1.4" fill="#ffd0b8"/>',
  shell:
    '<path d="M24 36L11 22a14 14 0 0 1 26 0z" fill="#ffd3df" stroke="#e79bb0" stroke-width="1.4" stroke-linejoin="round"/>' +
    '<path d="M24 36l-8-15M24 36V17M24 36l8-15" stroke="#e79bb0" stroke-width="1.3"/>',
  lighthouse:
    SH +
    '<path d="M17 44l3-30h8l3 30z" fill="#fff"/><path d="M17.6 38h12.8l.5 6H17.1zM18.7 27h10.6l.5 5H18.2zM19.5 18h9l.4 4h-9.8z" fill="#e8413c"/>' +
    '<rect x="19" y="8" width="10" height="7" rx="1.5" fill="#ffe36b" stroke="#333" stroke-width="1.4"/><path d="M17 8.5L24 3l7 5.5z" fill="#e8413c"/>' +
    '<path d="M29 11l12-4M29 12l12 2M19 11L7 7M19 12L7 14" stroke="#ffe36b" stroke-width="1.8" stroke-linecap="round" opacity=".8"/>',
  tree:
    SH +
    '<rect x="21.5" y="28" width="5" height="17" rx="2" fill="#7a4b26"/><circle cx="16" cy="24" r="9" fill="#2b8a43"/>' +
    '<circle cx="32" cy="24" r="9" fill="#2b8a43"/><circle cx="24" cy="15" r="11" fill="#36a352"/><circle cx="20" cy="12" r="3.5" fill="#57c46f"/>',
  bush:
    '<ellipse cx="24" cy="38" rx="15" ry="3" fill="rgba(0,0,0,.14)"/><circle cx="16" cy="31" r="7" fill="#2f9447"/><circle cx="31" cy="31" r="7.5" fill="#2f9447"/>' +
    '<circle cx="23.5" cy="27" r="8.5" fill="#3cae56"/><circle cx="19" cy="25" r="1.6" fill="#ff5d73"/><circle cx="29" cy="28" r="1.6" fill="#ffcf3f"/>',
  totem:
    SH +
    '<rect x="17" y="9" width="14" height="36" rx="2" fill="#a8693a"/><path d="M12 15h24l-3 4H15z" fill="#e0a23c"/>' +
    '<rect x="17" y="22" width="14" height="2.5" fill="#6e3f1d"/><rect x="17" y="34" width="14" height="2.5" fill="#6e3f1d"/>' +
    '<circle cx="21" cy="28.5" r="2" fill="#fff"/><circle cx="27" cy="28.5" r="2" fill="#fff"/><circle cx="21" cy="28.5" r=".9" fill="#222"/><circle cx="27" cy="28.5" r=".9" fill="#222"/>' +
    '<rect x="21" y="39" width="6" height="3" rx="1" fill="#6e3f1d"/>',
  temple:
    SH +
    '<path d="M6 45h36v-7H6zM10 38h28v-7H10zM14 31h20v-7H14zM18 24h12v-7H18z" fill="#8fa38a" stroke="#5f735b" stroke-width="1.3"/>' +
    '<rect x="21.5" y="38.5" width="5" height="6.5" fill="#3b4a38"/><path d="M14 31c3 2 6-1 9 1M29 24c2 2 4 0 5 2" stroke="#3cae56" stroke-width="2" fill="none" stroke-linecap="round"/>' +
    '<circle cx="24" cy="12" r="3.5" fill="#46e0ff" stroke="#fff" stroke-width="1.2"/>',
  pine:
    SH +
    '<rect x="22" y="36" width="4" height="9" fill="#6b4524"/><path d="M24 6l9 13h-18z" fill="#2e7d58"/><path d="M24 14l11 14H13z" fill="#2a7351"/>' +
    '<path d="M24 22l13 15H11z" fill="#256847"/><path d="M24 6l3.6 5.2c-2.2 1-4.8 1-7.2 0zM17 26.5c3 1.4 9 1.4 14 0l-1.6-2c-3 1-8 1-10.8 0zM14 35c5 1.6 15 1.6 20 0l-1.5-1.8c-5 1.3-12 1.3-17 0z" fill="#fff"/>',
  igloo:
    '<ellipse cx="24" cy="40" rx="17" ry="2.6" fill="rgba(0,0,0,.12)"/><path d="M7 40a17 17 0 0 1 34 0z" fill="#fff" stroke="#a9c9de" stroke-width="1.4"/>' +
    '<path d="M9 33h30M13 26h22M24 23v10M16 33v7M32 33v7M19 26v7M29 26v7" stroke="#a9c9de" stroke-width="1.2"/><path d="M19 40v-4a5 5 0 0 1 10 0v4z" fill="#3d6684"/>',
  snowman:
    SH +
    '<circle cx="24" cy="36" r="9" fill="#fff" stroke="#a9c9de" stroke-width="1.3"/><circle cx="24" cy="21" r="6.5" fill="#fff" stroke="#a9c9de" stroke-width="1.3"/>' +
    '<path d="M24 22l6 1.5-6 1z" fill="#ff8a2a"/><circle cx="21.8" cy="19.5" r="1" fill="#222"/><circle cx="26.2" cy="19.5" r="1" fill="#222"/>' +
    '<path d="M18.5 15.5h11M20 15.5V9h8v6.5" fill="#333" stroke="#333" stroke-width="1.4"/><path d="M17.5 26.5h13" stroke="#e8413c" stroke-width="2.6" stroke-linecap="round"/>',
  peak:
    SH +
    '<path d="M2 45L18 14l8 12 6-8 14 27z" fill="#7b97ad"/><path d="M18 14l-6 11.5 4-1.5 2.5 2 3-2.5 4.5 3zM32 18l-4.2 5.5 2.5-.5 2 1.6 2.3-1.4z" fill="#fff"/>' +
    '<path d="M18 7.5v6.5" stroke="#555" stroke-width="1.4"/><path d="M18.6 7.5l6 2.4-6 2.2z" fill="#e8413c"/>',
  volcano:
    SH +
    '<path d="M3 45l13-27h16l13 27z" fill="#4a3434"/><path d="M16 18h16l2 4c-3 2-5-1-7 1.5-2 2.5-4-1-6 1-2 1.5-4-1-7 0z" fill="#ff6a2a"/>' +
    '<path d="M22 22c-1 6-4 9-3 14M27 23c1 5 4 8 3 13" stroke="#ff8a2a" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
    '<g class="smoke"><circle cx="22" cy="12" r="4" fill="#9a8f8f"/><circle cx="27" cy="8" r="5" fill="#b5abab"/><circle cx="21" cy="4" r="3.5" fill="#cbc3c3"/></g>',
  rock:
    '<ellipse cx="24" cy="40" rx="15" ry="2.6" fill="rgba(0,0,0,.18)"/><path d="M9 40l4-12 9-6 10 3 6 15z" fill="#3a2c2c" stroke="#251b1b" stroke-width="1.3" stroke-linejoin="round"/>' +
    '<path d="M16 34l5-5 4 3 5-2" stroke="#ff6a2a" stroke-width="1.6" fill="none" stroke-linecap="round"/>',
  lava:
    '<ellipse cx="24" cy="32" rx="16" ry="7" fill="#3a2424"/><ellipse cx="24" cy="31.5" rx="12.5" ry="5" fill="#ff6a2a"/>' +
    '<ellipse cx="21" cy="30.5" rx="5" ry="1.8" fill="#ffc23a"/><circle cx="30" cy="31" r="1.3" fill="#ffe08a"/>',
  deadtree:
    SH +
    '<path d="M24 45V24M24 30l-7-8M17 22l-4 1M17 22l-1-5M24 26l6-9M30 17l4-2M30 17l-1-4" stroke="#2b2020" stroke-width="2.6" fill="none" stroke-linecap="round"/>',
  cloud:
    '<path d="M11 34a7 7 0 0 1 2-13.5 9 9 0 0 1 17-3 7.5 7.5 0 0 1 8 7.5 5 5 0 0 1-1 9.5z" fill="#fff" stroke="#c8c0f2" stroke-width="1.4"/>',
  tower:
    SH +
    '<rect x="16" y="16" width="16" height="29" fill="#b9b0e6" stroke="#6d62b0" stroke-width="1.4"/><path d="M14 16h20v-5h-3v3h-3v-3h-4v3h-4v-3h-3v3h-3z" fill="#b9b0e6" stroke="#6d62b0" stroke-width="1.4"/>' +
    '<path d="M21.5 29a2.5 2.5 0 0 1 5 0v5h-5z" fill="#4b3f8f"/>',
  flag:
    '<ellipse cx="18" cy="44" rx="6" ry="1.6" fill="rgba(0,0,0,.16)"/><path d="M18 44V8" stroke="#6d62b0" stroke-width="2.2" stroke-linecap="round"/>' +
    '<path class="wave-flag" d="M19 9c6-2 9 2 16 0v11c-7 2-10-2-16 0z" fill="#ff4f8b"/>',
  castle:
    SH +
    '<path d="M6 45V22h7v-4h4v4h4v-6h6v6h4v-4h4v4h7v23z" fill="#c9c1f2" stroke="#6d62b0" stroke-width="1.4" stroke-linejoin="round"/>' +
    '<rect x="5" y="15" width="9" height="7" fill="#c9c1f2" stroke="#6d62b0" stroke-width="1.4"/><rect x="34" y="15" width="9" height="7" fill="#c9c1f2" stroke="#6d62b0" stroke-width="1.4"/>' +
    '<path d="M4 15l5.5-7 5.5 7zM33 15l5.5-7 5.5 7z" fill="#8a5cff"/><path d="M19 16l5-9 5 9z" fill="#ff4f8b"/>' +
    '<path d="M20 45v-8a4 4 0 0 1 8 0v8z" fill="#4b3f8f"/><rect x="9" y="27" width="3" height="5" rx="1.5" fill="#4b3f8f"/><rect x="36" y="27" width="3" height="5" rx="1.5" fill="#4b3f8f"/>',
  boat:
    '<path d="M8 33h32l-5 7H13z" fill="#a8693a" stroke="#6e3f1d" stroke-width="1.3" stroke-linejoin="round"/><path d="M24 31V7" stroke="#6e3f1d" stroke-width="1.8"/>' +
    '<path d="M25 8c7 4 10 12 10 21H25z" fill="#fff"/><path d="M23 12c-4 4-7 10-7 17h7z" fill="#ffe7b0"/><path d="M24 7l6 2-6 2" fill="#e8413c"/>',
  wave:
    '<path d="M6 26c3-3 6-3 9 0s6 3 9 0 6-3 9 0 6 3 9 0" stroke="rgba(255,255,255,.55)" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
  gems:
    '<path d="M24 6l14 12-14 24L10 18z" fill="#46e0ff" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/><path d="M10 18h28M24 6l-6 12 6 24 6-24z" stroke="#fff" stroke-width="1.2" fill="none" opacity=".75"/>',
};

/** Decoración por isla: piezas pequeñas que se reparten junto a los niveles y un monumento en la cima. */
export const THEME_DECOR: Record<IslandTheme, { small: string[]; landmark: string }> = {
  beach: { small: ['palm', 'starfish', 'shell', 'palm'], landmark: 'lighthouse' },
  jungle: { small: ['tree', 'bush', 'totem', 'tree'], landmark: 'temple' },
  snow: { small: ['pine', 'igloo', 'pine', 'snowman'], landmark: 'peak' },
  volcano: { small: ['rock', 'deadtree', 'lava', 'rock'], landmark: 'volcano' },
  sky: { small: ['cloud', 'tower', 'flag', 'cloud'], landmark: 'castle' },
};

export const decorSvg = (name: string) => `<svg viewBox="0 0 48 48" aria-hidden="true">${DECOR[name] ?? ''}</svg>`;
