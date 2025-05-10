import { Score, Stat, Stats } from '../types';

const STORAGE_KEYS = {
  SCORES: 'scores',
  STATS: 'stats',
  LAST_STARTED: 'last_started',
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

export const setLastStarted = (id: number): void => {
  localStorage.setItem(STORAGE_KEYS.LAST_STARTED, id.toString());
};

export const getLastStarted = (): number | undefined => {
  const lastStarted = localStorage.getItem(STORAGE_KEYS.LAST_STARTED);
  return lastStarted ? parseInt(lastStarted) : undefined;
};
