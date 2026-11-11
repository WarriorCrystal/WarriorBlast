import { describe, expect, it } from 'vitest';
import { CLEAR_DELAY_MS, COLS, CascadeSession, HIDDEN, KINDS, SHAPES, TOTAL_ROWS, gravitySeconds } from '../src/core/cascade';

const fillRow = (s: CascadeSession, y: number, gapX: number[] = []) => {
  for (let x = 0; x < COLS; x++) if (!gapX.includes(x)) s.grid[y * COLS + x] = 1;
};

describe('cascada', () => {
  it('cada pieza tiene 4 rotaciones de 4 celdas', () => {
    for (const k of KINDS) {
      expect(SHAPES[k]).toHaveLength(4);
      for (const r of SHAPES[k]) expect(r).toHaveLength(4);
    }
  });

  it('la bolsa de 7 trae una pieza de cada tipo', () => {
    const s = new CascadeSession(123);
    const seen = [s.active!.kind, ...s.queue.slice(0, 6)];
    expect(new Set(seen).size).toBe(7);
  });

  it('es determinista con la semilla', () => {
    const a = new CascadeSession(42);
    const b = new CascadeSession(42);
    expect(a.queue.join('')).toBe(b.queue.join(''));
  });

  it('las paredes bloquean el movimiento', () => {
    const s = new CascadeSession(1);
    let n = 0;
    while (s.move(-1)) n++;
    expect(n).toBeGreaterThan(0);
    expect(s.move(-1)).toBe(false);
    const xs = s.cellsOf(s.active!.kind, s.active!.rot, s.active!.x, s.active!.y).map((c) => c[0]);
    expect(Math.min(...xs)).toBe(0);
  });

  it('caída instantánea bloquea en el fondo y da 2 puntos por fila', () => {
    const s = new CascadeSession(7);
    const a = { ...s.active! };
    const dist = s.ghostY() - a.y;
    s.hardDrop();
    expect(s.score).toBe(dist * 2);
    expect(s.pieces).toBe(1);
    const cells = s.cellsOf(a.kind, a.rot, a.x, a.y + dist);
    for (const [x, y] of cells) expect(s.get(x, y)).toBeGreaterThan(0);
    expect(Math.max(...cells.map((c) => c[1]))).toBe(TOTAL_ROWS - 1);
  });

  it('limpia líneas, puntúa y baja las filas de arriba', () => {
    const s = new CascadeSession(9);
    // pozo casi lleno salvo una columna; colocar una I vertical en ella limpia 4 filas
    for (let y = TOTAL_ROWS - 4; y < TOTAL_ROWS; y++) fillRow(s, y, [0]);
    s.grid[(TOTAL_ROWS - 5) * COLS + 5] = 3; // bloque suelto encima
    s.active = { kind: 'I', rot: 1, x: -2, y: 5 };
    s.hardDrop();
    expect(s.clearing).toHaveLength(4);
    const clear = s.events.find((e) => e.type === 'clear');
    expect(clear && clear.type === 'clear' && clear.lines).toBe(4);
    expect(s.lines).toBe(4);
    s.update(CLEAR_DELAY_MS + 1);
    expect(s.clearing).toBeNull();
    expect(s.get(5, TOTAL_ROWS - 1)).toBe(3);
    expect(s.active).not.toBeNull();
  });

  it('la reserva solo se usa una vez por pieza', () => {
    const s = new CascadeSession(5);
    const first = s.active!.kind;
    expect(s.holdPiece()).toBe(true);
    expect(s.hold).toBe(first);
    expect(s.holdPiece()).toBe(false);
    s.hardDrop();
    expect(s.holdPiece()).toBe(true);
    expect(s.active!.kind).toBe(first);
  });

  it('las patadas permiten girar pegado a la pared', () => {
    const s = new CascadeSession(3);
    s.active = { kind: 'T', rot: 1, x: -1, y: 10 };
    expect(s.fits('T', 1, -1, 10)).toBe(true);
    expect(s.rotate(1)).toBe(true);
    for (const [x] of s.cellsOf('T', s.active!.rot, s.active!.x, s.active!.y)) expect(x).toBeGreaterThanOrEqual(0);
  });

  it('se bloquea tras el retardo al tocar fondo y termina si no cabe la siguiente', () => {
    const s = new CascadeSession(11);
    for (let y = HIDDEN; y < TOTAL_ROWS; y++) fillRow(s, y, [y % COLS]);
    s.update(gravitySeconds(1) * 1000 + 600);
    s.update(600);
    expect(s.ended).toBe('gameover');
  });

  it('la gravedad acelera con el nivel', () => {
    expect(gravitySeconds(1)).toBeCloseTo(1);
    expect(gravitySeconds(10)).toBeLessThan(gravitySeconds(5));
  });
});
