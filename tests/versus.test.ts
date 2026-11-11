import { describe, expect, it } from 'vitest';
import { Board, SIZE, STONE_COLOR } from '../src/core/board';
import { Rng } from '../src/core/rng';
import { shapeFrom } from '../src/core/pieces';
import { CHARGE_MAX, DIFFICULTIES, VersusMatch, addJunk, chargeFor, chooseBotMove, countJunk, removeJunk } from '../src/core/versus';
import { migrate } from '../src/save/save';

const dot = () => ({ shape: shapeFrom('#'), color: 1, gems: [] });

describe('versus', () => {
  it('multiplicadores de monedas por dificultad', () => {
    expect(DIFFICULTIES.easy.mult).toBe(1);
    expect(DIFFICULTIES.medium.mult).toBe(1.5);
    expect(DIFFICULTIES.hard.mult).toBe(2);
  });

  it('la basura nunca completa líneas y la limpieza la retira', () => {
    const b = Board.fromAscii(['1111111.', '.......1']);
    const cells = addJunk(b, 20, new Rng(3));
    expect(cells.length).toBe(20);
    expect(b.cells[7]).toBe(0); // completaría la fila 0
    const l = b.fullLines();
    expect(l.rows.length + l.cols.length).toBe(0);
    expect(countJunk(b)).toBe(20);
    expect(removeJunk(b, 6, new Rng(1))).toHaveLength(6);
    expect(countJunk(b)).toBe(14);
    expect(b.cells.filter((c) => c === STONE_COLOR).length).toBe(14);
  });

  it('la carga depende de líneas, combo y limpieza perfecta', () => {
    expect(chargeFor({ lines: 0, combo: 0, perfect: false })).toBe(0);
    expect(chargeFor({ lines: 2, combo: 1, perfect: false })).toBe(2);
    expect(chargeFor({ lines: 1, combo: 3, perfect: true })).toBe(4);
  });

  it('el bot difícil completa la línea disponible', () => {
    const m = new VersusMatch('hard', 7);
    const s = m.bot.session;
    s.board = Board.fromAscii(['1111111.']);
    s.tray = [dot(), dot(), dot()];
    const mv = chooseBotMove(s, 'hard', new Rng(1))!;
    expect([mv.x, mv.y]).toEqual([7, 0]);
  });

  it('llenar el medidor dispara un modificador; el escudo lo bloquea', () => {
    const m = new VersusMatch('medium', 11);
    m.bot.shield = true;
    m.player.charge = CHARGE_MAX - 1;
    const ev = m.afterMove('player', { lines: 1, combo: 1, perfect: false } as never);
    expect(ev).not.toBeNull();
    expect(m.player.charge).toBe(0);
    if (ev!.target === 'bot') {
      expect(ev!.blocked).toBe(true);
      expect(m.bot.shield).toBe(false);
    }
    m.bot.shield = false;
    const junk = m.fire('player', 'junk');
    expect(junk.blocked).toBe(false);
    expect(junk.cells.length).toBeGreaterThan(0);
  });

  it('quien se queda sin jugadas pierde; con tiempo agotado gana quien tenga más puntos', () => {
    const a = new VersusMatch('easy', 1);
    a.bot.session.forceEnd('gameover');
    expect(a.check()).toBe('win');

    const b = new VersusMatch('easy', 2);
    b.player.session.score = 10;
    b.bot.session.score = 50;
    expect(b.update(10 ** 9)).toBe('lose');
  });

  it('un bot difícil juega una partida entera sin romper nada', () => {
    const m = new VersusMatch('hard', 99);
    let moves = 0;
    while (!m.bot.session.ended && moves < 300) {
      const r = m.botMove();
      if (r) m.afterMove('bot', r);
      moves++;
    }
    expect(m.bot.session.score).toBeGreaterThan(0);
    for (const c of m.bot.session.board.cells) expect(c).toBeLessThanOrEqual(STONE_COLOR);
    expect(m.bot.session.board.cells.length).toBe(SIZE * SIZE);
  });

  it('migración: se borra el desafío diario y aparece Versus', () => {
    const d = migrate({ version: 2, coins: 5, daily: { lastDate: '2026-01-01', todayScore: 3, streak: 1, bestStreak: 1, history: {} } });
    expect('daily' in d).toBe(false);
    expect(d.versus.wins.hard).toBe(0);
    expect(d.versus.difficulty).toBe('medium');
    expect(d.coins).toBe(5);
  });
});
