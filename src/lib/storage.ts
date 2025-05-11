import { GameState, Score, Stat, Stats } from '../types';

const STORAGE_KEYS = {
  SCORES: 'scores',
  STATS: 'stats',
  STARTED: 'started',
  GAME_STATE: 'games',
} as const;

export const getStoredScores = (): Record<string, Score> => {
  const scores = localStorage.getItem(STORAGE_KEYS.SCORES);
  return scores ? JSON.parse(scores) : {};
};

export const saveResult = (
  id: number,
  date: Date,
  wrongGuesses: number,
  expertMode: boolean
): void => {
  const scores = getStoredScores();
  scores[`${id}`] = { i: id, d: date.getTime(), g: wrongGuesses, e: expertMode };
  localStorage.setItem(STORAGE_KEYS.SCORES, JSON.stringify(scores));
};

export const getStoredStats = (): Partial<Stats> => {
  const stats = localStorage.getItem(STORAGE_KEYS.STATS);
  return stats ? JSON.parse(stats) : {};
};

export const saveStats = (stats: Partial<Stats>): void => {
  const currentStats = getStoredStats();
  localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify({ ...currentStats, ...stats }));
};

export const incrementStat = (key: Stat): void => {
  const currentStats = getStoredStats();
  currentStats[key] = (currentStats[key] || 0) + 1;
  localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(currentStats));
};

export const setStarted = (id: number): void => {
  let games = new Set<number>();
  const currentStarted = localStorage.getItem(STORAGE_KEYS.STARTED);
  if (currentStarted) {
    games = new Set<number>(JSON.parse(currentStarted).games);
  }

  games.add(id);

  localStorage.setItem(STORAGE_KEYS.STARTED, JSON.stringify({ games: Array.from(games) }));
};

export const getStarted = (): Set<number> => {
  const started = localStorage.getItem(STORAGE_KEYS.STARTED);
  return new Set<number>(started ? JSON.parse(started).games : []);
};

export const getStoredGameState = (id: number): GameState | undefined => {
  const gameStates = localStorage.getItem(STORAGE_KEYS.GAME_STATE);
  if (!gameStates) return undefined;
  const parsed = JSON.parse(gameStates);
  return parsed[`${id}`];
};

export const storeGameState = (id: number, gameState: GameState): void => {
  const currentGameState = localStorage.getItem(STORAGE_KEYS.GAME_STATE);
  if (!currentGameState) {
    localStorage.setItem(STORAGE_KEYS.GAME_STATE, JSON.stringify({ [`${id}`]: gameState }));
  } else {
    const parsed = JSON.parse(currentGameState);
    parsed[`${id}`] = gameState;

    if (Math.random() < 0.05) {
      // remove anything 7 days older than the one we're working on now.
      const oldGameState = Object.keys(parsed).filter(key => parseInt(key) < id - 7);
      oldGameState.forEach(key => delete parsed[key]);
    }

    localStorage.setItem(STORAGE_KEYS.GAME_STATE, JSON.stringify(parsed));
  }
};
