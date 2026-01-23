import { GameState, Headline, Hint, PlayAction, Score, Stat, Stats } from 'types';

export const STORAGE_KEYS = {
  SCORES: 'scores',
  STATS: 'stats',
  STARTED: 'started',
  GAME_STATE: 'games',
  ADMIN_KEY: 'admin',
} as const;

export const getStoredScores = (): Record<string, Score> => {
  const scores = localStorage.getItem(STORAGE_KEYS.SCORES);
  return scores ? JSON.parse(scores) : {};
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

/**
 * Handles schema migration for a single GameState object.
 * Specifically, migrates the old `hints: { chars: number, clue: boolean }`
 * to the new `actions: PlayAction[]`.
 */
const handleGameStateSchemaChanges = (
  gameStates: Record<string, any>
): Record<string, GameState> => {
  const ids = Object.keys(gameStates);
  const newGameStates: Record<string, GameState> = {};

  for (const id of ids) {
    const gameState = gameStates[id];

    if (gameState && (gameState.hints || gameState.wrongGuesses)) {
      // Ensure 'actions' is an array, preserving existing actions if any (though unlikely for this specific migration path)
      const newActions: PlayAction[] = Array.isArray(gameState.actions)
        ? [...gameState.actions]
        : [];

      // Migrate char hints
      if (typeof gameState.hints?.chars === 'number' && gameState.hints.chars > 0) {
        for (let i = 0; i < gameState.hints.chars; i++) {
          newActions.push(Hint.CHAR);
        }
      }

      // Migrate clue hint
      if (gameState.hints?.clue) {
        newActions.push(Hint.CLUE);
      }

      // Migrate wrong guesses
      if (gameState.wrongGuesses && Array.isArray(gameState.wrongGuesses)) {
        gameState.wrongGuesses.forEach(({ guess }: { guess: string }) => newActions.push(guess));
      }

      gameState.actions = gameState.actions ?? newActions;
      delete gameState.hints;
      delete gameState.wrongGuesses;
    }

    newGameStates[id] = gameState;
  }
  return newGameStates;
};

export const getStoredGameState = (id: number | string): GameState | undefined => {
  const gameStates = localStorage.getItem(STORAGE_KEYS.GAME_STATE);
  if (!gameStates) return undefined;
  const parsed = handleGameStateSchemaChanges(JSON.parse(gameStates));
  return parsed[`${id}`];
};

export const storeGameState = (id: number | string, gameState: GameState): void => {
  let allGameStates: Record<string, GameState> = {};

  const currentStoredGameStates = localStorage.getItem(STORAGE_KEYS.GAME_STATE);
  if (currentStoredGameStates) {
    allGameStates = handleGameStateSchemaChanges(JSON.parse(currentStoredGameStates));
  }
  allGameStates[`${id}`] = gameState;

  localStorage.setItem(STORAGE_KEYS.GAME_STATE, JSON.stringify(allGameStates));
};

export const getAdminKey = (): string | undefined => {
  return localStorage.getItem(STORAGE_KEYS.ADMIN_KEY) ?? undefined;
};

export const storeAdminKey = (key: string): void => {
  localStorage.setItem(STORAGE_KEYS.ADMIN_KEY, key);
};
