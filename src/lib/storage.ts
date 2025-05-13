import { GameState, Headline, Score, Stat, Stats } from '../types';

export const STORAGE_KEYS = {
  SCORES: 'scores',
  STATS: 'stats',
  STARTED: 'started',
  GAME_STATE: 'games',
  ADMIN_KEY: 'admin',
} as const;

const handleScoreSchemaChanges = (scores: Record<string, Score>): Record<string, Score> => {
  // For each change that has been made to the schema, need to process the update.
  // First: i was changed to n. Here are all the ids possible before the change
  const ids = [6, 8, 9, 10, 16, 19, 20, 25];
  Object.keys(scores)
    .sort()
    .forEach(key => {
      const id: number = parseInt(key);
      if (!scores[key].n) {
        const n = ids.indexOf(id) + 1;
        if (n !== 0) {
          scores[id].n = n;
        }

        // @ts-expect-error
        delete scores[id].i;
      }
    });

  return scores;
};

export const getStoredScores = (): Record<string, Score> => {
  const scores = localStorage.getItem(STORAGE_KEYS.SCORES);
  return handleScoreSchemaChanges(scores ? JSON.parse(scores) : {});
};

export const saveResult = (
  headline: Headline,
  date: Date,
  wrongGuesses: number,
  expertMode: boolean
): void => {
  const scores = getStoredScores();
  scores[headline.id] = { n: headline.gameNum, d: date.getTime(), g: wrongGuesses, e: expertMode };
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

    localStorage.setItem(STORAGE_KEYS.GAME_STATE, JSON.stringify(parsed));
  }
};

export const getAdminKey = (): string | undefined => {
  return localStorage.getItem(STORAGE_KEYS.ADMIN_KEY) ?? undefined;
};

export const storeAdminKey = (key: string): void => {
  localStorage.setItem(STORAGE_KEYS.ADMIN_KEY, key);
};
