import { describe, expect, it } from 'vitest';
import { Board, MARK_GEM, MARK_TARGET, SIZE } from '../src/core/board';
import { GameSession } from '../src/core/session';
import { LEVELS } from '../src/levels/levels';

/** Heurística sencilla: limpiar líneas (sobre todo con gemas/dianas) y no dejar huecos aislados. */
function evaluate(b: Board, s: GameSession, slot: number, x: number, y: number): number {
  const p = s.tray[slot]!;
  const c = b.clone();
  c.place(p.shape, x, y, p.color, p.gems);
  const lines = c.fullLines();
  const cleared = c.clearLines(lines);
  let v = (lines.rows.length + lines.cols.length) * 100;
  for (const cell of cleared) if (cell.mark === MARK_GEM || cell.mark === MARK_TARGET) v += 60;
  let holes = 0;
  for (let yy = 0; yy < SIZE; yy++)
    for (let xx = 0; xx < SIZE; xx++) {
      if (c.get(xx, yy)) continue;
      let n = 0;
      if (xx === 0 || c.get(xx - 1, yy)) n++;
      if (xx === SIZE - 1 || c.get(xx + 1, yy)) n++;
      if (yy === 0 || c.get(xx, yy - 1)) n++;
      if (yy === SIZE - 1 || c.get(xx, yy + 1)) n++;
      if (n >= 3) holes++;
    }
  return v - holes * 12 - c.countFilled() * 2;
}

function botPlay(s: GameSession, maxMoves = 400) {
  for (let m = 0; m < maxMoves && !s.ended; m++) {
    let best = null as [number, number, number] | null;
    let bv = -Infinity;
    s.tray.forEach((p, i) => {
      if (!p) return;
      for (const [x, y] of s.board.positionsFor(p.shape)) {
        const v = evaluate(s.board, s, i, x, y);
        if (v > bv) {
          bv = v;
          best = [i, x, y];
        }
      }
    });
    if (!best) break;
    const [i, x, y] = best;
    s.place(i, x, y);
  }
}

describe('balance de niveles (bot)', () => {
  it('todos los niveles son superables y la curva es razonable', () => {
    const report: string[] = [];
    for (const lv of LEVELS) {
      let wins = 0;
      let stars = 0;
      const N = 12;
      for (let seed = 0; seed < N; seed++) {
        const s = new GameSession({ mode: 'adventure', seed, level: { ...lv, seed: lv.id * 1000 + seed } });
        botPlay(s);
        if (s.ended === 'win') {
          wins++;
          stars += s.score >= lv.stars[1] ? 3 : s.score >= lv.stars[0] ? 2 : 1;
        }
      }
      report.push(`N${lv.id}: ${wins}/${N} victorias, ★ medias ${(stars / Math.max(1, wins)).toFixed(1)}`);
      expect(wins, `nivel ${lv.id}`).toBeGreaterThan(0);
    }
    console.log(report.join('\n'));
  }, 120_000);

  it('Clásico: el bot dura una partida razonable (la dificultad no es injusta al inicio)', () => {
    const scores: number[] = [];
    for (let seed = 1; seed <= 10; seed++) {
      const s = new GameSession({ mode: 'classic', seed });
      botPlay(s, 600);
      scores.push(s.score);
      expect(s.moves).toBeGreaterThan(30);
    }
    console.log('Clásico (bot):', scores.join(', '));
  }, 120_000);
});
