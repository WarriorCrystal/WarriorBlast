/**
 * Catálogo de formas. Cada familia se define con un patrón ASCII legible;
 * las rotaciones (y espejos, si procede) se generan automáticamente.
 *
 * tier: 0 = amable, 1 = normal, 2 = incómoda, 3 = grande/difícil.
 */
export type Cell = readonly [number, number];

export interface Shape {
  id: string;
  family: string;
  cells: Cell[];
  w: number;
  h: number;
  tier: number;
  /** Peso base de aparición (ya repartido entre orientaciones). */
  weight: number;
}

interface FamilyDef {
  family: string;
  tier: number;
  weight: number;
  pattern: string[];
  rotate: boolean;
  mirror: boolean;
}

const FAMILIES: FamilyDef[] = [
  { family: 'dot', tier: 0, weight: 2.5, pattern: ['#'], rotate: false, mirror: false },
  { family: 'i2', tier: 0, weight: 6, pattern: ['##'], rotate: true, mirror: false },
  { family: 'i3', tier: 0, weight: 7, pattern: ['###'], rotate: true, mirror: false },
  { family: 'i4', tier: 1, weight: 6, pattern: ['####'], rotate: true, mirror: false },
  { family: 'i5', tier: 2, weight: 4.5, pattern: ['#####'], rotate: true, mirror: false },
  { family: 'o2', tier: 0, weight: 6, pattern: ['##', '##'], rotate: false, mirror: false },
  { family: 'o3', tier: 3, weight: 3, pattern: ['###', '###', '###'], rotate: false, mirror: false },
  { family: 'r23', tier: 2, weight: 4, pattern: ['###', '###'], rotate: true, mirror: false },
  { family: 'c3', tier: 0, weight: 6, pattern: ['#.', '##'], rotate: true, mirror: false },
  { family: 'l4', tier: 1, weight: 6, pattern: ['#.', '#.', '##'], rotate: true, mirror: true },
  { family: 't4', tier: 1, weight: 5, pattern: ['###', '.#.'], rotate: true, mirror: false },
  { family: 's4', tier: 2, weight: 4, pattern: ['.##', '##.'], rotate: true, mirror: true },
  { family: 'c5', tier: 3, weight: 4, pattern: ['#..', '#..', '###'], rotate: true, mirror: false },
];

function parse(pattern: string[]): Cell[] {
  const cells: Cell[] = [];
  pattern.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) if (row[x] === '#') cells.push([x, y]);
  });
  return cells;
}

function normalize(cells: Cell[]): Cell[] {
  const minX = Math.min(...cells.map((c) => c[0]));
  const minY = Math.min(...cells.map((c) => c[1]));
  return cells
    .map((c) => [c[0] - minX, c[1] - minY] as Cell)
    .sort((a, b) => a[1] - b[1] || a[0] - b[0]);
}

const rot90 = (cells: Cell[]): Cell[] => normalize(cells.map(([x, y]) => [-y, x] as Cell));
const mirrorX = (cells: Cell[]): Cell[] => normalize(cells.map(([x, y]) => [-x, y] as Cell));
const keyOf = (cells: Cell[]) => cells.map((c) => c.join(',')).join(';');

function buildShapes(): Shape[] {
  const out: Shape[] = [];
  for (const f of FAMILIES) {
    const variants = new Map<string, Cell[]>();
    const bases = [normalize(parse(f.pattern))];
    if (f.mirror) bases.push(mirrorX(bases[0]));
    for (const base of bases) {
      let cur = base;
      for (let r = 0; r < (f.rotate ? 4 : 1); r++) {
        variants.set(keyOf(cur), cur);
        cur = rot90(cur);
      }
    }
    const list = [...variants.values()];
    list.forEach((cells, i) => {
      out.push({
        id: `${f.family}_${i}`,
        family: f.family,
        cells,
        w: Math.max(...cells.map((c) => c[0])) + 1,
        h: Math.max(...cells.map((c) => c[1])) + 1,
        tier: f.tier,
        weight: f.weight / list.length,
      });
    });
  }
  return out;
}

export const SHAPES: Shape[] = buildShapes();
export const SHAPE_BY_ID: Record<string, Shape> = Object.fromEntries(SHAPES.map((s) => [s.id, s]));

/** Busca una forma por id exacto ('l4_2') o por patrón ASCII ('##/#.'). */
export function shapeFrom(idOrPattern: string): Shape {
  const s = SHAPE_BY_ID[idOrPattern];
  if (s) return s;
  const key = keyOf(normalize(parse(idOrPattern.split('/'))));
  const found = SHAPES.find((sh) => keyOf(sh.cells) === key);
  if (!found) throw new Error(`Forma desconocida: ${idOrPattern}`);
  return found;
}

/** Número de colores de bloque que toda skin debe definir. */
export const COLOR_COUNT = 7;

export interface Piece {
  shape: Shape;
  /** 1..COLOR_COUNT */
  color: number;
  /** Índices (en shape.cells) de celdas que llevan una gema. */
  gems: number[];
}
