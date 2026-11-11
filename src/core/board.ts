import type { Shape } from './pieces';

export const SIZE = 8;

/** Marcas especiales de celda (modo Aventura). */
export const MARK_NONE = 0;
export const MARK_GEM = 1; // gema: se recoge al limpiar la celda
export const MARK_TARGET = 2; // bloque objetivo preexistente: hay que limpiarlo

export interface ClearedCell {
  x: number;
  y: number;
  color: number;
  mark: number;
}

export interface LineSet {
  rows: number[];
  cols: number[];
}

export class Board {
  readonly cells: Uint8Array;
  readonly marks: Uint8Array;

  constructor(cells?: Uint8Array, marks?: Uint8Array) {
    this.cells = cells ? new Uint8Array(cells) : new Uint8Array(SIZE * SIZE);
    this.marks = marks ? new Uint8Array(marks) : new Uint8Array(SIZE * SIZE);
  }

  static idx(x: number, y: number) {
    return y * SIZE + x;
  }

  get(x: number, y: number): number {
    return this.cells[y * SIZE + x];
  }

  set(x: number, y: number, color: number, mark = MARK_NONE) {
    this.cells[y * SIZE + x] = color;
    this.marks[y * SIZE + x] = mark;
  }

  clone(): Board {
    return new Board(this.cells, this.marks);
  }

  canPlace(shape: Shape, x: number, y: number): boolean {
    if (x < 0 || y < 0 || x + shape.w > SIZE || y + shape.h > SIZE) return false;
    for (const [cx, cy] of shape.cells) if (this.cells[(y + cy) * SIZE + x + cx] !== 0) return false;
    return true;
  }

  /** Coloca sin comprobar; devuelve índices de celdas ocupadas. */
  place(shape: Shape, x: number, y: number, color: number, gems: number[] = []): number[] {
    const out: number[] = [];
    shape.cells.forEach(([cx, cy], i) => {
      const k = (y + cy) * SIZE + x + cx;
      this.cells[k] = color;
      this.marks[k] = gems.includes(i) ? MARK_GEM : MARK_NONE;
      out.push(k);
    });
    return out;
  }

  fullLines(): LineSet {
    const rows: number[] = [];
    const cols: number[] = [];
    for (let i = 0; i < SIZE; i++) {
      let r = true;
      let c = true;
      for (let j = 0; j < SIZE; j++) {
        if (this.cells[i * SIZE + j] === 0) r = false;
        if (this.cells[j * SIZE + i] === 0) c = false;
      }
      if (r) rows.push(i);
      if (c) cols.push(i);
    }
    return { rows, cols };
  }

  /** Líneas que se completarían si se colocara la forma (sin modificar el tablero). */
  linesIfPlaced(shape: Shape, x: number, y: number): LineSet {
    const filled = new Uint8Array(this.cells);
    for (const [cx, cy] of shape.cells) filled[(y + cy) * SIZE + x + cx] = 1;
    const rows: number[] = [];
    const cols: number[] = [];
    for (let i = 0; i < SIZE; i++) {
      let r = true;
      let c = true;
      for (let j = 0; j < SIZE; j++) {
        if (!filled[i * SIZE + j]) r = false;
        if (!filled[j * SIZE + i]) c = false;
      }
      if (r) rows.push(i);
      if (c) cols.push(i);
    }
    return { rows, cols };
  }

  /** Vacía filas y columnas (simultáneamente) y devuelve las celdas limpiadas sin duplicados. */
  clearLines(lines: LineSet): ClearedCell[] {
    const seen = new Set<number>();
    const out: ClearedCell[] = [];
    const take = (x: number, y: number) => {
      const k = y * SIZE + x;
      if (seen.has(k)) return;
      seen.add(k);
      out.push({ x, y, color: this.cells[k], mark: this.marks[k] });
    };
    for (const r of lines.rows) for (let x = 0; x < SIZE; x++) take(x, r);
    for (const c of lines.cols) for (let y = 0; y < SIZE; y++) take(c, y);
    for (const k of seen) {
      this.cells[k] = 0;
      this.marks[k] = MARK_NONE;
    }
    return out;
  }

  fitsAnywhere(shape: Shape): boolean {
    for (let y = 0; y <= SIZE - shape.h; y++)
      for (let x = 0; x <= SIZE - shape.w; x++) if (this.canPlace(shape, x, y)) return true;
    return false;
  }

  /** Lista de posiciones válidas para una forma. */
  positionsFor(shape: Shape): Array<[number, number]> {
    const out: Array<[number, number]> = [];
    for (let y = 0; y <= SIZE - shape.h; y++)
      for (let x = 0; x <= SIZE - shape.w; x++) if (this.canPlace(shape, x, y)) out.push([x, y]);
    return out;
  }

  isEmpty(): boolean {
    for (let i = 0; i < this.cells.length; i++) if (this.cells[i]) return false;
    return true;
  }

  countFilled(): number {
    let n = 0;
    for (let i = 0; i < this.cells.length; i++) if (this.cells[i]) n++;
    return n;
  }

  countMark(mark: number): number {
    let n = 0;
    for (let i = 0; i < this.marks.length; i++) if (this.marks[i] === mark) n++;
    return n;
  }

  /**
   * Crea un tablero desde filas ASCII (ver docs/NIVELES.md):
   *  '.' vacío · '1'..'7' bloque de color · '#' bloque gris · 'G' bloque con gema · 'X' bloque objetivo
   */
  static fromAscii(rows: string[]): Board {
    const b = new Board();
    rows.slice(0, SIZE).forEach((row, y) => {
      const r = row.replace(/\s+/g, '');
      for (let x = 0; x < Math.min(SIZE, r.length); x++) {
        const ch = r[x];
        if (ch >= '1' && ch <= '7') b.set(x, y, Number(ch));
        else if (ch === '#') b.set(x, y, 8);
        else if (ch === 'G') b.set(x, y, 1 + ((x + y) % 7), MARK_GEM);
        else if (ch === 'X') b.set(x, y, 8, MARK_TARGET);
      }
    });
    return b;
  }
}

/** Color 8 = bloque neutro/piedra (lo dibuja cada skin con su estilo). */
export const STONE_COLOR = 8;
