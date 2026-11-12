/**
 * Definición de una skin. Una skin es un archivo en src/skins/defs/ que exporta
 * `default` con este tipo. Se registra sola (import.meta.glob), sin tocar la lógica del juego.
 * Guía completa: docs/SKINS.md
 */
export type Ctx = CanvasRenderingContext2D;
export type Lang = 'es' | 'en';
export type BlockVariant = 'normal' | 'ghost' | 'stone';

export interface SkinUi {
  /** Color de fondo base (también theme-color del navegador). */
  bg: string;
  panel: string;
  panelBorder: string;
  text: string;
  textDim: string;
  accent: string;
  accent2: string;
  good: string;
  danger: string;
  /** Radio de esquinas de los paneles (px). */
  radius: number;
  /** Paneles con efecto vidrio (backdrop-filter). */
  glass?: boolean;
  /** Pila de fuentes (solo fuentes del sistema; nada de red). */
  font?: string;
  /** Sombra de texto del logo/títulos. */
  titleGlow?: string;
  /**
   * 7 colores para la interfaz (iconos de los modos, logo de bloques). Por defecto se usan
   * los 7 de `blocks`; úsalo cuando los bloques sean demasiado claros u oscuros para leerse sobre los paneles.
   */
  swatches?: [string, string, string, string, string, string, string];
}

export interface SkinParticles {
  /** Dibuja una partícula centrada en (s/2, s/2) dentro de un cuadrado s×s. */
  draw(ctx: Ctx, s: number, color: string): void;
  /** Partículas por celda limpiada. */
  perCell: number;
  /** Tamaño en fracción de celda [min, max]. */
  size: [number, number];
  /** Velocidad inicial en celdas/segundo [min, max]. */
  speed: [number, number];
  /** Gravedad en celdas/s². */
  gravity: number;
  /** Vida en segundos [min, max]. */
  life: [number, number];
  blend: 'add' | 'normal';
  spin: boolean;
  /** Las partículas se encogen (true) o se desvanecen (false). */
  shrink: boolean;
}

export interface SkinAmbient {
  count: number;
  draw(ctx: Ctx, s: number): void;
  /** Tamaño en px CSS [min, max]. */
  size: [number, number];
  /** Velocidad vertical px/s (negativo = sube). */
  speed: [number, number];
  alpha: [number, number];
  blend: 'add' | 'normal';
}

export interface SkinMusic {
  bpm: number;
  /** Grados de la escala (0-based) que forman la progresión de acordes, uno por compás. */
  progression: number[];
  pad: OscillatorType;
  lead: OscillatorType;
  bass: OscillatorType;
  /** Probabilidad de nota de melodía en cada corchea. */
  leadDensity: number;
  padGain: number;
  leadGain: number;
  bassGain: number;
  /** Corte del filtro paso bajo del pad (Hz). */
  filter: number;
  /** Cantidad de reverb 0..1. */
  reverb: number;
  /** Eco de la melodía 0..1. */
  echo: number;
  /** Ritmo de percusión suave (hi-hat sintetizado). */
  hats: boolean;
}

export interface SkinSound {
  /** Nota raíz MIDI de la ambientación. */
  root: number;
  /** Escala en semitonos desde la raíz. */
  scale: number[];
  /** Timbre de clics/colocación. */
  blip: OscillatorType;
  /** Timbre de las limpiezas y combos. */
  sparkle: OscillatorType;
  /** Cuerpo grave del golpe al colocar (0..1). */
  thump: number;
  music: SkinMusic;
}

/** Carácter de la explosión al limpiar líneas. Todo opcional: sin definir = valores por defecto. */
export interface SkinExplosion {
  /** Multiplicador de partículas, destello y temblor (1 = normal). */
  power?: number;
  /** Color de los anillos de onda expansiva (por defecto, `flash`). */
  ring?: string;
  /** Anillos de onda por limpieza (por defecto 1; 0 = sin anillos). */
  rings?: number;
  /** Destello de pantalla completa en limpiezas grandes (por defecto true). */
  screenFlash?: boolean;
}

export interface SkinDef {
  id: string;
  name: Record<Lang, string>;
  description: Record<Lang, string>;
  /** Precio en monedas (0 = gratis). */
  price: number;
  /** Orden en la tienda. */
  order: number;
  /** 7 colores de bloque + 1 color "piedra" (índice 8 del tablero). */
  blocks: [string, string, string, string, string, string, string, string];
  ui: SkinUi;
  /** Margen extra alrededor del bloque para brillos (fracción de celda). */
  blockMargin: number;
  /** El tablero muestra el fondo desenfocado detrás (efecto vidrio esmerilado). */
  frosted?: boolean;
  /** Usa escalado sin suavizado (pixel art). */
  pixelated?: boolean;
  /** Color del destello de línea al limpiar. */
  flash: string;
  /** Fondo de pantalla completo (estático). */
  drawBackground(ctx: Ctx, w: number, h: number): void;
  /** Marco y celdas vacías del tablero. `cell` = tamaño de celda, el tablero ocupa size×size. */
  drawBoard(ctx: Ctx, size: number, cell: number): void;
  /** Bloque de tamaño s×s en (0,0). Puede dibujar fuera (hasta blockMargin·s) para brillos. */
  drawBlock(ctx: Ctx, s: number, color: string, variant: BlockVariant): void;
  /** Icono de gema encima de un bloque (s×s). */
  drawGem?(ctx: Ctx, s: number): void;
  /** Marca de bloque objetivo encima del bloque (s×s). */
  drawTarget?(ctx: Ctx, s: number): void;
  particles: SkinParticles;
  /** (Opcional) Ajustes de la explosión: potencia, anillos y destello de pantalla. */
  explosion?: SkinExplosion;
  ambient?: SkinAmbient;
  sound: SkinSound;
}
