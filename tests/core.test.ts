import { describe, expect, it } from 'vitest';
import { Board, MARK_GEM, MARK_TARGET, SIZE } from '../src/core/board';
import { anyShapeFits, dealPure, dealSet, solvable } from '../src/core/generator';
import { SHAPES, shapeFrom } from '../src/core/pieces';
import { Rng, dailySeed, dateKey, daysBetween } from '../src/core/rng';
import { COMBO_GRACE, advanceCombo, clearPoints, linesBase, praiseLevel } from '../src/core/scoring';
import { GameSession, TIME_ATTACK_MS } from '../src/core/session';
import { LEVELS } from '../src/levels/levels';

const row = (s: string) => s;

describe('piezas', () => {
  it('genera rotaciones únicas', () => {
    const fam = (f: string) => SHAPES.filter((s) => s.family === f).length;
    expect(fam('dot')).toBe(1);
    expect(fam('i3')).toBe(2);
    expect(fam('o2')).toBe(1);
    expect(fam('c3')).toBe(4);
    expect(fam('l4')).toBe(8);
    expect(fam('t4')).toBe(4);
    expect(fam('s4')).toBe(4);
    expect(fam('c5')).toBe(4);
  });
  it('encuentra formas por patrón', () => {
    expect(shapeFrom('###').family).toBe('i3');
    expect(shapeFrom('#/#/#').family).toBe('i3');
    expect(shapeFrom('##/##').family).toBe('o2');
  });
});

describe('tablero', () => {
  it('valida límites y colisiones', () => {
    const b = new Board();
    const i3 = shapeFrom('###');
    expect(b.canPlace(i3, 5, 0)).toBe(true);
    expect(b.canPlace(i3, 6, 0)).toBe(false);
    expect(b.canPlace(i3, -1, 0)).toBe(false);
    b.place(i3, 0, 0, 1);
    expect(b.canPlace(i3, 2, 0)).toBe(false);
    expect(b.canPlace(i3, 3, 0)).toBe(true);
  });

  it('limpia filas y columnas a la vez sin duplicar la intersección', () => {
    const b = Board.fromAscii([
      row('1111111.'),
      row('.......1'),
      row('.......1'),
      row('.......1'),
      row('.......1'),
      row('.......1'),
      row('.......1'),
      row('.......1'),
    ]);
    b.place(shapeFrom('#'), 7, 0, 2);
    const lines = b.fullLines();
    expect(lines.rows).toEqual([0]);
    expect(lines.cols).toEqual([7]);
    const cleared = b.clearLines(lines);
    expect(cleared.length).toBe(15);
    expect(b.isEmpty()).toBe(true);
  });

  it('previsualiza líneas sin modificar el tablero', () => {
    const b = Board.fromAscii(['11111...']);
    const l = b.linesIfPlaced(shapeFrom('###'), 5, 0);
    expect(l.rows).toEqual([0]);
    expect(b.get(5, 0)).toBe(0);
  });

  it('lee marcas desde ASCII', () => {
    const b = Board.fromAscii(['G.X.....']);
    expect(b.marks[0]).toBe(MARK_GEM);
    expect(b.marks[2]).toBe(MARK_TARGET);
    expect(b.get(2, 0)).toBe(8);
  });
});

describe('puntuación y combos', () => {
  it('bonifica limpiezas múltiples', () => {
    expect(linesBase(0)).toBe(0);
    expect(linesBase(1)).toBe(80);
    expect(linesBase(2)).toBe(240);
    expect(linesBase(3)).toBe(480);
    expect(clearPoints(2, 3, false)).toBe(720);
    expect(clearPoints(1, 1, true)).toBe(80 + 1000);
  });

  it('la racha sube con limpiezas y se pierde tras COMBO_GRACE jugadas sin limpiar', () => {
    let s = { combo: 0, movesSinceClear: 0 };
    let r = advanceCombo(s, 1);
    expect(r.mult).toBe(1);
    r = advanceCombo(r, 2);
    expect(r.mult).toBe(2);
    s = r;
    for (let i = 0; i < COMBO_GRACE - 1; i++) {
      s = advanceCombo(s, 0);
      expect(s.combo).toBe(2);
    }
    s = advanceCombo(s, 0);
    expect(s.combo).toBe(0);
  });

  it('elogios crecen con líneas y combo', () => {
    expect(praiseLevel(0, 0, false)).toBeNull();
    expect(praiseLevel(1, 1, false)).toBeNull();
    expect(praiseLevel(2, 1, false)).toBe(1);
    expect(praiseLevel(4, 4, false)).toBe(4);
    expect(praiseLevel(1, 1, true)).toBe(5);
  });
});

describe('sesión', () => {
  it('coloca, puntúa y vacía la bandeja', () => {
    const s = new GameSession({ mode: 'classic', seed: 1 });
    const p = s.tray[0]!;
    const [x, y] = s.board.positionsFor(p.shape)[0];
    const r = s.place(0, x, y)!;
    expect(r).not.toBeNull();
    expect(r.points).toBe(p.shape.cells.length);
    expect(s.tray[0]).toBeNull();
    expect(s.place(0, x, y)).toBeNull();
  });

  it('combo y multiplicador en limpiezas consecutivas', () => {
    const s = new GameSession({ mode: 'classic', seed: 2 });
    s.board = Board.fromAscii(['1111111.', '1111111.', '........', '........', '........', '........', '........', '........']);
    s.tray = [
      { shape: shapeFrom('#'), color: 1, gems: [] },
      { shape: shapeFrom('#'), color: 2, gems: [] },
      { shape: shapeFrom('#'), color: 3, gems: [] },
    ];
    const a = s.place(0, 7, 0)!;
    expect(a.lines).toBe(1);
    expect(a.mult).toBe(1);
    const b = s.place(1, 7, 1)!;
    expect(b.mult).toBe(2);
    expect(b.clearPts).toBe(160 + 2000); // limpieza perfecta x2
    expect(b.perfect).toBe(true);
    expect(s.bestCombo).toBe(2);
  });

  it('detecta game over cuando ninguna pieza cabe', () => {
    const s = new GameSession({ mode: 'classic', seed: 3 });
    // tablero en damero: no caben piezas de 2+ celdas contiguas
    const rows: string[] = [];
    for (let y = 0; y < SIZE; y++) {
      let r = '';
      for (let x = 0; x < SIZE; x++) r += (x + y) % 2 === 0 ? '1' : '.';
      rows.push(r);
    }
    s.board = Board.fromAscii(rows);
    s.board.set(1, 0, 1); // tapamos un hueco
    s.tray = [{ shape: shapeFrom('#'), color: 1, gems: [] }, { shape: shapeFrom('##'), color: 2, gems: [] }, null];
    const r = s.place(0, 3, 0)!;
    expect(r.ended).toBe('gameover');
    expect(s.ended).toBe('gameover');
  });

  it('Zen nunca termina y permite deshacer', () => {
    const s = new GameSession({ mode: 'zen', seed: 4 });
    const before = s.board.countFilled();
    const p = s.tray[0]!;
    const [x, y] = s.board.positionsFor(p.shape)[0];
    s.place(0, x, y);
    expect(s.canUndo).toBe(true);
    expect(s.undo()).toBe(true);
    expect(s.board.countFilled()).toBe(before);
    expect(s.tray[0]).toBe(p);
  });

  it('Contrarreloj: tiempo, bonus por líneas y fin', () => {
    const s = new GameSession({ mode: 'timeattack', seed: 5 });
    expect(s.timeLeftMs).toBe(TIME_ATTACK_MS);
    s.board = Board.fromAscii(['1111111.']);
    s.tray = [{ shape: shapeFrom('#'), color: 1, gems: [] }, null, { shape: shapeFrom('#'), color: 1, gems: [] }];
    const r = s.place(0, 7, 0)!;
    expect(r.timeBonusMs).toBeGreaterThan(0);
    expect(s.update(TIME_ATTACK_MS * 10)).toBe('timeup');
  });

  it('Aventura: gana al cumplir objetivos y da estrellas', () => {
    const s = new GameSession({
      mode: 'adventure',
      seed: 1,
      level: { id: 999, goals: [{ type: 'lines', target: 1 }], moves: 5, stars: [100, 200], board: ['1111111.'], sets: [['#', '#', '#']] },
    });
    const r = s.place(0, 7, 0)!;
    expect(r.ended).toBe('win');
    expect(r.moveBonus).toBe(4 * 40);
    expect(r.stars).toBe(3);
  });

  it('Aventura: pierde al agotar movimientos', () => {
    const s = new GameSession({
      mode: 'adventure',
      seed: 1,
      level: { id: 998, goals: [{ type: 'lines', target: 5 }], moves: 1, stars: [100, 200], sets: [['#', '#', '#']] },
    });
    expect(s.place(0, 0, 0)!.ended).toBe('fail');
  });

  it('Aventura: recoge gemas y limpia bloques objetivo', () => {
    const s = new GameSession({
      mode: 'adventure',
      seed: 1,
      level: { id: 997, goals: [{ type: 'gems', target: 1 }, { type: 'targets' }], stars: [1, 2], board: ['GX11111.'], sets: [['#', '#', '#']] },
    });
    expect(s.targetsTotal).toBe(1);
    const r = s.place(0, 7, 0)!;
    expect(r.gems).toBe(1);
    expect(r.targets).toBe(1);
    expect(r.ended).toBe('win');
  });
});

describe('generador', () => {
  it('siempre da al menos una pieza que cabe si alguna forma cabe', () => {
    const rng = new Rng(42);
    for (let t = 0; t < 300; t++) {
      const b = new Board();
      const fill = rng.next() * 0.75;
      for (let i = 0; i < 64; i++) if (rng.next() < fill) b.cells[i] = 1;
      b.clearLines(b.fullLines());
      const set = dealSet(b, rng, { difficulty: rng.next() });
      expect(set.length).toBe(3);
      if (anyShapeFits(b)) expect(set.some((p) => b.fitsAnywhere(p.shape))).toBe(true);
    }
  });

  it('con dificultad 0 el set completo casi siempre es colocable', () => {
    const rng = new Rng(7);
    let ok = 0;
    const N = 120;
    for (let t = 0; t < N; t++) {
      const b = new Board();
      for (let i = 0; i < 64; i++) if (rng.next() < 0.35) b.cells[i] = 1;
      b.clearLines(b.fullLines());
      const set = dealSet(b, rng, { difficulty: 0 });
      if (solvable(b, set.map((p) => p.shape), { n: 20000 })) ok++;
    }
    expect(ok / N).toBeGreaterThan(0.9);
  });

  it('la dificultad sube la proporción de piezas grandes', () => {
    const big = (d: number) => {
      const rng = new Rng(9);
      let n = 0;
      for (let i = 0; i < 400; i++) n += dealPure(rng, d).filter((p) => p.shape.tier >= 2).length;
      return n;
    };
    expect(big(1)).toBeGreaterThan(big(0) * 2);
  });

  it('es determinista con la misma semilla', () => {
    const a = dealSet(new Board(), new Rng(123), { difficulty: 0.5 }).map((p) => p.shape.id + p.color);
    const b = dealSet(new Board(), new Rng(123), { difficulty: 0.5 }).map((p) => p.shape.id + p.color);
    expect(a).toEqual(b);
  });
});

describe('rng y fechas', () => {
  it('semilla diaria estable', () => {
    const d = new Date(2026, 0, 5);
    expect(dateKey(d)).toBe('2026-01-05');
    expect(dailySeed(d)).toBe(dailySeed(new Date(2026, 0, 5, 23, 59)));
    expect(dailySeed(d)).not.toBe(dailySeed(new Date(2026, 0, 6)));
    expect(daysBetween('2026-01-31', '2026-02-01')).toBe(1);
  });
});

describe('niveles', () => {
  it('hay 30 niveles válidos', () => {
    expect(LEVELS.length).toBe(30);
    LEVELS.forEach((l, i) => {
      expect(l.id).toBe(i + 1);
      expect(l.goals.length).toBeGreaterThan(0);
      expect(l.stars[1]).toBeGreaterThanOrEqual(l.stars[0]);
      // el tablero inicial carga y deja jugada posible
      const s = new GameSession({ mode: 'adventure', seed: 1, level: l });
      expect(s.hasMove()).toBe(true);
      expect(s.board.fullLines().rows.length + s.board.fullLines().cols.length).toBe(0);
      if (l.goals.some((g) => g.type === 'targets')) expect(s.targetsTotal).toBeGreaterThan(0);
    });
  });
});
