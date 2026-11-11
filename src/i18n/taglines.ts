import { getLang, type LangCode } from '.';

/**
 * Frases que aparecen bajo el título en la portada. Se elige una al azar cada vez
 * que se dibuja el inicio (sin repetir la anterior). Para añadir más, basta con
 * sumar líneas aquí; no hace falta que ambos idiomas tengan las mismas.
 */
export const TAGLINES: Record<LangCode, string[]> = {
  es: [
    'No seas gaga.',
    'Encaja. Limpia. Encadena.',
    'Ocho por ocho, cero excusas.',
    'Hoy huele a combo.',
    'El tablero vacío te está mirando.',
    'Una línea más y lo dejas. Seguro.',
    'Las piezas no muerden. Casi nunca.',
    'Piensa rápido, coloca despacio.',
    'Ese hueco tiene tu nombre.',
    'Los bots también lloran.',
    'Prohibido dejar huecos.',
    'Cuadra la cuenta, cuadra el tablero.',
    'Hecho con bloques y cariño.',
    'Respira. Arrastra. Explota.',
    '¿Otra partida? Otra partida.',
  ],
  en: [
    'Fit. Clear. Chain.',
    "Don't be gaga.",
    'Eight by eight, zero excuses.',
    'Smells like a combo today.',
    'The empty board is staring at you.',
    'One more line and you quit. Sure.',
    "The pieces don't bite. Usually.",
    'Think fast, place slow.',
    'That gap has your name on it.',
    'Bots cry too.',
    'No gaps allowed.',
    'Made of blocks and love.',
    'Breathe. Drag. Blast.',
    'Another round? Another round.',
    'Your thumbs called. They want combos.',
    'Clean boards, clear mind.',
  ],
};

let last = '';

/** Frase aleatoria en el idioma actual, distinta de la última mostrada. */
export function randomTagline(rand: () => number = Math.random): string {
  const list = TAGLINES[getLang()] ?? TAGLINES.en;
  if (list.length === 1) return list[0];
  let pick = last;
  for (let i = 0; i < 8 && pick === last; i++) pick = list[Math.floor(rand() * list.length)];
  last = pick;
  return pick;
}
