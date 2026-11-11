import { COINS_PER_STAR } from '../core/level';
import { dateKey, daysBetween } from '../core/rng';
import { coinsForScore } from '../core/scoring';
import type { GameSession, ModeId } from '../core/session';
import { LEVELS } from '../levels/levels';
import type { BestMode, SaveData, SaveStore } from '../save/save';

/** Lo mínimo de una partida que necesitan récords y recompensas (cualquier modo). */
export interface RunResult {
  mode: ModeId;
  score: number;
  bestCombo: number;
}

/* ================= Logros ================= */

export interface AchievementDef {
  id: string;
  target: number;
  reward: number;
  value(d: SaveData): number;
}

export const totalStars = (d: SaveData) => Object.values(d.levels).reduce((a, l) => a + l.stars, 0);
export const levelsDone = (d: SaveData) => Object.values(d.levels).filter((l) => l.stars > 0).length;

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_game', target: 1, reward: 10, value: (d) => d.stats.games },
  { id: 'games_50', target: 50, reward: 100, value: (d) => d.stats.games },
  { id: 'combo_5', target: 5, reward: 50, value: (d) => d.stats.bestCombo },
  { id: 'combo_10', target: 10, reward: 150, value: (d) => d.stats.bestCombo },
  { id: 'lines_100', target: 100, reward: 50, value: (d) => d.stats.lines },
  { id: 'lines_1000', target: 1000, reward: 200, value: (d) => d.stats.lines },
  { id: 'score_5k', target: 5000, reward: 50, value: (d) => d.best.classic },
  { id: 'score_20k', target: 20000, reward: 150, value: (d) => d.best.classic },
  { id: 'multi_4', target: 4, reward: 100, value: (d) => d.stats.maxLinesAtOnce },
  { id: 'perfect', target: 1, reward: 100, value: (d) => d.stats.perfect },
  { id: 'levels_10', target: 10, reward: 100, value: levelsDone },
  { id: 'levels_30', target: 30, reward: 300, value: levelsDone },
  { id: 'stars_90', target: 90, reward: 300, value: totalStars },
  { id: 'daily_first', target: 1, reward: 30, value: (d) => Object.keys(d.daily.history).length },
  { id: 'daily_7', target: 7, reward: 150, value: (d) => d.daily.bestStreak },
  { id: 'time_5k', target: 5000, reward: 100, value: (d) => d.best.timeattack },
  { id: 'zen_200', target: 200, reward: 50, value: (d) => d.stats.zenMoves },
  { id: 'skin_1', target: 1, reward: 50, value: (d) => d.stats.skinsBought },
  { id: 'cascade_25k', target: 25000, reward: 150, value: (d) => d.best.cascade },
];

/* ================= Resultados ================= */

export interface GameReward {
  coins: number;
  newBest: boolean;
  best: number;
  achievements: AchievementDef[];
  /** Solo Aventura */
  stars?: number;
  prevStars?: number;
}

export class Progress {
  constructor(readonly store: SaveStore) {}

  get d(): SaveData {
    return this.store.data;
  }

  addCoins(n: number) {
    if (n <= 0) return;
    this.d.coins += n;
    this.d.stats.coinsEarned += n;
  }

  /** Comprueba logros nuevos, paga sus recompensas y los devuelve. */
  checkAchievements(): AchievementDef[] {
    const out: AchievementDef[] = [];
    for (const a of ACHIEVEMENTS) {
      if (this.d.achievements[a.id]) continue;
      if (a.value(this.d) >= a.target) {
        this.d.achievements[a.id] = Date.now();
        this.addCoins(a.reward);
        out.push(a);
      }
    }
    return out;
  }

  /** Registra estadísticas de una jugada (se llama en cada colocación). */
  recordMove(lines: number, combo: number, perfect: boolean, mode: string) {
    const s = this.d.stats;
    s.pieces++;
    s.lines += lines;
    s.bestCombo = Math.max(s.bestCombo, combo);
    s.maxLinesAtOnce = Math.max(s.maxLinesAtOnce, lines);
    if (perfect) s.perfect++;
    if (mode === 'zen') s.zenMoves++;
  }

  /**
   * Tras cada jugada: guarda el récord en vivo (Clásico/Zen/Contrarreloj no necesitan terminar
   * para contar) y desbloquea los logros en el momento en que se cumplen.
   */
  liveUpdate(session: RunResult): AchievementDef[] {
    const m = session.mode as BestMode;
    if (m in this.d.best) this.d.best[m] = Math.max(this.d.best[m], session.score);
    const achievements = this.checkAchievements();
    this.store.save();
    return achievements;
  }

  /** Fin de partida (no Aventura). Devuelve monedas ganadas y logros. */
  /** bestBefore: récord al empezar la partida (el récord se actualiza en vivo durante la jugada). */
  finishGame(session: RunResult, bestBefore?: number): GameReward {
    const d = this.d;
    d.stats.games++;
    let coins = coinsForScore(session.score, session.bestCombo);
    let newBest = false;
    let best = 0;
    if (session.mode === 'daily') {
      const today = dateKey();
      const prev = d.daily.lastDate;
      if (prev !== today) {
        d.daily.streak = prev && daysBetween(prev, today) === 1 ? d.daily.streak + 1 : 1;
        d.daily.bestStreak = Math.max(d.daily.bestStreak, d.daily.streak);
        d.daily.todayScore = 0;
        coins += 15; // bonus por completar el desafío del día (una vez al día)
      }
      d.daily.lastDate = today;
      newBest = session.score > d.daily.todayScore;
      d.daily.todayScore = Math.max(d.daily.todayScore, session.score);
      d.daily.history[today] = d.daily.todayScore;
      const keys = Object.keys(d.daily.history).sort();
      while (keys.length > 60) delete d.daily.history[keys.shift()!];
      best = d.daily.todayScore;
    } else if (session.mode !== 'tutorial') {
      const m = session.mode as BestMode;
      if (m in d.best) {
        newBest = session.score > (bestBefore ?? d.best[m]) && session.score > 0;
        d.best[m] = Math.max(d.best[m], session.score);
        best = d.best[m];
      }
    }
    if (session.mode === 'zen') coins = Math.floor(coins / 2); // Zen no tiene riesgo
    if (session.mode === 'cascade') coins = Math.floor(coins / 4); // Cascada puntúa mucho más alto
    this.addCoins(coins);
    const achievements = this.checkAchievements();
    this.store.save();
    return { coins, newBest, best, achievements };
  }

  /** Fin de nivel de Aventura. */
  finishLevel(session: GameSession, won: boolean, stars: number): GameReward {
    const d = this.d;
    d.stats.games++;
    const id = String(session.level!.id);
    const prev = d.levels[id] ?? { stars: 0, best: 0 };
    let coins = 0;
    const official = LEVELS.some((l) => l === session.level);
    if (won && official) {
      coins = Math.max(0, COINS_PER_STAR[stars] - COINS_PER_STAR[prev.stars]);
      d.levels[id] = { stars: Math.max(prev.stars, stars), best: Math.max(prev.best, session.score) };
    }
    this.addCoins(coins);
    const achievements = this.checkAchievements();
    this.store.save();
    return { coins, newBest: won && session.score > prev.best, best: Math.max(prev.best, session.score), achievements, stars, prevStars: prev.stars };
  }

  /** Nivel máximo desbloqueado (1-based). */
  unlockedLevel(): number {
    let n = 1;
    for (const l of LEVELS) {
      if ((this.d.levels[String(l.id)]?.stars ?? 0) > 0) n = Math.max(n, l.id + 1);
    }
    return Math.min(n, LEVELS.length);
  }

  /** Recompensa de entrada diaria: devuelve {coins, streak} si toca hoy, o null. */
  pendingLoginReward(): { coins: number; streak: number } | null {
    const today = dateKey();
    const l = this.d.login;
    if (l.lastDate === today) return null;
    const streak = l.lastDate && daysBetween(l.lastDate, today) === 1 ? l.streak + 1 : 1;
    return { coins: Math.min(20 + (streak - 1) * 5, 50), streak };
  }

  claimLoginReward(): number {
    const r = this.pendingLoginReward();
    if (!r) return 0;
    this.d.login = { lastDate: dateKey(), streak: r.streak };
    this.addCoins(r.coins);
    this.store.save();
    return r.coins;
  }

  buySkin(id: string, price: number): boolean {
    if (this.d.ownedSkins.includes(id)) return true;
    if (this.d.coins < price) return false;
    this.d.coins -= price;
    this.d.ownedSkins.push(id);
    this.d.stats.skinsBought++;
    this.store.save();
    return true;
  }
}
