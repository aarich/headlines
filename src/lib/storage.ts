const STORAGE_KEYS = {
  SCORE: 'score',
  STREAK: 'streak'
} as const;

export const getStoredScore = (): number => {
  const score = localStorage.getItem(STORAGE_KEYS.SCORE);
  return score ? parseInt(score, 10) : 0;
};

export const getStoredStreak = (): number => {
  const streak = localStorage.getItem(STORAGE_KEYS.STREAK);
  return streak ? parseInt(streak, 10) : 0;
};

export const saveScore = (score: number): void => {
  localStorage.setItem(STORAGE_KEYS.SCORE, score.toString());
};

export const saveStreak = (streak: number): void => {
  localStorage.setItem(STORAGE_KEYS.STREAK, streak.toString());
}; 